# Architecture Review (2026-02-05)

This document is a comprehensive architecture review of the vtrpc codebase, based on
current repository structure and implementation.

## 1. Code Organization

### Current file/directory structure (high level)

- `cmd/vtr/` - Cobra CLI entrypoint, hub/spoke runtime, TUI, web server, federation
- `server/` - Coordinator/session model, PTY/VT, gRPC service implementation
- `proto/` - `vtr.proto` + generated Go stubs
- `web/` - Frontend (Vite/React), `web/dist` embedded via `web/embed.go`
- `go-ghostty/` - CGO/zig shim + Ghostty submodule vendor tree
- `tracing/` - OpenTelemetry and trace transport helpers
- `docs/` - Architecture, ops, protocols, web UI, streaming, etc.
- `scripts/` - build helper(s)
- `bin/`, `dist/`, `web/dist/`, `web/node_modules/` - build artifacts (present locally)
- `github.com/advait/vtrpc/proto/` - empty directory (looks accidental or legacy)

### What makes sense

- `cmd/vtr/` as the CLI root is clear and idiomatic for Go.
- `server/` being the coordinator + session domain is coherent at a high level.
- `proto/` is a single source of truth for RPC contract (good).
- `web/` is a clean frontend boundary with embed via `web/embed.go`.
- `go-ghostty/` contains the CGO bridge and ghostty code, isolated from `server/`.

### What is confusing or haphazard

- `server/` mixes domain logic (Coordinator/Session/PTY/VT) with transport details
  (gRPC server, streaming, TLS concerns), so it is not a clear "core" package.
- `cmd/vtr/` contains heavy server-side logic (federation, tunnel, web server) in
  addition to CLI concerns; file sizes indicate "god file" accretion:
  - `cmd/vtr/attach.go` (~3800 LOC) mixes state, UI, RPC, and rendering logic.
  - `server/grpc.go` (~1290 LOC) mixes mapping, streaming, and server wiring.
  - `cmd/vtr/federation.go` (~1200 LOC), `cmd/vtr/web_cmd.go` (~1000 LOC).
- Web UI type definitions live in `components/` but are imported by `lib/`
  (`web/src/lib/api.ts` and `web/src/lib/session.ts` import from
  `web/src/components/CoordinatorTree.tsx`), which reverses typical layering.
- `web/src/lib/proto.ts` duplicates the protobuf schema as a string literal,
  creating a drift risk versus `proto/vtr.proto`.
- `.gitignore` suggests `proto/*.pb.go`, `web/dist/`, `web/node_modules/`, and
  `/bin`, `/dist` should be ignored, but those paths exist in the tree; this
  increases confusion about what is source vs generated.
- The empty `github.com/advait/vtrpc/proto/` directory is a structural oddity.

### Suggested reorganization (target shape)

Keep the current top-level shape but introduce clear layering:

```
cmd/vtr/                # CLI wiring only
internal/
  core/                 # Coordinator, Session, idle/wait, grep, output buffer
  pty/                  # PTY wrapper and read loop
  vt/                   # Ghostty wrapper
  federation/           # Spoke registry + tunnel + hub aggregation
  transport/
    grpc/               # gRPC server + mappings
    web/                # HTTP/WS handlers + REST bridge
  config/               # config parsing + defaults
  auth/                 # token/TLS helpers
  logging/              # slog setup + helpers
pkg/
  proto/                # generated (or keep at top-level)
web/                    # frontend
go-ghostty/             # (or move to third_party/ghostty)
tracing/                # (or internal/observability)
```

This keeps `cmd/vtr` as assembly/wiring only and moves heavy logic into internal
packages with clearer boundaries.

## 2. Naming Conventions

### What exists today

- Go identifiers mostly follow Go conventions (CamelCase for exported, lower for
  unexported).
- JSON and proto fields are snake_case (good).

### Inconsistencies observed

- **Session name vs label**:
  - Server uses `label` internally (`server/coordinator.go`) while proto and most
    clients use `name` (`proto/vtr.proto`, `cmd/vtr/output.go`).
  - CLI models use both `label` and `name` (`cmd/vtr/attach.go`, `cmd/vtr/client.go`).
- **Hub vs coordinator vs spoke**:
  - Code frequently uses `hub` for configuration/addressing while internal types
    are `Coordinator`/`Spoke` (`cmd/vtr/hub.go`, `cmd/vtr/federation.go`,
    `server/federation.go`).
- **Logging style**:
  - `cmd/vtr/*` uses `slog`, but `server/grpc.go` and `cmd/vtr/web_cmd.go` still
    use `log.Printf`, leading to inconsistent output and configuration.
- **Product naming**:
  - `vtr` vs `vtrpc` in config/env (`VTRPC_CONFIG_DIR`, `vtrpc.toml`) vs CLI
    name (`vtr`).
- **Web UI type ownership**:
  - `SessionInfo` type is defined in a UI component but used as a core model in
    `web/src/lib` modules, which implies the "domain" lives in the UI layer.

### Recommended conventions

- **Unify "name" vs "label":** pick `name` as the user-visible string everywhere
  and reserve `id` for immutable identifiers. Rename internal fields accordingly.
- **Distinguish runtime roles clearly:** `Hub` for multi-coordinator aggregation,
  `Coordinator` for a single VT engine, `Spoke` for remote coordinators. Encode
  this consistently in config and code.
- **Standardize logging:** use `slog` everywhere; provide a small `logging` helper
  to configure levels/format once.
- **Web UI types:** move shared types to `web/src/types/` (or `web/src/lib/types`)
  and let components import from there, not vice versa.

## 3. Architecture Patterns

### Current patterns in use

- **Coordinator + Session domain:** `server/` models a Coordinator that owns
  sessions (PTY + VT + output buffers).
- **VT adapter:** `server/vt.go` is a thread-safe adapter over Ghostty.
- **PTY read loop:** `server/pty.go` funnels PTY output into VT and replies to
  DSR requests.
- **gRPC server as adapter:** `server/grpc.go` maps domain events to proto types,
  including streaming and keyframes.
- **Federation via tunnel:** `cmd/vtr/federation.go` + `cmd/vtr/tunnel.go`
  implement hub/spoke multiplexing.
- **WebSocket bridge:** `cmd/vtr/web_cmd.go` adapts WS clients to gRPC calls.
- **TUI as monolith:** `cmd/vtr/attach.go` contains model/update/render in one file.

### Where patterns break down

- **Domain vs transport leakage:** core session logic depends on proto types via
  `server/grpc.go`, preventing a clean "domain-only" package.
- **Adapter code lives in CLI:** federation and web transport live in `cmd/vtr/`,
  so CLI packages are not just CLI.
- **Proto duplication:** web UI manually defines proto in `web/src/lib/proto.ts`,
  risking drift from `proto/vtr.proto`.
- **Large files and mixed concerns:** several files exceed 1000 LOC and mix
  state, networking, UI, and formatting.

### Clean architecture recommendations

- Define a **core domain package** (`internal/core`) with no proto/web imports.
  It should expose small interfaces like `SessionStore`, `SessionLifecycle`,
  `OutputStream`, etc.
- Move **gRPC + WebSocket** into adapter packages (`internal/transport/grpc`,
  `internal/transport/web`) that depend on `core`.
- Move **federation** into `internal/federation` so it can be reused by `hub`,
  `spoke`, and test harnesses without dragging CLI code.
- Keep `cmd/vtr` as wiring/config only, with explicit dependency injection.
- Replace manual proto in `web/` with generated TS types (or protobufjs codegen)
  derived from `proto/vtr.proto`.

## 4. Testing Strategy

### Current test coverage and organization

- Go unit tests in `server/` (coordinator, idle, grpc) and `cmd/vtr/`
  (client, attach, federation, resolve).
- `go-ghostty/ghostty_test.go` covers the CGO shim surface.
- Playwright E2E tests for web UI in `web/tests/`.

### Testing gaps

- **Transport adapters:** no focused tests for the HTTP/WS bridge in
  `cmd/vtr/web_cmd.go`.
- **Config/auth:** limited coverage for config parsing, token/TLS handling, and
  error cases (mostly exercised indirectly).
- **Federation:** basic tests exist but no end-to-end hub/spoke integration test
  across real gRPC streams.
- **Web UI logic:** no unit tests for `web/src/lib/*` (session normalization,
  proto encode/decode).
- **Proto contract drift:** no automated check that TS and Go proto models match.
- **Concurrency/race:** coverage exists in test tasks but not tied to specific
  regression tests for streaming, idle detection, keyframe policy.

### Recommended testing approach

- Add **contract tests** to validate WS <-> gRPC behavior, especially for
  screen updates and session events.
- Create **integration tests** that spin up hub + spoke(s) and assert federation
  behavior and session list aggregation.
- Add **unit tests** for config parsing, auth mode handling, and web handlers.
- Add **TS unit tests** for `web/src/lib` utilities (proto decoding, session
  normalization) with mocked WS payloads.
- Consider a **golden test** suite for screen deltas to guard against regression
  in VT -> proto mappings.

## 5. Dependencies & Layering

### Current dependency graph (Go)

```
cmd/vtr  ---> server, tracing, proto, web
server   ---> proto, go-ghostty
tracing  ---> otel SDK (no internal deps)
web      ---> (embed only)
```

### Coupling or layering issues

- `cmd/vtr` depends on `server` and also implements server-side behaviors
  (federation/web). This blurs "CLI vs server" boundaries.
- `server` depends directly on `proto`, so it is not transport-agnostic.
- Frontend `lib` modules depend on component definitions (`SessionInfo` types),
  making UI components a dependency of core logic.
- Proto definitions are duplicated in `web/src/lib/proto.ts`.

### Cleaner layering suggestions

- Move proto translation into adapters (`internal/transport/grpc`), leaving
  `internal/core` free of proto types.
- Move federation and tunnel logic into `internal/federation`.
- Enforce TS layering: `components` should only import from `lib`/`types`, never
  the other way around.
- Decide whether to keep generated Go proto stubs committed; align `.gitignore`
  and build tooling accordingly to avoid confusion.

## 6. Specific Reorganization Opportunities (Prioritized)

### Quick wins (low risk)

1. **Web UI type layering**:
   - Move `SessionInfo` / `CoordinatorInfo` to `web/src/types/session.ts`.
   - Update imports in `web/src/lib/api.ts`, `web/src/lib/session.ts`,
     `web/src/components/CoordinatorTree.tsx`.
2. **Logging consistency**:
   - Replace `log.Printf` usage in `server/grpc.go` and `cmd/vtr/web_cmd.go`
     with `slog` (using the same logger as `hub`/`spoke`).
3. **Proto duplication warning**:
   - Add a doc note in `docs/protocols.md` that `web/src/lib/proto.ts` is a
     partial mirror and must be updated with `proto/vtr.proto` changes.
4. **Clean empty directories**:
   - Remove or explain `github.com/advait/vtrpc/proto/` (empty, confusing).
5. **Align generated artifacts policy**:
   - Decide if `proto/*.pb.go` and `web/dist/` are committed; align `.gitignore`
     and docs accordingly.

### Medium refactors

6. **Split `cmd/vtr/attach.go`**:
   - Extract to `internal/tui/` with `model.go`, `update.go`, `view.go`,
     `commands.go` to reduce file size and clarify responsibilities.
7. **Split `server/grpc.go`**:
   - Move mapping helpers to `internal/transport/grpc/mapper.go`.
   - Move stream/keyframe logic to `internal/transport/grpc/stream.go`.
8. **Extract web server**:
   - Move `cmd/vtr/web_cmd.go` handlers to `internal/transport/web/` and keep
     `cmd/vtr/web_cmd.go` for flag parsing/wiring only.
9. **Extract federation**:
   - Move `cmd/vtr/federation.go` and `cmd/vtr/tunnel.go` into
     `internal/federation/` and expose a small interface for hub/spoke wiring.

### Major refactors (higher risk)

10. **Create `internal/core`**:
    - Move `server/coordinator.go`, `server/pty.go`, `server/vt.go`, `server/idle.go`,
      `server/wait.go`, `server/grep.go`, `server/output.go` into a core package.
    - Leave only adapters in `server/` or rename `server/` to `core/`.
11. **Proto-to-TS generation**:
    - Replace `web/src/lib/proto.ts` with generated types from `proto/vtr.proto`
      (protobufjs or buf + ts plugin).
12. **Separate "runtime" from "CLI"**:
    - Introduce `internal/app` (or `internal/runtime`) that assembles hub/spoke
      servers, leaving `cmd/vtr` to just parse args and call into `internal/app`.

