# Streaming

This document defines streaming semantics for gRPC `Subscribe` and the WebSocket bridge.
It is the canonical description of how screen updates flow to clients.

## Message model

All streaming uses the protobuf types in `proto/vtr.proto`:

- `SubscribeRequest`
- `SubscribeEvent`
- `ScreenUpdate`
- `ScreenDelta`
- `RowDelta`
- `SessionExited`
- `SessionIdle`
- `SubscribeSessionsRequest`
- `SessionsSnapshot`

### SubscribeRequest

```
message SubscribeRequest {
  string name = 1;
  bool include_screen_updates = 2;
  bool include_raw_output = 3;
  string id = 4;
}
```

Rules:
- Either `id` or `name` is required; `id` is preferred and stable.
- At least one of `include_screen_updates` or `include_raw_output` must be true.

### SubscribeEvent

```
message SubscribeEvent {
  oneof event {
    ScreenUpdate screen_update = 1;
    bytes raw_output = 2;
    SessionExited session_exited = 3;
    SessionIdle session_idle = 4;
  }
}
```

- `session_exited` is the final event before stream close.
- `session_idle` is emitted when the idle threshold is crossed.

## Current behavior

- The server emits keyframes only (`ScreenUpdate.screen`), not deltas.
- `frame_id` is monotonic; gaps are allowed.
- Keyframes are sent on subscribe, periodically, and after resizes.
- Raw output is buffered up to 1MB for subscribers that request it.

## Delta format (supported, not emitted)

`ScreenDelta` and `RowDelta` exist in the proto and are handled by the web client,
but the server currently does not emit deltas.

If deltas are introduced:
- `base_frame_id` must match the client's current `frame_id`.
- If the base is missing, clients must wait for a keyframe.

## Backpressure and coalescing

- Screen updates are output-driven and throttled (approx 30fps max).
- Latest-only policy: per subscriber, only the most recent pending update is kept.
- Keyframes are cached for resync when a client falls behind.

## Session list snapshots

`SubscribeSessions` streams `SessionsSnapshot` frames. Each snapshot includes
all known coordinators (including empty) and their current session lists. Hubs
emit a fresh snapshot whenever membership or sessions change.

## WebSocket transport mapping

- `/api/ws` carries `SubscribeRequest` and `SubscribeEvent` wrapped in `Any`.
- `/api/ws/sessions` carries `SubscribeSessionsRequest` and `SessionsSnapshot` wrapped in `Any`.
- Errors are sent as `google.rpc.Status` then the WebSocket closes.
