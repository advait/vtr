# Protocols

`proto/vtr.proto` is the source of truth. This document summarizes the contract
and current implementation status.

## Services

`service VTR` includes:

Session management:
- Spawn, List, SubscribeSessions, Info, Kill, Close, Remove, Rename

Screen / input:
- GetScreen, Grep, SendText, SendKey, SendBytes, Resize

Blocking ops:
- WaitFor, WaitForIdle

Streaming:
- Subscribe

Federation:
- RegisterSpoke

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
- RegisterSpoke

Not implemented:
- DumpAsciinema

## Session identity

- Sessions have stable UUIDs (`id`) and mutable labels (`name`).
- gRPC and the WebSocket bridge accept `id` (preferred); `name` is legacy lookup.
- For hubs with multiple coordinators, use `coordinator:session-id` when routing.

## Error behavior (common cases)

- `NOT_FOUND`: unknown session id/label.
- `ALREADY_EXISTS`: spawn with an existing name.
- `FAILED_PRECONDITION`: input to an exited session.
- `INVALID_ARGUMENT`: missing required fields or invalid subscribe flags.

## WebSocket bridge

The web server exposes a WebSocket bridge that carries protobuf `Any` frames.
See `docs/web-ui.md` and `docs/streaming.md` for message flow and semantics.
