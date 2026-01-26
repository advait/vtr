# Federation: Hub-and-Spoke Architecture (Draft)

Status: straw-man proposal for coordinator federation.

## Summary
Introduce a hub coordinator that aggregates multiple spoke coordinators over a
Tailscale transport. The hub serves the web UI and exposes gRPC (local UDS plus
optional TCP with TLS+token) for clients, while spokes remain the source of
truth for PTY state. The hub proxies session list and I/O calls to the
appropriate spoke and can optionally proxy streaming Subscribe events.

## Goals
- Central entrypoint for web UI and CLI across many coordinators.
- Keep PTY lifecycle and VT state owned by the spoke coordinator.
- Work over Tailscale without exposing public ports.
- Preserve local UDS access on each spoke for local clients.
- Keep client UX aligned with existing multi-coordinator naming (coordinator:session).

## Non-goals
- Global scheduling or moving sessions across coordinators.
- Federated PTY state replication.
- Multi-tenant auth beyond TLS+token or tailnet ACLs.

## Terminology
- Hub: Aggregating coordinator that serves web UI and federated gRPC.
- Spoke: Per-container coordinator that owns PTY state.
- Tailnet: Tailscale network used for spoke connectivity.

## Components
### Spoke coordinator
- Runs the existing VTR gRPC service on a local UDS.
- Optionally exposes the gRPC service over TCP on localhost and publishes it to
  the tailnet via `tailscale serve`.
- Remains authoritative for session state, screen updates, and input handling.

### Hub coordinator
- Dials each spoke over the tailnet and maintains a live view of sessions.
- Serves a federated gRPC endpoint (optional local UDS) for clients.
- Runs `vtr hub` to host the web UI and WS bridge.
- Tracks per-spoke health and handles partial availability.

### Clients
- CLI/TUI can connect to the hub UDS (or TCP) instead of multiple local sockets.
- Web UI connects to the hub HTTP/WS endpoints.
- Session addressing uses `spoke:session` to route to the correct coordinator.

## Transport with Tailscale
Straw-man transport options:
1. Spoke runs gRPC on `127.0.0.1:<port>` and uses `tailscale serve` to expose
   it to the tailnet. Hub dials `spoke-name.tailnet.ts.net:<port>`.
2. Embed tsnet in the hub and/or spoke to avoid shelling to `tailscale serve`,
   while still keeping ports bound to localhost.

The hub relies on TLS+token for non-loopback gRPC, or tailnet ACLs/tags when
served through Tailscale.

## Federation behavior
### Spoke discovery
- Static: hub config lists spokes with name + tailnet address + port.
- Optional: spokes register themselves with the hub over gRPC (RegisterSpoke) to advertise
  name, address, and version metadata.
- Optional future: discovery via Tailscale netmap or tagged hosts.

### Session listing
- Hub periodically calls `List` on each spoke.
- Hub returns a merged list, with names rewritten as `spoke:session`.
- Hub marks sessions from unreachable spokes as stale/unavailable.

### Attach / Subscribe streaming
- Client calls `Subscribe` on the hub with `spoke:session`.
- Hub opens a stream to the target spoke and forwards events to the client.
- Optional optimization: hub returns a redirect hint so clients can connect
  directly to the spoke when not using the web UI.

### Input / control APIs
- Hub forwards `SendText`, `SendKey`, `Resize`, `WaitFor`, etc to the spoke.
- Errors include spoke identity so the client can surface clear messages.

## Failure handling
- Hub survives partial spoke outages and returns partial results.
- Per-spoke circuit breaker to avoid hot-loop retries.
- Web UI displays spoke health and last-seen timestamps.

## Configuration sketch
`vtrpc.toml` (draft):
```
[federation]
mode = "hub" # or "spoke"

[[federation.spokes]]
name = "build-a"
address = "build-a.tailnet.ts.net:8443"

[[federation.spokes]]
name = "build-b"
address = "build-b.tailnet.ts.net:8443"
```

Spokes still expose their local UDS for local clients. The hub can also expose
its federated gRPC service over a local UDS for the CLI.

## Alternatives and tradeoffs
1. Full mesh (no hub):
   - Pros: no extra proxy hop; simple server design.
   - Cons: web UI and CLI must manage N coordinators; no single entrypoint.
2. Centralized coordinator (spokes are thin PTY shims):
   - Pros: single source of truth; simple client API.
   - Cons: high latency; hub becomes heavy and fragile; breaks local UDS usage.
3. Control-plane hub, data-plane direct:
   - Pros: hub load is light; streaming traffic stays local to spokes.
   - Cons: clients need a redirect protocol; web UI must speak to multiple
     coordinators instead of one.

## Open questions
- Should the hub expose the existing VTR gRPC service, or add a new
  Federation service with explicit `spoke` fields?
- Is static config acceptable, or do we need dynamic discovery/registration?
- Do we require hub-side session caching, or always hit spokes for List?
- Should web UI always connect to hub, or should it connect to spokes directly
  when running inside a tailnet?
- How should per-spoke ACLs map to user access in the hub?
- Do we need a standard redirect mechanism for data-plane direct mode?
