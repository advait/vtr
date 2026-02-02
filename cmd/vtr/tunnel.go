package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"sync"
	"time"

	proto "github.com/advait/vtrpc/proto"
	"github.com/advait/vtrpc/tracing"
	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	goproto "google.golang.org/protobuf/proto"
)

const (
	tunnelMethodSpawn             = "Spawn"
	tunnelMethodList              = "List"
	tunnelMethodSubscribeSessions = "SubscribeSessions"
	tunnelMethodInfo              = "Info"
	tunnelMethodKill              = "Kill"
	tunnelMethodClose             = "Close"
	tunnelMethodRemove            = "Remove"
	tunnelMethodRename            = "Rename"
	tunnelMethodGetScreen         = "GetScreen"
	tunnelMethodGrep              = "Grep"
	tunnelMethodSendText          = "SendText"
	tunnelMethodSendKey           = "SendKey"
	tunnelMethodSendBytes         = "SendBytes"
	tunnelMethodResize            = "Resize"
	tunnelMethodWaitFor           = "WaitFor"
	tunnelMethodWaitForIdle       = "WaitForIdle"
	tunnelMethodSubscribe         = "Subscribe"
	tunnelMethodDumpAsciinema     = "DumpAsciinema"
)

const tunnelSlowCallThreshold = time.Second

type tunnelRegistry struct {
	mu     sync.RWMutex
	spokes map[string]*tunnelEndpoint
}

func newTunnelRegistry() *tunnelRegistry {
	return &tunnelRegistry{spokes: make(map[string]*tunnelEndpoint)}
}

func (r *tunnelRegistry) Set(name string, endpoint *tunnelEndpoint) *tunnelEndpoint {
	if r == nil {
		return nil
	}
	key := strings.TrimSpace(name)
	if key == "" {
		return nil
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	prev := r.spokes[key]
	r.spokes[key] = endpoint
	return prev
}

func (r *tunnelRegistry) Get(name string) *tunnelEndpoint {
	if r == nil {
		return nil
	}
	key := strings.TrimSpace(name)
	if key == "" {
		return nil
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.spokes[key]
}

func (r *tunnelRegistry) Remove(name string, endpoint *tunnelEndpoint) {
	if r == nil {
		return
	}
	key := strings.TrimSpace(name)
	if key == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if current, ok := r.spokes[key]; ok && current == endpoint {
		delete(r.spokes, key)
	}
}

func (r *tunnelRegistry) Names() []string {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	names := make([]string, 0, len(r.spokes))
	for name := range r.spokes {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

func tunnelNames(r *tunnelRegistry) []string {
	if r == nil {
		return nil
	}
	return r.Names()
}

type tunnelCall struct {
	id     string
	ch     chan *proto.TunnelFrame
	mu     sync.Mutex
	closed bool
}

type tunnelSendResult int

const (
	tunnelSendOk tunnelSendResult = iota
	tunnelSendDroppedOldest
	tunnelSendFailed
)

func newTunnelCall(id string) *tunnelCall {
	return &tunnelCall{
		id: id,
		ch: make(chan *proto.TunnelFrame, 16),
	}
}

func (c *tunnelCall) send(frame *proto.TunnelFrame) tunnelSendResult {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return tunnelSendFailed
	}
	select {
	case c.ch <- frame:
		return tunnelSendOk
	default:
	}
	// Drop the oldest frame to avoid blocking the tunnel reader.
	select {
	case <-c.ch:
	default:
	}
	select {
	case c.ch <- frame:
		return tunnelSendDroppedOldest
	default:
		return tunnelSendFailed
	}
}

func (c *tunnelCall) close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return
	}
	c.closed = true
	close(c.ch)
}

type tunnelEndpoint struct {
	name   string
	stream proto.VTR_TunnelServer
	sendMu sync.Mutex

	mu     sync.Mutex
	calls  map[string]*tunnelCall
	closed bool
	logger *slog.Logger
}

func newTunnelEndpoint(name string, stream proto.VTR_TunnelServer, logger *slog.Logger) *tunnelEndpoint {
	if logger == nil {
		logger = slog.Default()
	}
	return &tunnelEndpoint{
		name:   strings.TrimSpace(name),
		stream: stream,
		calls:  make(map[string]*tunnelCall),
		logger: logger,
	}
}

func (e *tunnelEndpoint) send(frame *proto.TunnelFrame) error {
	if frame == nil {
		return nil
	}
	e.sendMu.Lock()
	defer e.sendMu.Unlock()
	return e.stream.Send(frame)
}

func (e *tunnelEndpoint) startCall() (*tunnelCall, error) {
	if e == nil {
		return nil, errors.New("tunnel endpoint is nil")
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.closed {
		return nil, errors.New("tunnel endpoint is closed")
	}
	id := uuid.NewString()
	call := newTunnelCall(id)
	e.calls[id] = call
	return call, nil
}

func (e *tunnelEndpoint) endCall(id string) {
	if e == nil {
		return
	}
	e.mu.Lock()
	call := e.calls[id]
	delete(e.calls, id)
	e.mu.Unlock()
	if call != nil {
		call.close()
	}
}

func (e *tunnelEndpoint) dispatch(frame *proto.TunnelFrame) {
	if e == nil || frame == nil {
		return
	}
	callID := strings.TrimSpace(frame.GetCallId())
	if callID == "" {
		return
	}
	e.mu.Lock()
	call := e.calls[callID]
	e.mu.Unlock()
	if call == nil {
		return
	}
	terminal := isTerminalTunnelFrame(frame)
	switch call.send(frame) {
	case tunnelSendDroppedOldest:
		if e.logger != nil {
			e.logger.Debug("tunnel call backlog drop", "spoke", e.name, "call_id", callID, "kind", tunnelFrameKind(frame))
		}
	case tunnelSendFailed:
		if terminal {
			e.endCall(callID)
		}
		if e.logger != nil {
			e.logger.Debug("tunnel call enqueue failed", "spoke", e.name, "call_id", callID, "kind", tunnelFrameKind(frame))
		}
		return
	}
	if terminal {
		e.endCall(callID)
	}
}

func (e *tunnelEndpoint) close(err error) {
	if e == nil {
		return
	}
	e.mu.Lock()
	if e.closed {
		e.mu.Unlock()
		return
	}
	e.closed = true
	calls := make([]*tunnelCall, 0, len(e.calls))
	for _, call := range e.calls {
		calls = append(calls, call)
	}
	e.calls = make(map[string]*tunnelCall)
	e.mu.Unlock()
	for _, call := range calls {
		call.close()
	}
	if err != nil {
		e.logger.Debug("tunnel closed", "spoke", e.name, "err", err)
	}
}

func (e *tunnelEndpoint) CallUnary(ctx context.Context, method string, req goproto.Message, resp goproto.Message) error {
	if e == nil {
		return errors.New("tunnel not available")
	}
	payload, err := goproto.Marshal(req)
	if err != nil {
		return err
	}
	call, err := e.startCall()
	if err != nil {
		return err
	}
	start := time.Now()
	e.logger.Info("tunnel call start", "spoke", e.name, "method", method, "call_id", call.id)
	reqFrame := &proto.TunnelRequest{
		Method:  method,
		Payload: payload,
		Stream:  false,
	}
	injectTunnelTrace(reqFrame, ctx)
	frame := &proto.TunnelFrame{
		CallId: call.id,
		Kind: &proto.TunnelFrame_Request{
			Request: reqFrame,
		},
	}
	if err := e.send(frame); err != nil {
		e.endCall(call.id)
		return err
	}
	for {
		select {
		case <-ctx.Done():
			elapsed := time.Since(start)
			if errors.Is(ctx.Err(), context.DeadlineExceeded) {
				e.logger.Warn("tunnel call timeout", "spoke", e.name, "method", method, "call_id", call.id, "elapsed", elapsed)
			}
			_ = e.send(&proto.TunnelFrame{
				CallId: call.id,
				Kind: &proto.TunnelFrame_Cancel{
					Cancel: &proto.TunnelCancel{Reason: ctx.Err().Error()},
				},
			})
			e.endCall(call.id)
			return ctx.Err()
		case frame, ok := <-call.ch:
			if !ok {
				return errors.New("tunnel closed")
			}
			if frame == nil {
				continue
			}
			if errFrame := frame.GetError(); errFrame != nil {
				return tunnelErrorToStatus(errFrame)
			}
			if respFrame := frame.GetResponse(); respFrame != nil {
				if len(respFrame.Payload) > 0 {
					if err := goproto.Unmarshal(respFrame.Payload, resp); err != nil {
						return err
					}
				}
				if respFrame.Done {
					elapsed := time.Since(start)
					e.logger.Info("tunnel call success", "spoke", e.name, "method", method, "call_id", call.id, "elapsed", elapsed)
					if elapsed > tunnelSlowCallThreshold {
						e.logger.Warn("tunnel call slow", "spoke", e.name, "method", method, "call_id", call.id, "elapsed", elapsed)
					}
					return nil
				}
			}
		}
	}
}

func (e *tunnelEndpoint) CallStream(ctx context.Context, method string, req goproto.Message, onEvent func([]byte) error) error {
	if e == nil {
		return errors.New("tunnel not available")
	}
	payload, err := goproto.Marshal(req)
	if err != nil {
		return err
	}
	call, err := e.startCall()
	if err != nil {
		return err
	}
	start := time.Now()
	e.logger.Info("tunnel call start", "spoke", e.name, "method", method, "call_id", call.id)
	reqFrame := &proto.TunnelRequest{
		Method:  method,
		Payload: payload,
		Stream:  true,
	}
	injectTunnelTrace(reqFrame, ctx)
	frame := &proto.TunnelFrame{
		CallId: call.id,
		Kind: &proto.TunnelFrame_Request{
			Request: reqFrame,
		},
	}
	if err := e.send(frame); err != nil {
		e.endCall(call.id)
		return err
	}
	for {
		select {
		case <-ctx.Done():
			elapsed := time.Since(start)
			if errors.Is(ctx.Err(), context.DeadlineExceeded) {
				e.logger.Warn("tunnel call timeout", "spoke", e.name, "method", method, "call_id", call.id, "elapsed", elapsed)
			}
			_ = e.send(&proto.TunnelFrame{
				CallId: call.id,
				Kind: &proto.TunnelFrame_Cancel{
					Cancel: &proto.TunnelCancel{Reason: ctx.Err().Error()},
				},
			})
			e.endCall(call.id)
			return ctx.Err()
		case frame, ok := <-call.ch:
			if !ok {
				return errors.New("tunnel closed")
			}
			if frame == nil {
				continue
			}
			if errFrame := frame.GetError(); errFrame != nil {
				return tunnelErrorToStatus(errFrame)
			}
			if event := frame.GetEvent(); event != nil {
				if onEvent != nil {
					if err := onEvent(event.Payload); err != nil {
						return err
					}
				}
				continue
			}
			if resp := frame.GetResponse(); resp != nil && resp.Done {
				elapsed := time.Since(start)
				e.logger.Info("tunnel call success", "spoke", e.name, "method", method, "call_id", call.id, "elapsed", elapsed)
				if elapsed > tunnelSlowCallThreshold {
					e.logger.Warn("tunnel call slow", "spoke", e.name, "method", method, "call_id", call.id, "elapsed", elapsed)
				}
				return nil
			}
		}
	}
}

func isTerminalTunnelFrame(frame *proto.TunnelFrame) bool {
	if frame == nil {
		return false
	}
	if frame.GetError() != nil {
		return true
	}
	if resp := frame.GetResponse(); resp != nil && resp.Done {
		return true
	}
	return false
}

func tunnelFrameKind(frame *proto.TunnelFrame) string {
	if frame == nil {
		return "none"
	}
	switch {
	case frame.GetResponse() != nil:
		return "response"
	case frame.GetEvent() != nil:
		return "event"
	case frame.GetError() != nil:
		return "error"
	case frame.GetTrace() != nil:
		return "trace"
	case frame.GetRequest() != nil:
		return "request"
	case frame.GetCancel() != nil:
		return "cancel"
	case frame.GetHello() != nil:
		return "hello"
	default:
		return "unknown"
	}
}

func tunnelErrorFrom(err error) *proto.TunnelError {
	if err == nil {
		return nil
	}
	if st, ok := status.FromError(err); ok {
		return &proto.TunnelError{Code: int32(st.Code()), Message: st.Message()}
	}
	return &proto.TunnelError{Code: int32(codes.Unknown), Message: err.Error()}
}

func tunnelErrorToStatus(err *proto.TunnelError) error {
	if err == nil {
		return nil
	}
	code := codes.Code(err.Code)
	if code == codes.OK {
		code = codes.Unknown
	}
	return status.Error(code, err.Message)
}

func injectTunnelTrace(req *proto.TunnelRequest, ctx context.Context) {
	if req == nil || ctx == nil {
		return
	}
	carrier := propagation.MapCarrier{}
	otel.GetTextMapPropagator().Inject(ctx, carrier)
	if value := carrier.Get("traceparent"); value != "" {
		req.TraceParent = value
	}
	if value := carrier.Get("tracestate"); value != "" {
		req.TraceState = value
	}
	if value := carrier.Get("baggage"); value != "" {
		req.Baggage = value
	}
}

func extractTunnelTrace(ctx context.Context, req *proto.TunnelRequest) context.Context {
	if ctx == nil || req == nil {
		return ctx
	}
	carrier := propagation.MapCarrier{}
	if value := strings.TrimSpace(req.TraceParent); value != "" {
		carrier.Set("traceparent", value)
	}
	if value := strings.TrimSpace(req.TraceState); value != "" {
		carrier.Set("tracestate", value)
	}
	if value := strings.TrimSpace(req.Baggage); value != "" {
		carrier.Set("baggage", value)
	}
	if len(carrier) == 0 {
		return ctx
	}
	return otel.GetTextMapPropagator().Extract(ctx, carrier)
}

type tunnelSpoke struct {
	ctx     context.Context
	stream  proto.VTR_TunnelClient
	service proto.VTRServer
	logger  *slog.Logger

	sendMu sync.Mutex
	mu     sync.Mutex
	calls  map[string]context.CancelFunc

	onReady func()
}

func runSpokeTunnelLoop(ctx context.Context, addr string, cfg *clientConfig, token string, info *proto.SpokeInfo, service proto.VTRServer, traceHandle *tracing.Handle, transport *traceTransport, logger *slog.Logger) {
	if service == nil {
		return
	}
	if logger == nil {
		logger = slog.Default()
	}
	backoff := time.Second
	for {
		if ctx.Err() != nil {
			return
		}
		conn, err := dialHub(ctx, addr, cfg, token)
		if err != nil {
			logger.Warn("spoke: tunnel dial failed", "addr", addr, "err", err)
			if waitOrDone(ctx, backoff) {
				return
			}
			backoff = nextBackoff(backoff)
			continue
		}
		client := proto.NewVTRClient(conn)
		stream, err := client.Tunnel(ctx)
		if err != nil {
			_ = conn.Close()
			logger.Warn("spoke: tunnel stream failed", "addr", addr, "err", err)
			if waitOrDone(ctx, backoff) {
				return
			}
			backoff = nextBackoff(backoff)
			continue
		}

		name := ""
		if info != nil {
			name = info.GetName()
		}
		tunnel := &tunnelSpoke{
			ctx:     ctx,
			stream:  stream,
			service: service,
			logger:  logger,
			calls:   make(map[string]context.CancelFunc),
		}
		if transport != nil {
			tunnel.onReady = func() {
				transport.SetTunnel(tunnel)
				if traceHandle != nil {
					traceHandle.SetTransport(transport)
					_ = traceHandle.Flush(context.Background())
				}
			}
		}
		if err := tunnel.serve(name, info); err != nil {
			logger.Warn("spoke: tunnel stopped", "addr", addr, "err", err)
		}
		if transport != nil {
			transport.ClearTunnel(tunnel)
		}
		_ = conn.Close()
		if waitOrDone(ctx, backoff) {
			return
		}
		backoff = nextBackoff(backoff)
	}
}

func (t *tunnelSpoke) serve(name string, info *proto.SpokeInfo) error {
	helloInfo := &proto.TunnelHello{
		Name: strings.TrimSpace(name),
	}
	if helloInfo.Name == "" && info != nil {
		helloInfo.Name = strings.TrimSpace(info.GetName())
	}
	if info != nil {
		helloInfo.Version = info.GetVersion()
		helloInfo.Labels = info.GetLabels()
	}
	hello := &proto.TunnelFrame{
		Kind: &proto.TunnelFrame_Hello{
			Hello: helloInfo,
		},
	}
	if err := t.send(hello); err != nil {
		return err
	}
	if t.onReady != nil {
		t.onReady()
	}
	for {
		frame, err := t.stream.Recv()
		if err != nil {
			t.cancelAll()
			return err
		}
		if frame == nil {
			continue
		}
		if req := frame.GetRequest(); req != nil {
			t.handleRequest(frame.GetCallId(), req)
			continue
		}
		if cancel := frame.GetCancel(); cancel != nil {
			t.handleCancel(frame.GetCallId())
			continue
		}
	}
}

func (t *tunnelSpoke) handleCancel(callID string) {
	if t == nil {
		return
	}
	key := strings.TrimSpace(callID)
	if key == "" {
		return
	}
	t.mu.Lock()
	cancel := t.calls[key]
	t.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}

func (t *tunnelSpoke) registerCall(callID string, cancel context.CancelFunc) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if cancel == nil {
		return
	}
	t.calls[callID] = cancel
}

func (t *tunnelSpoke) removeCall(callID string) {
	t.mu.Lock()
	delete(t.calls, callID)
	t.mu.Unlock()
}

func (t *tunnelSpoke) cancelAll() {
	t.mu.Lock()
	cancels := make([]context.CancelFunc, 0, len(t.calls))
	for _, cancel := range t.calls {
		cancels = append(cancels, cancel)
	}
	t.calls = make(map[string]context.CancelFunc)
	t.mu.Unlock()
	for _, cancel := range cancels {
		cancel()
	}
}

func (t *tunnelSpoke) handleRequest(callID string, req *proto.TunnelRequest) {
	key := strings.TrimSpace(callID)
	if key == "" || req == nil {
		return
	}
	ctx, cancel := context.WithCancel(t.stream.Context())
	ctx = extractTunnelTrace(ctx, req)
	t.registerCall(key, cancel)
	if req.Stream {
		go func() {
			defer t.removeCall(key)
			defer cancel()
			t.handleStream(ctx, key, req)
		}()
		return
	}
	go func() {
		defer t.removeCall(key)
		defer cancel()
		t.handleUnary(ctx, key, req)
	}()
}

func (t *tunnelSpoke) handleUnary(ctx context.Context, callID string, req *proto.TunnelRequest) {
	if t == nil || req == nil {
		return
	}
	method := strings.TrimSpace(req.Method)
	if method == "" {
		t.sendError(callID, status.Error(codes.InvalidArgument, "method is required"))
		return
	}
	switch method {
	case tunnelMethodSpawn:
		payload := &proto.SpawnRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.Spawn(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodList:
		payload := &proto.ListRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.List(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodInfo:
		payload := &proto.InfoRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.Info(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodKill:
		payload := &proto.KillRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.Kill(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodClose:
		payload := &proto.CloseRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.Close(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodRemove:
		payload := &proto.RemoveRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.Remove(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodRename:
		payload := &proto.RenameRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.Rename(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodGetScreen:
		payload := &proto.GetScreenRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.GetScreen(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodGrep:
		payload := &proto.GrepRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.Grep(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodSendText:
		payload := &proto.SendTextRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.SendText(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodSendKey:
		payload := &proto.SendKeyRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.SendKey(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodSendBytes:
		payload := &proto.SendBytesRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.SendBytes(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodResize:
		payload := &proto.ResizeRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.Resize(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodWaitFor:
		payload := &proto.WaitForRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.WaitFor(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodWaitForIdle:
		payload := &proto.WaitForIdleRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.WaitForIdle(ctx, payload)
		t.sendUnary(callID, resp, err)
	case tunnelMethodDumpAsciinema:
		payload := &proto.DumpAsciinemaRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		resp, err := t.service.DumpAsciinema(ctx, payload)
		t.sendUnary(callID, resp, err)
	default:
		t.sendError(callID, status.Error(codes.Unimplemented, fmt.Sprintf("unsupported method %q", method)))
	}
}

func (t *tunnelSpoke) handleStream(ctx context.Context, callID string, req *proto.TunnelRequest) {
	if t == nil || req == nil {
		return
	}
	method := strings.TrimSpace(req.Method)
	if method == "" {
		t.sendError(callID, status.Error(codes.InvalidArgument, "method is required"))
		return
	}
	switch method {
	case tunnelMethodSubscribe:
		payload := &proto.SubscribeRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		stream := &tunnelSubscribeStream{
			ctx: ctx,
			send: func(event *proto.SubscribeEvent) error {
				return t.sendEvent(callID, event)
			},
		}
		err := t.service.Subscribe(payload, stream)
		t.finishStream(callID, err)
	case tunnelMethodSubscribeSessions:
		payload := &proto.SubscribeSessionsRequest{}
		if !t.decode(req.Payload, payload, callID) {
			return
		}
		stream := &tunnelSessionsStream{
			ctx: ctx,
			send: func(snapshot *proto.SessionsSnapshot) error {
				return t.sendEvent(callID, snapshot)
			},
		}
		err := t.service.SubscribeSessions(payload, stream)
		t.finishStream(callID, err)
	default:
		t.sendError(callID, status.Error(codes.Unimplemented, fmt.Sprintf("unsupported method %q", method)))
	}
}

func (t *tunnelSpoke) finishStream(callID string, err error) {
	if err != nil && !errors.Is(err, context.Canceled) && !errors.Is(err, context.DeadlineExceeded) {
		t.sendError(callID, err)
		return
	}
	_ = t.send(&proto.TunnelFrame{
		CallId: callID,
		Kind: &proto.TunnelFrame_Response{
			Response: &proto.TunnelResponse{Done: true},
		},
	})
}

func (t *tunnelSpoke) sendUnary(callID string, resp goproto.Message, err error) {
	if err != nil {
		t.sendError(callID, err)
		return
	}
	payload, err := goproto.Marshal(resp)
	if err != nil {
		t.sendError(callID, err)
		return
	}
	_ = t.send(&proto.TunnelFrame{
		CallId: callID,
		Kind: &proto.TunnelFrame_Response{
			Response: &proto.TunnelResponse{
				Payload: payload,
				Done:    true,
			},
		},
	})
}

func (t *tunnelSpoke) sendEvent(callID string, event goproto.Message) error {
	payload, err := goproto.Marshal(event)
	if err != nil {
		return err
	}
	return t.send(&proto.TunnelFrame{
		CallId: callID,
		Kind: &proto.TunnelFrame_Event{
			Event: &proto.TunnelStreamEvent{Payload: payload},
		},
	})
}

func (t *tunnelSpoke) sendError(callID string, err error) {
	_ = t.send(&proto.TunnelFrame{
		CallId: callID,
		Kind: &proto.TunnelFrame_Error{
			Error: tunnelErrorFrom(err),
		},
	})
}

func (t *tunnelSpoke) decode(payload []byte, msg goproto.Message, callID string) bool {
	if err := goproto.Unmarshal(payload, msg); err != nil {
		t.sendError(callID, status.Error(codes.InvalidArgument, "invalid payload"))
		return false
	}
	return true
}

func (t *tunnelSpoke) send(frame *proto.TunnelFrame) error {
	if frame == nil {
		return nil
	}
	t.sendMu.Lock()
	defer t.sendMu.Unlock()
	return t.stream.Send(frame)
}

type tunnelSubscribeStream struct {
	ctx  context.Context
	send func(*proto.SubscribeEvent) error
}

func (s *tunnelSubscribeStream) Send(event *proto.SubscribeEvent) error {
	if s.send == nil {
		return nil
	}
	return s.send(event)
}

func (s *tunnelSubscribeStream) Context() context.Context {
	if s.ctx != nil {
		return s.ctx
	}
	return context.Background()
}

func (s *tunnelSubscribeStream) SetHeader(metadata.MD) error  { return nil }
func (s *tunnelSubscribeStream) SendHeader(metadata.MD) error { return nil }
func (s *tunnelSubscribeStream) SetTrailer(metadata.MD)       {}
func (s *tunnelSubscribeStream) SendMsg(interface{}) error    { return nil }
func (s *tunnelSubscribeStream) RecvMsg(interface{}) error    { return nil }

type tunnelSessionsStream struct {
	ctx  context.Context
	send func(*proto.SessionsSnapshot) error
}

func (s *tunnelSessionsStream) Send(snapshot *proto.SessionsSnapshot) error {
	if s.send == nil {
		return nil
	}
	return s.send(snapshot)
}

func (s *tunnelSessionsStream) Context() context.Context {
	if s.ctx != nil {
		return s.ctx
	}
	return context.Background()
}

func (s *tunnelSessionsStream) SetHeader(metadata.MD) error  { return nil }
func (s *tunnelSessionsStream) SendHeader(metadata.MD) error { return nil }
func (s *tunnelSessionsStream) SetTrailer(metadata.MD)       {}
func (s *tunnelSessionsStream) SendMsg(interface{}) error    { return nil }
func (s *tunnelSessionsStream) RecvMsg(interface{}) error    { return nil }
