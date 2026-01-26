# Federation (Hub / Spoke)

## Current status

Federation is partially implemented:

- `RegisterSpoke` RPC exists in `proto/vtr.proto`.
- `vtr spoke --hub <addr>` registers to a hub in a heartbeat loop.
- The hub stores spoke metadata in an in-memory registry.
- `Tunnel` RPC allows spokes to proxy requests without exposing listeners.

In practice today:
- `vtr hub` runs a local coordinator + web UI.
- `vtr spoke` can register and open a tunnel so the hub routes requests to it.

## What works now

- Spoke registration to hub with periodic heartbeats.
- Hub retains last-seen metadata (name, grpc_addr, version, labels).
- Hub routes List/Info/Send/Subscribe/Wait via tunnel-connected spokes.
- Tunnel mode works without TCP/Unix listeners on the spoke.
- Hub aggregates session lists across spokes.

## What is not implemented yet

- Configuration blocks for federation in `vtrpc.toml`.

## Planned direction

- Hub maintains a live view of spokes (registration + health).
- Hub proxies gRPC requests to the correct spoke using `spoke:session` routing.
- Web UI and CLI can attach to hub as a single entry point.

## Related commands

```
# Hub
vtr hub --addr 127.0.0.1:4620

# Spoke (tunnel, no listeners)
vtr spoke --hub hub.internal:4621 --name spoke-a

# Spoke with local Unix socket
vtr spoke --hub hub.internal:4621 --serve-socket --socket /tmp/vtrpc.sock
```
