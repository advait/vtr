package server

import (
	"context"
	"crypto/tls"
	"errors"
	"image/color"
	"log"
	"net"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	proto "github.com/advait/vtrpc/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/peer"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/durationpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const (
	maxRawInputBytes = 1 << 20
	keyframeRingSize = 4
)

var keyframeInterval = 5 * time.Second
var logResize = strings.TrimSpace(os.Getenv("VTR_LOG_RESIZE")) != ""

// GRPCServer implements the vtr gRPC service.
type GRPCServer struct {
	proto.UnimplementedVTRServer
	coord *Coordinator
	shell string

	keyframeMu   sync.Mutex
	keyframeRing map[string]*keyframeRing
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

// NewGRPCServer constructs a gRPC server backed by the coordinator.
func NewGRPCServer(coord *Coordinator) *GRPCServer {
	shell := "/bin/sh"
	if coord != nil && coord.DefaultShell() != "" {
		shell = coord.DefaultShell()
	}
	return &GRPCServer{
		coord:        coord,
		shell:        shell,
		keyframeRing: make(map[string]*keyframeRing),
	}
}

// ListenUnix creates a Unix socket listener, removing any stale socket file.
func ListenUnix(socketPath string) (net.Listener, error) {
	if strings.TrimSpace(socketPath) == "" {
		return nil, errors.New("grpc: socket path is required")
	}
	if err := os.MkdirAll(filepath.Dir(socketPath), 0o755); err != nil {
		return nil, err
	}
	if err := os.Remove(socketPath); err != nil && !os.IsNotExist(err) {
		return nil, err
	}
	return net.Listen("unix", socketPath)
}

// ServeUnix runs the gRPC server on a Unix socket until ctx is canceled.
func ServeUnix(ctx context.Context, coord *Coordinator, socketPath string) error {
	listener, err := ListenUnix(socketPath)
	if err != nil {
		return err
	}
	defer func() {
		_ = listener.Close()
		_ = os.Remove(socketPath)
	}()

	grpcServer := grpc.NewServer()
	proto.RegisterVTRServer(grpcServer, NewGRPCServer(coord))

	errCh := make(chan error, 1)
	go func() {
		errCh <- grpcServer.Serve(listener)
	}()

	select {
	case <-ctx.Done():
		grpcServer.GracefulStop()
		err := <-errCh
		if err != nil && !errors.Is(err, grpc.ErrServerStopped) {
			return err
		}
		return ctx.Err()
	case err := <-errCh:
		return err
	}
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
	}
	if tlsConfig != nil {
		opts = append(opts, grpc.Creds(credentials.NewTLS(tlsConfig)))
	}

	grpcServer := grpc.NewServer(opts...)
	proto.RegisterVTRServer(grpcServer, NewGRPCServer(coord))

	errCh := make(chan error, 1)
	go func() {
		errCh <- grpcServer.Serve(listener)
	}()

	select {
	case <-ctx.Done():
		grpcServer.GracefulStop()
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
	if req.Name == "" {
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

	s.clearKeyframes(req.Name)
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
		return stream.Send(&proto.SubscribeSessionsEvent{Sessions: out})
	}

	if err := sendSnapshot(); err != nil {
		return err
	}

	ctx := stream.Context()
	signal := s.coord.sessionsChanged()
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-signal:
			if err := sendSnapshot(); err != nil {
				return err
			}
			signal = s.coord.sessionsChanged()
		}
	}
}

func (s *GRPCServer) Info(_ context.Context, req *proto.InfoRequest) (*proto.InfoResponse, error) {
	if req == nil || req.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
	}
	info, err := s.coord.Info(req.Name)
	if err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.InfoResponse{Session: toProtoSession(info)}, nil
}

func (s *GRPCServer) Kill(_ context.Context, req *proto.KillRequest) (*proto.KillResponse, error) {
	if req == nil || req.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
	}
	sig, err := parseSignal(req.Signal)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	if err := s.coord.Kill(req.Name, sig); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.KillResponse{}, nil
}

func (s *GRPCServer) Close(_ context.Context, req *proto.CloseRequest) (*proto.CloseResponse, error) {
	if req == nil || req.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
	}
	if err := s.coord.Close(req.Name); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.CloseResponse{}, nil
}

func (s *GRPCServer) Remove(_ context.Context, req *proto.RemoveRequest) (*proto.RemoveResponse, error) {
	if req == nil || req.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
	}
	if err := s.coord.Remove(req.Name); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	s.clearKeyframes(req.Name)
	return &proto.RemoveResponse{}, nil
}

func (s *GRPCServer) Rename(_ context.Context, req *proto.RenameRequest) (*proto.RenameResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
	}
	if strings.TrimSpace(req.NewName) == "" {
		return nil, status.Error(codes.InvalidArgument, "new name is required")
	}
	if err := s.coord.Rename(req.Name, req.NewName); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	s.clearKeyframes(req.Name)
	s.clearKeyframes(req.NewName)
	return &proto.RenameResponse{}, nil
}

func (s *GRPCServer) GetScreen(_ context.Context, req *proto.GetScreenRequest) (*proto.GetScreenResponse, error) {
	if req == nil || req.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
	}
	snap, err := s.coord.Snapshot(req.Name)
	if err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return screenResponseFromSnapshot(req.Name, snap), nil
}

func (s *GRPCServer) Grep(_ context.Context, req *proto.GrepRequest) (*proto.GrepResponse, error) {
	if req == nil || req.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
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
	matches, err := s.coord.Grep(req.Name, re, int(req.ContextBefore), int(req.ContextAfter), maxMatches)
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
	if req == nil || req.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
	}
	if !utf8.ValidString(req.Text) {
		return nil, status.Error(codes.InvalidArgument, "text must be valid UTF-8")
	}
	if err := s.coord.Send(req.Name, []byte(req.Text)); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.SendTextResponse{}, nil
}

func (s *GRPCServer) SendKey(_ context.Context, req *proto.SendKeyRequest) (*proto.SendKeyResponse, error) {
	if req == nil || req.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
	}
	seq, err := keyToBytes(req.Key)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	if err := s.coord.Send(req.Name, seq); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.SendKeyResponse{}, nil
}

func (s *GRPCServer) SendBytes(_ context.Context, req *proto.SendBytesRequest) (*proto.SendBytesResponse, error) {
	if req == nil || req.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
	}
	if len(req.Data) > maxRawInputBytes {
		return nil, status.Errorf(codes.InvalidArgument, "data exceeds %d bytes", maxRawInputBytes)
	}
	if err := s.coord.Send(req.Name, req.Data); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.SendBytesResponse{}, nil
}

func (s *GRPCServer) Resize(ctx context.Context, req *proto.ResizeRequest) (*proto.ResizeResponse, error) {
	if req == nil || req.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
	}
	cols, err := requiredUint16(req.Cols)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	rows, err := requiredUint16(req.Rows)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	if logResize {
		peerAddr := "unknown"
		if p, ok := peer.FromContext(ctx); ok && p != nil && p.Addr != nil {
			peerAddr = p.Addr.String()
		}
		prevCols := 0
		prevRows := 0
		if info, infoErr := s.coord.Info(req.Name); infoErr == nil && info != nil {
			prevCols = int(info.Cols)
			prevRows = int(info.Rows)
		}
		log.Printf("resize grpc name=%s cols=%d rows=%d prev=%dx%d peer=%s", req.Name, cols, rows, prevCols, prevRows, peerAddr)
	}
	if err := s.coord.Resize(req.Name, cols, rows); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.ResizeResponse{}, nil
}

func (s *GRPCServer) WaitFor(ctx context.Context, req *proto.WaitForRequest) (*proto.WaitForResponse, error) {
	if req == nil || req.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
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
	matched, line, timedOut, err := s.coord.WaitFor(ctx, req.Name, re, timeout)
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
	if req == nil || req.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
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
	idleReached, timedOut, err := s.coord.WaitForIdle(ctx, req.Name, idle, timeout)
	if err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return nil, err
		}
		return nil, mapCoordinatorErr(err)
	}
	return &proto.WaitForIdleResponse{
		Idle:     idleReached,
		TimedOut: timedOut,
	}, nil
}

func (s *GRPCServer) Subscribe(req *proto.SubscribeRequest, stream proto.VTR_SubscribeServer) error {
	if req == nil || req.Name == "" {
		return status.Error(codes.InvalidArgument, "session name is required")
	}
	if !req.IncludeScreenUpdates && !req.IncludeRawOutput {
		return status.Error(codes.InvalidArgument, "subscribe requires screen updates or raw output")
	}

	session, err := s.coord.getSession(req.Name)
	if err != nil {
		return mapCoordinatorErr(err)
	}

	offset, outputCh, _ := session.outputState()
	includeScreen := req.IncludeScreenUpdates
	includeRaw := req.IncludeRawOutput
	resizeCh := session.resizeState()
	ctx := stream.Context()

	screenSignal := make(chan struct{}, 1)
	rawSignal := make(chan struct{}, 1)
	idleSignal := make(chan struct{}, 1)
	sendErrCh := make(chan error, 1)
	exitSignal := make(chan exitPayload, 1)
	makeKeyframe := func() (*proto.ScreenUpdate, error) {
		snap, err := s.coord.Snapshot(req.Name)
		if err != nil {
			return nil, err
		}
		update := keyframeUpdateFromSnapshot(session, req.Name, snap)
		total, _, _ := session.outputState()
		s.cacheKeyframe(req.Name, update, total)
		return update, nil
	}

	var screenMu sync.Mutex
	var latestScreen *proto.ScreenUpdate
	setLatestScreen := func(update *proto.ScreenUpdate) {
		if update == nil {
			return
		}
		screenMu.Lock()
		latestScreen = update
		screenMu.Unlock()
		select {
		case screenSignal <- struct{}{}:
		default:
		}
	}
	drainLatestScreen := func() *proto.ScreenUpdate {
		screenMu.Lock()
		update := latestScreen
		latestScreen = nil
		screenMu.Unlock()
		return update
	}

	var rawMu sync.Mutex
	var pendingRaw []byte
	appendRaw := func(data []byte) {
		if len(data) == 0 {
			return
		}
		rawMu.Lock()
		pendingRaw = append(pendingRaw, data...)
		if len(pendingRaw) > maxOutputBuffer {
			drop := len(pendingRaw) - maxOutputBuffer
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

	go func() {
		sendErrCh <- runSubscribeSender(
			ctx,
			stream,
			screenSignal,
			rawSignal,
			idleSignal,
			exitSignal,
			drainLatestScreen,
			drainRaw,
			drainLatestIdle,
		)
	}()

	_, idleCh := session.idleState()

	info := session.Info()
	if info.State == SessionExited {
		if includeRaw {
			data, nextOffset, nextCh := session.outputSnapshot(offset)
			offset = nextOffset
			outputCh = nextCh
			appendRaw(data)
		}
		var finalScreen *proto.ScreenUpdate
		if includeScreen {
			update, err := makeKeyframe()
			if err != nil {
				return mapCoordinatorErr(err)
			}
			finalScreen = update
		}
		exitSignal <- exitPayload{
			exit:        &proto.SessionExited{ExitCode: int32(info.ExitCode)},
			finalScreen: finalScreen,
		}
		err := <-sendErrCh
		if err == nil {
			return nil
		}
		return err
	}

	if includeScreen {
		if cached := s.cachedKeyframe(session, req.Name); cached != nil {
			setLatestScreen(cached)
		} else {
			update, err := makeKeyframe()
			if err != nil {
				return mapCoordinatorErr(err)
			}
			setLatestScreen(update)
		}
	}

	var ticker *time.Ticker
	var tick <-chan time.Time
	var keyframeTicker *time.Ticker
	var keyframeTick <-chan time.Time
	if includeScreen {
		ticker = time.NewTicker(time.Second / 30)
		tick = ticker.C
		if keyframeInterval > 0 {
			keyframeTicker = time.NewTicker(keyframeInterval)
			keyframeTick = keyframeTicker.C
		}
	}
	if ticker != nil {
		defer ticker.Stop()
	}
	if keyframeTicker != nil {
		defer keyframeTicker.Stop()
	}

	pendingScreen := false

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
			idleState, nextCh := session.idleState()
			idleCh = nextCh
			setLatestIdle(&proto.SessionIdle{Name: req.Name, Idle: idleState})
		case <-session.exitCh:
			if includeRaw {
				data, nextOffset, nextCh := session.outputSnapshot(offset)
				offset = nextOffset
				outputCh = nextCh
				appendRaw(data)
			} else {
				total, nextCh, _ := session.outputState()
				offset = total
				outputCh = nextCh
			}

			var finalScreen *proto.ScreenUpdate
			if includeScreen {
				update, err := makeKeyframe()
				if err != nil {
					return mapCoordinatorErr(err)
				}
				finalScreen = update
			}

			info := session.Info()
			exitSignal <- exitPayload{
				exit:        &proto.SessionExited{ExitCode: int32(info.ExitCode)},
				finalScreen: finalScreen,
			}
			err := <-sendErrCh
			if err == nil {
				return nil
			}
			return err
		case <-outputCh:
			if includeRaw {
				data, nextOffset, nextCh := session.outputSnapshot(offset)
				offset = nextOffset
				outputCh = nextCh
				appendRaw(data)
			} else {
				total, nextCh, _ := session.outputState()
				offset = total
				outputCh = nextCh
			}
			if includeScreen {
				pendingScreen = true
			}
		case <-resizeCh:
			if includeScreen {
				pendingScreen = true
			}
			resizeCh = session.resizeState()
		case <-tick:
			if includeScreen && pendingScreen {
				update, err := makeKeyframe()
				if err != nil {
					return mapCoordinatorErr(err)
				}
				setLatestScreen(update)
				pendingScreen = false
			}
		case <-keyframeTick:
			if includeScreen {
				pendingScreen = true
			}
		}
	}
}

type exitPayload struct {
	exit        *proto.SessionExited
	finalScreen *proto.ScreenUpdate
}

func runSubscribeSender(
	ctx context.Context,
	stream proto.VTR_SubscribeServer,
	screenSignal <-chan struct{},
	rawSignal <-chan struct{},
	idleSignal <-chan struct{},
	exitSignal <-chan exitPayload,
	drainScreen func() *proto.ScreenUpdate,
	drainRaw func() []byte,
	drainIdle func() *proto.SessionIdle,
) error {
	sendScreen := func(update *proto.ScreenUpdate) error {
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

func (s *GRPCServer) cacheKeyframe(name string, update *proto.ScreenUpdate, outputTotal int64) {
	if update == nil || !update.IsKeyframe {
		return
	}
	s.keyframeMu.Lock()
	ring := s.keyframeRing[name]
	if ring == nil {
		ring = newKeyframeRing(keyframeRingSize)
		s.keyframeRing[name] = ring
	}
	ring.Add(keyframeEntry{
		update:      update,
		outputTotal: outputTotal,
		at:          time.Now(),
	})
	s.keyframeMu.Unlock()
}

func (s *GRPCServer) cachedKeyframe(session *Session, name string) *proto.ScreenUpdate {
	if session == nil {
		return nil
	}
	total, _, _ := session.outputState()
	info := session.Info()
	s.keyframeMu.Lock()
	ring := s.keyframeRing[name]
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

func (s *GRPCServer) clearKeyframes(name string) {
	s.keyframeMu.Lock()
	delete(s.keyframeRing, name)
	s.keyframeMu.Unlock()
}

func toProtoSession(info *SessionInfo) *proto.Session {
	if info == nil {
		return nil
	}
	session := &proto.Session{
		Name:      info.Name,
		Status:    toProtoStatus(info.State),
		Cols:      int32(info.Cols),
		Rows:      int32(info.Rows),
		ExitCode:  int32(info.ExitCode),
		CreatedAt: timestamppb.New(info.CreatedAt),
		Idle:      info.Idle,
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

func screenResponseFromSnapshot(name string, snap *Snapshot) *proto.GetScreenResponse {
	if snap == nil {
		return &proto.GetScreenResponse{Name: name}
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
		Name:       name,
		Cols:       int32(snap.Cols),
		Rows:       int32(snap.Rows),
		CursorX:    int32(snap.CursorX),
		CursorY:    int32(snap.CursorY),
		ScreenRows: rows,
	}
}

func keyframeUpdateFromSnapshot(session *Session, name string, snap *Snapshot) *proto.ScreenUpdate {
	if session == nil {
		return nil
	}
	return &proto.ScreenUpdate{
		FrameId:     session.nextFrameID(),
		BaseFrameId: 0,
		IsKeyframe:  true,
		Screen:      screenResponseFromSnapshot(name, snap),
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
