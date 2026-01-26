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

- The API currently identifies sessions by `name` (string).
- Names are used for routing in gRPC and the WebSocket bridge.

## Error behavior (common cases)

- `NOT_FOUND`: unknown session name.
- `ALREADY_EXISTS`: spawn with an existing name.
- `FAILED_PRECONDITION`: input to an exited session.
- `INVALID_ARGUMENT`: missing required fields or invalid subscribe flags.

## WebSocket bridge

The web server exposes a WebSocket bridge that carries protobuf `Any` frames.
See `docs/web-ui.md` and `docs/streaming.md` for message flow and semantics.
