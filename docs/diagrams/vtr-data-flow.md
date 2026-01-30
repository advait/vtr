# vtr data flow (hub + spokes)

This diagram shows how bytes and screen state move through the system when a hub
routes traffic to multiple spokes while several UI clients and a CLI client attach
at the same time. It also highlights where the protobuf contract plugs in.

```mermaid
%%{init: {"flowchart": {"curve": "basis"}, "theme": "base", "themeVariables": {"fontFamily": "IBM Plex Mono, ui-monospace", "fontSize": "14px", "primaryColor": "#e7f5ff", "primaryTextColor": "#0b1f3a", "primaryBorderColor": "#1f5e99", "lineColor": "#5c6f82"}} }%%
flowchart LR
  classDef client fill:#fff7ed,stroke:#f59f00,color:#5c3d00;
  classDef hub fill:#e7f5ff,stroke:#1f5e99,color:#0b1f3a;
  classDef spoke fill:#f3f0ff,stroke:#6f42c1,color:#2d1b69;
  classDef engine fill:#fff4e6,stroke:#f08c00,color:#5c3d00;
  classDef proto fill:#f8f9fa,stroke:#adb5bd,color:#343a40,stroke-dasharray:4 3;
  classDef note fill:#f1f3f5,stroke:#868e96,color:#343a40,stroke-dasharray:2 2;

  proto["proto/vtr.proto\nRPC + messages\nSubscribe, Send*, Tunnel, Sessions"]:::proto
  sessionRef["SessionRef { id, coordinator }\nHub routes by coordinator"]:::note
  subscribeNote["Subscribe stream\n- keyframes today\n- latest-only backpressure"]:::note

  subgraph Clients["Clients (many can attach concurrently)"]
    cli["CLI / TUI / Agent\ngRPC client"]:::client
    webA["Web UI (browser A)"]:::client
    webB["Web UI (browser B)"]:::client
  end

  subgraph Hub["Hub (vtr hub)"]
    web["Web server + WS bridge\n/api/ws, /api/ws/sessions"]:::hub
    grpc["Federated VTR service\n(gRPC API)"]:::hub
    sessionsAgg["Sessions snapshot\naggregator"]:::hub
    registry["Spoke registry\n(hello + liveness)"]:::hub
    tunnelHub["Tunnel endpoints\n(bidirectional stream)"]:::hub

    subgraph Local["Local coordinator (optional)"]
      localPTY["PTY session(s)"]:::engine
      localVT["Ghostty VT\nscreen grid + scrollback"]:::engine
      localPTY -->|"output bytes"| localVT
    end

    web -->|"gRPC client"| grpc
    grpc --> sessionsAgg
    sessionsAgg --> registry
    grpc <--> tunnelHub
  end

  subgraph Spokes["Spokes (many)"]
    subgraph SpokeA["Spoke A"]
      tA["Tunnel client"]:::spoke
      gA["Spoke VTR service"]:::spoke
      pA["PTY session(s)"]:::engine
      vA["Ghostty VT"]:::engine
      gA --> pA
      pA -->|"output bytes"| vA
      vA -->|"ScreenUpdate keyframes"| gA
      pA -->|"raw output buffer"| gA
      tA <--> gA
    end
    subgraph SpokeB["Spoke B"]
      tB["Tunnel client"]:::spoke
      gB["Spoke VTR service"]:::spoke
      pB["PTY session(s)"]:::engine
      vB["Ghostty VT"]:::engine
      gB --> pB
      pB -->|"output bytes"| vB
      vB -->|"ScreenUpdate keyframes"| gB
      pB -->|"raw output buffer"| gB
      tB <--> gB
    end
  end

  proto --- grpc
  proto --- web
  proto --- tA
  proto --- tB

  cli -->|"gRPC: Spawn / Send* / Resize / Subscribe"| grpc
  webA -->|"WS Any: SubscribeRequest + input"| web
  webB -->|"WS Any: SubscribeRequest + input"| web

  sessionRef --- grpc
  subscribeNote --- grpc

  grpc -->|"local sessions"| localPTY
  localPTY -->|"raw output buffer"| grpc
  localVT -->|"ScreenUpdate keyframes"| grpc

  tunnelHub <--> |"TunnelRequest / Response / Event"| tA
  tunnelHub <--> |"TunnelRequest / Response / Event"| tB

  grpc -->|"SubscribeEvent stream"| cli
  grpc -->|"SubscribeEvent stream"| web

  cli -.->|"SubscribeSessions"| sessionsAgg
  web -.->|"SubscribeSessions"| sessionsAgg
  sessionsAgg -.->|"SessionsSnapshot (all coordinators)"| cli
  sessionsAgg -.->|"SessionsSnapshot"| web
```

## Extension points (proto-first)

- `proto/vtr.proto` is the contract for gRPC, tunnel routing, and WebSocket `Any` frames.
- To add a new capability, add messages/RPCs in the proto, implement in `server/grpc.go`,
  and wire tunnel routing in `cmd/vtr/tunnel.go` (hub + spoke). If it needs Web UI
  support, handle the new `Any` type in `cmd/vtr/web_cmd.go` and `web/src/lib/ws.ts`.
