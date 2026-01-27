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

## What works now

- Spoke registration via tunnel hello (name/version/labels).
- Hub retains last-seen metadata (name, version, labels).
- Hub routes List/Info/Send/Subscribe/Wait via tunnel-connected spokes.
- Tunnel mode works without TCP/Unix listeners on the spoke.
- Hub aggregates session lists across spokes.

## What is not implemented yet

- Persistent federation configuration or policy.

## Planned direction

- Keep tunnel-first federation and expand metadata (capabilities, versions).
- Web UI and CLI attach to hub as a single entry point.

## Related commands

```
# Hub
vtr hub --addr 127.0.0.1:4620

# Spoke (tunnel, no listeners)
vtr spoke --hub hub.internal:4621 --name spoke-a

# Spoke with local Unix socket
vtr spoke --hub hub.internal:4621 --serve-socket --socket /tmp/vtrpc.sock
```
