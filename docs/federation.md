# Federation (Hub / Spoke)

## Current status

Federation is tunnel-only:

- Spokes connect to the hub using the `Tunnel` RPC.
- The tunnel hello carries spoke identity and metadata.
- The hub stores spoke metadata in an in-memory registry.
- Liveness is derived from the tunnel stream lifecycle.

In practice today:
- `vtr hub` runs a local coordinator + web UI.
- `vtr spoke` opens a tunnel so the hub routes requests to it.
- `vtr hub --no-coordinator` runs a hub-only aggregator (no local sessions).

## What works now

- Spoke registration via tunnel hello (name/version/labels).
- Hub retains last-seen metadata (name, version, labels).
- Hub routes List/Info/Send/Subscribe/Wait via tunnel-connected spokes.
- Tunnel mode works without any spoke-side listeners.
- Hub aggregates session lists across spokes.
- Stream calls now fail deterministically with `Unavailable` when tunnel backlog drops them.
- Hub logs subscribe tunnel failures with explicit reason strings.

## What is not implemented yet

- Persistent federation configuration or policy.

## Reliability notes

- The tunnel send queue is latest-bounded; under sustained pressure, oldest queued calls can be dropped.
- When a dropped call is a streaming call, the pending request is failed immediately (`codes.Unavailable`, reason `tunnel_backlog_drop`) instead of hanging.
- Unary calls continue to use existing timeout/error behavior.

## Planned direction

- Keep tunnel-first federation and expand metadata (capabilities, versions).
- Web UI and CLI attach to hub as a single entry point.

## Related commands

```
# Hub
vtr hub --addr 127.0.0.1:4620

# Spoke (tunnel, no listeners)
vtr spoke --hub hub.internal:4620 --name spoke-a

# Spoke (tunnel only)
vtr spoke --hub hub.internal:4620 --name spoke-a
```
