# vtr Specification

> Headless terminal multiplexer: container PTYs stream bytes to a central VT engine inside the coordinator. gRPC exposes screen state + I/O to heterogeneous clients (agent CLI, web UI). Decouples PTY lifecycle from rendering.

## Overview

vtr is a terminal multiplexer designed for the agent era. Each container runs a coordinator that manages multiple named PTY sessions. Clients connect via gRPC over Unix sockets to query screen state, search scrollback, send input, and wait for output patterns.

**Core insight**: Agents don't need 60fps terminal streaming. They need consistent screen state on demand, pattern matching on output, and reliable input delivery.

## Implementation Status (post-M5)

- Implemented gRPC methods: Spawn, List, Info, Kill, Remove, GetScreen, Grep, SendText, SendKey, SendBytes, Resize, WaitFor, WaitForIdle.
- Subscribe and DumpAsciinema remain defined in `proto/vtr.proto` but are not implemented yet (gRPC returns UNIMPLEMENTED).
- CLI supports core client commands plus `grep`, `wait`, `idle`, and `config resolve` (alongside `serve` and `version`).
- Multi-coordinator resolution supports `--socket` and `coordinator:session` with auto-disambiguation via per-coordinator lookup.
- Grep uses scrollback dumps when available; falls back to screen/viewport dumps if history is unavailable.
- WaitFor scans output emitted after the request starts using a rolling 1MB buffer.

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
| **Web UI** | Browser-based session viewer (P2) |

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
vtr attach <name> [--socket /path/to.sock]  # planned M6 (TUI)
```

TUI features (planned for M6):
- Bubbletea TUI renders the viewport inside a Lipgloss border.
- Status bar shows session name, coordinator, and time (cwd/process name TBD if available).
- Uses `Subscribe` for real-time screen updates (throttled to 30fps max).
- Raw mode passthrough for normal typing.
- Leader key is `Ctrl+b` (tmux-style) for commands:
  - `c` - Create new session (defaults to current coordinator, j/k selector to change)
  - `d` - Detach (exit TUI, session keeps running)
  - `k` - Kill current session
  - `n` - Next session
  - `p` - Previous session
  - `w` - List sessions (fuzzy finder picker using Bubbletea filter component)
  - `r` - Rename session (modal prompt)
- Session exit keeps the final screen visible and marks the UI clearly exited
  (border color change + EXITED badge with exit code).

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

**Status (post-M5):** Spawn, List, Info, Kill, Remove, GetScreen, Grep, SendText, SendKey, SendBytes, Resize, WaitFor, and WaitForIdle are implemented. Subscribe and DumpAsciinema are defined but not implemented yet.

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

### Subscribe Stream (planned M6)

- Server-side stream of `SubscribeEvent` for attach and web UI clients.
- Server always sends an initial full `ScreenUpdate` snapshot so clients can diff.
- `include_screen_updates` controls subsequent full-frame snapshots (throttled to 30fps max).
- `include_raw_output` emits raw PTY bytes for logging or custom rendering.
- `session_exited` is sent once with the exit code; the server closes the stream afterward.
- Slow clients may skip intermediate frames; the server prioritizes the latest screen state (see Backpressure).
- Subscribe is receive-only; input still uses `SendText`, `SendKey`, or `SendBytes`.

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

### Streaming Clients (Subscribe) (planned)

For attach and web UI (not implemented yet):
- Server maintains circular buffer of recent screen snapshots
- Screen updates are throttled to 30fps max and coalesced to the latest frame
- Slow clients skip intermediate frames
- Clients always see current state, may miss transitions
- Buffer size: 10 snapshots (configurable)

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
4. Subscribe stream (for attach) (planned post-M5)

### Phase 3: CLI Client (core done; M5 extensions done)

1. Core commands implemented (`ls`, `spawn`, `info`, `screen`, `send`, `key`, `raw`, `resize`, `kill`, `rm`)
2. Human and JSON output formats
3. Config management (`config resolve` done; `config ls/add/rm` planned post-M5)
4. Multi-coordinator support (done)
5. Session addressing resolution (done)

### Phase 4: Interactive Attach

1. Bubbletea TUI
2. Raw mode passthrough
3. Leader key bindings
4. Window decoration

### Phase 5: Web UI (P2)

1. React/Lit frontend
2. Canvas renderer over vtr screen snapshots
3. WebSocket → gRPC bridge
4. Multi-session view

### Phase 6: Recording (P2)

1. Asciinema format recording
2. DumpAsciinema RPC
3. Playback support in web UI

## Project Structure (post-M5)

```
vtrpc/
├── cmd/
│   └── vtr/
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
├── web/                 # Web UI (P2)
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
| github.com/charmbracelet/bubbletea | TUI framework (planned) |

## Testing Strategy (post-M5)

### Current coverage

- go-ghostty snapshot/dump coverage (attrs, colors, cursor movement, wide chars, wrapping)
- Server coordinator tests for spawn/echo, exit code, kill/remove, screen snapshot, default working dir
- gRPC integration tests for spawn/send/screen, list/info/resize, kill/remove, error mapping, grep, wait, idle
- CLI end-to-end tests for spawn/send/key/screen plus grep/wait/idle

### Gaps / planned

- Multi-coordinator resolution + `vtr config` command coverage
- Subscribe stream behavior (backpressure, dropped frames, event ordering)
- Attach TUI + web UI + recording

---

*Last updated: 2026-01-18*
