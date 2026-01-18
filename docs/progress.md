# vtr Progress

Milestones from initial setup to a fully working MVP. Each milestone ends in a
functional, testable, and understandable state.

Complexity scale: XS (hours), S (1-2 days), M (3-5 days), L (1-2 weeks), XL (2+ weeks).

## M0 - Project Setup

Goal: Establish repo scaffolding and build/test workflow.

Deliverables:
- `go.mod`/`go.sum` with baseline dependencies pinned.
- `proto/vtr.proto` checked in with initial service/messages from spec.
- Build scripts: `Makefile` or `taskfile` for `proto`, `build`, `test`.
- Minimal `cmd/vtr` skeleton for future CLI/server split.
- `docs/progress.md` created and referenced in `docs/agent-meta.md`.

Success criteria:
- `go test ./...` passes (even if only empty packages).
- `make proto` (or equivalent) generates Go stubs locally without manual steps.
- Repo layout matches `docs/spec.md` structure.

Estimated complexity: S.

## M1 - Ghostty Shim + Go Wrapper

Goal: Prove VT engine integration and snapshot/dump access via go-ghostty.

Status: complete (2026-01-18).

Deliverables:
- `go-ghostty/shim` Zig build script producing `libvtr-ghostty-vt.a` and header.
- C header defining `vtr_ghostty_*` API per `go-ghostty/README.md`.
- Go package `go-ghostty` with `Terminal`, `Snapshot`, `Dump` APIs.
- Unit tests feeding ANSI bytes and asserting snapshot and dump contents.

Success criteria:
- `go test ./go-ghostty/...` passes locally with Ghostty checkout configured.
- A small demo or test shows cursor position and viewport cells are correct.
- No memory leaks in snapshot/dump (validated by test harness or basic tooling).

Estimated complexity: L.

## M2 - Coordinator Core (No gRPC Yet)

Goal: Build in-process session management and PTY plumbing around the VT engine.

Status: complete (2026-01-18).

Deliverables:
- `server/coordinator.go` session registry with spawn/kill/rm/info states.
- `server/pty.go` for PTY lifecycle, resize, and I/O loops.
- `server/vt.go` that adapts go-ghostty snapshots and scrollback dumps.
- Tests for spawn/echo, kill/remove, exit codes, and basic screen capture.

Success criteria:
- Sessions can be spawned, accept input, and exit cleanly.
- Screen snapshots reflect PTY output; scrollback grows as expected.
- `go test ./server/...` covers spawn/kill/rm and exit transitions.

Estimated complexity: L.

## M3 - gRPC Server Core

Goal: Expose core session management and screen/input operations over gRPC.

Status: complete (2026-01-18).

Deliverables:
- gRPC server on Unix socket with `Spawn`, `List`, `Info`, `Kill`, `Remove`.
- Screen/input RPCs: `GetScreen`, `SendText`, `SendKey`, `SendBytes`, `Resize`.
- `cmd/vtr serve` to run coordinator with config flags.
- gRPC integration tests using a real PTY-backed session.

Success criteria:
- `vtr serve` starts and accepts client calls over a socket.
- Core RPCs return correct state and enforce error codes from spec.
- Tests validate screen contents after `SendText` and resizing behavior.

Estimated complexity: M.

## M6 - Attach TUI (Bubbletea)

Goal: Deliver a tmux-like attach experience for basic workflows with modern UX.

Status: complete (2026-01-18).

Deliverables:
- Server `Subscribe` RPC implemented with streaming events, initial snapshot, exit ordering,
  raw output streaming, and backpressure handling.
- Proto messages finalized for streaming: `SubscribeRequest`, `ScreenUpdate`, `SessionExited`, `SubscribeEvent`.
- `vtr attach` Bubbletea TUI with Lipgloss border, status bar, raw-mode passthrough, and resize handling.
- Leader-based session management: create (and switch), detach, kill, next/prev (name-sorted),
  list picker (switch), literal `Ctrl+b` passthrough.
- Tests for subscribe stream behavior (initial snapshot, raw output, final-frame ordering with
  exit event, disconnect handling).

Success criteria:
- `vtr attach` renders live output with a border and status bar using Subscribe updates.
- Leader key commands work reliably without leaking input into the session.
- Detach returns to the shell while the session keeps running; kill ends the session cleanly.
- Subscribe streams handle session exit and client disconnects without leaks or crashes.
- Window resizes update the remote PTY size (border/status bar accounted for).
- No tabs, splits, copy mode, rename, or mouse support in this milestone.

Estimated complexity: L.

## M7 - Web UI (Mobile-First)

Goal: Deliver a touch-friendly browser UI with live terminal streaming over Tailscale.

Status: planned.

Deliverables:
- Dedicated `vtr web` command serving static assets + WebSocket bridge.
- React + shadcn/ui frontend with Tokyo Night palette and JetBrains Mono.
- Mobile-first layout: coordinator tree view, attach view, and on-screen input controls.
- Multi-coordinator discovery via `~/.config/vtr/config.toml` with CLI overrides.
- Custom grid renderer implemented (no ANSI parsing).
- WebSocket protocol (`hello`/`ready`/`screen_full`/`screen_delta`) implemented and documented.
- Subscribe stream bridge (gRPC -> WS) with row-level deltas, backpressure resync,
  and resize handling.
- Tailscale Serve tailnet-only setup documented (no Funnel).
- UI screenshots captured for mobile + desktop review (shot or equivalent).

Success criteria:
- Phone and desktop can load the UI, list sessions across coordinators, attach, and send input.
- Terminal updates stream within 250ms under normal load.
- Works via Tailscale Serve on tailnet; Funnel not supported in M7.
- Session exit, resize, and disconnects are handled without leaks or broken UI.
- Coordinator tree view is responsive, searchable, and touch-friendly.

Estimated complexity: L.

## M4 - CLI Client Core

Goal: Provide a usable CLI for core operations against a single coordinator.

Status: complete (2026-01-18).

Deliverables:
- CLI commands: `ls`, `spawn`, `info`, `screen`, `send`, `key`, `raw`,
  `resize`, `kill`, `rm`.
- Client config loader for `~/.config/vtr/config.toml`.
- Human and JSON output formats for key commands.
- CLI end-to-end test that spawns a session and validates screen output.

Success criteria:
- `vtr ls` and `vtr spawn` work against a running coordinator.
- `vtr screen` renders a correct viewport in human mode.
- CLI flags map cleanly to gRPC requests and errors surface clearly.

Estimated complexity: M.

## M5 - MVP: Advanced Operations + Multi-Coordinator

Goal: Ship the agent-ready MVP with grep/wait/idle and coordinator discovery.

Status: complete (2026-01-18).

Deliverables:
- Server RPCs: `Grep`, `WaitFor`, `WaitForIdle` with timeout handling.
- CLI commands: `grep`, `wait`, `idle`.
- Multi-coordinator resolution (`vtr config resolve`, `coordinator:session`).
- Tests for grep context, wait timeouts, and idle detection.
- Updated docs describing MVP usage and limitations.

Success criteria:
- Agents can spawn, send input, and block on output/idle via CLI.
- Grep returns correct line numbers and context slices.
- Multi-coordinator ambiguity errors are deterministic and user-friendly.
- `go test ./...` passes with core and advanced RPC coverage.

Estimated complexity: M.

## M8 - Attach TUI Mouse Support

Goal: Add mouse passthrough in `vtr attach` so interactive apps (vim, htop, etc.) can click and scroll.

Status: planned.

Deliverables:
- Attach TUI captures mouse input and forwards it to the session when mouse tracking is active.
- VT layer exposes mouse tracking mode (X10, button-event, any-event, SGR) for the TUI.
- Mouse input encoder with coverage for press/release, drag, wheel, and modifiers.
- Tests for mouse encoding and mode gating.

Implementation plan:
- Bubbletea: construct the program with `tea.WithMouseCellMotion()` (or `tea.WithMouseAllMotion()` for drag/motion), handle `tea.MouseMsg` in `Update`, map coordinates into the viewport, and ignore events while list/create modals are active.
- Mouse mode tracking: parse DECSET/DECRST sequences (`CSI ? 1000/1002/1003/1006 h` and `CSI ? ... l`) from PTY output or expose Ghostty mouse mode via the shim and plumb it through server snapshots/Subscribe events.
- PTY enablement: only forward mouse events while mouse tracking is enabled; otherwise drop to avoid injecting escape sequences into apps that did not request mouse input.
- Translation: emit xterm mouse escape sequences using 1-based coordinates; default to SGR (`CSI <b;x;yM`/`m`) when enabled and fall back to X10/normal if SGR is off; include modifier bits and wheel encoding.
- Modes: support X10 (1000), button-event tracking (1002), any-event tracking (1003), and SGR (1006), with optional UTF-8 (1005) compatibility if needed.

Open questions:
- Should we always prefer SGR when 1006 is set, or expose a config override for legacy clients?
- Do you want mouse mode detection via Ghostty state or via parsing raw output in the server/TUI?
- Should mouse events be consumed by the attach UI (list/modal) or always forwarded?
- Do we need a CLI/config flag to disable mouse passthrough entirely?

Estimated complexity: M.

## M9 - Memory Safety Test Suite

Goal: Comprehensive memory safety test suite for CGO + Zig integration.

Status: planned.

Deliverables:
- Sanitizer build path for the Zig shim (ASan + LSan) with a dedicated `go test` target.
- Valgrind memcheck target for focused `go-ghostty` tests with documented suppressions.
- Go race detector job for Go packages that exercise the CGO boundary.
- CI pipeline jobs for sanitizer, memcheck, and race runs with clear failure criteria.
- Documentation of CGO ownership patterns and safe usage for snapshot/dump allocations.

Success criteria:
- Sanitizer and memcheck runs report zero actionable findings in `go-ghostty` paths.
- `go test -race ./...` passes on supported platforms in CI.
- Docs describe allocator ownership and required free calls at the boundary.

Estimated complexity: M.
