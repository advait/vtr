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
  SessionRef session = 1;
  bool include_screen_updates = 2;
  bool include_raw_output = 3;
}
```

```
message SessionRef {
  string id = 1;
  string coordinator = 2;
}
```

Rules:
- `session.id` is required and stable.
- `session.coordinator` is optional for single-coordinator servers; hubs use it for routing.
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

- Screen streams start with a fresh keyframe (`ScreenUpdate.screen`) built from a live snapshot.
- Subsequent updates emit deltas (`ScreenUpdate.delta`) when a safe base frame is available.
- `frame_id` is monotonic; gaps are allowed.
- The server does not emit periodic keyframes in healthy steady state.
- Keyframes are forced on first frame, resize, and any unsafe delta condition.
- Raw output is buffered up to 1MB for subscribers that request it.

## Delta format (emitted)

- `ScreenDelta.base_frame_id` must match the client-applied `frame_id`.
- `RowDelta` entries carry full replacement row data for changed rows only.
- Cursor-only movement may produce a delta with no `row_deltas`.
- When server-side base chaining is unsafe (missing base, size mismatch, or non-comparable data), the server falls back to a keyframe.

## Backpressure and coalescing

- Screen updates are output-driven and throttled (approx 30fps max).
- Latest-only policy: per subscriber, only the most recent pending update is kept.
- If a client falls out of delta chain, it must wait for/trigger a new keyframe.

## Session list snapshots

`SubscribeSessions` streams `SessionsSnapshot` frames. Each snapshot includes
all known coordinators (including empty) and their current session lists. Hubs
emit a fresh snapshot whenever membership or sessions change.

## WebSocket transport mapping

- `/api/ws` carries `SubscribeRequest` and `SubscribeEvent` wrapped in `Any`.
- `/api/ws/sessions` carries `SubscribeSessionsRequest` and `SessionsSnapshot` wrapped in `Any`.
- Errors are sent as `google.rpc.Status` then the WebSocket closes.
