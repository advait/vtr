# Mosh protocol notes (for vtr)

Purpose
- Document the mosh diff/state-sync protocol and UDP transport details to inform vtr improvements.

Sources (mosh)
- README.md (overview, UDP usage)
- src/statesync/completeterminal.{h,cc}
- src/statesync/user.{h,cc}
- src/terminal/terminaldisplay.{h,cc}
- src/network/{network,networktransport,transportsender,transportfragment}.{h,cc}
- src/protobufs/{transportinstruction,hostinput,userinput}.proto

## Diff protocol (state synchronization)
- Transport instructions carry protocol_version, old_num, new_num, ack_num, throwaway_num, diff, and chaff.
- Sender computes a diff from the assumed receiver state, not from the last sent state.
- Prospective resend optimization: if a diff from the oldest known receiver state is shorter (or close), resend that.
- Diffs are zlib-compressed, fragmented to MTU, and reassembled by instruction id + fragment number.
- Receiver accepts out-of-order diffs if the referenced old_num is still in the state queue; otherwise drop.
- throwaway_num tells the receiver which old states can be discarded to bound memory.

## Screen state synchronization
- The state is the full terminal emulator (framebuffer + cursor + modes) plus echo ack.
- Complete::diff_from sends:
  - resize instructions when dimensions change
  - hostbytes containing a minimal ANSI update string (Display::new_frame)
  - echoack updates for speculative local echo validation
- Display::new_frame maximizes information density by:
  - detecting vertical scroll and emitting scroll sequences
  - walking rows and only emitting changes
  - compressing runs of blank cells with erase or spaces
  - minimizing cursor moves and rendition switches
- The diff is not a structured grid delta; it is the same terminal byte stream the client would see.

## User input sync
- UserStream diffs coalesce keystrokes into a single instruction when possible.
- Resizes are sent as separate resize instructions.

## UDP transport and rationale
- SSH is used for auth and key exchange; the live session runs over UDP.
- UDP allows roaming: server updates remote address on receipt; client hops ports if no RTT success.
- Custom reliability is layered on top with state numbers, ACKs, and RTT-based send pacing.
- Avoids TCP head-of-line blocking and works over lossy links.
- Uses ECN hints, conservative MTU sizing, and disables PMTU discovery to reduce fragmentation risk.

## Comparison to vtr (current)
- vtr uses gRPC over Unix sockets (ordered, reliable) with full ScreenUpdate snapshots today.
- Subscribe streams are throttled and designed for local or tailnet connections.
- Row-level deltas are planned but not yet implemented.

## Recommendations for vtr
- Keep gRPC/TCP for now; consider UDP or QUIC only if we need roaming or lossy-link resilience.
- Implement row-level deltas with per-row hashes and periodic full snapshots (keyframes).
- Add frame sequencing to ScreenUpdate (frame_id, base_frame_id) so deltas can be applied safely.
- Add per-subscriber coalescing: if a client falls behind, drop older frames and send the newest state.
- Only pursue a mosh-style ANSI diff path if bandwidth becomes a hard constraint.

## Backpressure and latency (vtr considerations)
- Treat screen updates as state replication, not a video timeline; the latest frame matters most.
- During latency spikes, drop stale frames rather than queueing; queue growth increases end-to-end delay.
- Maintain a small ring buffer of recent full snapshots and deltas; if a client misses a base, send a full snapshot.
- Add optional client ACKs (last_applied_frame_id) so the server can choose the best delta or keyframe.
- Client double buffering helps apply deltas atomically: apply to a back buffer, then swap for render.

## Compression considerations
- permessage-deflate is simplest for WebSocket and works with protobuf, but it is zlib-heavy and resets per message.
- App-level compression lets us choose faster codecs: lz4 (fast, lower ratio) or zstd (good ratio, low latency).
- Avoid double compression (permessage-deflate + app compression) unless measurements show a net win.
- For local/Tailscale use, row-level deltas alone may be enough; measure before adding CPU cost.

## Lessons from video streaming
- Use I-frames (full snapshots) and P-frames (deltas); send keyframes periodically and on resync.
- Adaptive rate: reduce update frequency when RTT/backlog increases; coalesce to keep latency low.
- Jitter buffers trade latency for smoothness; for terminals, prefer minimal buffering and latest-wins.

## Lessons from game state streaming
- Server authoritative state with delta compression and base-frame references maps well to terminal grids.
- Missing base state should trigger a keyframe, not a rebuild from stale deltas.
- Client-side prediction can reduce perceived input latency, but requires server correction (like mosh echo ack).
- Snapshot interpolation is usually unnecessary for terminals; correctness beats smooth transitions.

## Open questions
- Should delta frames be optional per subscriber (web vs CLI)?
- Where should compression live (permessage-deflate vs app-level)?
- Do we want client ACKs or a server-side "latest only" policy for slow subscribers?
