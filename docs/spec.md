# vtr Specification

> Headless terminal multiplexer: container PTYs stream bytes to a central VT engine inside the coordinator. gRPC exposes screen state + I/O to heterogeneous clients (agent CLI, web UI). Decouples PTY lifecycle from rendering.

## Overview

vtr is a terminal multiplexer designed for the agent era. Each container runs a coordinator that manages multiple named PTY sessions. Clients connect via gRPC over Unix sockets to query screen state, search scrollback, send input, and wait for output patterns.

**Core insight**: Agents don't need 60fps terminal streaming. They need consistent screen state on demand, pattern matching on output, and reliable input delivery.

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

### Client Config

Location: `~/.config/vtr/config.toml`

```toml
# Coordinator socket discovery
[[coordinators]]
path = "/var/run/vtr/*.sock"  # glob pattern

[[coordinators]]
path = "/home/advait/.vtr/project-alpha.sock"  # explicit path

# Defaults
[defaults]
wait_for_idle_timeout = "5s"  # overall deadline for vtr idle
grep_context_before = 3
grep_context_after = 3
output_format = "human"  # or "json"
```

### Server Config

Passed via CLI flags. Optional config file for defaults.

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
vtr serve [--socket /path/to.sock] [--config /path/to/server.toml]

# Start coordinator (background)
vtr serve --daemon [--socket /path/to.sock] [--pid-file /path/to.pid]

# Stop daemon
vtr serve --stop [--pid-file /path/to.pid]
```

### Session Management

```bash
# List sessions across all configured coordinators
vtr ls [--json]

# Create new session
vtr spawn <name> [--coordinator /path/to.sock] [--cmd "command"] [--cwd /path] [--cols 80] [--rows 24]

# Remove session (kills if running)
vtr rm <name> [--coordinator /path/to.sock]

# Kill PTY process (session remains in Exited state)
vtr kill <name> [--signal TERM|KILL|INT] [--coordinator /path/to.sock]
```

### Screen Operations

```bash
# Get current screen state
vtr screen <name> [--json] [--coordinator /path/to.sock]

# Search scrollback (ripgrep-style output; RE2 regex)
vtr grep <name> <pattern> [-B lines] [-A lines] [-C lines] [--coordinator /path/to.sock] [--json]

# Get session info (dimensions, status, exit code)
vtr info <name> [--json] [--coordinator /path/to.sock]
```

### Input Operations

```bash
# Send text
vtr send <name> <text> [--coordinator /path/to.sock]

# Send special key
vtr key <name> <key> [--coordinator /path/to.sock]
# Keys: enter, tab, escape, up, down, left, right, backspace, delete
# Modifiers: ctrl+c, ctrl+d, ctrl+z, alt+x, etc.

# Send raw bytes (hex-encoded)
vtr raw <name> <hex> [--coordinator /path/to.sock]

# Resize terminal
vtr resize <name> <cols> <rows> [--coordinator /path/to.sock]
```

### Blocking Operations

```bash
# Wait for pattern in output (future output only, RE2 regex)
vtr wait <name> <pattern> [--timeout 30s] [--coordinator /path/to.sock] [--json]

# Wait for idle (no output for idle duration)
vtr idle <name> [--idle 5s] [--timeout 5s] [--coordinator /path/to.sock] [--json]
```

### Interactive Mode

```bash
# Attach to session (interactive TUI)
vtr attach <name> [--coordinator /path/to.sock]
```

TUI features (Bubbletea):
- Window decoration showing session name, coordinator, dimensions
- Leader key (`Ctrl+b` default) for commands:
  - `d` - Detach
  - `k` - Kill session
  - `r` - Resize
  - `?` - Help
- Raw mode passthrough for normal typing

### Config Management

```bash
# List configured coordinators
vtr config ls

# Add coordinator
vtr config add <path-or-glob>

# Remove coordinator
vtr config rm <path-or-glob>

# Show resolved socket paths
vtr config resolve
```

### Session Addressing

When multiple coordinators are configured:

1. **Unambiguous**: Session name unique across all coordinators → use name directly
2. **Ambiguous**: Session name exists on multiple coordinators → error with suggestion
3. **Explicit**: Use `--coordinator` flag or `coordinator:session` syntax

```bash
# These are equivalent
vtr screen codex --coordinator /var/run/project-a.sock
vtr screen project-a:codex
```

Coordinator names derived from socket filename (without .sock extension).
If two sockets share the same basename, names collide; use `--coordinator` to disambiguate.

### Output Formats

**Human (default):**
```
$ vtr ls
COORDINATOR    SESSION    STATUS    COLS×ROWS    AGE
project-a      codex      running   120×40       2h
project-a      shell      exited    80×24        5m
project-b      claude     running   100×30       1h

$ vtr screen codex
┌─ codex (120×40) ──────────────────────────────────────┐
│$ echo hello                                           │
│hello                                                  │
│$ █                                                    │
└───────────────────────────────────────────────────────┘

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

message SubscribeEvent {
  oneof event {
    ScreenUpdate screen_update = 1;
    bytes raw_output = 2;
    SessionExited session_exited = 3;
  }
}
```

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

## Backpressure

### Agent Clients (poll-based)

Agents use `GetScreen()`, `WaitFor()`, `WaitForIdle()` — natural backpressure via request/response. No buffering concerns.

### Streaming Clients (Subscribe)

For attach and web UI:
- Server maintains circular buffer of recent screen snapshots
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

`WaitFor`/`WaitForIdle` return `timed_out = true` when the request timeout elapses. If the gRPC deadline triggers first, the RPC is canceled and no response body is returned.

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
- Patterns: regex validated, timeout enforced

## Implementation Plan

### Phase 1: Server Core

1. gRPC server over Unix socket
2. Session spawn/list/info/kill/rm
3. PTY management (spawn, I/O)
4. VT engine integration (libghostty-vt via go-ghostty shim)
5. GetScreen, SendText, SendKey
6. Tests for all core operations

### Phase 2: Advanced Operations

1. Grep with context
2. WaitFor (pattern matching)
3. WaitForIdle (debounced idle detection)
4. Resize
5. Subscribe stream (for attach)

### Phase 3: CLI Client

1. All commands implemented
2. Human and JSON output formats
3. Config management
4. Multi-coordinator support
5. Session addressing resolution

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

## Project Structure (planned)

```
vtr/
├── docs/
│   ├── spec.md          # This file
│   └── progress.md      # Development progress tracking (planned)
├── go-ghostty/          # cgo shim around libghostty-vt Zig module
├── proto/
│   └── vtr.proto        # gRPC service definition
├── server/
│   ├── main.go
│   ├── coordinator.go   # Session management
│   ├── pty.go           # PTY operations
│   ├── vt.go            # VT engine wrapper
│   └── grpc.go          # gRPC handlers
├── cli/
│   ├── main.go
│   ├── commands/        # CLI command implementations
│   └── tui/             # Bubbletea attach mode
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
| github.com/charmbracelet/bubbletea | TUI framework |
| github.com/BurntSushi/toml | Config parsing |

## Testing Strategy

### Tier 1: Core Contracts (CI gate)

```go
func TestSpawnAndEcho(t *testing.T)      // PTY + I/O round-trip
func TestScreenDimensions(t *testing.T)  // GetScreen correctness
func TestCursorPosition(t *testing.T)    // Cursor tracking
func TestScrollbackGrep(t *testing.T)    // Search correctness
func TestWaitForTimeout(t *testing.T)    // Timeout behavior
func TestWaitForSuccess(t *testing.T)    // Pattern detection
func TestMultiClient(t *testing.T)       // Concurrent connections
func TestSpecialKeys(t *testing.T)       // Ctrl+C, arrows, etc.
```

### Tier 2: Confidence Builders

```go
func TestUnicode(t *testing.T)           // 日本語 rendering
func TestColors(t *testing.T)            // ANSI color preservation
func TestRapidOutput(t *testing.T)       // Output flood handling
func TestResize(t *testing.T)            // Mid-session resize
func TestLongRunning(t *testing.T)       // 60s stability
```

### Golden Tests

Screen state tests use golden files:
```go
func TestVimRenders(t *testing.T) {
    // spawn vim, wait for "~", compare screen to golden file
}
```

### Test Harness

```go
// fixtures_test.go
func withSession(t *testing.T, name string, fn func(client vtr.VTRClient, session string))
```

---

*Last updated: 2026-01-18*
