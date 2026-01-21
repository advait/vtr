# Idle Detection

The coordinator tracks per-session activity and exposes an idle flag for UIs.

## Activity signals
- PTY output: any bytes emitted by the session.
- Client input: SendText/SendKey/SendBytes input to the session.

## Idle threshold
- A session becomes idle after no activity for `IdleThreshold`.
- Default `IdleThreshold` is 5s.
- Idle transitions are debounced by the threshold (brief pauses do not flip idle).

## Where idle is surfaced
- `Session.idle` in List/Info responses.
- `SessionIdle` events on `Subscribe`.

## Configuration
`IdleThreshold` is set when constructing the coordinator (see
`server.CoordinatorOptions`). There is no CLI flag for this yet.

## Notes
`WaitForIdle` is a blocking RPC that waits for silence on output; it is
independent from the session idle state used for UI indicators.
