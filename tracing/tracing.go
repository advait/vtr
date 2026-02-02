package tracing

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

type Role string

const (
	RoleHub    Role = "hub"
	RoleSpoke  Role = "spoke"
	RoleClient Role = "client"
)

type Options struct {
	Role           Role
	ServiceName    string
	ServiceVersion string
	Coordinator    string
	BaseDir        string
	Transport      Transport
	Logger         *slog.Logger
}

type Handle struct {
	provider *sdktrace.TracerProvider
	sink     Sink
	role     Role
}

func Init(opts Options) (*Handle, error) {
	logger := opts.Logger
	if logger == nil {
		logger = slog.Default()
	}
	serviceName := strings.TrimSpace(opts.ServiceName)
	if serviceName == "" {
		serviceName = "vtr"
	}
	baseDir := strings.TrimSpace(opts.BaseDir)
	if baseDir == "" {
		baseDir = defaultBaseDir()
	}
	sink, err := buildSink(opts.Role, baseDir, opts.Transport)
	if err != nil {
		logger.Warn("tracing sink unavailable; falling back to discard", "err", err)
		sink = discardSink{}
	}

	resAttrs := []attribute.KeyValue{
		attribute.String("service.name", serviceName),
	}
	if strings.TrimSpace(opts.ServiceVersion) != "" {
		resAttrs = append(resAttrs, attribute.String("service.version", opts.ServiceVersion))
	}
	if strings.TrimSpace(opts.Coordinator) != "" {
		resAttrs = append(resAttrs, attribute.String("coordinator.name", opts.Coordinator))
	}
	if strings.TrimSpace(string(opts.Role)) != "" {
		resAttrs = append(resAttrs, attribute.String("vtr.role", string(opts.Role)))
	}

	res, _ := resource.New(
		context.Background(),
		resource.WithAttributes(resAttrs...),
	)

	exporter := newJSONLExporter(sink)
	processor := sdktrace.NewBatchSpanProcessor(exporter)
	provider := sdktrace.NewTracerProvider(
		sdktrace.WithResource(res),
		sdktrace.WithSpanProcessor(processor),
		sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.AlwaysSample())),
	)

	otel.SetTracerProvider(provider)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	h := &Handle{provider: provider, sink: sink, role: opts.Role}
	if setter, ok := sink.(transportSetter); ok && opts.Transport != nil {
		setter.SetTransport(opts.Transport)
	}
	if opts.Role == RoleHub {
		registerHubSink(sink)
	}
	return h, nil
}

func (h *Handle) Shutdown(ctx context.Context) error {
	if h == nil || h.provider == nil {
		return nil
	}
	return h.provider.Shutdown(ctx)
}

func (h *Handle) Flush(ctx context.Context) error {
	if h == nil {
		return nil
	}
	if flusher, ok := h.sink.(flusher); ok {
		return flusher.Flush(ctx)
	}
	return nil
}

func (h *Handle) SetTransport(transport Transport) {
	if h == nil {
		return
	}
	if setter, ok := h.sink.(transportSetter); ok {
		setter.SetTransport(transport)
	}
}

func defaultBaseDir() string {
	if override := strings.TrimSpace(os.Getenv("VTRPC_CONFIG_DIR")); override != "" {
		return expandPath(override)
	}
	dir, err := os.UserConfigDir()
	if err != nil || dir == "" {
		return ""
	}
	return filepath.Join(dir, "vtrpc")
}

func expandPath(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if trimmed == "~" || strings.HasPrefix(trimmed, "~/") {
		home, err := os.UserHomeDir()
		if err != nil || home == "" {
			return value
		}
		if trimmed == "~" {
			return home
		}
		return filepath.Join(home, trimmed[2:])
	}
	return value
}

func tracePath(baseDir string) string {
	if strings.TrimSpace(baseDir) == "" {
		return ""
	}
	return filepath.Join(baseDir, "traces.jsonl")
}

func spoolDir(baseDir string) string {
	if strings.TrimSpace(baseDir) == "" {
		return ""
	}
	return filepath.Join(baseDir, "spool")
}

func buildSink(role Role, baseDir string, transport Transport) (Sink, error) {
	switch role {
	case RoleHub:
		return newFileSink(tracePath(baseDir))
	case RoleSpoke:
		spool, err := newSpoolWriter(spoolDir(baseDir))
		if err != nil {
			return nil, err
		}
		return newHybridSink(transport, spool), nil
	case RoleClient:
		return discardSink{}, nil
	default:
		return discardSink{}, nil
	}
}
