# Tracing Strategy

This document proposes an OpenTelemetry tracing strategy for vtr. It focuses on
propagating traces across the hub <-> spoke tunnel, capturing packet loss and
latency signals, and making traces queryable by agents.

## Goals

- Distributed tracing that survives async hub <-> spoke tunnel hops.
- Clear visibility into latency and drop behavior in streaming paths.
- Span model that works for streaming gRPC without exploding cardinality.
- Coverage across all relevant layers (gRPC, tunnel, PTY, VT, coordinator,
  renderers).
- Trace storage that agents can query via API (not just dashboards).

## Architecture (Tracing View)

```
                                    +------------------+
                                    |  vtr agent/tui   |
                                    |  web UI (WS)     |
                                    +---------+--------+
                                              |
                                   gRPC / WS / HTTP
                                              |
+------------------+     Tunnel (bi-di gRPC stream)     +------------------+
| Hub Coordinator  | <--------------------------------> | Spoke Coordinator|
| gRPC API         |                                   | gRPC API         |
| Session Registry |                                   | Session Registry |
+----+-------------+                                   +----+-------------+
     |                                                      |
     | PTY I/O + VT Engine                                  | PTY I/O + VT Engine
     v                                                      v
+----+-------------+                                   +----+-------------+
| Session (PTY)    |                                   | Session (PTY)    |
| Idle/Wait logic  |                                   | Idle/Wait logic  |
+------------------+                                   +------------------+

Tracing notes:
- Client -> hub uses standard gRPC/HTTP propagation.
- Hub -> spoke uses tunnel frames; trace context must be injected manually.
- Streaming paths (Subscribe, Tunnel stream) use long-lived spans with events.
```

## Distributed tracing through the tunnel

### Propagation requirement

OpenTelemetry propagation supports W3C Trace Context (traceparent, tracestate)
plus W3C Baggage. In gRPC, otelgrpc can inject/extract headers automatically
via gRPC stats handlers, but the tunnel frames do not have metadata today, so
trace context must be carried explicitly in the tunnel payload. Recommended
approach:

- Add optional trace context fields on TunnelFrame or TunnelRequest:
  - trace_parent (string)
  - trace_state (string)
  - baggage (string, optional)
- On the hub side, use a composite propagator (TraceContext + Baggage) and
  propagation.MapCarrier to inject into a map stored on the TunnelRequest.
- On the spoke side, extract into a new context before decoding and dispatching
  the request. This makes the tunneled span a child of the original trace.

If adding fields is too invasive, a minimal alternative is to wrap the payload
in an envelope message that contains the context and the original bytes. The
core requirement is that the tunnel hop preserves traceparent and tracestate.

### Async linkage

For async work that happens after the RPC returns (for example, delayed screen
updates or idle transitions), create new spans with Span Links to the original
context rather than reusing the same parent span. This avoids long-lived parent
spans and makes causal relationships explicit.

## Streaming span strategy

Streaming gRPC is long-lived and high-volume. The strategy below keeps span
counts bounded while still recording per-message behavior.

- One span per stream lifetime:
  - vtr.grpc.Subscribe (server)
  - vtr.tunnel.Stream (hub and spoke sides)
  - vtr.ws.Subscribe (web socket bridge)
- Use span events for per-message details:
  - event names: screen.keyframe, screen.delta, raw_output, session_idle
  - attributes: frame_id, bytes, dropped_frames, queue_delay_ms
- Optional short child spans only for high-cost operations:
  - vt.render.keyframe
  - screen.encode
  - pty.read_batch
- Record message send/receive events with otelgrpc.WithMessageEvents when
  debugging, but default to off (or sampled) to avoid high overhead.

Span IDs should be stable per stream. Do not allocate a span per frame.
Instead use per-event data with bounded cardinality.

## Packet loss and latency visibility

vtr has intentional application-level dropping (latest-only screen updates)
that should be treated as packet loss in traces. Recommended signals:

- stream.dropped_frames (count) on Subscribe spans
- stream.backpressure (event) with duration
- stream.queue_depth (attribute or event)
- screen.frame_id_gap (event) when frame_id skips
- tunnel.enqueue_delay_ms and tunnel.rtt_ms on tunnel spans
- pty.read_to_render_ms measured from PTY read -> VT render -> screen send

Network-level packet loss is masked by TCP, but will manifest as longer send
latency or gRPC stream resets. Record gRPC errors and stream restarts.

## Span hierarchy proposal

Example hierarchy for a request routed through the hub to a spoke:

- vtr.grpc.WaitForIdle (server span, hub)
  - vtr.tunnel.dispatch (hub -> spoke)
    - vtr.tunnel.request (spoke side decode + dispatch)
      - vtr.grpc.WaitForIdle (server span, spoke)
        - coordinator.wait_for_idle
          - session.wait_for_idle

Example hierarchy for streaming Subscribe:

- vtr.grpc.Subscribe (server span, hub)
  - subscribe.snapshot (initial keyframe)
  - subscribe.stream (long-lived span)
    - event: screen.keyframe (frame_id, bytes, dropped_frames)
    - event: raw_output (bytes)
    - event: session_idle (idle=true/false)

If a Subscribe is routed through the tunnel:

- vtr.grpc.Subscribe (hub)
  - vtr.tunnel.stream (hub)
    - vtr.tunnel.stream (spoke)
      - vtr.grpc.Subscribe (spoke)
        - vt.render.keyframe (child span, sampled)
        - event: screen.keyframe

## Multi-layer instrumentation map

1. Client layer
   - vtr agent / tui gRPC client (otelgrpc client stats handler)
   - web UI WebSocket bridge (server-side Go, otelhttp middleware)
   - optional browser OTel for Web UI (OTLP over HTTP)

2. Transport layer
   - gRPC server stats handler on coordinator (otelgrpc.NewServerHandler)
   - gRPC client stats handler for hub -> spoke and client -> hub
     (otelgrpc.NewClientHandler)
   - WebSocket bridge HTTP handlers (otelhttp.NewMiddleware)

3. Tunnel layer
   - tunnel stream span (hub + spoke)
   - per-call tunnel dispatch spans
   - context propagation injected into tunnel frames

4. Coordinator layer
   - session lifecycle spans (spawn, close, remove)
   - wait/idle spans
   - subscribe span events

5. PTY I/O layer
   - read/write batch spans
   - per-batch bytes + latency

6. VT engine + screen rendering
   - vt.parse, vt.render.keyframe (sampled)
   - screen.encode
   - dropped frame accounting

7. Storage + query layer
   - exporter spans (OTLP)
   - backend query spans (optional, for agent trace queries)

## Recommended OTel libraries for Go

Core
- go.opentelemetry.io/otel (API)
- go.opentelemetry.io/otel/sdk (SDK)
- go.opentelemetry.io/otel/trace (tracing API)
- go.opentelemetry.io/otel/propagation (TraceContext + Baggage)

Transport instrumentation
- go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp

Exporters
- go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp

Recommended defaults:
- Set a composite propagator: TraceContext + Baggage.
- Use grpc.WithStatsHandler(otelgrpc.NewClientHandler(...)) for clients.
- Use grpc.StatsHandler(otelgrpc.NewServerHandler(...)) for servers.
- Use otelhttp.NewMiddleware for inbound HTTP and otelhttp.NewTransport for
  outbound HTTP.

Use the OpenTelemetry Collector in front of the backend to keep export
configuration stable and allow fan-out.

## Sink strategy (agent-queryable traces)

Agents need programmatic access to traces. Favor backends with stable query
APIs and low-latency trace lookup.

Recommended options:

1) Grafana Tempo (open source)
- HTTP API for trace-by-id and search; supports tag search and TraceQL queries.
- Good fit for agent queries (simple HTTP calls).
- Query endpoints include /api/traces/<traceID>, /api/v2/traces/<traceID>, and
  /api/search (plus /api/search/tags and /api/search/tag/<tag>/values).

2) Jaeger
- Stable gRPC QueryService for programmatic access to traces.
- HTTP JSON API exists but is explicitly internal; use gRPC for automation.

Suggested pipeline:
- vtr -> OTLP exporter -> OpenTelemetry Collector -> Tempo or Jaeger
- Add a vtr agent command that queries the backend API and renders results
  (trace tree, span timing, dropped frame annotations).

## Implementation phases

Phase 0: baseline plumbing
- Add OTel SDK init, resource attributes (service.name, service.version,
  coordinator.name, session.id).
- OTLP exporter + Collector wiring.
- gRPC client/server interceptors for all RPCs.

Phase 1: tunnel propagation
- Add trace context fields to TunnelFrame or TunnelRequest.
- Inject/extract propagation on hub/spoke.
- Add tunnel dispatch spans with call_id attribute.

Phase 2: streaming spans
- Add Subscribe stream spans with bounded event emission.
- Add frame drop counters and frame_id gap events.
- Add tunnel stream spans and enqueue/rtx timing.

Phase 3: PTY/VT instrumentation
- PTY read/write batch spans with bytes and latency.
- VT render spans (sampled) with row/col counts.
- Correlate render -> send latency.

Phase 4: agent-query tooling
- vtr agent trace <trace-id> (Tempo or Jaeger backend)
- vtr agent trace-search --session <id> --since 5m
- Add output that highlights drops, delays, and idle transitions.

## Example span output (abbreviated)

```
TraceID: 4bf92f3577b34da6a3ce929d0e0e4736

- vtr.grpc.Subscribe [hub] duration=12.4s
  attrs: session.id=..., coordinator=hub-1
  event: screen.keyframe frame_id=120 bytes=6521 dropped_frames=2 queue_delay_ms=18
  event: raw_output bytes=128
  - vtr.tunnel.stream [hub] duration=12.4s
    attrs: call_id=abc123, spoke=spoke-2
    - vtr.tunnel.stream [spoke] duration=12.3s
      - vtr.grpc.Subscribe [spoke] duration=12.3s
        - vt.render.keyframe duration=3.1ms attrs: rows=40 cols=120

- vtr.grpc.WaitForIdle [hub] duration=210ms
  - vtr.tunnel.dispatch duration=14ms attrs: call_id=def456
    - vtr.grpc.WaitForIdle [spoke] duration=178ms
      - session.wait_for_idle duration=170ms attrs: idle_duration=100ms
```
