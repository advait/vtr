# vtr Specification

> Headless terminal multiplexer: container PTYs stream bytes to a central VT engine inside the coordinator. gRPC exposes screen state + I/O to heterogeneous clients (agent CLI, web UI). Decouples PTY lifecycle from rendering.

## Overview

vtr is a terminal multiplexer designed for the agent era. Each container runs a coordinator that manages multiple named PTY sessions. Clients connect via gRPC over Unix sockets to query screen state, search scrollback, send input, and wait for output patterns.

**Core insight**: Agents don't need 60fps terminal streaming. They need consistent screen state on demand, pattern matching on output, and reliable input delivery.

## Implementation Status (post-M6)

- Implemented gRPC methods: Spawn, List, Info, Kill, Remove, GetScreen, Grep, SendText, SendKey, SendBytes, Resize, WaitFor, WaitForIdle, Subscribe.
- DumpAsciinema remains defined in `proto/vtr.proto` but is not implemented yet (gRPC returns UNIMPLEMENTED).
- CLI supports core client commands plus `grep`, `wait`, `idle`, `attach`, and `config resolve` (alongside `serve` and `version`).
- Attach TUI uses Subscribe streaming updates with leader key bindings for session actions.
- Mouse support is not implemented yet; M8 adds mouse mode tracking, Subscribe events, and SendMouse RPC.
- Multi-coordinator resolution supports `--socket` and `coordinator:session` with auto-disambiguation via per-coordinator lookup.
- Grep uses scrollback dumps when available; falls back to screen/viewport dumps if history is unavailable.
- WaitFor scans output emitted after the request starts using a rolling 1MB buffer.
- M7 (partial): `vtr web` serves static assets + WS bridge using protobuf `Any` frames (SubscribeRequest/SubscribeEvent); REST JSON API and frontend assets are still pending.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Container A                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              vtr serve (coordinator)                 │   │
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
│              /var/run/vtr.sock (Unix socket)                │
└─────────────────────────┬───────────────────────────────────┘
                          │ (volume mounted to host)
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ vtr CLI │      │ vtr CLI │      │ Web UI  │
   │ (agent) │      │ (human) │      │         │
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
- **Exited**: PTY process terminated, scrollback readable, has exit code
- **Removed**: Session deleted from coordinator

**Key behaviors:**
- Sessions persist until explicitly removed via `rm`
- `rm` on a running session sends SIGTERM, waits 5s, sends SIGKILL, then removes
- Exit code preserved in Exited state

## Configuration

### Client Config (M5)

Location: `~/.config/vtr/config.toml`

```toml
# Coordinator socket discovery
[[coordinators]]
path = "/var/run/vtr/*.sock"  # glob pattern

[[coordinators]]
path = "/home/advait/.vtr/project-alpha.sock"  # explicit path

# Defaults
[defaults]
output_format = "human"  # or "json"
# wait_for_idle_timeout = "5s"  # planned (idle default override)
# grep_context_before = 3       # planned (grep default override)
# grep_context_after = 3        # planned (grep default override)
```

M5 uses `coordinators.path` (glob or explicit sockets) and `defaults.output_format`.
If no config file is present and `--socket` is not provided, the client defaults to `/var/run/vtr.sock`.

### Server Config (planned)

Passed via CLI flags. Optional config file for defaults (not yet implemented).

```toml
# ~/.config/vtr/server.toml (optional)
socket_path = "/var/run/vtr.sock"
scrollback_limit = 10000
default_shell = "/bin/bash"
```

## CLI Interface

Single `vtr` binary serves as both client and server.

### Server Commands

```bash
# Start coordinator (foreground)
vtr serve [--socket /path/to.sock] [--shell /bin/bash] [--cols 80] [--rows 24] \
  [--scrollback 10000] [--kill-timeout 5s]

# Daemon mode + config file support (planned)
# vtr serve --daemon [--socket /path/to.sock] [--pid-file /path/to.pid]
# vtr serve --stop [--pid-file /path/to.pid]
# vtr serve [--config /path/to/server.toml]
```

### Session Management

```bash
# List sessions across all configured coordinators
vtr ls [--json]

# Create new session
vtr spawn <name> [--socket /path/to.sock] [--cmd "command"] [--cwd /path] [--cols 80] [--rows 24]

# Remove session (kills if running)
vtr rm <name> [--socket /path/to.sock]

# Kill PTY process (session remains in Exited state)
vtr kill <name> [--signal TERM|KILL|INT] [--socket /path/to.sock]
```

### Screen Operations

```bash
# Get current screen state
vtr screen <name> [--json] [--socket /path/to.sock]

# Search scrollback (ripgrep-style output; RE2 regex)
vtr grep <name> <pattern> [-B lines] [-A lines] [-C lines] [--socket /path/to.sock] [--json]

# Get session info (dimensions, status, exit code)
vtr info <name> [--json] [--socket /path/to.sock]
```

### Input Operations

```bash
# Send text
vtr send <name> <text> [--socket /path/to.sock]

# Send special key
vtr key <name> <key> [--socket /path/to.sock]
# Keys: enter/return, tab, escape/esc, up, down, left, right, backspace, delete, home, end, pageup, pagedown
# Modifiers: ctrl+c, ctrl+d, ctrl+z, alt+x, meta+x, etc. (single characters are sent verbatim)

# Send raw bytes (hex-encoded)
vtr raw <name> <hex> [--socket /path/to.sock]

# Resize terminal
vtr resize <name> <cols> <rows> [--socket /path/to.sock]
```

### Blocking Operations

```bash
# Wait for pattern in output (future output only, RE2 regex)
vtr wait <name> <pattern> [--timeout 30s] [--socket /path/to.sock] [--json]

# Wait for idle (no output for idle duration)
vtr idle <name> [--idle 5s] [--timeout 30s] [--socket /path/to.sock] [--json]
```

### Interactive Mode

```bash
# Attach to session (interactive TUI)
vtr attach <name> [--socket /path/to.sock]
```

TUI features (M6):
- Bubbletea TUI renders the viewport inside a Lipgloss border with a 1-row status bar.
- Status bar shows session name, coordinator, local time, leader mode, and transient status messages.
- Attach uses the standard session addressing rules (`coordinator:session` or `--socket`).
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
  - `k` - Kill current session
  - `n` - Next session (current coordinator, name-sorted; includes exited)
  - `p` - Previous session (current coordinator, name-sorted; includes exited)
  - `w` - List sessions (current coordinator; fuzzy finder picker using Bubbletea filter component;
    selection switches sessions)
- `Esc` closes the session picker or create dialog.
- Window resize sends `Resize` with viewport dimensions (terminal size minus border and status bar).
- Session exit keeps the final screen visible, disables input, and marks the UI
  clearly exited (border color change + EXITED badge with exit code); press
  `q` or `enter` to close the TUI.

## Web UI (M7)

Goal: Mobile-first browser UI for live terminal sessions over Tailscale.

### Architecture overview

```
Browser (mobile/desktop)
  |  HTTPS (static assets) + WS (stream/input)
  v
Web UI server (Go HTTP)
  |  gRPC clients (one per coordinator)
  v
Coordinators (vtr serve)
```

The Web UI runs as a dedicated `vtr web` command. It serves static assets and
bridges `Subscribe` streaming + input over WebSocket using protobuf frames.
M7 does not include a REST/JSON API.

### Command and configuration

- `vtr web` reads `~/.config/vtr/config.toml` and resolves `coordinators.path`
  globs to build the coordinator tree.
- CLI overrides: `--socket /path` for a single coordinator or `--coordinator`
  (repeatable path/glob) to replace config discovery.
- `--listen` controls the HTTP bind address (default: `127.0.0.1:8080`).

### HTTP API (M7)

No HTTP JSON API in M7. Session lifecycle and input flow over the WebSocket
protobuf protocol; listing/spawn/kill will be added later via a WS RPC envelope
or a small REST layer if needed.

### Frontend stack (decision)

- Framework: React with shadcn/ui (Radix + Tailwind) components.
- Dev tooling: Bun + Vite for fast HMR and modern tooling.
- Typography: JetBrains Mono for UI + terminal, fallback to `ui-monospace`.
- Theme: Tokyo Night dark palette (see UI design spec).
- Layout: single-column mobile layout, bottom input bar, tap-to-focus, and a
  minimal action tray (Ctrl, Esc, Tab, arrows, PgUp/PgDn).
- Session navigation: coordinator tree view with expandable groups (see
  Session Tree View).

### UI design (Tokyo Night)

Design goals: minimalist, dark, high-contrast, and production-grade.

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
- App shell: sticky top bar with coordinator filter + status; background `--tn-panel`.
- Coordinator tree: `Accordion` + `ScrollArea`, group headers 44px tall.
- Session rows: 44px min height, full-width tap target, status `Badge`.
- Terminal panel: full-bleed dark panel with subtle border and inset shadow.
- Input bar: bottom-docked `Input` + `Button` row, 48px height.
- Action tray: row of ghost buttons (Ctrl, Esc, Tab, arrows), 40px touch targets.
- Status chip: `Badge` with running/exited colors (`--tn-green` / `--tn-red`).

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
- `Subscribe` streams `ScreenUpdate` (structured grid), not raw output bytes.
- The web server forwards `SubscribeEvent` frames as-is over WebSocket.
- Renderer state is a `rows x cols` grid plus cursor state; each `ScreenUpdate`
  replaces the grid.
- Row-level deltas are a post-M7 optimization.

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
- Frames are binary protobuf `google.protobuf.Any` messages.
- First client frame must be `SubscribeRequest` (name can use `coordinator:session`
  when multiple coordinators are configured). The server resolves the target or
  returns a `google.rpc.Status` error on ambiguity.
- Client input frames use `ResizeRequest`, `SendTextRequest`, `SendKeyRequest`,
  or `SendBytesRequest` wrapped in `Any`.
- Server frames are `SubscribeEvent` wrapped in `Any` (full `ScreenUpdate` +
  `SessionExited`). `google.rpc.Status` is sent on protocol/resolve errors, then
  the socket closes.

### WebSocket API (M7)

Frames are binary protobuf `google.protobuf.Any`. The embedded message type
identifies the payload.

Message flow:
1. Client sends `SubscribeRequest` (Any).
2. Client may send `ResizeRequest` immediately after to set initial size.
3. Server streams `SubscribeEvent` (Any) until `SessionExited`.
4. On error, server sends `google.rpc.Status` (Any) and closes the socket.

Client -> server (Any-wrapped protobuf):
- `vtr.SubscribeRequest { name: "project-a:codex", include_screen_updates: true }`
- `vtr.ResizeRequest { cols: 120, rows: 40 }`
- `vtr.SendTextRequest { text: "ls -la\n" }`
- `vtr.SendKeyRequest { key: "ctrl+c" }`

Server -> client (Any-wrapped protobuf):
- `vtr.SubscribeEvent { screen_update: { screen: GetScreenResponse{...} } }`
- `vtr.SubscribeEvent { session_exited: { exit_code: 0 } }`
- `google.rpc.Status { code: 5, message: "unknown session" }`

Notes:
- `SubscribeRequest.name` is required; it may include `coordinator:session` to
  disambiguate when multiple coordinators are configured.
- `ResizeRequest` is optional and can be sent after the initial `SubscribeRequest`.
- `SubscribeEvent` currently carries full screens; row-level deltas are
  deferred.
- Indices are 0-based.

Compression:
- Enable WebSocket permessage-deflate for binary frames if needed.

### Tailscale Serve integration

Tailnet-only flow (no Funnel in M7):

```bash
vtr web --listen 127.0.0.1:8080 --socket /var/run/vtr.sock
tailscale serve https / http://127.0.0.1:8080
```
Exact flags can vary; verify with `tailscale serve --help`.

### Authentication (M7 simplified)

No additional auth in M7. Rely on Tailscale Serve tailnet access. Funnel is
explicitly out of scope for this milestone.

### Notes from modern web terminal patterns

- ttyd/wetty stacks use WebSockets with raw PTY output; vtr uses structured
  screen updates instead of ANSI parsing.
- Vibe tunnel patterns appear to prefer tailnet access plus optional share
  links; we are not implementing share links in M7.

### M7 decisions (final)

- Delta format: full-screen `SubscribeEvent` updates in M7; row-level deltas
  deferred.
- Cursor: block cursor with no blink; visibility is assumed true in M7.
- Wide/combining: client-side `wcwidth` heuristic (see Rendering considerations);
  accept limitations until wide metadata is exposed.
- Scrollback: out of scope for M7 (viewport only).
- Encoding: protobuf `Any` frames; permessage-deflate optional.

### Post-M7 considerations

- Add cursor visibility/style fields to the proto or WS schema.
- Expose wide/continuation metadata and grapheme cluster text in `ScreenCell`.
- Add scrollback RPC + UI paging.
- Add row-level delta frames for `SubscribeEvent` updates.

### Config Management

Only `config resolve` is implemented in M5; the remaining subcommands are planned post-M5.

```bash
# List configured coordinators
vtr config ls  # planned post-M5

# Add coordinator
vtr config add <path-or-glob>  # planned post-M5

# Remove coordinator
vtr config rm <path-or-glob>  # planned post-M5

# Show resolved socket paths
vtr config resolve
```

`config resolve` honors `--json` and `defaults.output_format`.

### Session Addressing

When multiple coordinators are configured:

1. **Unambiguous**: Session name unique across all coordinators → use name directly
2. **Ambiguous**: Session name exists on multiple coordinators → error with suggestion
3. **Explicit**: Use `--socket` flag or `coordinator:session` syntax

```bash
# These are equivalent
vtr screen codex --socket /var/run/project-a.sock
vtr screen project-a:codex
```

Coordinator names derived from socket filename (without .sock extension).
If two sockets share the same basename, names collide; use `--socket` to disambiguate.

M5 CLI uses `--socket` to target a single coordinator and auto-resolves session names across configured coordinators.

### Output Formats

**Human (default):**
```
$ vtr ls
COORDINATOR    SESSION    STATUS    COLSxROWS    AGE
project-a      codex      running   120x40       2h
project-a      shell      exited    80x24        5m
project-b      claude     running   100x30       1h

$ vtr screen codex
Screen: codex (120x40)
$ echo hello
hello
$ █

$ vtr grep codex "error" -C 2
scrollback:142: warning: something happened
scrollback:143: error: connection refused
scrollback:144: retrying in 5s
--
scrollback:289: error: timeout exceeded
scrollback:290: giving up
```

**JSON (`--json`):**
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

Transport: Unix domain socket
Auth: POSIX filesystem permissions

### Service Definition

**Status (post-M6):** Spawn, List, Info, Kill, Remove, GetScreen, Grep, SendText, SendKey, SendBytes, Resize, WaitFor, WaitForIdle, and Subscribe are implemented. SendMouse and mouse mode events are planned for M8. DumpAsciinema is defined but not implemented yet.

```protobuf
syntax = "proto3";
package vtr;

service VTR {
  // Session management
  rpc Spawn(SpawnRequest) returns (SpawnResponse);
  rpc List(ListRequest) returns (ListResponse);
  rpc Info(InfoRequest) returns (InfoResponse);
  rpc Kill(KillRequest) returns (KillResponse);
  rpc Remove(RemoveRequest) returns (RemoveResponse);
  
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
}

enum SessionStatus {
  SESSION_STATUS_UNSPECIFIED = 0;
  SESSION_STATUS_RUNNING = 1;
  SESSION_STATUS_EXITED = 2;
}

message SpawnRequest {
  string name = 1;
  string command = 2;  // default: server default shell (config or $SHELL)
  string working_dir = 3;  // default: $HOME
  map<string, string> env = 4;  // merged with default env
  int32 cols = 5;  // default: 80
  int32 rows = 6;  // default: 24
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
  GetScreenResponse screen = 1;
}

message SessionExited {
  int32 exit_code = 1;
}

message SubscribeEvent {
  oneof event {
    ScreenUpdate screen_update = 1;
    bytes raw_output = 2;
    SessionExited session_exited = 3;
  }
}
```

### Subscribe Stream (M6)

- Server-side stream of `SubscribeEvent` for attach and web UI clients.
- Server always sends an initial full `ScreenUpdate` snapshot so clients can diff (even when
  `include_screen_updates` is false).
- `include_screen_updates` controls subsequent full-frame snapshots; updates are emitted on new
  output and coalesced to 30fps max.
- `include_raw_output` emits raw PTY bytes for logging or custom rendering; raw output starts at
  subscription time and is buffered up to 1MB (older bytes are dropped on overflow).
- At least one of `include_screen_updates` or `include_raw_output` must be true; otherwise the
  server returns `INVALID_ARGUMENT`.
- If `include_screen_updates` is true, the server sends a final `ScreenUpdate` before
  `session_exited`; `session_exited` is always the last event before stream close.
- M8: `mouse_mode_changed` will be emitted on Subscribe start and whenever the app enables or disables
  mouse tracking; clients gate mouse input on this event.
- `session_exited` is sent once with the exit code; the server closes the stream afterward.
- When clients disconnect or cancel, the server stops streaming and releases resources.
- Slow clients may skip intermediate frames; the server prioritizes the latest screen state (see Backpressure).
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
- Screen updates are output-driven and throttled to 30fps max
- Slow clients skip intermediate frames and receive the latest snapshot
- No snapshot ring buffer yet; each update is a fresh snapshot on send
- Raw output is buffered up to 1MB for subscribers that request it

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
chmod 600 /var/run/vtr.sock

# Allow group
chmod 660 /var/run/vtr.sock
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
- Valgrind is intentionally skipped due to runtime costs; sanitizer runs must stay under the 5-minute CI budget.

### Planned execution (M9)

- Zig ASan/LSan support is not exposed in Zig 0.15.2 (no `-fsanitize=address` flag), so the shim uses the LLVM IR pipeline for ASan until Zig adds native sanitizer flags.
- Build the shim with Zig 0.15.2 (per shim build.zig.zon) and frame pointers enabled (`-Dframe_pointers=true`), plus LLVM IR emission (`-Demit_llvm_ir=true`).
- Compile the emitted IR with clang `-fsanitize=address` and archive it into `go-ghostty/shim/zig-out-asan/` (Make: `shim-llvm-asan`).
- Run `go test -asan -tags=asan` only for CGO-boundary packages (go-ghostty + server VT integration tests).
- Use suppression files in `go-ghostty/shim/sanitizers/` via `ASAN_OPTIONS`/`LSAN_OPTIONS` if third-party noise appears.

## Build System (M10)

M10 standardizes the build system on mise for tool versions and task automation.

### Goals

- Tool version management via `mise.toml` (replaces asdf, nvm, etc.); cached installs are built in.
- Tasks defined under `[tasks]` with dependencies (`depends`) and optional `env` vars.
- `mise run <task>` executes tasks; use a single command for the full pipeline: `mise run all`.

### mise.toml (project)

```toml
[tools]
go = "1.25.3"
zig = "0.15.2"

[tasks.shim]
run = "cd go-ghostty/shim && zig build"

[tasks.build]
depends = ["shim"]
run = "go build -o bin/vtr ./cmd/vtr"

[tasks.test]
depends = ["shim"]
run = "go test ./..."

[tasks.all]
depends = ["build", "test"]
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

### Phase 5: Web UI (M7)

1. React + shadcn/ui frontend with Tokyo Night palette and JetBrains Mono
2. Bun + Vite dev tooling and HMR workflow
3. Custom grid renderer using `ScreenUpdate` frames (no ANSI parsing; deltas optional)
4. WebSocket -> gRPC bridge in `vtr web`
5. Multi-coordinator tree view from `~/.config/vtr/config.toml`
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
│   ├── progress.md
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
├── go.sum
└── Makefile
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
