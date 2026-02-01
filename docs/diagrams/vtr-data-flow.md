# vtr data flow (simplified)

This is a minimal, high-level view of how data flows when multiple clients
attach to a hub that routes to local sessions and spokes.

```mermaid
%%{init: {"flowchart": {"curve": "basis"}, "theme": "base", "themeVariables": {"fontFamily": "IBM Plex Mono, ui-monospace", "fontSize": "14px", "primaryColor": "#e7f5ff", "primaryTextColor": "#0b1f3a", "primaryBorderColor": "#1f5e99", "lineColor": "#5c6f82"}} }%%
flowchart LR
  classDef client fill:#fff7ed,stroke:#f59f00,color:#5c3d00;
  classDef hub fill:#e7f5ff,stroke:#1f5e99,color:#0b1f3a;
  classDef spoke fill:#f3f0ff,stroke:#6f42c1,color:#2d1b69;
  classDef engine fill:#fff4e6,stroke:#f08c00,color:#5c3d00;
  classDef proto fill:#f8f9fa,stroke:#adb5bd,color:#343a40,stroke-dasharray:4 3;
  classDef note fill:#f1f3f5,stroke:#868e96,color:#343a40,stroke-dasharray:2 2;

  proto["proto/vtr.proto\nContract for gRPC + WS + Tunnel"]:::proto

  subgraph Clients["Clients"]
    cli["CLI / TUI / Agent"]:::client
    web["Web UI (browsers)"]:::client
  end

  subgraph Hub["Hub (vtr hub)"]
    hub["Federated API\n(gRPC + WS bridge + routing)"]:::hub
    snapshots["SessionsSnapshot\n(aggregated view)"]:::note
  end

  subgraph Local["Local coordinator (optional)"]
    local["Coordinator\n(PTY + VT engine)"]:::engine
  end

  subgraph Spokes["Spokes"]
    tunnel["Tunnel stream\n(bidirectional)"]:::spoke
    spoke["Spoke coordinator\n(PTY + VT engine)"]:::engine
  end

  proto --- hub

  cli -->|"gRPC: Spawn / Send / Subscribe"| hub
  web -->|"WS Any: Subscribe + input"| hub
  hub -.->|"SubscribeSessions"| snapshots
  snapshots -.->|"SessionsSnapshot"| cli
  snapshots -.->|"SessionsSnapshot"| web

  hub <--> |"local calls"| local
  hub <--> |"TunnelRequest / Event"| tunnel
  tunnel <--> |"Spoke RPCs"| spoke
  spoke -->|"screen updates + raw output"| tunnel
```

## Extension points (proto-first)

- Add messages/RPCs in `proto/vtr.proto`.
- Implement server behavior in `server/grpc.go`.
- If routed to spokes, wire `cmd/vtr/tunnel.go` (hub + spoke).
- If used by Web UI, handle the new `Any` type in `cmd/vtr/web_cmd.go` and `web/src/lib/ws.ts`.
