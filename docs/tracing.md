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
   - optional browser tracing forwarded to the hub and written to JSONL

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
   - exporter spans (JSONL writer)
   - no backend query service

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
- Custom JSONL SpanExporter (write one span per line)
- Optional: JSONL metric snapshot writer (periodic flush)

Recommended defaults:
- Set a composite propagator: TraceContext + Baggage.
- Use grpc.WithStatsHandler(otelgrpc.NewClientHandler(...)) for clients.
- Use grpc.StatsHandler(otelgrpc.NewServerHandler(...)) for servers.
- Use otelhttp.NewMiddleware for inbound HTTP and otelhttp.NewTransport for
  outbound HTTP.

## Sink strategy (agent-queryable traces)

Keep this lightweight and self-contained. Do not depend on a backend service
or query API. Instead, write spans and derived metrics to a local JSONL file
that agents can parse with rg/jq.

Recommended approach:

- Implement a custom JSONL SpanExporter that writes one JSON object per span.
- Add a periodic metrics snapshot writer (JSONL) for counters/gauges derived
  from spans (dropped_frames, queue_delay_ms, frame_id_gap, rtt_ms, etc).
- Store files locally (e.g., ~/.local/share/vtr/traces.jsonl and
  ~/.local/share/vtr/metrics.jsonl) and make the path configurable via config
  or env var (VTR_TRACE_JSONL_PATH, VTR_METRICS_JSONL_PATH).
- Rotate files by size/time (simple daily or size-based rotation) to keep
  the file bounded.

Example JSONL span line:

```
{\"ts\":\"2026-02-01T17:30:05.123Z\",\"type\":\"span\",\"trace_id\":\"4bf92f...\",\"span_id\":\"00f067aa...\",\"parent_span_id\":\"9f1c2d...\",\"name\":\"vtr.grpc.Subscribe\",\"start_ns\":1738431000000000000,\"end_ns\":1738431001240000000,\"attrs\":{\"session.id\":\"...\",\"coordinator\":\"hub-1\"},\"events\":[{\"name\":\"screen.keyframe\",\"attrs\":{\"frame_id\":120,\"bytes\":6521,\"dropped_frames\":2}}]}
```

Example JSONL metrics line:

```
{\"ts\":\"2026-02-01T17:30:05.200Z\",\"type\":\"metric\",\"name\":\"stream.dropped_frames\",\"value\":2,\"unit\":\"1\",\"attrs\":{\"session.id\":\"...\",\"coordinator\":\"hub-1\"}}
```

Agents can then run:
- rg 'session.id\":\"<id>' ~/.local/share/vtr/traces.jsonl
- jq 'select(.type==\"metric\" and .name==\"stream.dropped_frames\")' ~/.local/share/vtr/metrics.jsonl

## Implementation phases

Phase 0: baseline plumbing
- Add OTel SDK init, resource attributes (service.name, service.version,
  coordinator.name, session.id).
- JSONL exporter wiring.
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
- vtr agent trace --jsonl <path> --trace <trace-id>
- vtr agent trace-search --jsonl <path> --session <id> --since 5m
- Add output that highlights drops, delays, and idle transitions using the
  local JSONL files (no backend).

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
