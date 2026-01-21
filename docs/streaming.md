# Streaming Design

This document defines the technical design for streaming terminal state to both
the TUI (gRPC) and Web UI (WebSocket bridge) using a unified payload model.

## Goals

- Single streaming schema for all clients.
- Consistent semantics across gRPC and WebSocket transports.
- Clear backpressure behavior under slow clients.
- Reliable resync behavior without client ACKs.
- M7 delivers keyframes only; deltas are defined for post-M7.

## Non-Goals (M7)

- Client-driven ACK or retransmit protocols.
- Scrollback streaming.
- Mouse input (planned in M8).
- App-level compression (future).

## Unified Message Model

All streaming uses the same protobuf types from `proto/vtr.proto`:

- `SubscribeRequest`
- `SubscribeEvent`
- `ScreenUpdate`
- `ScreenDelta`
- `RowDelta`
- `SessionExited`
- `SessionIdle`

### SubscribeRequest

```
message SubscribeRequest {
  string name = 1;
  bool include_screen_updates = 2;
  bool include_raw_output = 3;
}
```

- `name` is required; it may include `coordinator:session`.
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

- `session_exited` is always the last event before stream close.
- `session_idle` emits when the coordinator crosses the idle threshold (default 5s) based on input/output activity.

## Transport Mapping

### gRPC (TUI)

- TUI uses native `Subscribe` gRPC streaming.
- Input uses separate RPCs (`SendText`, `SendKey`, `SendBytes`, `Resize`).

### WebSocket (Web UI)

- Server exposes `GET /api/ws`.
- All frames are binary protobuf `google.protobuf.Any`.
- First client frame must be `SubscribeRequest` wrapped in `Any`.
- Client input frames use `ResizeRequest`, `SendTextRequest`, `SendKeyRequest`,
  or `SendBytesRequest` wrapped in `Any`.
- Server frames are `SubscribeEvent` wrapped in `Any`.
- Errors are `google.rpc.Status` wrapped in `Any`, followed by socket close.

The WebSocket bridge forwards the exact protobuf payloads used by gRPC.

## Streaming Semantics

### ScreenUpdate fields

```
message ScreenUpdate {
  uint64 frame_id = 1;
  uint64 base_frame_id = 2;  // 0 for keyframes
  bool is_keyframe = 3;
  GetScreenResponse screen = 4;  // full snapshot when is_keyframe
  ScreenDelta delta = 5;  // row-level deltas when !is_keyframe
}
```

Definitions:

- CURRENT STATE: client-rendered grid after applying the last `ScreenUpdate`.
- DESIRED STATE: server's latest authoritative grid.

Rules:

- `frame_id` is monotonic; clients may observe gaps.
- Keyframes (`is_keyframe = true`) carry a full snapshot in `screen`.
- Deltas (`is_keyframe = false`) carry `delta` row replacements.
- `base_frame_id` is meaningful only for deltas and refers to the frame the
  delta was computed from.
- Clients must apply deltas only if `base_frame_id` matches their current frame.
  Otherwise they drop the delta and wait for a keyframe (or resubscribe).
- Indices in row deltas are 0-based.
- Resizes force keyframes.

### Delta format

```
message ScreenDelta {
  int32 cols = 1;
  int32 rows = 2;
  int32 cursor_x = 3;
  int32 cursor_y = 4;
  repeated RowDelta row_deltas = 5;
}
```

- `row_deltas` are full row replacements.
- Unlisted rows are unchanged.
- `row_deltas` may be empty (cursor-only updates).

## M7 Policy

- M7 emits keyframes only.
- Delta generation and tuning is post-M7.

## Backpressure and Coalescing

- Updates are output-driven and coalesced to 30fps max.
- Latest-only policy: per subscriber, the server keeps only the newest pending
  `ScreenUpdate` under backpressure and drops older unsent frames.
- When coalescing, the server must ensure any delta is based on the last frame
  it sent to that subscriber; otherwise it sends a keyframe.
- Server keeps a small ring buffer of recent keyframes (deltas post-M7) for
  resync and periodic keyframes.
- `raw_output` is buffered up to 1MB for subscribers that request it.

## Resync Strategy

- Initial keyframe on subscribe when `include_screen_updates` is true.
- Periodic keyframes every 5s (current default).
- Keyframe on resize.
- Client resubscribe forces a keyframe.

## Compression

- Default: no compression for local/Tailscale.
- Prefer transport-level compression for remote links (gRPC/HTTP).
- For WebSocket, consider `permessage-deflate` only after benchmarking.
- Avoid double compression; app-level zstd requires explicit framing and
  negotiation (future).

## Error Handling

- Invalid subscribe (both `include_*` false): gRPC `INVALID_ARGUMENT`.
- Unknown session: gRPC `NOT_FOUND`.
- WS bridge: send `google.rpc.Status` (Any) and close the socket.

## Client Responsibilities

### TUI

- Maintain a grid and cursor state from `ScreenUpdate`.
- Use `raw_output` only for logging or diagnostics.

### Web UI

- Maintain a grid and cursor state from `ScreenUpdate`.
- Ignore `raw_output` unless explicitly enabled for debugging.
