package server

import (
	"context"
	"errors"
	"image/color"
	"net"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	proto "github.com/advait/vtrpc/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/durationpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const maxRawInputBytes = 1 << 20

// GRPCServer implements the vtr gRPC service.
type GRPCServer struct {
	proto.UnimplementedVTRServer
	coord *Coordinator
	shell string
}

// NewGRPCServer constructs a gRPC server backed by the coordinator.
func NewGRPCServer(coord *Coordinator) *GRPCServer {
	shell := "/bin/sh"
	if coord != nil && coord.DefaultShell() != "" {
		shell = coord.DefaultShell()
	}
	return &GRPCServer{coord: coord, shell: shell}
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

func (s *GRPCServer) Remove(_ context.Context, req *proto.RemoveRequest) (*proto.RemoveResponse, error) {
	if req == nil || req.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "session name is required")
	}
	if err := s.coord.Remove(req.Name); err != nil {
		return nil, mapCoordinatorErr(err)
	}
	return &proto.RemoveResponse{}, nil
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

func (s *GRPCServer) Resize(_ context.Context, req *proto.ResizeRequest) (*proto.ResizeResponse, error) {
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
	sentInitialScreen := false

	if includeScreen {
		snap, err := s.coord.Snapshot(req.Name)
		if err != nil {
			return mapCoordinatorErr(err)
		}
		if err := stream.Send(&proto.SubscribeEvent{
			Event: &proto.SubscribeEvent_ScreenUpdate{
				ScreenUpdate: keyframeUpdateFromSnapshot(session, req.Name, snap),
			},
		}); err != nil {
			return err
		}
		sentInitialScreen = true
	}

	info := session.Info()
	if info.State == SessionExited {
		if includeScreen && !sentInitialScreen {
			snap, err := s.coord.Snapshot(req.Name)
			if err != nil {
				return mapCoordinatorErr(err)
			}
			if err := stream.Send(&proto.SubscribeEvent{
				Event: &proto.SubscribeEvent_ScreenUpdate{
					ScreenUpdate: keyframeUpdateFromSnapshot(session, req.Name, snap),
				},
			}); err != nil {
				return err
			}
		}
		return stream.Send(&proto.SubscribeEvent{
			Event: &proto.SubscribeEvent_SessionExited{
				SessionExited: &proto.SessionExited{ExitCode: int32(info.ExitCode)},
			},
		})
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
	ctx := stream.Context()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-session.exitCh:
			if includeRaw {
				data, nextOffset, nextCh := session.outputSnapshot(offset)
				offset = nextOffset
				outputCh = nextCh
				if len(data) > 0 {
					if err := stream.Send(&proto.SubscribeEvent{
						Event: &proto.SubscribeEvent_RawOutput{RawOutput: data},
					}); err != nil {
						return err
					}
				}
			} else {
				total, nextCh, _ := session.outputState()
				offset = total
				outputCh = nextCh
			}

			if includeScreen {
				snap, err := s.coord.Snapshot(req.Name)
				if err != nil {
					return mapCoordinatorErr(err)
				}
				if err := stream.Send(&proto.SubscribeEvent{
					Event: &proto.SubscribeEvent_ScreenUpdate{
						ScreenUpdate: keyframeUpdateFromSnapshot(session, req.Name, snap),
					},
				}); err != nil {
					return err
				}
			}

			info := session.Info()
			return stream.Send(&proto.SubscribeEvent{
				Event: &proto.SubscribeEvent_SessionExited{
					SessionExited: &proto.SessionExited{ExitCode: int32(info.ExitCode)},
				},
			})
		case <-outputCh:
			if includeRaw {
				data, nextOffset, nextCh := session.outputSnapshot(offset)
				offset = nextOffset
				outputCh = nextCh
				if len(data) > 0 {
					if err := stream.Send(&proto.SubscribeEvent{
						Event: &proto.SubscribeEvent_RawOutput{RawOutput: data},
					}); err != nil {
						return err
					}
				}
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
				snap, err := s.coord.Snapshot(req.Name)
				if err != nil {
					return mapCoordinatorErr(err)
				}
				if err := stream.Send(&proto.SubscribeEvent{
					Event: &proto.SubscribeEvent_ScreenUpdate{
						ScreenUpdate: keyframeUpdateFromSnapshot(session, req.Name, snap),
					},
				}); err != nil {
					return err
				}
				pendingScreen = false
			}
		}
	}
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
