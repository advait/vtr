package tracing

import (
	"bytes"
	"context"
	"encoding/json"
	"time"

	"go.opentelemetry.io/otel/attribute"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/trace"
)

type jsonlExporter struct {
	sink Sink
}

type spanJSON struct {
	TS           string                 `json:"ts"`
	Type         string                 `json:"type"`
	TraceID      string                 `json:"trace_id"`
	SpanID       string                 `json:"span_id"`
	ParentSpanID string                 `json:"parent_span_id,omitempty"`
	Name         string                 `json:"name"`
	Kind         string                 `json:"kind,omitempty"`
	StartNS      int64                  `json:"start_ns"`
	EndNS        int64                  `json:"end_ns"`
	Attrs        map[string]interface{} `json:"attrs,omitempty"`
	Resource     map[string]interface{} `json:"resource,omitempty"`
	Events       []eventJSON            `json:"events,omitempty"`
}

type eventJSON struct {
	Name  string                 `json:"name"`
	TS    string                 `json:"ts"`
	Attrs map[string]interface{} `json:"attrs,omitempty"`
}

func newJSONLExporter(sink Sink) *jsonlExporter {
	return &jsonlExporter{sink: sink}
}

func (e *jsonlExporter) ExportSpans(ctx context.Context, spans []sdktrace.ReadOnlySpan) error {
	if e == nil || e.sink == nil || len(spans) == 0 {
		return nil
	}
	var buf bytes.Buffer
	for _, span := range spans {
		line, err := encodeSpan(span)
		if err != nil {
			return err
		}
		buf.Write(line)
	}
	return e.sink.Write(ctx, buf.Bytes())
}

func (e *jsonlExporter) Shutdown(ctx context.Context) error {
	if e == nil || e.sink == nil {
		return nil
	}
	if closer, ok := e.sink.(interface{ Close() error }); ok {
		return closer.Close()
	}
	return nil
}

func encodeSpan(span sdktrace.ReadOnlySpan) ([]byte, error) {
	if span == nil {
		return nil, nil
	}
	spanContext := span.SpanContext()
	parent := span.Parent()
	attrs := attrsToMap(span.Attributes())
	resourceAttrs := map[string]interface{}{}
	if res := span.Resource(); res != nil {
		resourceAttrs = attrsToMap(res.Attributes())
	}
	events := eventsToJSON(span.Events())

	payload := spanJSON{
		TS:      span.EndTime().UTC().Format(time.RFC3339Nano),
		Type:    "span",
		TraceID: spanContext.TraceID().String(),
		SpanID:  spanContext.SpanID().String(),
		Name:    span.Name(),
		Kind:    spanKindString(span.SpanKind()),
		StartNS: span.StartTime().UnixNano(),
		EndNS:   span.EndTime().UnixNano(),
		Attrs:   attrs,
		Resource: func() map[string]interface{} {
			if len(resourceAttrs) == 0 {
				return nil
			}
			return resourceAttrs
		}(),
		Events: events,
	}
	if parent.IsValid() {
		payload.ParentSpanID = parent.SpanID().String()
	}

	encoded, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	encoded = append(encoded, '\n')
	return encoded, nil
}

func attrsToMap(attrs []attribute.KeyValue) map[string]interface{} {
	if len(attrs) == 0 {
		return nil
	}
	out := make(map[string]interface{}, len(attrs))
	for _, attr := range attrs {
		out[string(attr.Key)] = attrValue(attr.Value)
	}
	return out
}

func attrValue(value attribute.Value) interface{} {
	switch value.Type() {
	case attribute.BOOL:
		return value.AsBool()
	case attribute.INT64:
		return value.AsInt64()
	case attribute.FLOAT64:
		return value.AsFloat64()
	case attribute.STRING:
		return value.AsString()
	case attribute.BOOLSLICE:
		return value.AsBoolSlice()
	case attribute.INT64SLICE:
		return value.AsInt64Slice()
	case attribute.FLOAT64SLICE:
		return value.AsFloat64Slice()
	case attribute.STRINGSLICE:
		return value.AsStringSlice()
	default:
		return value.AsInterface()
	}
}

func eventsToJSON(events []sdktrace.Event) []eventJSON {
	if len(events) == 0 {
		return nil
	}
	out := make([]eventJSON, 0, len(events))
	for _, event := range events {
		attrs := attrsToMap(event.Attributes)
		out = append(out, eventJSON{
			Name:  event.Name,
			TS:    event.Time.UTC().Format(time.RFC3339Nano),
			Attrs: attrs,
		})
	}
	return out
}

func spanKindString(kind trace.SpanKind) string {
	switch kind {
	case trace.SpanKindInternal:
		return "internal"
	case trace.SpanKindServer:
		return "server"
	case trace.SpanKindClient:
		return "client"
	case trace.SpanKindProducer:
		return "producer"
	case trace.SpanKindConsumer:
		return "consumer"
	default:
		return "unspecified"
	}
}
