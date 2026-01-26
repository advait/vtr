# vtr Specification

> Headless terminal multiplexer: container PTYs stream bytes to a central VT engine inside the coordinator. gRPC exposes screen state + I/O to heterogeneous clients (agent CLI, web UI). Decouples PTY lifecycle from rendering.

## Overview

vtr is a terminal multiplexer designed for the agent era. Each container runs a coordinator that manages multiple named PTY sessions. Clients connect via gRPC over Unix sockets (local) or TCP (hub/spoke) to query screen state, search scrollback, send input, and wait for output patterns.

**Core insight**: Agents don't need 60fps terminal streaming. They need consistent screen state on demand, pattern matching on output, and reliable input delivery.

## Documentation

- Release process: `docs/RELEASING.md`.

## Implementation Status (post-M6)

- Implemented gRPC methods: Spawn, List, Info, Kill, Close, Remove, Rename, GetScreen, Grep, SendText, SendKey, SendBytes, Resize, WaitFor, WaitForIdle, Subscribe.
- DumpAsciinema remains defined in `proto/vtr.proto` but is not implemented yet (gRPC returns UNIMPLEMENTED).
- CLI supports `hub`, `spoke`, `tui`, `agent`, and `setup` (JSON-only agent output).
- TUI uses Subscribe streaming updates with leader key bindings for session actions.
- Mouse support is not implemented yet; M8 adds mouse mode tracking, Subscribe events, and SendMouse RPC.
- Agent/TUI target a single hub via `--hub` (unix socket path or host:port).
- Grep uses scrollback dumps when available; falls back to screen/viewport dumps if history is unavailable.
- WaitFor scans output emitted after the request starts using a rolling 1MB buffer.
- M7/M7.1: `vtr hub` serves embedded `web/dist` assets plus WS bridges using protobuf `Any` frames (`SubscribeRequest/SubscribeEvent` for terminal streaming, `SubscribeSessionsRequest/SessionsSnapshot` for session list updates). HTTP JSON endpoints include `POST /api/sessions` (spawn) and `POST /api/sessions/action` (send_key/signal/close/remove/rename); `GET /api/sessions` remains for manual debugging. The web UI includes a settings menu with theme presets.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Container A                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              vtr spoke (coordinator)                 │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │   │
│  │  │ Session │  │ Session │  │ Session │             │   │
│  │  │ "codex" │  │ "shell" │  │ "build" │             │   │
│  │  │   PTY   │  │   PTY   │  │   PTY   │             │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘             │   │
│  │       │            │            │                   │   │
│  │       └────────────┴────────────┘                   │   │
│  │                    │                                │   │
│  │   VT Engine (libghostty-vt via go-ghostty shim)     │   │
│  │              Screen State + Scrollback              │   │
│  │                    │                                │   │
│  │              gRPC Server                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│              /var/run/vtrpc.sock (Unix socket)              │
└─────────────────────────┬───────────────────────────────────┘
                          │ (volume mounted to host)
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ vtr     │      │ vtr tui │      │ Web UI  │
   │ agent   │      │         │      │         │
   └─────────┘      └─────────┘      └─────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Coordinator** | Per-container server managing PTY sessions, VT engine, gRPC |
| **Session** | Named PTY + scrollback buffer + metadata |
| **VT Engine** | Native terminal emulator (libghostty-vt Zig module via go-ghostty shim) maintaining screen state |
| **CLI Client** | Agent/human interface for queries and input |
| **Web UI** | Browser-based session viewer (M7) |

## Session Lifecycle

```
         spawn(name)
              │
              ▼
        ┌──────────┐
        │ Running  │◄────────────────┐
        └────┬─────┘                 │
             │                       │
        PTY exits                    │
             │                       │
             ▼                       │
        ┌──────────┐                 │
        │  Exited  │    (still readable, has exit_code)
        └────┬─────┘                 │
             │                       │
          rm(name)                   │
             │                       │
             ▼                       │
        ┌──────────┐                 │
        │ Removed  │                 │
        └──────────┘                 │
                                     │
    rm(name) on Running ─────────────┘
    (auto-kills PTY first)
```

**States:**
- **Running**: PTY process alive, accepting input
- **Closing**: Close requested; PTY may still be running
- **Exited**: PTY process terminated, scrollback readable, has exit code
- **Removed**: Session deleted from coordinator

**Key behaviors:**
- Sessions persist until explicitly removed via `rm`
- `close` sends SIGHUP to the session process group, marks status Closing, and schedules SIGKILL after `--kill-timeout` if still running
- `rm` on a running session sends SIGTERM, waits `--kill-timeout` (default 5s), sends SIGKILL, then removes
- Exit code preserved in Exited state

## Configuration

### Config (vtrpc.toml)

Location: `$VTRPC_CONFIG_DIR/vtrpc.toml` (default: `~/.config/vtrpc/vtrpc.toml`).

```toml
[hub]
grpc_socket = "/var/run/vtrpc.sock"
addr = "127.0.0.1:4620"
web_enabled = true

[auth]
mode = "both" # token, mtls, or both
token_file = "~/.config/vtrpc/token"
ca_file = "~/.config/vtrpc/ca.crt"
cert_file = "~/.config/vtrpc/client.crt"
key_file = "~/.config/vtrpc/client.key"

[server]
cert_file = "~/.config/vtrpc/server.crt"
key_file = "~/.config/vtrpc/server.key"
```

`vtr setup` writes a local-hub config and generates auth material (0600 for keys/tokens).
If `/var/run/vtrpc.sock` is not writable, setup offers `/tmp/vtrpc.sock` and updates the config.

## CLI Interface

Single `vtr` binary serves as both client and server.

### Server Commands

```bash
# Start hub coordinator (web UI enabled by default)
vtr hub [--socket /path/to.sock] [--addr 127.0.0.1:4620] [--no-web] \
  [--shell /bin/bash] [--cols 80] [--rows 24] [--scrollback 10000] [--kill-timeout 5s] [--idle-threshold 5s]

# Start spoke coordinator and register with hub
vtr spoke --hub host:4621 [--socket /path/to.sock] [--name spoke-a]

# One-time local setup (config + auth material)
vtr setup
```

### Session Management

```bash
# List sessions
vtr agent ls [--hub <addr|socket>]

# Create new session
vtr agent spawn <name> [--hub <addr|socket>] [--cmd "command"] [--cwd /path] [--cols 80] [--rows 24]

# Remove session (kills if running)
vtr agent rm <name> [--hub <addr|socket>]

# Kill PTY process (session remains in Exited state)
vtr agent kill <name> [--signal TERM|KILL|INT] [--hub <addr|socket>]
```

### Screen Operations

```bash
# Get current screen state (plain text by default)
vtr agent screen <name> [--hub <addr|socket>] [--json] [--ansi]

# Search scrollback (ripgrep-style output; RE2 regex)
vtr agent grep <name> <pattern> [-B lines] [-A lines] [-C lines] [--hub <addr|socket>]

# Get session info (dimensions, status, exit code)
vtr agent info <name> [--hub <addr|socket>]
```

### Input Operations

```bash
# Send text
vtr agent send <name> <text> [--hub <addr|socket>]

# Send special key
vtr agent key <name> <key> [--hub <addr|socket>]
# Keys: enter/return, tab, escape/esc, up, down, left, right, backspace, delete, home, end, pageup, pagedown
# Modifiers: ctrl+c, ctrl+d, ctrl+z, alt+x, meta+x, etc. (single characters are sent verbatim)

# Send raw bytes (hex-encoded)
vtr agent raw <name> <hex> [--hub <addr|socket>]

# Resize terminal
vtr agent resize <name> <cols> <rows> [--hub <addr|socket>]
```

### Blocking Operations

```bash
# Wait for pattern in output (future output only, RE2 regex)
vtr agent wait <name> <pattern> [--timeout 30s] [--hub <addr|socket>]

# Wait for idle (no output for idle duration)
vtr agent idle <name> [--idle 5s] [--timeout 30s] [--hub <addr|socket>]
```

### Interactive Mode

```bash
# Attach to session (interactive TUI)
vtr tui <name> [--hub <addr|socket>]
```

TUI features (M6):
- Bubbletea TUI renders the viewport inside a Lipgloss border with 1-row header and footer bars.
- Header shows coordinator/session (and exit code on exit) plus version; footer shows leader hints/legend and transient status messages.
- TUI uses the standard session addressing rules (`spoke:session` or `--hub`).
- Uses `Subscribe` for real-time screen updates (output-driven, throttled to 30fps max).
- Terminal runs in raw mode; input not bound to leader commands is forwarded via `SendBytes`
  (or `SendKey` for special keys).
- `Ctrl+b` enters leader mode; the next key is consumed. `Ctrl+b` then `Ctrl+b` sends a
  literal `Ctrl+b` to the session. Unknown leader keys show a brief status message and
  do not send input.
- Leader key commands:
  - `c` - Create new session (prompt for name; `tab` toggles focus between name and coordinator;
    j/k changes coordinator; uses coordinator default shell/cwd; attaches to the new session)
  - `d` - Detach (exit TUI, session keeps running)
  - `x` - Kill current session
  - `j`/`n` - Next session (current coordinator, name-sorted; includes exited)
  - `k`/`p` - Previous session (current coordinator, name-sorted; includes exited)
  - `w` - List sessions (current coordinator; fuzzy finder picker using Bubbletea filter component;
    selection switches sessions)
- `Esc` closes the session picker or create dialog.
- Window resize sends `Resize` with viewport dimensions (terminal size minus border).
- Session exit keeps the final screen visible, disables input, and marks the UI
  clearly exited (border color change + EXITED badge with exit code); press
  `q` or `enter` to close the TUI, or use leader commands to switch sessions.

## Web UI (M7)

Goal: Mobile-first browser UI for live terminal sessions over Tailscale.

### Architecture overview

```
Browser (mobile/desktop)
  |  HTTPS (static assets) + WS (stream/input)
  v
Hub (vtr hub: web UI + WS + gRPC)
  |  gRPC clients (one per spoke)
  v
Spokes (vtr spoke)
```

The Web UI runs inside `vtr hub` (enabled by default; use `--no-web` to disable).
It serves static assets and bridges `Subscribe` streaming + input over WebSocket using protobuf frames.
Session list updates stream over WebSocket (`SubscribeSessionsRequest` → `SessionsSnapshot`), while streaming
and input (`Subscribe`, `SendText`, `SendKey`, `SendBytes`, `Resize`) flow over the terminal WebSocket.
HTTP JSON endpoints include `POST /api/sessions` (spawn) and `POST /api/sessions/action`
(send_key/signal/close/remove/rename); `GET /api/sessions` remains available for manual debugging.

### Command and configuration

- `vtr hub` reads `$VTRPC_CONFIG_DIR/vtrpc.toml` (default: `~/.config/vtrpc/vtrpc.toml`).
- `--addr` controls the single gRPC+web bind address (default: `127.0.0.1:4620`).
- `--no-web` disables the web UI while keeping the hub coordinator running.

### HTTP API (M7)

HTTP JSON API for session listing and lifecycle:

- `GET /api/sessions` returns `{"coordinators":[{"name","path","sessions":[{"name","status","cols","rows","idle","exit_code"}],"error"}]}` (debugging only).
- `POST /api/sessions` accepts `{"name","coordinator","command","working_dir","cols","rows"}` and returns `{"coordinator","session":{...}}`.
- `POST /api/sessions/action` accepts `{"name","action","key","signal","new_name"}` where `action` is `send_key`, `signal`, `close`, `remove`, or `rename`.

Streaming and input (`Subscribe`, `SendText`, `SendKey`, `SendBytes`, `Resize`) flow over the WebSocket protobuf protocol.

### Frontend stack (decision)

- Framework: React with shadcn/ui (Radix + Tailwind) components.
- Dev tooling: Bun + Vite for fast HMR and modern tooling.
- Typography: JetBrains Mono for UI + terminal, fallback to `ui-monospace`.
- Theme: Tokyo Night default with selectable presets (Tokyo Night, Nord, Solarized Light).
- Layout: single-column mobile layout, bottom input bar, tap-to-focus, and a
  minimal action tray (Ctrl, Esc, Tab, arrows, PgUp/PgDn).
- Session navigation: coordinator tree view with expandable groups (see
  Session Tree View).

### UI design (Tokyo Night default)

Design goals: minimalist, dark, high-contrast, and production-grade.
Default theme is Tokyo Night; other presets override the same CSS variables.

Design tokens (CSS variables):
```css
:root {
  --tn-bg: #1a1b26;
  --tn-bg-alt: #16161e;
  --tn-panel: #1f2335;
  --tn-panel-2: #24283b;
  --tn-border: #414868;
  --tn-text: #c0caf5;
  --tn-text-dim: #9aa5ce;
  --tn-muted: #565f89;
  --tn-accent: #7aa2f7;
  --tn-cyan: #7dcfff;
  --tn-green: #9ece6a;
  --tn-orange: #ff9e64;
  --tn-red: #f7768e;
  --tn-purple: #bb9af7;
  --tn-yellow: #e0af68;
}
```

Typography:
- Font: `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`.
- Base size: 14px mobile, 15px desktop; headings at 16-18px.
- Line height: 1.45 for labels, 1.6 for body.
- Enable programming ligatures in terminal content when supported by the font;
  keep UI labels non-ligatured for legibility.

Component specs (shadcn/ui primitives):
- App shell: sticky top bar with status + settings; background `--tn-panel`.
- Coordinator tree: `Accordion` + `ScrollArea`, group headers 44px tall.
- Session rows: compact tap targets with status `Badge` and size metadata.
- Terminal panel: full-bleed dark panel with subtle border and inset shadow.
- Input bar: bottom-docked `Input` + `Button` row, 48px height.
- Action tray: row of ghost buttons (Ctrl, Esc, Tab, arrows), 40px touch targets.
- Status chip: `Badge` with running/exited colors (`--tn-green` / `--tn-red`).
- Coordinator filter input: anchored at the bottom of the left panel.

Spacing and shape:
- Radius: 10px for panels, 8px for inputs/buttons.
- Padding: 12-16px for panels, 8-12px for list rows.
- Borders: 1px `--tn-border`, avoid heavy shadows.

Visual QA:
- Capture screenshots (shot or equivalent) for mobile (390px wide) and desktop
  (1280px wide) with tree view expanded and a live session attached.

### UI polish requirements (M7)

- No layout jumps: measure cell size after fonts load; keep the grid stable
  during connect/reconnect.
- Connection UX: clear connecting/reconnecting states; disable input when the
  session exits or the socket is down.
- Input feel: tap-to-focus is reliable; paste works; on-screen controls and
  keyboard input never fight for focus.
- Performance: screen updates apply within a frame budget; avoid per-cell DOM
  churn by using run-based rendering.
- Fit-and-finish: crisp borders, consistent spacing, 44px tap targets, and
  readable contrast across all states.

### Testing strategy (E2E pipeline)

Goal: validate end-to-end data flow from ANSI bytes to rendered browser state
via structured screen updates (no client-side ANSI parsing).

Approach:
- Spawn a coordinator-backed PTY, feed ANSI bytes, and attach a web client.
- Observe the rendered terminal state in the browser and assert content + style.
- Cover both screen-update streaming and snapshot resync paths.

Example flow:
1. Feed `"\x1b[31mRED\x1b[0m"` to PTY.
2. Wait for the web client to attach and render.
3. Assert the terminal contains "RED" with the expected red color.

Additional coverage:
- Single-codepoint emoji and wide CJK glyphs render with correct width and
  alignment; multi-codepoint grapheme cluster coverage is post-M7 once the
  proto carries cluster metadata.
- Ligatures (e.g., `->`, `=>`, `!=`) render when enabled without shifting cell
  boundaries.

### Session Tree View (coordinator -> sessions)

Mobile-first hierarchy:
- Coordinators render as accordion headers with counts and status badges.
- Expanding a coordinator shows sessions with state chips (running/exited).
- Each session row is tap-target sized, with a primary "Attach" action.
- Provide a global search/filter that matches coordinator or session names.
- Default view shows all coordinators resolved from config; CLI overrides
  restrict the tree to the provided paths.

### Ghostty web/WASM findings

Ghostty includes a WebAssembly build and small browser examples, but no full
terminal renderer or reusable web UI components:
- WASM entrypoint and helpers: `ghostty/src/main_wasm.zig`,
  `ghostty/include/ghostty/vt/wasm.h`.
- Examples: `ghostty/example/wasm-sgr` (SGR parser) and
  `ghostty/example/wasm-key-encode` (key encoder).
- Web canvas font utilities live in `ghostty/src/font/*/web_canvas.zig`.

Recommendation: for M7, do not use Ghostty WASM in the browser. Render from
structured screen updates emitted by the coordinator.

### Screen model (proto)

The coordinator owns terminal state and exposes it as a structured grid:

```
message ScreenCell {
  string char = 1;
  int32 fg_color = 2;  // RGB packed
  int32 bg_color = 3;  // RGB packed
  uint32 attributes = 4;  // bold=0x01, italic=0x02, underline=0x04, faint=0x08,
                          // blink=0x10, inverse=0x20, invisible=0x40,
                          // strikethrough=0x80, overline=0x100
}

message ScreenRow {
  repeated ScreenCell cells = 1;
}

message GetScreenResponse {
  string name = 1;
  int32 cols = 2;
  int32 rows = 3;
  int32 cursor_x = 4;
  int32 cursor_y = 5;
  repeated ScreenRow screen_rows = 6;
}
```
Screen cell semantics:
- `char` is a single Unicode codepoint string from Ghostty's snapshot; the
  server sends `" "` for empty cells. Multi-codepoint grapheme clusters
  (ZWJ/flags/emoji sequences) are not preserved yet and may appear as separate
  cells until the proto carries cluster metadata.
- `fg_color`/`bg_color` are packed 24-bit RGB ints (`0xRRGGBB`, no alpha).
- `attributes` uses the Ghostty bitmask values listed above.
- Cursor visibility is not exposed in the proto; M7 assumes the cursor is visible.

### Terminal renderer (decision: custom grid, no ANSI parsing)

- Web clients render directly from `ScreenRow`/`ScreenCell` data.
- `Subscribe` streams `ScreenUpdate` (structured grid) and can optionally include
  raw PTY bytes for logging/custom rendering; web clients should use `ScreenUpdate`.
- The web server forwards `SubscribeEvent` frames as-is over WebSocket.
- Renderer state is a `rows x cols` grid plus cursor state; `ScreenUpdate`
  frames advance it from current state to desired state.
- Keyframes replace the full grid; deltas replace only listed rows (see
  Streaming semantics).
- M7 emits keyframes only; delta emission is a post-M7 optimization.

### Rendering considerations

- Core rendering is a monospace grid, but correctness also needs cursor,
  wide-char handling, and selection/copy behavior.
- Grid rendering: monospace cells with per-cell fg/bg and attribute bitmask;
- use `white-space: pre` and fixed tab size; measure cell metrics after fonts
  load to avoid layout shifts.
- Emoji/graphemes: render `char` as an atomic codepoint string; do not split or
  normalize it on the client. Multi-codepoint clusters are not preserved yet.
- Ligatures: coalesce consecutive cells with identical style into text runs and
  enable programming ligatures (`font-variant-ligatures: contextual`,
  `font-feature-settings: "liga" 1, "calt" 1`). If the chosen font breaks
  monospaced advances, disable ligatures to preserve grid alignment.
- Attributes: map bold/italic/underline/strikethrough/overline to CSS; implement
  faint via reduced opacity, inverse by swapping fg/bg, invisible by rendering
  fg as bg, and ignore blink for M7.
- Cursor: use `cursor_x`/`cursor_y` and render a block cursor with inverted
  colors; cursor-only updates are legal (no row diffs). Cursor visibility is
  assumed true in M7.
- Wide characters: use `wcwidth` on `char` to detect width 2. If width 2, render
  the codepoint in the head cell and hide the next cell only when it is a space
  with matching style (heuristic until wide metadata is exposed in the proto).
- Selection/copy: implement client-side range selection across the grid and
  synthesize text for clipboard. Paste uses a hidden textarea and `SendText`.
- Scrollback: not in `GetScreenResponse`. M7 shows viewport only; add a
  scrollback API later (e.g. dump + paging or new RPC).

### React component responsibilities

- `TerminalGrid` holds the current grid, cursor, and size (`cols`/`rows`).
- `TerminalRow` coalesces cells into styled runs and renders a text layer to
  allow ligatures and grapheme clusters to shape correctly.
- `TerminalCell` (optional) renders background/selection in a separate grid layer.
- Cursor overlay is a positioned element layered above the grid.

### gRPC-Web or WebSocket bridge design

Recommended: server-side bridge in Go, not gRPC-Web.

- gRPC-Web adds an extra proxy layer and is awkward with Unix sockets.
- A Go HTTP server can hold gRPC streams and expose a simple WS protocol.
- SSE is viable for read-only streaming but WS is required for input.

Bridge behavior:
- WS endpoint: `GET /api/ws`.
- Sessions WS endpoint: `GET /api/ws/sessions`.
- Frames are binary protobuf `google.protobuf.Any` messages.
- First client frame must be `SubscribeRequest` (name can use `coordinator:session`
  when multiple coordinators are configured). The server resolves the target or
  returns a `google.rpc.Status` error on ambiguity.
- Client input frames use `ResizeRequest`, `SendTextRequest`, `SendKeyRequest`,
  or `SendBytesRequest` wrapped in `Any`.
- Server frames are `SubscribeEvent` wrapped in `Any` (`ScreenUpdate` keyframes/deltas,
  optional `raw_output`, + `SessionExited`). `google.rpc.Status` is sent on
  protocol/resolve errors, then the socket closes.

### Streaming semantics (Subscribe + WebSocket)

- gRPC Subscribe and WebSocket bridge share identical streaming semantics and message fields.
- CURRENT STATE: the client's rendered grid after applying the last `ScreenUpdate`
  it processed (frame_id N).
- DESIRED STATE: the server's latest authoritative grid (frame_id M).
- `ScreenUpdate` advances current to desired; `is_keyframe` carries a full
  snapshot (`screen` set, `delta` unset), deltas carry absolute size/cursor and
  replace only listed rows (full row replacements; unlisted rows are unchanged).
- `frame_id` is monotonic and increments per authoritative screen state; clients
  may observe gaps and must not assume contiguous IDs. `base_frame_id` is
  meaningful only for deltas and refers to the frame the delta was computed from
  (set to 0 for keyframes).
- Server emits deltas only when `base_frame_id` matches the last frame it sent to
  that subscriber; otherwise it sends a keyframe to resync. Resizes should force
  a keyframe.
- Latest-only policy: under backpressure the server keeps only the newest pending
  `ScreenUpdate` per subscriber and drops older unsent frames; no client ACKs.
- When coalescing, the server must ensure any delta is based on the last frame
  it sent to that subscriber; otherwise it sends a keyframe.
- Server keeps a small ring buffer of recent keyframes (and deltas post-M7) for
  resync; sends periodic keyframes (currently every 5s) and on new subscriptions
  (resubscribe is the resync request).
- Compression: off by default for local/Tailscale; for remote links prefer
  transport-level compression (gRPC/HTTP; for WebSocket, consider permessage-deflate
  only after benchmarking). App-level zstd requires explicit framing/negotiation (future).

### WebSocket API (M7)

Frames are binary protobuf `google.protobuf.Any`. The embedded message type
identifies the payload.

Endpoint:
- `GET /api/ws` (alias: `/ws`).
- `GET /api/ws/sessions` (alias: `/ws/sessions`).

Compression: disabled server-side by default.

Message flow:
1. Client sends `SubscribeRequest` (Any).
2. Client may send `ResizeRequest` immediately after to set initial size.
3. Server streams `SubscribeEvent` (Any) until `SessionExited`.
4. On error, server sends `google.rpc.Status` (Any) and closes the socket.

Session list flow (sessions WS):
1. Client sends `SubscribeSessionsRequest` (Any).
2. Server streams `SessionsSnapshot` (Any) on every session list update.
3. On error, server sends `google.rpc.Status` (Any) and closes the socket.

Client -> server (Any-wrapped protobuf):
- `vtr.SubscribeRequest { name: "project-a:codex", include_screen_updates: true }`
- `vtr.ResizeRequest { cols: 120, rows: 40 }`
- `vtr.SendTextRequest { text: "ls -la\n" }`
- `vtr.SendKeyRequest { key: "ctrl+c" }`

Server -> client (Any-wrapped protobuf):
- `vtr.SubscribeEvent { screen_update: { frame_id: 42, base_frame_id: 0, is_keyframe: true, screen: GetScreenResponse{...} } }`
- `vtr.SubscribeEvent { raw_output: "ls -la\n" }`
- `vtr.SubscribeEvent { session_idle: { name: "project-a:codex", idle: true } }`
- `vtr.SubscribeEvent { session_exited: { exit_code: 0 } }`
- `google.rpc.Status { code: 5, message: "unknown session" }`

Notes:
- `SubscribeRequest.name` is required; it may include `coordinator:session` to
  disambiguate when multiple coordinators are configured.
- `ResizeRequest` is optional and can be sent after the initial `SubscribeRequest`.
- `SubscribeEvent` carries `ScreenUpdate` frames with `frame_id`, `base_frame_id`,
  and `is_keyframe`. Keyframes include `screen`; deltas use `delta` row updates.
- `frame_id` is monotonic; clients may observe gaps and must not assume contiguous IDs.
- Deltas carry absolute `cols`/`rows`/cursor and `row_deltas` full-row replacements;
  unlisted rows are unchanged and `row_deltas` may be empty.
- Clients apply deltas only when `base_frame_id` matches their current state;
  otherwise they drop deltas and wait for the next keyframe (or resubscribe to
  force one).
- Indices are 0-based.

Compression:
- Default to no compression for local/Tailscale to minimize CPU and latency.
- For remote links, prefer transport-level compression (gRPC/HTTP); for WebSocket,
  consider permessage-deflate only after benchmarking.
- Avoid double compression; app-level zstd requires explicit framing/negotiation (future).

### Tailscale Serve integration

Tailnet-only flow (no Funnel in M7):

```bash
vtr hub --addr 127.0.0.1:4620 --socket /var/run/vtrpc.sock
tailscale serve https / http://127.0.0.1:4620
```
Exact flags can vary; verify with `tailscale serve --help`.

### Authentication (M7 simplified)

Web UI is unauthenticated by default. gRPC over TCP requires TLS + token when
binding to non-loopback addresses; local Unix sockets rely on filesystem permissions.

### Notes from modern web terminal patterns

- ttyd/wetty stacks use WebSockets with raw PTY output; vtr uses structured
  screen updates instead of ANSI parsing.
- Vibe tunnel patterns appear to prefer tailnet access plus optional share
  links; we are not implementing share links in M7.

### M7 decisions (final)

- Delta format: `ScreenUpdate` supports keyframes and row-level `row_deltas`; M7 emits keyframes only.
- Streaming semantics: latest-only policy (drop stale frames per subscriber), no client ACKs;
  keyframes periodic (currently every 5s), on resubscribe, and when base frames are missing.
- Cursor: block cursor with no blink; visibility is assumed true in M7.
- Wide/combining: client-side `wcwidth` heuristic (see Rendering considerations);
  accept limitations until wide metadata is exposed.
- Scrollback: out of scope for M7 (viewport only).
- Encoding: protobuf `Any` frames; compression off by default. Use transport-level
  compression for remote links; permessage-deflate only after benchmarking.

### Post-M7 considerations

- Add cursor visibility/style fields to the proto or WS schema.
- Expose wide/continuation metadata and grapheme cluster text in `ScreenCell`.
- Add scrollback RPC + UI paging.
- Implement row-level delta emission and tune keyframe cadence and ring buffer size.
- Consider mosh-style state sync/diff ideas for low-bandwidth or lossy links; see `docs/mosh-notes.md`.

### Config Management

`vtr setup` creates a local hub config and auth material. Advanced hub/spoke
configuration is done by editing `vtrpc.toml` directly.

### Session Addressing

When the hub aggregates multiple spokes:

1. **Unambiguous**: Session name unique across all coordinators → use name directly
2. **Ambiguous**: Session name exists on multiple coordinators → error with suggestion
3. **Explicit**: Use `--hub` flag or `spoke:session` syntax

```bash
# These are equivalent
vtr agent screen codex --hub /var/run/project-a.sock
vtr agent screen project-a:codex
```

Coordinator names derived from the spoke name (or socket filename without `.sock`).
If two spokes share the same name, use `--hub` to disambiguate.

### Output Formats

`vtr agent` outputs JSON for most commands, but `vtr agent screen` defaults to plain text for agent-friendly output.
Use `--json` to get structured screen data, or `--ansi` to include ANSI color/attribute codes in the text stream.

Example:
```json
{
  "sessions": [
    {
      "coordinator": "project-a",
      "name": "codex",
      "status": "running",
      "cols": 120,
      "rows": 40,
      "created_at": "2026-01-18T02:00:00Z"
    }
  ]
}
```

## gRPC API

Transport: Unix domain socket (local) or TCP (hub/spoke)
Auth: POSIX filesystem permissions for Unix sockets; TLS + token for non-loopback TCP

### Service Definition

**Status (post-M6):** Spawn, List, SubscribeSessions, Info, Kill, Close, Remove, Rename, GetScreen, Grep, SendText, SendKey, SendBytes, Resize, WaitFor, WaitForIdle, and Subscribe are implemented. SendMouse and mouse mode events are planned for M8. DumpAsciinema is defined but not implemented yet.

```protobuf
syntax = "proto3";
package vtr;

service VTR {
  // Session management
  rpc Spawn(SpawnRequest) returns (SpawnResponse);
  rpc List(ListRequest) returns (ListResponse);
  rpc SubscribeSessions(SubscribeSessionsRequest) returns (stream SubscribeSessionsEvent);
  rpc Info(InfoRequest) returns (InfoResponse);
  rpc Kill(KillRequest) returns (KillResponse);
  rpc Close(CloseRequest) returns (CloseResponse);
  rpc Remove(RemoveRequest) returns (RemoveResponse);
  rpc Rename(RenameRequest) returns (RenameResponse);
  
  // Screen operations
  rpc GetScreen(GetScreenRequest) returns (GetScreenResponse);
  rpc Grep(GrepRequest) returns (GrepResponse);
  
  // Input operations
  rpc SendText(SendTextRequest) returns (SendTextResponse);
  rpc SendKey(SendKeyRequest) returns (SendKeyResponse);
  rpc SendBytes(SendBytesRequest) returns (SendBytesResponse);
  // SendMouse planned for M8.
  rpc Resize(ResizeRequest) returns (ResizeResponse);
  
  // Blocking operations
  rpc WaitFor(WaitForRequest) returns (WaitForResponse);
  rpc WaitForIdle(WaitForIdleRequest) returns (WaitForIdleResponse);
  
  // Streaming (for attach/web UI)
  rpc Subscribe(SubscribeRequest) returns (stream SubscribeEvent);
  
  // Recording (P2)
  rpc DumpAsciinema(DumpAsciinemaRequest) returns (DumpAsciinemaResponse);
}
```

### Key Messages

```protobuf
message Session {
  string name = 1;
  SessionStatus status = 2;
  int32 cols = 3;
  int32 rows = 4;
  int32 exit_code = 5;  // only valid when status = EXITED
  google.protobuf.Timestamp created_at = 6;
  google.protobuf.Timestamp exited_at = 7;  // only valid when status = EXITED
  bool idle = 8;
}

enum SessionStatus {
  SESSION_STATUS_UNSPECIFIED = 0;
  SESSION_STATUS_RUNNING = 1;
  SESSION_STATUS_CLOSING = 2;
  SESSION_STATUS_EXITED = 3;
}

message SpawnRequest {
  string name = 1;
  string command = 2;  // default: server default shell (config or $SHELL)
  string working_dir = 3;  // default: $HOME
  map<string, string> env = 4;  // merged with default env
  int32 cols = 5;  // default: 80
  int32 rows = 6;  // default: 24
}

message SubscribeSessionsRequest {
  bool exclude_exited = 1;
}

message SubscribeSessionsEvent {
  repeated Session sessions = 1;
}

message GetScreenResponse {
  string name = 1;
  int32 cols = 2;
  int32 rows = 3;
  int32 cursor_x = 4;
  int32 cursor_y = 5;
  repeated ScreenRow screen_rows = 6;
}

message ScreenRow {
  repeated ScreenCell cells = 1;
}

message ScreenCell {
  string char = 1;
  int32 fg_color = 2;  // RGB packed
  int32 bg_color = 3;  // RGB packed
  uint32 attributes = 4;  // bold=0x01, italic=0x02, underline=0x04, etc.
}

message GrepRequest {
  string name = 1;
  string pattern = 2;  // regex (RE2)
  int32 context_before = 3;
  int32 context_after = 4;
  int32 max_matches = 5;  // default: 100
}

message GrepResponse {
  repeated GrepMatch matches = 1;
}

message GrepMatch {
  int32 line_number = 1;  // 0-based, relative to scrollback start
  string line = 2;
  repeated string context_before = 3;
  repeated string context_after = 4;
}

message WaitForRequest {
  string name = 1;
  string pattern = 2;  // regex (RE2), matches output after request starts
  google.protobuf.Duration timeout = 3;  // overall deadline
}

message WaitForResponse {
  bool matched = 1;
  string matched_line = 2;
  bool timed_out = 3;
}

message WaitForIdleRequest {
  string name = 1;
  google.protobuf.Duration idle_duration = 2;  // default: 5s of silence
  google.protobuf.Duration timeout = 3;  // overall deadline
}

message WaitForIdleResponse {
  bool idle = 1;
  bool timed_out = 2;
}

message SubscribeRequest {
  string name = 1;
  bool include_screen_updates = 2;
  bool include_raw_output = 3;
}

message ScreenUpdate {
  uint64 frame_id = 1;
  uint64 base_frame_id = 2;  // meaningful only for deltas; 0 for keyframes
  bool is_keyframe = 3;
  GetScreenResponse screen = 4;  // full snapshot when is_keyframe
  ScreenDelta delta = 5;  // row-level deltas when !is_keyframe
}

message ScreenDelta {
  int32 cols = 1;
  int32 rows = 2;
  int32 cursor_x = 3;
  int32 cursor_y = 4;
  repeated RowDelta row_deltas = 5;  // full-row replacements
}

message RowDelta {
  int32 row = 1;  // 0-based row index
  ScreenRow row_data = 2;  // full row after update
}

message SessionExited {
  int32 exit_code = 1;
}

message SessionIdle {
  string name = 1;
  bool idle = 2;
}

message SubscribeEvent {
  oneof event {
    ScreenUpdate screen_update = 1;
    bytes raw_output = 2;
    SessionExited session_exited = 3;
    SessionIdle session_idle = 4;
  }
}
```

### Subscribe Stream (M6)

- Server-side stream of `SubscribeEvent` for attach and web UI clients.
- If `include_screen_updates` is true, the server sends an initial keyframe
  `ScreenUpdate` snapshot so clients start from a known state.
- `include_screen_updates` controls subsequent `ScreenUpdate` frames (keyframes or deltas); updates are emitted on new
  output and coalesced to 30fps max. M7 sends keyframes only; deltas are
  post-M7.
- `include_raw_output` emits raw PTY bytes for logging or custom rendering; raw output starts at
  subscription time and is buffered up to 1MB (older bytes are dropped on overflow).
- At least one of `include_screen_updates` or `include_raw_output` must be true; otherwise the
  server returns `INVALID_ARGUMENT`.
- If `include_screen_updates` is false, no `ScreenUpdate` frames are sent; clients
  needing a snapshot should call `GetScreen` separately.
- If `include_screen_updates` is true, the server sends a final keyframe `ScreenUpdate` before
  `session_exited`; `session_exited` is always the last event before stream close.
- `session_idle` emits whenever the inactivity threshold (default 5s) is crossed based on input/output activity.
- M8: `mouse_mode_changed` will be emitted on Subscribe start and whenever the app enables or disables
  mouse tracking; clients gate mouse input on this event.
- `session_exited` is sent once with the exit code; the server closes the stream afterward.
- When clients disconnect or cancel, the server stops streaming and releases resources.
- Slow clients may skip intermediate `ScreenUpdate` frames; latest-only policy applies (see Backpressure).
- Subscribe is receive-only; input uses `SendText`, `SendKey`, `SendBytes` (SendMouse planned in M8).

### Mouse Support (M8) Design

Key constraint: clients do not see ANSI; they only see gRPC. Mouse mode state must be owned by the coordinator.

#### Planned proto additions (M8, not in current proto)
```protobuf
enum MouseEventMode {
  MOUSE_EVENT_MODE_UNSPECIFIED = 0;
  MOUSE_EVENT_MODE_NONE = 1;
  MOUSE_EVENT_MODE_X10 = 2;
  MOUSE_EVENT_MODE_NORMAL = 3;
  MOUSE_EVENT_MODE_BUTTON = 4;
  MOUSE_EVENT_MODE_ANY = 5;
}

enum MouseFormat {
  MOUSE_FORMAT_UNSPECIFIED = 0;
  MOUSE_FORMAT_X10 = 1;
  MOUSE_FORMAT_UTF8 = 2;
  MOUSE_FORMAT_SGR = 3;
  MOUSE_FORMAT_URXVT = 4;
  MOUSE_FORMAT_SGR_PIXELS = 5;
}

enum MouseButton {
  MOUSE_BUTTON_UNSPECIFIED = 0;
  MOUSE_BUTTON_NONE = 1;
  MOUSE_BUTTON_LEFT = 2;
  MOUSE_BUTTON_MIDDLE = 3;
  MOUSE_BUTTON_RIGHT = 4;
  MOUSE_BUTTON_WHEEL_UP = 5;
  MOUSE_BUTTON_WHEEL_DOWN = 6;
  MOUSE_BUTTON_WHEEL_LEFT = 7;
  MOUSE_BUTTON_WHEEL_RIGHT = 8;
  MOUSE_BUTTON_BACK = 9;
  MOUSE_BUTTON_FORWARD = 10;
}

enum MouseAction {
  MOUSE_ACTION_UNSPECIFIED = 0;
  MOUSE_ACTION_PRESS = 1;
  MOUSE_ACTION_RELEASE = 2;
  MOUSE_ACTION_MOTION = 3;
}

message SendMouseRequest {
  string name = 1;
  int32 x = 2;  // 0-based cell coordinate
  int32 y = 3;  // 0-based cell coordinate
  MouseButton button = 4;
  MouseAction action = 5;
  bool shift = 6;
  bool alt = 7;
  bool ctrl = 8;
}

message SendMouseResponse {}

message MouseModeChanged {
  bool enabled = 1;
  MouseEventMode event_mode = 2;
  MouseFormat format = 3;
}
```

#### Ghostty mouse mode state
- Ghostty tracks the active mouse event mode and format in `terminal.flags`:
  - `mouse_event` (none/x10/normal/button/any) and `mouse_format` (x10/utf8/sgr/urxvt/sgr_pixels).
- These flags are updated by the VT stream when it processes DECSET/DECRST
  for `?9`, `?1000`, `?1002`, `?1003`, `?1005`, `?1006`, `?1015`, `?1016`
  (see `ghostty/src/termio/stream_handler.zig`).
- **Approved:** Add `vtr_ghostty_terminal_mouse_mode()` to shim (C header `vtr_ghostty_vt.h` + Zig impl in `vtr_ghostty_vt_shim.zig` + Go wrapper) to read current mode from VT.

#### Broadcasting mouse mode changes
- Coordinator caches `MouseEventMode` + `MouseFormat` per session.
- After each VT feed, query the current mode; if it changed, emit
  `MouseModeChanged` to all `Subscribe` streams.
- On Subscribe start, send the current mode before the first `ScreenUpdate`
  so clients can immediately enable/disable mouse capture.

#### Client -> server mouse input (SendMouse)
- Clients send structured mouse events via `SendMouse` (no escape sequences).
- Server validates coordinates (0-based cell coords, same as `GetScreenResponse`)
  and checks `event_mode != NONE` before encoding; if disabled, return
  `FAILED_PRECONDITION` (or drop) unless overridden by server config.
- Server encodes xterm mouse sequences based on current `event_mode` + `format`
  and writes to the PTY.

#### Encoding rules (server-side)
- Event mode gates reporting:
  - `x10`: press only, left/middle/right only.
  - `normal`: press/release only (no motion).
  - `button`: motion only with a button held.
  - `any`: motion always.
- Formats:
  - `sgr`: `ESC[<b;x;yM` for press/motion, `ESC[<b;x;ym` for release.
  - `x10`: `ESC[M` with 32+encoded button/x/y (coords limited to 223).
  - `utf8`: `ESC[M` with UTF-8 encoded x/y.
  - `urxvt`: `ESC[b;x;yM` with decimal coords.
  - `sgr_pixels`: only valid with pixel coords; if clients only have cell coords,
    fall back to `sgr`.
- Modifiers: shift +4, alt +8, ctrl +16; motion adds +32; wheel uses 64/65/66/67.
- Reference implementation for encoding logic: `ghostty/src/Surface.zig` (`mouseReport`).

#### End-to-end flow
1. PTY app emits DECSET/DECRST -> Ghostty updates mouse flags.
2. Coordinator detects change -> `Subscribe` emits `MouseModeChanged`.
3. Client enables mouse capture; user clicks/scrolls.
4. Client calls `SendMouse` -> server encodes -> PTY receives escape sequence.
5. App disables mouse -> Ghostty flags reset -> `MouseModeChanged` -> client stops sending.

## VT Engine

Uses libghostty-vt (Ghostty's Zig core) via a small cgo shim (go-ghostty).
The upstream C API is incomplete and unstable, so the shim wraps the Zig
module directly for terminal state and snapshot access.

The wrapper feeds PTY output into Ghostty's VT stream and exposes snapshots for
viewport cells, cursor state, and scrollback dumps.

**Responsibilities:**
- Parse ANSI escape sequences from PTY output
- Maintain screen buffer (current viewport)
- Maintain scrollback buffer (configurable limit, default 10K lines)
- Track cursor position
- Track cell attributes (colors, bold, italic, etc.)

**Not responsible for:**
- Rendering (that's the client's job)
- Recording (P2 feature, separate concern)

### Screen State

```
┌─────────────────────────────────────────┐
│           Scrollback Buffer             │
│         (up to 10,000 lines)            │
│                                         │
├─────────────────────────────────────────┤
│           Current Viewport              │  ← GetScreen returns this
│            (cols × rows)                │
│                                         │
│               █ (cursor)                │
└─────────────────────────────────────────┘
```

### Grep Indexing

Scrollback is line-indexed for efficient grep:
- Line 0 = oldest line in scrollback
- Line N = most recent line
- Pattern matching via Go regexp (RE2; no backreferences/lookaround)
- Returns line numbers relative to scrollback start
- If scrollback is unavailable, line numbers are relative to the fallback screen/viewport dump

## Backpressure

### Agent Clients (poll-based)

Agents use `GetScreen()`, `WaitFor()`, `WaitForIdle()` — natural backpressure via request/response. No buffering concerns.

### Streaming Clients (Subscribe) (M6)

For attach and web UI:
- Screen updates are output-driven and throttled to 30fps max.
- Latest-only policy: per subscriber, keep only the newest pending `ScreenUpdate` under
  backpressure; no client ACKs.
- Server keeps a small ring buffer of recent keyframes (deltas post-M7) for
  resync; falls back to keyframes when base frames are missing.
- Keyframes are sent periodically and on new subscriptions/resubscribe.
- Raw output is buffered up to 1MB for subscribers that request it.

### PTY Output Floods

When PTY produces output faster than VT engine processes:
- VT engine processes synchronously (no internal buffering)
- PTY's kernel buffer provides backpressure
- If kernel buffer fills, PTY write() blocks
- This is acceptable — matches native terminal behavior

## Error Handling

### Session Errors

| Error | gRPC Code | When |
|-------|-----------|------|
| `SESSION_NOT_FOUND` | `NOT_FOUND` | Session name doesn't exist |
| `SESSION_ALREADY_EXISTS` | `ALREADY_EXISTS` | Spawn with existing name |
| `SESSION_NOT_RUNNING` | `FAILED_PRECONDITION` | Send input to exited session |

### Timeout Handling

`WaitFor`/`WaitForIdle` return `timed_out = true` when the request timeout elapses. `WaitFor` also returns `timed_out = true` if the session exits before a match. If the gRPC deadline triggers first, the RPC is canceled and no response body is returned.

### System Errors

| Error | gRPC Code | When |
|-------|-----------|------|
| `SPAWN_FAILED` | `INTERNAL` | PTY creation failed |
| `INTERNAL_ERROR` | `INTERNAL` | Unexpected server error |

## Security

### Socket Permissions

Unix socket permissions control access:
```bash
# Restrict to owner
chmod 600 /var/run/vtrpc.sock

# Allow group
chmod 660 /var/run/vtrpc.sock
```

### Container Isolation

- Each container has its own coordinator and socket
- Host accesses container sockets via volume mounts
- No cross-container federation; each coordinator only serves its own container's sessions

### Input Sanitization

- Text input: UTF-8 validated
- Raw bytes: CLI accepts hex and decodes to bytes; server enforces length limit (1MB max)
- Patterns: regex validated (RE2); WaitFor/WaitForIdle honor timeouts

## Memory Safety (M9)

### CGO ownership and lifetimes (go-ghostty)

- `vtr_ghostty_terminal_new` allocates a terminal handle; Go owns it and must call `vtr_ghostty_terminal_free` once (`Terminal.Close`).
- `vtr_ghostty_terminal_feed` does not retain the `data` pointer; bytes are read during the call only.
- `vtr_ghostty_terminal_snapshot` allocates `rows*cols` cells via the allocator argument (or default when NULL); callers must copy the data and then call `vtr_ghostty_snapshot_free` with the same allocator.
- `vtr_ghostty_terminal_dump` allocates `vtr_ghostty_bytes_t` via the allocator argument (or default when NULL); callers must copy the bytes and then call `vtr_ghostty_bytes_free`.
- The Go wrapper copies C memory into Go slices/strings before freeing; no Go pointers are stored in C; callers must serialize access (Terminal is not thread-safe).

### Tooling and rationale

- ASan/LSan: catches native heap errors (buffer overflows, use-after-free, leaks) in the Zig shim + Ghostty VT code.
- `cgocheck2`: detects Go pointer rule violations at the CGO boundary; enable via `GODEBUG=cgocheck=2` with `GOEXPERIMENT=cgocheck2` when required by the Go version.
- `go test -race`: validates Go-side concurrency around VT access; scope to CGO-boundary packages.
- Valgrind is intentionally skipped due to runtime costs; sanitizer runs should stay under a reasonable local runtime budget.

### Planned execution (M9)

- Zig ASan/LSan support is not exposed in Zig 0.15.2 (no `-fsanitize=address` flag), so the shim uses the LLVM IR pipeline for ASan until Zig adds native sanitizer flags.
- Build the shim with Zig 0.15.2 (per shim build.zig.zon) and frame pointers enabled (`-Dframe_pointers=true`), plus LLVM IR emission (`-Demit_llvm_ir=true`).
- Compile the emitted IR with clang `-fsanitize=address` and archive it into `go-ghostty/shim/zig-out-asan/` (`mise run shim-llvm-asan`).
- Run `go test -asan -tags=asan` only for CGO-boundary packages (go-ghostty + server VT integration tests).
- Use suppression files in `go-ghostty/shim/sanitizers/` via `ASAN_OPTIONS`/`LSAN_OPTIONS` if third-party noise appears.

## Build System (M10)

M10 standardizes the build system on mise for tool versions and task automation.

### Goals

- Tool version management via `mise.toml` (replaces asdf, nvm, etc.); cached installs are built in.
- Tasks defined under `[tasks]` with dependencies (`depends`) and optional `env` vars.
- `mise run <task>` executes tasks; use a single command for the full pipeline: `mise run all`.
- Onboarding: `mise trust`, `mise install`, then `mise run all`.
- CGO builds use explicit toolchain env vars (`CGO_ENABLED`, `CC`, `CXX`) for consistent clang usage.
- Sanitizer and race targets are exposed as mise tasks (no Makefile).

### mise.toml (project)

```toml
[tools]
go = "1.25.3"
zig = "0.15.2"
"vfox:clang" = "19.1.7"

[tasks.shim]
run = "cd go-ghostty/shim && zig build -Dghostty=${GHOSTTY_ROOT:-../ghostty}"

[tasks.shim-sanitize]
run = "cd go-ghostty/shim && zig build -Dghostty=${GHOSTTY_ROOT:-../ghostty} -Doptimize=Debug -Dframe_pointers=true && mkdir -p zig-out && touch zig-out/.shim-sanitize.stamp"

[tasks.shim-llvm-ir]
run = "cd go-ghostty/shim && zig build -Dghostty=${GHOSTTY_ROOT:-../ghostty} -Doptimize=Debug -Dframe_pointers=true -Demit_llvm_ir=true"

[tasks.shim-llvm-asan]
depends = ["shim-llvm-ir"]
run = "mkdir -p go-ghostty/shim/zig-out-asan/lib go-ghostty/shim/zig-out-asan/include && clang -x ir -c -fsanitize=address -fno-omit-frame-pointer -fPIC -o go-ghostty/shim/zig-out-asan/lib/vtr-ghostty-vt-asan.o go-ghostty/shim/zig-out/llvm-ir/vtr-ghostty-vt.ll && ar rcs go-ghostty/shim/zig-out-asan/lib/libvtr-ghostty-vt.a go-ghostty/shim/zig-out-asan/lib/vtr-ghostty-vt-asan.o && cp go-ghostty/shim/zig-out/include/vtr_ghostty_vt.h go-ghostty/shim/zig-out-asan/include/"

[tasks.proto]
run = "protoc --go_out=. --go_opt=paths=source_relative --go-grpc_out=. --go-grpc_opt=paths=source_relative proto/vtr.proto"

[tasks.build]
depends = ["proto", "shim"]
run = "go build -o bin/vtr ./cmd/vtr"
env = { CGO_ENABLED = "1", CC = "clang", CXX = "clang++" }

[tasks.test]
depends = ["proto", "shim"]
run = "go test ./... && mkdir -p bin && touch bin/.mise-test.stamp"
env = { CGO_ENABLED = "1", CC = "clang", CXX = "clang++" }

[tasks.test-race-cgo]
depends = ["proto", "shim"]
run = "CGO_ENABLED=1 CC=clang CXX=clang++ go test -race ./go-ghostty/... ./server/... && mkdir -p bin && touch bin/.mise-test-race-cgo.stamp"

[tasks.test-sanitize-cgo]
depends = ["proto", "shim-llvm-asan"]
run = "GODEBUG=cgocheck=2 GOEXPERIMENT=${GOEXPERIMENT:-cgocheck2} ASAN_OPTIONS=detect_leaks=1:halt_on_error=1:suppressions=go-ghostty/shim/sanitizers/asan.supp LSAN_OPTIONS=suppressions=go-ghostty/shim/sanitizers/lsan.supp CGO_ENABLED=1 CC=clang CXX=clang++ go test -asan -tags=asan ./go-ghostty/... ./server/... && mkdir -p bin && touch bin/.mise-test-sanitize-cgo.stamp"

[tasks.all]
depends = ["build", "test"]

[tasks.clean]
run = "rm -rf bin/ && rm -f proto/*.pb.go"
```

## Implementation Plan

### Phase 1: Server Core (done in M3)

1. gRPC server over Unix socket
2. Session spawn/list/info/kill/rm
3. PTY management (spawn, I/O)
4. VT engine integration (libghostty-vt via go-ghostty shim)
5. GetScreen, SendText, SendKey, SendBytes, Resize
6. Tests for core operations

### Phase 2: Advanced Operations (done in M5)

1. Grep with context (done)
2. WaitFor (pattern matching) (done)
3. WaitForIdle (debounced idle detection) (done)
4. Subscribe stream (for attach) (done in M6)

### Phase 3: CLI Client (core done; M5 extensions done)

1. Core commands implemented (`ls`, `spawn`, `info`, `screen`, `send`, `key`, `raw`, `resize`, `kill`, `rm`)
2. Human and JSON output formats
3. Config management (`config resolve` done; `config ls/add/rm` planned post-M5)
4. Multi-coordinator support (done)
5. Session addressing resolution (done)

### Phase 4: Interactive Attach (done in M6)

1. Bubbletea TUI
2. Raw mode passthrough
3. Leader key bindings
4. Window decoration

### Phase 4b: TUI Streaming Updates

1. Update streaming proto to match `docs/streaming.md` (frame_id/base_frame_id/is_keyframe, ScreenDelta/RowDelta) and regenerate Go stubs.
2. Subscribe: send initial keyframe only when `include_screen_updates` is true; include frame IDs; send final keyframe before `session_exited`.
3. Implement latest-only coalescing for screen updates (drop stale frames; keyframe on resync, resize, and periodic cadence).
4. TUI attach: track current `frame_id`, apply keyframes, drop mismatched deltas, and resubscribe on desync.
5. Tests: frame ID monotonicity, latest-only behavior, resize keyframe, final-frame ordering, and TUI keyframe handling.

### Phase 5: Web UI (M7)

1. React + shadcn/ui frontend with Tokyo Night palette and JetBrains Mono
2. Bun + Vite dev tooling and HMR workflow
3. Custom grid renderer using `ScreenUpdate` frames (no ANSI parsing; deltas optional)
4. WebSocket -> gRPC bridge in `vtr hub`
5. Multi-coordinator tree view from `~/.config/vtrpc/vtrpc.toml`
6. Tailnet-only Tailscale Serve integration
7. E2E tests covering ANSI -> coordinator -> web -> render pipeline

### Phase 6: Mouse Support (M8)

1. Expose Ghostty mouse mode via go-ghostty shim
2. Track mouse mode changes per session and broadcast on Subscribe
3. Add SendMouse RPC + server-side encoding
4. Update attach/web clients to use SendMouse and gate on MouseModeChanged
5. Tests for mode transitions and encoding correctness

### Phase 7: Recording (P2)

1. Asciinema format recording
2. DumpAsciinema RPC
3. Playback support in web UI

## Project Structure (post-M6)

```
vtrpc/
├── .beads/              # beads issue tracker data
├── AGENTS.md
├── cmd/
│   └── vtr/
│       ├── attach.go
│       ├── client.go
│       ├── output.go
│       ├── config.go
│       ├── config_cmd.go
│       ├── main.go
│       ├── resolve.go
│       ├── root.go
│       ├── serve.go
│       └── version.go
├── docs/
│   ├── spec.md
│   └── agent-meta.md
├── go-ghostty/
│   ├── ghostty.go
│   ├── ghostty_test.go
│   └── shim/            # Zig shim + build artifacts
├── proto/
│   └── vtr.proto
├── server/
│   ├── coordinator.go
│   ├── grep.go
│   ├── grpc.go
│   ├── input.go
│   ├── output.go
│   ├── pty.go
│   ├── vt.go
│   └── wait.go
├── web/                 # Web UI (M7 planned)
├── go.mod
└── go.sum
```

## Dependencies

| Dependency | Purpose |
|------------|---------|
| google.golang.org/grpc | gRPC server/client |
| github.com/creack/pty | PTY management |
| libghostty-vt (Zig) | Terminal emulation core accessed via go-ghostty shim (custom C ABI) |
| github.com/spf13/cobra | CLI framework |
| github.com/BurntSushi/toml | Client config parsing |
| github.com/charmbracelet/bubbletea | TUI framework |
| github.com/charmbracelet/bubbles | TUI components (list, text input) |
| github.com/charmbracelet/lipgloss | TUI styling |

## Testing Strategy (post-M6)

### Current coverage

- go-ghostty snapshot/dump coverage (attrs, colors, cursor movement, wide chars, wrapping)
- Server coordinator tests for spawn/echo, exit code, kill/remove, screen snapshot, default working dir
- gRPC integration tests for spawn/send/screen, list/info/resize, kill/remove, error mapping, grep, wait, idle
- gRPC Subscribe tests for initial snapshot, raw output, and exit ordering
- CLI end-to-end tests for spawn/send/key/screen plus grep/wait/idle
- CLI config resolve test for default output format handling

### Gaps / planned

- Multi-coordinator resolution coverage (ambiguity handling across coordinators)
- Subscribe stream backpressure/coalescing behavior under slow clients
- Mouse mode tracking + SendMouse encoding coverage
- Attach TUI + web UI + recording

---

*Last updated: 2026-01-18*

#### SendMouse error handling

- `SendMouse` returns `FAILED_PRECONDITION` error when `MouseEventMode` is `NONE`.
- No override flag in M8; rogue mouse events indicate client state bugs.
- Server validates event gating before encoding (e.g., motion only valid for `BUTTON`/`ANY` modes).
