# Protocols

`proto/vtr.proto` is the source of truth. This document summarizes the contract
and current implementation status.

## Services

`service VTR` includes:

Session management:
- Spawn, List, SubscribeSessions (stream SessionsSnapshot), Info, Kill, Close, Remove, Rename

Screen / input:
- GetScreen, Grep, SendText, SendKey, SendBytes, Resize

Blocking ops:
- WaitFor, WaitForIdle

Streaming:
- Subscribe

Federation:
- Tunnel

Recording:
- DumpAsciinema (defined but not implemented; server returns UNIMPLEMENTED)

## Implemented vs not implemented

Implemented in server code:
- Spawn, List, SubscribeSessions, Info
- Kill, Close, Remove, Rename
- GetScreen, Grep
- SendText, SendKey, SendBytes, Resize
- WaitFor, WaitForIdle
- Subscribe
- Tunnel

Not implemented:
- DumpAsciinema

## Tunnel (spoke-initiated federation)

`Tunnel` is a bidirectional stream initiated by a spoke. The hub sends
`TunnelRequest` frames (method + payload) and receives `TunnelResponse` or
`TunnelStreamEvent` frames. Spokes reply with `TunnelError` frames on failures.

## Session identity

- Sessions have stable UUIDs (`id`) and mutable labels (`name`).
- gRPC and the WebSocket bridge use `SessionRef` with `id`; `name` is a label only.
- For hubs with multiple coordinators, set `SessionRef.coordinator` when routing.

## Session snapshots

`SubscribeSessions` streams `SessionsSnapshot` frames that include coordinator
membership and per-coordinator session lists (`CoordinatorSessions` with
`name`, `path`, `sessions`, and `error`). Clients render the latest snapshot.

## Error behavior (common cases)

- `NOT_FOUND`: unknown session id.
- `ALREADY_EXISTS`: spawn with an existing name.
- `FAILED_PRECONDITION`: input to an exited session.
- `INVALID_ARGUMENT`: missing required fields or invalid subscribe flags.

## WebSocket bridge

The web server exposes a WebSocket bridge that carries protobuf `Any` frames.
See `docs/web-ui.md` and `docs/streaming.md` for message flow and semantics.
