package transportgrpc

import (
	"context"
	"crypto/tls"
	"errors"
	"image/color"
	"log/slog"
	"net"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"
	"unicode/utf8"

	core "github.com/advait/vtrpc/internal/core"
	proto "github.com/advait/vtrpc/proto"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/peer"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/durationpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type Coordinator = core.Coordinator
type Session = core.Session
type SessionInfo = core.SessionInfo
type SessionState = core.SessionState
type SpawnOptions = core.SpawnOptions
type GrepMatch = core.GrepMatch
type SpokeRegistry = core.SpokeRegistry
type SpokeRecord = core.SpokeRecord
type Snapshot = core.Snapshot
type Cell = core.Cell

const (
	SessionRunning SessionState = core.SessionRunning
	SessionClosing SessionState = core.SessionClosing
	SessionExited  SessionState = core.SessionExited
)

var (
	ErrSessionNotFound   = core.ErrSessionNotFound
	ErrSessionExists     = core.ErrSessionExists
	ErrSessionNotRunning = core.ErrSessionNotRunning
	ErrInvalidName       = core.ErrInvalidName
	ErrInvalidSize       = core.ErrInvalidSize
)

func NewSpokeRegistry() *SpokeRegistry {
	return core.NewSpokeRegistry()
}

const (
	maxRawInputBytes = 1 << 20
	keyframeRingSize = 4
)

const grpcGracefulShutdownTimeout = 5 * time.Second

// Deprecated: periodic keyframes were removed from healthy subscribe streams.
// The variable remains for compatibility with older tests and callers.
var keyframeInterval = time.Duration(0)
var logResize = strings.TrimSpace(os.Getenv("VTR_LOG_RESIZE")) != ""
var grpcKeepaliveParams = keepalive.ServerParameters{
	Time:    30 * time.Second,
	Timeout: 10 * time.Second,
}
var grpcKeepalivePolicy = keepalive.EnforcementPolicy{
	MinTime:             10 * time.Second,
	PermitWithoutStream: true,
}

const screenReceiveStaleThreshold = 2 * time.Second

var subscribeStreamStartedCount atomic.Int64
var subscribeStreamEndedCount atomic.Int64
var subscribeFirstKeyframeCount atomic.Int64
var subscribeDeltaFrameCount atomic.Int64

// GRPCServer implements the vtr gRPC service.
type GRPCServer struct {
	proto.UnimplementedVTRServer
	coord *Coordinator
	shell string

	keyframeMu   sync.Mutex
	keyframeRing map[string]*keyframeRing
	spokes       *SpokeRegistry

	coordinatorName string
	coordinatorPath string
}

type keyframeEntry struct {
	update      *proto.ScreenUpdate
	outputTotal int64
	at          time.Time
}

type keyframeRing struct {
	entries []keyframeEntry
	next    int
	count   int
}

func (s *GRPCServer) requireSessionID(ref *proto.SessionRef) (string, error) {
	if ref == nil {
		return "", status.Error(codes.InvalidArgument, "session id is required")
	}
	id := strings.TrimSpace(ref.Id)
	if id == "" {
		return "", status.Error(codes.InvalidArgument, "session id is required")
	}
	return id, nil
}

func (s *GRPCServer) resolveSession(ref *proto.SessionRef) (*Session, error) {
	sessionID, err := s.requireSessionID(ref)
	if err != nil {
		return nil, err
	}
	session, err := s.coord.GetSession(sessionID)
	if err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return session, nil
}

// NewGRPCServer constructs a gRPC server backed by the coordinator.
func NewGRPCServer(coord *Coordinator) *GRPCServer {
	shell := "/bin/sh"
	if coord != nil && coord.DefaultShell() != "" {
		shell = coord.DefaultShell()
	}
	return &GRPCServer{
		coord:           coord,
		shell:           shell,
		keyframeRing:    make(map[string]*keyframeRing),
		spokes:          NewSpokeRegistry(),
		coordinatorName: "local",
	}
}

func (s *GRPCServer) SpokeRegistry() *SpokeRegistry {
	if s == nil {
		return nil
	}
	return s.spokes
}

func (s *GRPCServer) SetSpokeRegistry(registry *SpokeRegistry) {
	if s == nil {
		return
	}
	s.spokes = registry
}

func (s *GRPCServer) SetCoordinatorInfo(name, path string) {
	if s == nil {
		return
	}
	name = strings.TrimSpace(name)
	path = strings.TrimSpace(path)
	if name == "" && path != "" {
		name = coordinatorNameFromPath(path)
	}
	s.coordinatorName = name
	s.coordinatorPath = path
}

// NewGRPCServerWithToken constructs a gRPC server with token interceptors attached.
func NewGRPCServerWithToken(coord *Coordinator, token string) *grpc.Server {
	return NewGRPCServerWithTokenAndService(NewGRPCServer(coord), token)
}

func NewGRPCServerWithTokenAndService(service proto.VTRServer, token string) *grpc.Server {
	opts := []grpc.ServerOption{
		grpc.UnaryInterceptor(tokenUnaryInterceptor(token)),
		grpc.StreamInterceptor(tokenStreamInterceptor(token)),
		grpc.KeepaliveParams(grpcKeepaliveParams),
		grpc.KeepaliveEnforcementPolicy(grpcKeepalivePolicy),
		grpc.StatsHandler(otelgrpc.NewServerHandler()),
	}
	grpcServer := grpc.NewServer(opts...)
	proto.RegisterVTRServer(grpcServer, service)
	return grpcServer
}

// ServeTCP runs the gRPC server on a TCP address until ctx is canceled.
// TLS is required when binding to a non-loopback address.
func ServeTCP(ctx context.Context, coord *Coordinator, addr string, tlsConfig *tls.Config, token string) error {
	if strings.TrimSpace(addr) == "" {
		return errors.New("grpc: tcp address is required")
	}
	if !isLoopbackAddress(addr) && tlsConfig == nil {
		return errors.New("grpc: tls config is required for non-loopback tcp")
	}
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	defer func() {
		_ = listener.Close()
	}()

	opts := []grpc.ServerOption{
		grpc.UnaryInterceptor(tokenUnaryInterceptor(token)),
		grpc.StreamInterceptor(tokenStreamInterceptor(token)),
		grpc.KeepaliveParams(grpcKeepaliveParams),
		grpc.KeepaliveEnforcementPolicy(grpcKeepalivePolicy),
		grpc.StatsHandler(otelgrpc.NewServerHandler()),
	}
	if tlsConfig != nil {
		opts = append(opts, grpc.Creds(credentials.NewTLS(tlsConfig)))
	}

	grpcServer := grpc.NewServer(opts...)
	service := NewGRPCServer(coord)
	service.SetCoordinatorInfo("", addr)
	proto.RegisterVTRServer(grpcServer, service)

	errCh := make(chan error, 1)
	go func() {
		errCh <- grpcServer.Serve(listener)
	}()

	select {
	case <-ctx.Done():
		gracefulStopWithTimeout(grpcServer, grpcGracefulShutdownTimeout)
		err := <-errCh
		if err != nil && !errors.Is(err, grpc.ErrServerStopped) {
			return err
		}
		return ctx.Err()
	case err := <-errCh:
		return err
	}
}

func tokenUnaryInterceptor(token string) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		if token != "" && !hasValidToken(ctx, token) {
			return nil, status.Error(codes.Unauthenticated, "missing or invalid authorization token")
		}
		return handler(ctx, req)
	}
}

func gracefulStopWithTimeout(server *grpc.Server, timeout time.Duration) {
	done := make(chan struct{})
	go func() {
		server.GracefulStop()
		close(done)
	}()

	timer := time.NewTimer(timeout)
	defer timer.Stop()

	select {
	case <-done:
		return
	case <-timer.C:
		server.Stop()
	}
}

func tokenStreamInterceptor(token string) grpc.StreamServerInterceptor {
	return func(srv interface{}, stream grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		if token != "" && !hasValidToken(stream.Context(), token) {
			return status.Error(codes.Unauthenticated, "missing or invalid authorization token")
		}
		return handler(srv, stream)
	}
}

func hasValidToken(ctx context.Context, token string) bool {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return false
	}
	for _, value := range md.Get("authorization") {
		if matchesBearerToken(value, token) {
			return true
		}
	}
	return false
}

func matchesBearerToken(value, token string) bool {
	fields := strings.Fields(value)
	if len(fields) != 2 {
		return false
	}
	if strings.ToLower(fields[0]) != "bearer" {
		return false
	}
	return fields[1] == token
}

func isLoopbackAddress(addr string) bool {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return false
	}
	if host == "" {
		return false
	}
	trimmed := strings.Trim(host, "[]")
	if strings.EqualFold(trimmed, "localhost") {
		return true
	}
	if ip := net.ParseIP(trimmed); ip != nil {
		return ip.IsLoopback()
	}
	return false
}

func (s *GRPCServer) Spawn(_ context.Context, req *proto.SpawnRequest) (*proto.SpawnResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "spawn request is required")
	}
	if strings.TrimSpace(req.Name) == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
	}

	var cmd []string
	if strings.TrimSpace(req.Command) != "" {
		cmd = []string{s.shell, "-c", req.Command}
	}

	cols, err := optionalUint16(req.Cols)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	rows, err := optionalUint16(req.Rows)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	info, err := s.coord.Spawn(req.Name, SpawnOptions{
		Command:    cmd,
		WorkingDir: req.WorkingDir,
		Env:        flattenEnv(req.Env),
		Cols:       cols,
		Rows:       rows,
	})
	if err != nil {
		return nil, mapCoordinatorErr(err)
	}

	s.clearKeyframes(info.ID)
	return &proto.SpawnResponse{Session: toProtoSession(info)}, nil
}

func (s *GRPCServer) List(_ context.Context, _ *proto.ListRequest) (*proto.ListResponse, error) {
	sessions := s.coord.List()
	out := make([]*proto.Session, 0, len(sessions))
	for _, info := range sessions {
		infoCopy := info
		out = append(out, toProtoSession(&infoCopy))
	}
	return &proto.ListResponse{Sessions: out}, nil
}

func (s *GRPCServer) SubscribeSessions(req *proto.SubscribeSessionsRequest, stream proto.VTR_SubscribeSessionsServer) error {
	excludeExited := false
	if req != nil {
		excludeExited = req.ExcludeExited
	}
	coordName, coordPath := s.coordinatorInfo()
	sendSnapshot := func() error {
		sessions := s.coord.List()
		out := make([]*proto.Session, 0, len(sessions))
		for _, info := range sessions {
			if excludeExited && info.State == SessionExited {
				continue
			}
			infoCopy := info
			out = append(out, toProtoSession(&infoCopy))
		}
		return stream.Send(&proto.SessionsSnapshot{
			Coordinators: []*proto.CoordinatorSessions{{
				Name:     coordName,
				Path:     coordPath,
				Sessions: out,
			}},
		})
	}

	if err := sendSnapshot(); err != nil {
		return err
	}

	ctx := stream.Context()
	signal := s.coord.SessionsChanged()
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-signal:
			if err := sendSnapshot(); err != nil {
				return err
			}
			signal = s.coord.SessionsChanged()
		}
	}
}

func (s *GRPCServer) coordinatorInfo() (string, string) {
	if s == nil {
		return "local", ""
	}
	name := strings.TrimSpace(s.coordinatorName)
	path := strings.TrimSpace(s.coordinatorPath)
	if name == "" && path != "" {
		name = coordinatorNameFromPath(path)
	}
	if name == "" {
		name = "local"
	}
	return name, path
}

func coordinatorNameFromPath(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	if host, _, err := net.SplitHostPort(trimmed); err == nil {
		host = strings.Trim(host, "[]")
		if host != "" {
			return host
		}
	}
	base := filepath.Base(trimmed)
	if strings.HasSuffix(base, ".sock") {
		base = strings.TrimSuffix(base, ".sock")
	}
	if base == "" {
		return trimmed
	}
	return base
}

func (s *GRPCServer) Tunnel(proto.VTR_TunnelServer) error {
	return status.Error(codes.Unimplemented, "tunnel is only supported by hubs")
}

func (s *GRPCServer) Info(_ context.Context, req *proto.InfoRequest) (*proto.InfoResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "session id is required")
	}
	sessionID, err := s.requireSessionID(req.Session)
	if err != nil {
		return nil, err
	}
	info, err := s.coord.Info(sessionID)
	if err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.InfoResponse{Session: toProtoSession(info)}, nil
}

func (s *GRPCServer) Kill(_ context.Context, req *proto.KillRequest) (*proto.KillResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "session id is required")
	}
	sig, err := parseSignal(req.Signal)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	sessionID, err := s.requireSessionID(req.Session)
	if err != nil {
		return nil, err
	}
	if err := s.coord.Kill(sessionID, sig); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.KillResponse{}, nil
}

func (s *GRPCServer) Close(_ context.Context, req *proto.CloseRequest) (*proto.CloseResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "session id is required")
	}
	sessionID, err := s.requireSessionID(req.Session)
	if err != nil {
		return nil, err
	}
	if err := s.coord.Close(sessionID); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.CloseResponse{}, nil
}

func (s *GRPCServer) Remove(_ context.Context, req *proto.RemoveRequest) (*proto.RemoveResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "session id is required")
	}
	sessionID, err := s.requireSessionID(req.Session)
	if err != nil {
		return nil, err
	}
	if err := s.coord.Remove(sessionID); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	s.clearKeyframes(sessionID)
	return &proto.RemoveResponse{}, nil
}

func (s *GRPCServer) Rename(_ context.Context, req *proto.RenameRequest) (*proto.RenameResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "session id is required")
	}
	if strings.TrimSpace(req.NewName) == "" {
		return nil, status.Error(codes.InvalidArgument, "new name is required")
	}
	sessionID, err := s.requireSessionID(req.Session)
	if err != nil {
		return nil, err
	}
	if err := s.coord.Rename(sessionID, req.NewName); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	s.clearKeyframes(sessionID)
	return &proto.RenameResponse{}, nil
}

func (s *GRPCServer) GetScreen(_ context.Context, req *proto.GetScreenRequest) (*proto.GetScreenResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "session id is required")
	}
	session, err := s.resolveSession(req.Session)
	if err != nil {
		return nil, err
	}
	snap, err := session.Snapshot()
	if err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return screenResponseFromSnapshot(session.ID(), session.Label(), snap), nil
}

func (s *GRPCServer) Grep(_ context.Context, req *proto.GrepRequest) (*proto.GrepResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "session id is required")
	}
	if strings.TrimSpace(req.Pattern) == "" {
		return nil, status.Error(codes.InvalidArgument, "pattern is required")
	}
	if req.ContextBefore < 0 || req.ContextAfter < 0 {
		return nil, status.Error(codes.InvalidArgument, "context must be >= 0")
	}
	maxMatches := int(req.MaxMatches)
	if maxMatches <= 0 {
		maxMatches = 100
	}
	re, err := regexp.Compile(req.Pattern)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	sessionID, err := s.requireSessionID(req.Session)
	if err != nil {
		return nil, err
	}
	matches, err := s.coord.Grep(sessionID, re, int(req.ContextBefore), int(req.ContextAfter), maxMatches)
	if err != nil {
		return nil, mapCoordinatorErr(err)
	}
	out := make([]*proto.GrepMatch, 0, len(matches))
	for _, match := range matches {
		matchCopy := match
		out = append(out, &proto.GrepMatch{
			LineNumber:    int32(matchCopy.LineNumber),
			Line:          matchCopy.Line,
			ContextBefore: append([]string(nil), matchCopy.ContextBefore...),
			ContextAfter:  append([]string(nil), matchCopy.ContextAfter...),
		})
	}
	return &proto.GrepResponse{Matches: out}, nil
}

func (s *GRPCServer) SendText(_ context.Context, req *proto.SendTextRequest) (*proto.SendTextResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "session id is required")
	}
	if !utf8.ValidString(req.Text) {
		return nil, status.Error(codes.InvalidArgument, "text must be valid UTF-8")
	}
	sessionID, err := s.requireSessionID(req.Session)
	if err != nil {
		return nil, err
	}
	if err := s.coord.Send(sessionID, normalizeTextInput(req.Text)); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.SendTextResponse{}, nil
}

func (s *GRPCServer) SendKey(_ context.Context, req *proto.SendKeyRequest) (*proto.SendKeyResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "session id is required")
	}
	seq, err := keyToBytes(req.Key)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	sessionID, err := s.requireSessionID(req.Session)
	if err != nil {
		return nil, err
	}
	if err := s.coord.Send(sessionID, seq); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.SendKeyResponse{}, nil
}

func (s *GRPCServer) SendBytes(_ context.Context, req *proto.SendBytesRequest) (*proto.SendBytesResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "session id is required")
	}
	if len(req.Data) > maxRawInputBytes {
		return nil, status.Errorf(codes.InvalidArgument, "data exceeds %d bytes", maxRawInputBytes)
	}
	sessionID, err := s.requireSessionID(req.Session)
	if err != nil {
		return nil, err
	}
	if err := s.coord.Send(sessionID, req.Data); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.SendBytesResponse{}, nil
}

func (s *GRPCServer) Resize(ctx context.Context, req *proto.ResizeRequest) (*proto.ResizeResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "session id is required")
	}
	cols, err := requiredUint16(req.Cols)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	rows, err := requiredUint16(req.Rows)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	sessionID, err := s.requireSessionID(req.Session)
	if err != nil {
		return nil, err
	}
	if logResize {
		peerAddr := "unknown"
		if p, ok := peer.FromContext(ctx); ok && p != nil && p.Addr != nil {
			peerAddr = p.Addr.String()
		}
		prevCols := 0
		prevRows := 0
		if info, infoErr := s.coord.Info(sessionID); infoErr == nil && info != nil {
			prevCols = int(info.Cols)
			prevRows = int(info.Rows)
		}
		slog.Info(
			"resize grpc",
			"id", sessionID,
			"cols", cols,
			"rows", rows,
			"prev_cols", prevCols,
			"prev_rows", prevRows,
			"peer", peerAddr,
		)
	}
	if err := s.coord.Resize(sessionID, cols, rows); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.ResizeResponse{}, nil
}

func (s *GRPCServer) WaitFor(ctx context.Context, req *proto.WaitForRequest) (*proto.WaitForResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "session id is required")
	}
	if strings.TrimSpace(req.Pattern) == "" {
		return nil, status.Error(codes.InvalidArgument, "pattern is required")
	}
	timeout, err := durationFromProto(req.Timeout)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	re, err := regexp.Compile(req.Pattern)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	sessionID, err := s.requireSessionID(req.Session)
	if err != nil {
		return nil, err
	}
	matched, line, timedOut, err := s.coord.WaitFor(ctx, sessionID, re, timeout)
	if err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return nil, err
		}
		return nil, mapCoordinatorErr(err)
	}
	return &proto.WaitForResponse{
		Matched:     matched,
		MatchedLine: line,
		TimedOut:    timedOut,
	}, nil
}

func (s *GRPCServer) WaitForIdle(ctx context.Context, req *proto.WaitForIdleRequest) (*proto.WaitForIdleResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "session id is required")
	}
	idle, err := durationFromProto(req.IdleDuration)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	if idle == 0 {
		idle = 5 * time.Second
	}
	timeout, err := durationFromProto(req.Timeout)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	sessionID, err := s.requireSessionID(req.Session)
	if err != nil {
		return nil, err
	}
	idleReached, timedOut, err := s.coord.WaitForIdle(ctx, sessionID, idle, timeout)
	if err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return nil, err
		}
		return nil, mapCoordinatorErr(err)
	}
	resp := &proto.WaitForIdleResponse{
		Idle:     idleReached,
		TimedOut: timedOut,
	}
	if idleReached && req.IncludeScreen {
		session, err := s.resolveSession(req.Session)
		if err != nil {
			return nil, err
		}
		snap, err := session.Snapshot()
		if err != nil {
			return nil, mapCoordinatorErr(err)
		}
		resp.Screen = screenResponseFromSnapshot(session.ID(), session.Label(), snap)
	}
	return resp, nil
}

func (s *GRPCServer) Subscribe(req *proto.SubscribeRequest, stream proto.VTR_SubscribeServer) (retErr error) {
	if req == nil {
		return status.Error(codes.InvalidArgument, "session id is required")
	}
	if !req.IncludeScreenUpdates && !req.IncludeRawOutput {
		return status.Error(codes.InvalidArgument, "subscribe requires screen updates or raw output")
	}

	session, err := s.resolveSession(req.Session)
	if err != nil {
		return err
	}
	sessionID := session.ID()
	startedAt := time.Now()
	startCount := subscribeStreamStartedCount.Add(1)
	slog.Info(
		"subscribe stream start",
		"session_id", sessionID,
		"include_screen", req.IncludeScreenUpdates,
		"include_raw", req.IncludeRawOutput,
		"stream_started_count", startCount,
	)
	defer func() {
		endCount := subscribeStreamEndedCount.Add(1)
		attrs := []any{
			"session_id", sessionID,
			"reason", subscribeStreamEndReason(retErr),
			"duration", time.Since(startedAt),
			"stream_ended_count", endCount,
		}
		if retErr != nil && !errors.Is(retErr, context.Canceled) && !errors.Is(retErr, context.DeadlineExceeded) {
			attrs = append(attrs, "err", retErr)
		}
		slog.Info("subscribe stream end", attrs...)
	}()
	sessionLabel := func() string {
		return session.Label()
	}
	offset, outputCh, _ := session.OutputState()
	includeScreen := req.IncludeScreenUpdates
	includeRaw := req.IncludeRawOutput
	resizeCh := session.ResizeState()
	ctx := stream.Context()

	screenSignal := make(chan struct{}, 1)
	rawSignal := make(chan struct{}, 1)
	idleSignal := make(chan struct{}, 1)
	sendErrCh := make(chan error, 1)
	exitSignal := make(chan exitPayload, 1)
	makeScreenSnapshot := func(forceKeyframe bool, reason string) (*subscribeScreenSnapshot, error) {
		snap, err := session.Snapshot()
		if err != nil {
			return nil, err
		}
		return &subscribeScreenSnapshot{
			snapshot:      snap,
			forceKeyframe: forceKeyframe,
			forceReason:   reason,
		}, nil
	}

	var screenMu sync.Mutex
	var latestScreen *subscribeScreenSnapshot
	setLatestScreen := func(snapshot *subscribeScreenSnapshot) {
		if snapshot == nil {
			return
		}
		screenMu.Lock()
		latestScreen = snapshot
		screenMu.Unlock()
		select {
		case screenSignal <- struct{}{}:
		default:
		}
	}
	drainLatestScreen := func() *subscribeScreenSnapshot {
		screenMu.Lock()
		snapshot := latestScreen
		latestScreen = nil
		screenMu.Unlock()
		return snapshot
	}

	var rawMu sync.Mutex
	var pendingRaw []byte
	appendRaw := func(data []byte) {
		if len(data) == 0 {
			return
		}
		rawMu.Lock()
		pendingRaw = append(pendingRaw, data...)
		if len(pendingRaw) > core.MaxOutputBuffer {
			drop := len(pendingRaw) - core.MaxOutputBuffer
			pendingRaw = pendingRaw[drop:]
		}
		rawMu.Unlock()
		select {
		case rawSignal <- struct{}{}:
		default:
		}
	}
	drainRaw := func() []byte {
		rawMu.Lock()
		data := pendingRaw
		pendingRaw = nil
		rawMu.Unlock()
		return data
	}

	var idleMu sync.Mutex
	var latestIdle *proto.SessionIdle
	setLatestIdle := func(update *proto.SessionIdle) {
		if update == nil {
			return
		}
		idleMu.Lock()
		latestIdle = update
		idleMu.Unlock()
		select {
		case idleSignal <- struct{}{}:
		default:
		}
	}
	drainLatestIdle := func() *proto.SessionIdle {
		idleMu.Lock()
		update := latestIdle
		latestIdle = nil
		idleMu.Unlock()
		return update
	}

	screenBuilder := newSubscribeScreenBuilder(s, session, sessionID, sessionLabel)
	sentCachedKeyframe := false
	if includeScreen {
		if cached := s.cachedKeyframe(session, sessionID); cached != nil {
			if err := stream.Send(&proto.SubscribeEvent{
				Event: &proto.SubscribeEvent_ScreenUpdate{
					ScreenUpdate: cached,
				},
			}); err != nil {
				return err
			}
			sentCachedKeyframe = true
			snap, snapErr := session.Snapshot()
			if snapErr != nil {
				slog.Warn(
					"subscribe cache prime fallback",
					"session_id", sessionID,
					"err", snapErr,
				)
			}
			screenBuilder.primeFromKeyframe(cached, snap)
		}
	}

	go func() {
		sendErrCh <- runSubscribeSender(
			ctx,
			stream,
			screenBuilder,
			screenSignal,
			rawSignal,
			idleSignal,
			exitSignal,
			drainLatestScreen,
			drainRaw,
			drainLatestIdle,
		)
	}()

	_, idleCh := session.IdleState()

	info := session.Info()
	if info.State == SessionExited {
		if includeRaw {
			data, nextOffset, nextCh := session.OutputSnapshot(offset)
			offset = nextOffset
			outputCh = nextCh
			appendRaw(data)
		}
		var finalScreen *subscribeScreenSnapshot
		if includeScreen {
			snapshot, err := makeScreenSnapshot(true, "session_already_exited")
			if err != nil {
				return mapCoordinatorErr(err)
			}
			finalScreen = snapshot
		}
		exitSignal <- exitPayload{
			exit:        &proto.SessionExited{ExitCode: int32(info.ExitCode), Id: sessionID},
			finalScreen: finalScreen,
		}
		err := <-sendErrCh
		if err == nil {
			return nil
		}
		return err
	}

	if includeScreen && !sentCachedKeyframe {
		initial, err := makeScreenSnapshot(true, "initial_subscribe")
		if err != nil {
			return mapCoordinatorErr(err)
		}
		setLatestScreen(initial)
	}

	var ticker *time.Ticker
	var tick <-chan time.Time
	if includeScreen {
		ticker = time.NewTicker(time.Second / 30)
		tick = ticker.C
	}
	if ticker != nil {
		defer ticker.Stop()
	}

	pendingScreen := false
	forceKeyframe := false

	for {
		select {
		case err := <-sendErrCh:
			if err == nil {
				return nil
			}
			return err
		case <-ctx.Done():
			return ctx.Err()
		case <-idleCh:
			idleState, nextCh := session.IdleState()
			idleCh = nextCh
			setLatestIdle(&proto.SessionIdle{Name: sessionLabel(), Idle: idleState, Id: sessionID})
		case <-session.ExitCh():
			if includeRaw {
				data, nextOffset, nextCh := session.OutputSnapshot(offset)
				offset = nextOffset
				outputCh = nextCh
				appendRaw(data)
			} else {
				total, nextCh, _ := session.OutputState()
				offset = total
				outputCh = nextCh
			}

			var finalScreen *subscribeScreenSnapshot
			if includeScreen {
				snapshot, err := makeScreenSnapshot(false, "session_exit")
				if err != nil {
					return mapCoordinatorErr(err)
				}
				finalScreen = snapshot
			}

			info := session.Info()
			exitSignal <- exitPayload{
				exit:        &proto.SessionExited{ExitCode: int32(info.ExitCode), Id: sessionID},
				finalScreen: finalScreen,
			}
			err := <-sendErrCh
			if err == nil {
				return nil
			}
			return err
		case <-outputCh:
			if includeRaw {
				data, nextOffset, nextCh := session.OutputSnapshot(offset)
				offset = nextOffset
				outputCh = nextCh
				appendRaw(data)
			} else {
				total, nextCh, _ := session.OutputState()
				offset = total
				outputCh = nextCh
			}
			if includeScreen {
				pendingScreen = true
			}
		case <-resizeCh:
			if includeScreen {
				pendingScreen = true
				forceKeyframe = true
			}
			resizeCh = session.ResizeState()
		case <-tick:
			if includeScreen && pendingScreen {
				reason := "output_update"
				if forceKeyframe {
					reason = "resize"
				}
				snapshot, err := makeScreenSnapshot(forceKeyframe, reason)
				if err != nil {
					return mapCoordinatorErr(err)
				}
				setLatestScreen(snapshot)
				pendingScreen = false
				forceKeyframe = false
			}
		}
	}
}

type exitPayload struct {
	exit        *proto.SessionExited
	finalScreen *subscribeScreenSnapshot
}

func runSubscribeSender(
	ctx context.Context,
	stream proto.VTR_SubscribeServer,
	screenBuilder *subscribeScreenBuilder,
	screenSignal <-chan struct{},
	rawSignal <-chan struct{},
	idleSignal <-chan struct{},
	exitSignal <-chan exitPayload,
	drainScreen func() *subscribeScreenSnapshot,
	drainRaw func() []byte,
	drainIdle func() *proto.SessionIdle,
) error {
	sendScreen := func(snapshot *subscribeScreenSnapshot) error {
		if snapshot == nil || screenBuilder == nil {
			return nil
		}
		update, err := screenBuilder.Build(snapshot)
		if err != nil {
			return err
		}
		if update == nil {
			return nil
		}
		return stream.Send(&proto.SubscribeEvent{
			Event: &proto.SubscribeEvent_ScreenUpdate{
				ScreenUpdate: update,
			},
		})
	}
	sendRaw := func(data []byte) error {
		if len(data) == 0 {
			return nil
		}
		return stream.Send(&proto.SubscribeEvent{
			Event: &proto.SubscribeEvent_RawOutput{
				RawOutput: data,
			},
		})
	}
	sendIdle := func(update *proto.SessionIdle) error {
		if update == nil {
			return nil
		}
		return stream.Send(&proto.SubscribeEvent{
			Event: &proto.SubscribeEvent_SessionIdle{
				SessionIdle: update,
			},
		})
	}
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case payload := <-exitSignal:
			if err := sendRaw(drainRaw()); err != nil {
				return err
			}
			if err := sendIdle(drainIdle()); err != nil {
				return err
			}
			if err := sendScreen(payload.finalScreen); err != nil {
				return err
			}
			if payload.exit != nil {
				if err := stream.Send(&proto.SubscribeEvent{
					Event: &proto.SubscribeEvent_SessionExited{
						SessionExited: payload.exit,
					},
				}); err != nil {
					return err
				}
			}
			return nil
		case <-rawSignal:
			if err := sendRaw(drainRaw()); err != nil {
				return err
			}
		case <-idleSignal:
			if err := sendIdle(drainIdle()); err != nil {
				return err
			}
		case <-screenSignal:
			if err := sendScreen(drainScreen()); err != nil {
				return err
			}
		}
	}
}

type subscribeScreenSnapshot struct {
	snapshot      *Snapshot
	forceKeyframe bool
	forceReason   string
}

type subscribeScreenBuilder struct {
	server       *GRPCServer
	session      *Session
	sessionID    string
	sessionLabel func() string

	lastSnapshot      *Snapshot
	lastFrameID       uint64
	firstKeyframeSent bool
}

func newSubscribeScreenBuilder(server *GRPCServer, session *Session, sessionID string, sessionLabel func() string) *subscribeScreenBuilder {
	return &subscribeScreenBuilder{
		server:       server,
		session:      session,
		sessionID:    sessionID,
		sessionLabel: sessionLabel,
	}
}

func (b *subscribeScreenBuilder) primeFromKeyframe(update *proto.ScreenUpdate, snapshot *Snapshot) {
	if b == nil || update == nil || !update.GetIsKeyframe() {
		return
	}
	b.firstKeyframeSent = true
	b.lastFrameID = update.GetFrameId()
	b.lastSnapshot = snapshot
}

func (b *subscribeScreenBuilder) Build(payload *subscribeScreenSnapshot) (*proto.ScreenUpdate, error) {
	if b == nil || payload == nil || payload.snapshot == nil || b.session == nil {
		return nil, nil
	}
	forceKeyframe := payload.forceKeyframe || !b.firstKeyframeSent || b.lastSnapshot == nil || b.lastFrameID == 0
	if !forceKeyframe && !snapshotDeltaSafe(b.lastSnapshot, payload.snapshot) {
		forceKeyframe = true
	}
	if forceKeyframe {
		return b.buildKeyframe(payload.snapshot, payload.forceReason), nil
	}
	delta, changedRows, err := screenDeltaFromSnapshots(b.lastSnapshot, payload.snapshot)
	if err != nil {
		slog.Warn(
			"subscribe delta fallback keyframe",
			"session_id", b.sessionID,
			"reason", "stream_desync",
			"err", err,
		)
		return b.buildKeyframe(payload.snapshot, "stream_desync"), nil
	}
	frameID := b.session.NextFrameID()
	update := &proto.ScreenUpdate{
		FrameId:     frameID,
		BaseFrameId: b.lastFrameID,
		IsKeyframe:  false,
		Delta:       delta,
	}
	b.lastSnapshot = payload.snapshot
	b.lastFrameID = frameID
	deltaCount := subscribeDeltaFrameCount.Add(1)
	slog.Debug(
		"subscribe delta sent",
		"session_id", b.sessionID,
		"frame_id", update.FrameId,
		"base_frame_id", update.BaseFrameId,
		"changed_rows", changedRows,
		"delta_count", deltaCount,
	)
	return update, nil
}

func (b *subscribeScreenBuilder) buildKeyframe(snap *Snapshot, reason string) *proto.ScreenUpdate {
	if b == nil || b.session == nil {
		return nil
	}
	label := ""
	if b.sessionLabel != nil {
		label = b.sessionLabel()
	}
	update := keyframeUpdateFromSnapshot(b.session, b.sessionID, label, snap)
	if b.server != nil {
		total, _, _ := b.session.OutputState()
		b.server.cacheKeyframe(b.sessionID, update, total)
	}
	b.lastSnapshot = snap
	if update != nil {
		b.lastFrameID = update.FrameId
	}
	if !b.firstKeyframeSent {
		b.firstKeyframeSent = true
		firstKeyframes := subscribeFirstKeyframeCount.Add(1)
		slog.Info(
			"subscribe first keyframe sent",
			"session_id", b.sessionID,
			"frame_id", b.lastFrameID,
			"reason", reason,
			"first_keyframe_count", firstKeyframes,
		)
	}
	return update
}

func snapshotDeltaSafe(prev, curr *Snapshot) bool {
	if prev == nil || curr == nil {
		return false
	}
	if prev.Cols <= 0 || prev.Rows <= 0 || curr.Cols <= 0 || curr.Rows <= 0 {
		return false
	}
	if prev.Cols != curr.Cols || prev.Rows != curr.Rows {
		return false
	}
	requiredCells := curr.Cols * curr.Rows
	if len(prev.Cells) < requiredCells || len(curr.Cells) < requiredCells {
		return false
	}
	return true
}

func screenDeltaFromSnapshots(prev, curr *Snapshot) (*proto.ScreenDelta, int, error) {
	if !snapshotDeltaSafe(prev, curr) {
		return nil, 0, errors.New("delta snapshots are not compatible")
	}
	cols := curr.Cols
	rows := curr.Rows
	delta := &proto.ScreenDelta{
		Cols:    int32(cols),
		Rows:    int32(rows),
		CursorX: int32(curr.CursorX),
		CursorY: int32(curr.CursorY),
	}
	changedRows := 0
	for row := 0; row < rows; row++ {
		if !snapshotRowChangedForProto(prev, curr, row, cols) {
			continue
		}
		rowData, err := screenRowFromSnapshot(curr, row)
		if err != nil {
			return nil, 0, err
		}
		delta.RowDeltas = append(delta.RowDeltas, &proto.RowDelta{
			Row:     int32(row),
			RowData: rowData,
		})
		changedRows++
	}
	return delta, changedRows, nil
}

func snapshotRowChangedForProto(prev, curr *Snapshot, row, cols int) bool {
	if prev == nil || curr == nil || row < 0 || cols <= 0 {
		return true
	}
	start := row * cols
	end := start + cols
	if start < 0 || end > len(prev.Cells) || end > len(curr.Cells) {
		return true
	}
	for idx := start; idx < end; idx++ {
		if !snapshotCellEqualForProto(prev.Cells[idx], curr.Cells[idx]) {
			return true
		}
	}
	return false
}

func snapshotCellEqualForProto(left, right Cell) bool {
	return left.Rune == right.Rune && left.Fg == right.Fg && left.Bg == right.Bg && left.Attrs == right.Attrs
}

func screenRowFromSnapshot(snap *Snapshot, row int) (*proto.ScreenRow, error) {
	if snap == nil {
		return nil, errors.New("snapshot is nil")
	}
	if row < 0 || row >= snap.Rows {
		return nil, errors.New("snapshot row out of range")
	}
	if snap.Cols <= 0 {
		return nil, errors.New("snapshot cols must be positive")
	}
	start := row * snap.Cols
	end := start + snap.Cols
	if end > len(snap.Cells) {
		return nil, errors.New("snapshot cell bounds out of range")
	}
	cells := make([]*proto.ScreenCell, snap.Cols)
	for col := start; col < end; col++ {
		cell := snap.Cells[col]
		ch := " "
		if cell.Rune != 0 {
			ch = string(cell.Rune)
		}
		cells[col-start] = &proto.ScreenCell{
			Char:       ch,
			FgColor:    packRGB(cell.Fg),
			BgColor:    packRGB(cell.Bg),
			Attributes: uint32(cell.Attrs),
		}
	}
	return &proto.ScreenRow{Cells: cells}, nil
}

func subscribeStreamEndReason(err error) string {
	switch {
	case err == nil:
		return "completed"
	case errors.Is(err, context.Canceled):
		return "context_canceled"
	case errors.Is(err, context.DeadlineExceeded):
		return "context_deadline"
	default:
		return "error"
	}
}

func newKeyframeRing(size int) *keyframeRing {
	if size < 1 {
		size = 1
	}
	return &keyframeRing{entries: make([]keyframeEntry, size)}
}

func (r *keyframeRing) Add(entry keyframeEntry) {
	if r == nil || len(r.entries) == 0 {
		return
	}
	r.entries[r.next] = entry
	r.next = (r.next + 1) % len(r.entries)
	if r.count < len(r.entries) {
		r.count++
	}
}

func (r *keyframeRing) Latest() (keyframeEntry, bool) {
	if r == nil || r.count == 0 {
		return keyframeEntry{}, false
	}
	idx := r.next - 1
	if idx < 0 {
		idx += len(r.entries)
	}
	return r.entries[idx], true
}

func (s *GRPCServer) cacheKeyframe(id string, update *proto.ScreenUpdate, outputTotal int64) {
	if update == nil || !update.IsKeyframe {
		return
	}
	s.keyframeMu.Lock()
	ring := s.keyframeRing[id]
	if ring == nil {
		ring = newKeyframeRing(keyframeRingSize)
		s.keyframeRing[id] = ring
	}
	ring.Add(keyframeEntry{
		update:      update,
		outputTotal: outputTotal,
		at:          time.Now(),
	})
	s.keyframeMu.Unlock()
}

func (s *GRPCServer) cachedKeyframe(session *Session, id string) *proto.ScreenUpdate {
	if session == nil {
		return nil
	}
	total, _, _ := session.OutputState()
	info := session.Info()
	s.keyframeMu.Lock()
	ring := s.keyframeRing[id]
	var entry keyframeEntry
	var ok bool
	if ring != nil {
		entry, ok = ring.Latest()
	}
	s.keyframeMu.Unlock()
	if !ok || entry.update == nil || !entry.update.IsKeyframe || entry.update.Screen == nil {
		return nil
	}
	screen := entry.update.Screen
	if screen.Cols != int32(info.Cols) || screen.Rows != int32(info.Rows) {
		return nil
	}
	if entry.outputTotal != total {
		return nil
	}
	return entry.update
}

func (s *GRPCServer) clearKeyframes(id string) {
	s.keyframeMu.Lock()
	delete(s.keyframeRing, id)
	s.keyframeMu.Unlock()
}

func toProtoSession(info *SessionInfo) *proto.Session {
	if info == nil {
		return nil
	}
	session := &proto.Session{
		Name:      info.Label,
		Status:    toProtoStatus(info.State),
		Cols:      int32(info.Cols),
		Rows:      int32(info.Rows),
		ExitCode:  int32(info.ExitCode),
		CreatedAt: timestamppb.New(info.CreatedAt),
		Idle:      info.Idle,
		Order:     info.Order,
		Id:        info.ID,
	}
	if info.State != SessionExited {
		session.ExitCode = 0
	}
	if !info.ExitedAt.IsZero() {
		session.ExitedAt = timestamppb.New(info.ExitedAt)
	}
	return session
}

func toProtoStatus(state SessionState) proto.SessionStatus {
	switch state {
	case SessionRunning:
		return proto.SessionStatus_SESSION_STATUS_RUNNING
	case SessionClosing:
		return proto.SessionStatus_SESSION_STATUS_CLOSING
	case SessionExited:
		return proto.SessionStatus_SESSION_STATUS_EXITED
	default:
		return proto.SessionStatus_SESSION_STATUS_UNSPECIFIED
	}
}

func mapCoordinatorErr(err error) error {
	switch {
	case err == nil:
		return nil
	case errors.Is(err, ErrSessionNotFound):
		return status.Error(codes.NotFound, err.Error())
	case errors.Is(err, ErrSessionExists):
		return status.Error(codes.AlreadyExists, err.Error())
	case errors.Is(err, ErrSessionNotRunning):
		return status.Error(codes.FailedPrecondition, err.Error())
	case errors.Is(err, ErrInvalidName), errors.Is(err, ErrInvalidSize):
		return status.Error(codes.InvalidArgument, err.Error())
	default:
		return status.Error(codes.Internal, err.Error())
	}
}

func flattenEnv(env map[string]string) []string {
	if len(env) == 0 {
		return nil
	}
	out := make([]string, 0, len(env))
	for key, value := range env {
		out = append(out, key+"="+value)
	}
	return out
}

func optionalUint16(v int32) (uint16, error) {
	if v == 0 {
		return 0, nil
	}
	if v < 0 || v > int32(^uint16(0)) {
		return 0, errors.New("size must be between 1 and 65535")
	}
	return uint16(v), nil
}

func requiredUint16(v int32) (uint16, error) {
	if v <= 0 || v > int32(^uint16(0)) {
		return 0, errors.New("size must be between 1 and 65535")
	}
	return uint16(v), nil
}

func packRGB(c color.RGBA) int32 {
	return int32(c.R)<<16 | int32(c.G)<<8 | int32(c.B)
}

func screenResponseFromSnapshot(id, label string, snap *Snapshot) *proto.GetScreenResponse {
	if snap == nil {
		return &proto.GetScreenResponse{Name: label, Id: id}
	}
	rows := make([]*proto.ScreenRow, snap.Rows)
	for row := 0; row < snap.Rows; row++ {
		cells := make([]*proto.ScreenCell, snap.Cols)
		for col := 0; col < snap.Cols; col++ {
			cell := snap.Cells[row*snap.Cols+col]
			ch := " "
			if cell.Rune != 0 {
				ch = string(cell.Rune)
			}
			cells[col] = &proto.ScreenCell{
				Char:       ch,
				FgColor:    packRGB(cell.Fg),
				BgColor:    packRGB(cell.Bg),
				Attributes: uint32(cell.Attrs),
			}
		}
		rows[row] = &proto.ScreenRow{Cells: cells}
	}
	return &proto.GetScreenResponse{
		Name:       label,
		Cols:       int32(snap.Cols),
		Rows:       int32(snap.Rows),
		CursorX:    int32(snap.CursorX),
		CursorY:    int32(snap.CursorY),
		ScreenRows: rows,
		Id:         id,
	}
}

func keyframeUpdateFromSnapshot(session *Session, id, label string, snap *Snapshot) *proto.ScreenUpdate {
	if session == nil {
		return nil
	}
	return &proto.ScreenUpdate{
		FrameId:     session.NextFrameID(),
		BaseFrameId: 0,
		IsKeyframe:  true,
		Screen:      screenResponseFromSnapshot(id, label, snap),
	}
}

func durationFromProto(dur *durationpb.Duration) (time.Duration, error) {
	if dur == nil {
		return 0, nil
	}
	if !dur.IsValid() {
		return 0, errors.New("invalid duration")
	}
	out := dur.AsDuration()
	if out < 0 {
		return 0, errors.New("duration must be >= 0")
	}
	return out, nil
}
