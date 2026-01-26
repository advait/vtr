# vtr Documentation

Start here. This folder is the canonical documentation set for vtr.

## Docs map

- `docs/overview.md` - What vtr is, core ideas, and a quick orientation.
- `docs/architecture.md` - Components, data flow, session lifecycle, and core invariants.
- `docs/operations.md` - Configuration, runtime flags, auth, and deployment notes.
- `docs/protocols.md` - gRPC + WebSocket contract summary (proto is source of truth).
- `docs/clients.md` - CLI/TUI/Web UI usage patterns and behaviors.
- `docs/web-ui.md` - Web UI architecture, renderer notes, and manual checks.
- `docs/streaming.md` - Streaming semantics and backpressure rules (deep dive).
- `docs/federation.md` - Hub/spoke status and planned federation work.
- `docs/development.md` - Build, test, debug, release, and agent workflow.
- `docs/appendix/mosh-notes.md` - Research notes and references.

## Where to start

- New to vtr: `docs/overview.md` -> `docs/architecture.md` -> `docs/operations.md`
- Working on clients: `docs/clients.md` -> `docs/protocols.md` -> `docs/streaming.md`
- Working on web UI: `docs/web-ui.md` -> `docs/streaming.md`
- Working on federation: `docs/federation.md` -> `docs/operations.md`

## Source of truth

- gRPC/WS schema: `proto/vtr.proto`
- CLI behavior: `cmd/vtr/*.go`
- Server behavior: `server/*.go`
- Web UI behavior: `web/src/*`
