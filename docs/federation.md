# Federation (Hub / Spoke)

## Current status

Federation is partially implemented:

- `RegisterSpoke` RPC exists in `proto/vtr.proto`.
- `vtr spoke --hub <addr>` registers to a hub in a heartbeat loop.
- The hub stores spoke metadata in an in-memory registry.
- No proxying of session I/O, list, or streaming is implemented yet.

In practice today:
- `vtr hub` runs a local coordinator + web UI.
- `vtr spoke` can register, but the hub does not route requests to spokes.

## What works now

- Spoke registration to hub with periodic heartbeats.
- Hub retains last-seen metadata (name, grpc_addr, version, labels).

## What is not implemented yet

- Hub-side proxying for List/Info/Send/Subscribe/Wait calls.
- Aggregated session list across spokes in hub or CLI.
- Configuration blocks for federation in `vtrpc.toml`.

## Planned direction

- Hub maintains a live view of spokes (registration + health).
- Hub proxies gRPC requests to the correct spoke using `spoke:session` routing.
- Web UI and CLI can attach to hub as a single entry point.

## Related commands

```
# Hub
vtr hub --addr 127.0.0.1:4620

# Spoke (client-only by default)
vtr spoke --hub hub.internal:4621 --name spoke-a

# Spoke with local Unix socket
vtr spoke --hub hub.internal:4621 --serve-socket --socket /tmp/vtrpc.sock
```
