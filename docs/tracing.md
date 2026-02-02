# Tracing (consumer view)

Tracing is always on for the hub and spokes. Spans are written as JSONL and
centralized on the hub; spokes keep a local spool only when the hub is
unreachable.

## Where traces live

- Hub JSONL: `~/.config/vtrpc/traces.jsonl`
- Spoke spool (temporary): `~/.config/vtrpc/spool/spool-<spoke>-*.jsonl`

`VTRPC_CONFIG_DIR` overrides the base directory (all paths above become
`$VTRPC_CONFIG_DIR/...`).

## What gets traced today

- gRPC client/server spans via `otelgrpc`.
- Web bridge HTTP spans via `otelhttp` (hub process).
- Trace context propagates across the hub<->spoke tunnel using W3C
  `traceparent`, `tracestate`, and `baggage` fields on tunnel requests.
- Spokes forward trace batches to the hub over the tunnel; when the tunnel is
  down, spans are spooled locally and backfilled on reconnect.

Notes:
- Agent/TUI CLI spans are created but **not persisted** (client sink is discard).
- There are no custom spans for PTY/VT/rendering yet, and no metrics JSONL yet.

## How to query traces

Each line is one JSON object representing a span. Common fields:
`trace_id`, `span_id`, `parent_span_id`, `name`, `start_ns`, `end_ns`,
`attrs`, `resource`, `events`.

Examples (run on the hub):

- Find spans by name:
  - `rg '"name":"vtr.grpc.Subscribe"' ~/.config/vtrpc/traces.jsonl`
- Filter by coordinator:
  - `jq 'select(.resource["coordinator.name"]=="hub-1")' ~/.config/vtrpc/traces.jsonl`
- Filter by trace id:
  - `rg '"trace_id":"<trace-id>"' ~/.config/vtrpc/traces.jsonl`

## Hybrid sink behavior (hub + spool)

- The hub writes spans to `traces.jsonl` and rotates by size (64MB).
- Spokes try to send spans to the hub immediately.
- If the tunnel is down, spokes append to `spool-<spoke>.jsonl` and rotate to
  `spool-<spoke>-*.jsonl`. When the tunnel reconnects, the backlog is sent to
  the hub and the spool files are deleted.

## Roadmap (not implemented yet)

- Metrics JSONL snapshots derived from spans.
- Span events for screen frames, dropped frames, and queue timing.
- PTY/VT/rendering spans.
- Agent CLI helpers to search traces locally.
