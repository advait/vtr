package server

import (
	"context"
	"errors"
	"fmt"
	"net"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"

	proto "github.com/advait/vtrpc/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/durationpb"
)

func startGRPCTestServer(t *testing.T) (proto.VTRClient, func()) {
	t.Helper()

	coord := newTestCoordinator()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		coord.CloseAll()
		t.Fatalf("Listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	proto.RegisterVTRServer(grpcServer, NewGRPCServer(coord))
	go func() {
		_ = grpcServer.Serve(listener)
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	conn, err := grpc.DialContext(ctx, listener.Addr().String(),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	cancel()
	if err != nil {
		listener.Close()
		coord.CloseAll()
		t.Fatalf("Dial: %v", err)
	}

	client := proto.NewVTRClient(conn)
	cleanup := func() {
		_ = conn.Close()
		grpcServer.GracefulStop()
		_ = listener.Close()
		_ = coord.CloseAll()
	}
	return client, cleanup
}

func waitForScreenContains(t *testing.T, client proto.VTRClient, id, want string, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	var lastScreen string
	var lastErr error
	for time.Now().Before(deadline) {
		ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
		resp, err := client.GetScreen(ctx, &proto.GetScreenRequest{Session: &proto.SessionRef{Id: id}})
		cancel()
		if err == nil {
			screen := screenToString(resp)
			if strings.Contains(screen, want) {
				return
			}
			lastScreen = screen
			lastErr = nil
		} else {
			lastErr = err
		}
		time.Sleep(20 * time.Millisecond)
	}
	if lastErr != nil {
		t.Fatalf("timeout waiting for screen %q: last error: %v", want, lastErr)
	}
	t.Fatalf("timeout waiting for screen %q: last screen: %q", want, lastScreen)
}

func screenToString(resp *proto.GetScreenResponse) string {
	if resp == nil {
		return ""
	}
	var b strings.Builder
	for _, row := range resp.ScreenRows {
		for _, cell := range row.Cells {
			if cell == nil || cell.Char == "" {
				b.WriteByte(' ')
				continue
			}
			b.WriteString(cell.Char)
		}
		b.WriteByte('\n')
	}
	return b.String()
}

type blockingSubscribeStream struct {
	ctx       context.Context
	blockCh   chan struct{}
	unblockCh chan struct{}
	events    chan *proto.SubscribeEvent

	mu      sync.Mutex
	blocked bool
}

func newBlockingSubscribeStream(ctx context.Context) *blockingSubscribeStream {
	return &blockingSubscribeStream{
		ctx:       ctx,
		blockCh:   make(chan struct{}),
		unblockCh: make(chan struct{}),
		events:    make(chan *proto.SubscribeEvent, 32),
	}
}

func (s *blockingSubscribeStream) Send(ev *proto.SubscribeEvent) error {
	if ev == nil {
		return nil
	}
	if ev.GetScreenUpdate() != nil {
		s.mu.Lock()
		shouldBlock := !s.blocked
		if shouldBlock {
			s.blocked = true
		}
		s.mu.Unlock()
		if shouldBlock {
			close(s.blockCh)
			select {
			case <-s.unblockCh:
			case <-s.ctx.Done():
				return s.ctx.Err()
			}
		}
	}
	select {
	case s.events <- ev:
	default:
	}
	return nil
}

func (s *blockingSubscribeStream) SetHeader(metadata.MD) error  { return nil }
func (s *blockingSubscribeStream) SendHeader(metadata.MD) error { return nil }
func (s *blockingSubscribeStream) SetTrailer(metadata.MD)       {}
func (s *blockingSubscribeStream) Context() context.Context     { return s.ctx }
func (s *blockingSubscribeStream) SendMsg(interface{}) error    { return nil }
func (s *blockingSubscribeStream) RecvMsg(interface{}) error    { return nil }

func waitForSessionStatus(t *testing.T, client proto.VTRClient, id string, want proto.SessionStatus, timeout time.Duration) *proto.Session {
	t.Helper()
	deadline := time.Now().Add(timeout)
	var lastSession *proto.Session
	var lastErr error
	for time.Now().Before(deadline) {
		ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
		resp, err := client.Info(ctx, &proto.InfoRequest{Session: &proto.SessionRef{Id: id}})
		cancel()
		if err == nil {
			if resp.Session != nil && resp.Session.Status == want {
				return resp.Session
			}
			lastSession = resp.Session
			lastErr = nil
		} else {
			lastErr = err
		}
		time.Sleep(20 * time.Millisecond)
	}
	if lastErr != nil {
		t.Fatalf("timeout waiting for status %v: last error: %v", want, lastErr)
	}
	t.Fatalf("timeout waiting for status %v: last session: %+v", want, lastSession)
	return nil
}

func TestGRPCSpawnSendScreen(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-echo",
		Command: "printf 'ready\\n'; read line; printf 'got:%s\\n' \"$line\"; sleep 0.1",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := spawnResp.GetSession().GetId()

	waitForScreenContains(t, client, sessionID, "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.SendText(ctx, &proto.SendTextRequest{Session: &proto.SessionRef{Id: sessionID}, Text: "hello\n"})
	cancel()
	if err != nil {
		t.Fatalf("SendText: %v", err)
	}

	waitForScreenContains(t, client, sessionID, "got:hello", 2*time.Second)
}

func TestGRPCListInfoResize(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-info",
		Command: "printf 'ready\\n'; while true; do sleep 0.2; done",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := spawnResp.GetSession().GetId()

	waitForScreenContains(t, client, sessionID, "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	listResp, err := client.List(ctx, &proto.ListRequest{})
	cancel()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	found := false
	for _, sess := range listResp.Sessions {
		if sess.Name == "grpc-info" {
			found = true
			if sess.Status != proto.SessionStatus_SESSION_STATUS_RUNNING {
				t.Fatalf("List status=%v", sess.Status)
			}
		}
	}
	if !found {
		t.Fatalf("List missing grpc-info")
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	infoResp, err := client.Info(ctx, &proto.InfoRequest{Session: &proto.SessionRef{Id: sessionID}})
	cancel()
	if err != nil {
		t.Fatalf("Info: %v", err)
	}
	if infoResp.Session == nil || infoResp.Session.Status != proto.SessionStatus_SESSION_STATUS_RUNNING {
		t.Fatalf("Info status=%v", infoResp.Session)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.Resize(ctx, &proto.ResizeRequest{Session: &proto.SessionRef{Id: sessionID}, Cols: 100, Rows: 30})
	cancel()
	if err != nil {
		t.Fatalf("Resize: %v", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	screenResp, err := client.GetScreen(ctx, &proto.GetScreenRequest{Session: &proto.SessionRef{Id: sessionID}})
	cancel()
	if err != nil {
		t.Fatalf("GetScreen: %v", err)
	}
	if screenResp.Cols != 100 || screenResp.Rows != 30 {
		t.Fatalf("screen size=%dx%d", screenResp.Cols, screenResp.Rows)
	}
}

func TestGRPCSubscribeSessions(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	stream, err := client.SubscribeSessions(ctx, &proto.SubscribeSessionsRequest{})
	if err != nil {
		cancel()
		t.Fatalf("SubscribeSessions: %v", err)
	}

	first, err := stream.Recv()
	if err != nil {
		cancel()
		t.Fatalf("SubscribeSessions recv: %v", err)
	}
	if snapshotHasSession(first, "grpc-subscribe") {
		cancel()
		t.Fatalf("SubscribeSessions unexpected session in initial snapshot")
	}

	spawnCtx, spawnCancel := context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.Spawn(spawnCtx, &proto.SpawnRequest{
		Name:    "grpc-subscribe",
		Command: "printf 'ready\\n'; while true; do sleep 0.2; done",
	})
	spawnCancel()
	if err != nil {
		cancel()
		t.Fatalf("Spawn: %v", err)
	}

	found := false
	for !found {
		snapshot, err := stream.Recv()
		if err != nil {
			cancel()
			t.Fatalf("SubscribeSessions recv after spawn: %v", err)
		}
		found = snapshotHasSession(snapshot, "grpc-subscribe")
	}
	cancel()
}

func snapshotHasSession(snapshot *proto.SessionsSnapshot, name string) bool {
	if snapshot == nil {
		return false
	}
	for _, coord := range snapshot.Coordinators {
		for _, session := range coord.GetSessions() {
			if session != nil && session.Name == name {
				return true
			}
		}
	}
	return false
}

func TestGRPCKillRemove(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-kill",
		Command: "printf 'ready\\n'; trap 'exit 0' TERM; while true; do sleep 0.2; done",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := spawnResp.GetSession().GetId()

	waitForScreenContains(t, client, sessionID, "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.Kill(ctx, &proto.KillRequest{Session: &proto.SessionRef{Id: sessionID}, Signal: "TERM"})
	cancel()
	if err != nil {
		t.Fatalf("Kill: %v", err)
	}

	waitForSessionStatus(t, client, sessionID, proto.SessionStatus_SESSION_STATUS_EXITED, 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.Remove(ctx, &proto.RemoveRequest{Session: &proto.SessionRef{Id: sessionID}})
	cancel()
	if err != nil {
		t.Fatalf("Remove: %v", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.Info(ctx, &proto.InfoRequest{Session: &proto.SessionRef{Id: sessionID}})
	cancel()
	if status.Code(err) != codes.NotFound {
		t.Fatalf("expected NotFound after remove, got %v", err)
	}
}

func TestGRPCErrors(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	_, err := client.Spawn(ctx, &proto.SpawnRequest{Name: "bad-size", Cols: -1})
	cancel()
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("expected InvalidArgument for bad size, got %v", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	errorsResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-errors",
		Command: "printf 'ready\\n'; while true; do sleep 0.2; done",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	errorsID := errorsResp.GetSession().GetId()

	waitForScreenContains(t, client, errorsID, "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.Spawn(ctx, &proto.SpawnRequest{Name: "grpc-errors"})
	cancel()
	if status.Code(err) != codes.AlreadyExists {
		t.Fatalf("expected AlreadyExists for duplicate spawn, got %v", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.SendKey(ctx, &proto.SendKeyRequest{Session: &proto.SessionRef{Id: errorsID}, Key: "not-a-key"})
	cancel()
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("expected InvalidArgument for bad key, got %v", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.SendText(ctx, &proto.SendTextRequest{Session: &proto.SessionRef{Id: "missing"}, Text: "hi"})
	cancel()
	if status.Code(err) != codes.NotFound {
		t.Fatalf("expected NotFound for missing session, got %v", err)
	}

	tooLarge := make([]byte, maxRawInputBytes+1)
	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.SendBytes(ctx, &proto.SendBytesRequest{Session: &proto.SessionRef{Id: errorsID}, Data: tooLarge})
	cancel()
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("expected InvalidArgument for oversized data, got %v", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	exitResp, err := client.Spawn(ctx, &proto.SpawnRequest{Name: "grpc-exit", Command: "exit 0"})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	exitID := exitResp.GetSession().GetId()

	waitForSessionStatus(t, client, exitID, proto.SessionStatus_SESSION_STATUS_EXITED, 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.SendText(ctx, &proto.SendTextRequest{Session: &proto.SessionRef{Id: exitID}, Text: "hi"})
	cancel()
	if status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("expected FailedPrecondition for exited session, got %v", err)
	}
}

func TestGRPCGrep(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-grep",
		Command: "printf 'zero\\none\\nerror here\\nthree\\n'; sleep 0.1",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := spawnResp.GetSession().GetId()

	waitForScreenContains(t, client, sessionID, "error here", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	resp, err := client.Grep(ctx, &proto.GrepRequest{
		Session:       &proto.SessionRef{Id: sessionID},
		Pattern:       "error",
		ContextBefore: 1,
		ContextAfter:  1,
		MaxMatches:    5,
	})
	cancel()
	if err != nil {
		t.Fatalf("Grep: %v", err)
	}
	if len(resp.Matches) != 1 {
		t.Fatalf("expected 1 match, got %d", len(resp.Matches))
	}
	match := resp.Matches[0]
	if match.Line != "error here" {
		t.Fatalf("match line=%q", match.Line)
	}
	if len(match.ContextBefore) != 1 || match.ContextBefore[0] != "one" {
		t.Fatalf("context before=%v", match.ContextBefore)
	}
	if len(match.ContextAfter) != 1 || match.ContextAfter[0] != "three" {
		t.Fatalf("context after=%v", match.ContextAfter)
	}
	if match.LineNumber != 2 {
		t.Fatalf("line number=%d", match.LineNumber)
	}
}

func TestGRPCWaitFor(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-wait",
		Command: "printf 'ready\\n'; sleep 0.2; printf 'done\\n'; sleep 0.1",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := spawnResp.GetSession().GetId()

	waitForScreenContains(t, client, sessionID, "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	resp, err := client.WaitFor(ctx, &proto.WaitForRequest{
		Session: &proto.SessionRef{Id: sessionID},
		Pattern: "done",
		Timeout: durationpb.New(2 * time.Second),
	})
	cancel()
	if err != nil {
		t.Fatalf("WaitFor: %v", err)
	}
	if resp.TimedOut || !resp.Matched {
		t.Fatalf("expected match, got %+v", resp)
	}
	if !strings.Contains(resp.MatchedLine, "done") {
		t.Fatalf("matched line=%q", resp.MatchedLine)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	resp, err = client.WaitFor(ctx, &proto.WaitForRequest{
		Session: &proto.SessionRef{Id: sessionID},
		Pattern: "never",
		Timeout: durationpb.New(200 * time.Millisecond),
	})
	cancel()
	if err != nil {
		t.Fatalf("WaitFor timeout: %v", err)
	}
	if !resp.TimedOut || resp.Matched {
		t.Fatalf("expected timeout, got %+v", resp)
	}
}

func TestGRPCWaitForIdle(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-idle",
		Command: "printf 'ready\\n'; sleep 0.5",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := spawnResp.GetSession().GetId()

	waitForScreenContains(t, client, sessionID, "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	resp, err := client.WaitForIdle(ctx, &proto.WaitForIdleRequest{
		Session:      &proto.SessionRef{Id: sessionID},
		IdleDuration: durationpb.New(200 * time.Millisecond),
		Timeout:      durationpb.New(1 * time.Second),
	})
	cancel()
	if err != nil {
		t.Fatalf("WaitForIdle: %v", err)
	}
	if resp.TimedOut || !resp.Idle {
		t.Fatalf("expected idle, got %+v", resp)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	resp, err = client.WaitForIdle(ctx, &proto.WaitForIdleRequest{
		Session:       &proto.SessionRef{Id: sessionID},
		IdleDuration:  durationpb.New(100 * time.Millisecond),
		Timeout:       durationpb.New(1 * time.Second),
		IncludeScreen: true,
	})
	cancel()
	if err != nil {
		t.Fatalf("WaitForIdle screen: %v", err)
	}
	if resp.TimedOut || !resp.Idle {
		t.Fatalf("expected idle with screen, got %+v", resp)
	}
	if resp.Screen == nil {
		t.Fatalf("expected screen snapshot with idle response")
	}
	if !strings.Contains(screenToString(resp.Screen), "ready") {
		t.Fatalf("expected idle screen to contain ready, got %q", screenToString(resp.Screen))
	}
}

func TestGRPCSubscribeIdleEvents(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-subscribe-idle",
		Command: "printf 'ready\\n'; sleep 0.4; printf 'again\\n'; sleep 0.4",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := spawnResp.GetSession().GetId()

	waitForScreenContains(t, client, sessionID, "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 3*time.Second)
	stream, err := client.Subscribe(ctx, &proto.SubscribeRequest{
		Session:              &proto.SessionRef{Id: sessionID},
		IncludeScreenUpdates: false,
		IncludeRawOutput:     true,
	})
	if err != nil {
		cancel()
		t.Fatalf("Subscribe: %v", err)
	}
	defer cancel()

	sawIdleTrue := false
	sawIdleFalseAfter := false

	for {
		event, err := stream.Recv()
		if err != nil {
			t.Fatalf("Recv: %v", err)
		}
		idle := event.GetSessionIdle()
		if idle == nil {
			if event.GetSessionExited() != nil && !sawIdleFalseAfter {
				t.Fatalf("session exited before idle transition")
			}
			continue
		}
		if idle.Id != sessionID {
			t.Fatalf("idle id=%q", idle.Id)
		}
		if idle.Idle {
			sawIdleTrue = true
			continue
		}
		if sawIdleTrue {
			sawIdleFalseAfter = true
			break
		}
	}

	if !sawIdleTrue || !sawIdleFalseAfter {
		t.Fatalf("expected idle transition, got idle=%v idle_after=%v", sawIdleTrue, sawIdleFalseAfter)
	}
}

func TestGRPCSubscribeInitialSnapshot(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-subscribe",
		Command: "printf 'ready\\n'; sleep 0.5",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := spawnResp.GetSession().GetId()

	waitForScreenContains(t, client, sessionID, "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	stream, err := client.Subscribe(ctx, &proto.SubscribeRequest{
		Session:              &proto.SessionRef{Id: sessionID},
		IncludeScreenUpdates: true,
		IncludeRawOutput:     false,
	})
	if err != nil {
		cancel()
		t.Fatalf("Subscribe: %v", err)
	}
	event, err := stream.Recv()
	cancel()
	if err != nil {
		t.Fatalf("Recv: %v", err)
	}
	update := event.GetScreenUpdate()
	if update == nil || update.Screen == nil {
		t.Fatalf("expected initial screen update, got %+v", event)
	}
	if !update.IsKeyframe || update.BaseFrameId != 0 || update.FrameId == 0 {
		t.Fatalf("expected keyframe with frame_id set, got %+v", update)
	}
	screen := screenToString(update.Screen)
	if !strings.Contains(screen, "ready") {
		t.Fatalf("expected initial screen to contain ready, got %q", screen)
	}
}

func TestGRPCSubscribeFrameIDMonotonic(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-subscribe-frames",
		Command: "sleep 0.1; printf 'one\\n'; sleep 0.1; printf 'two\\n'; sleep 0.2",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := spawnResp.GetSession().GetId()

	ctx, cancel = context.WithTimeout(context.Background(), 3*time.Second)
	stream, err := client.Subscribe(ctx, &proto.SubscribeRequest{
		Session:              &proto.SessionRef{Id: sessionID},
		IncludeScreenUpdates: true,
		IncludeRawOutput:     false,
	})
	if err != nil {
		cancel()
		t.Fatalf("Subscribe: %v", err)
	}

	var frames []uint64
	for len(frames) < 2 {
		event, err := stream.Recv()
		if err != nil {
			cancel()
			t.Fatalf("Recv: %v", err)
		}
		update := event.GetScreenUpdate()
		if update == nil {
			continue
		}
		if !update.IsKeyframe || update.BaseFrameId != 0 || update.FrameId == 0 {
			cancel()
			t.Fatalf("expected keyframe with frame_id set, got %+v", update)
		}
		frames = append(frames, update.FrameId)
	}
	cancel()
	if frames[1] <= frames[0] {
		t.Fatalf("expected frame IDs to increase, got %v", frames)
	}
}

func TestGRPCSubscribeResizeKeyframe(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-subscribe-resize",
		Command: "sleep 0.5",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := spawnResp.GetSession().GetId()

	ctx, cancel = context.WithTimeout(context.Background(), 3*time.Second)
	stream, err := client.Subscribe(ctx, &proto.SubscribeRequest{
		Session:              &proto.SessionRef{Id: sessionID},
		IncludeScreenUpdates: true,
		IncludeRawOutput:     false,
	})
	if err != nil {
		cancel()
		t.Fatalf("Subscribe: %v", err)
	}

	event, err := stream.Recv()
	if err != nil {
		cancel()
		t.Fatalf("Recv: %v", err)
	}
	update := event.GetScreenUpdate()
	if update == nil || update.Screen == nil {
		cancel()
		t.Fatalf("expected initial screen update, got %+v", event)
	}
	initialFrame := update.FrameId

	ctxResize, cancelResize := context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.Resize(ctxResize, &proto.ResizeRequest{
		Session: &proto.SessionRef{Id: sessionID},
		Cols:    100,
		Rows:    40,
	})
	cancelResize()
	if err != nil {
		cancel()
		t.Fatalf("Resize: %v", err)
	}

	var resized *proto.ScreenUpdate
	for {
		event, err := stream.Recv()
		if err != nil {
			cancel()
			t.Fatalf("Recv: %v", err)
		}
		update := event.GetScreenUpdate()
		if update == nil || update.Screen == nil {
			continue
		}
		if update.Screen.Cols == 100 && update.Screen.Rows == 40 {
			resized = update
			break
		}
	}
	cancel()
	if resized == nil {
		t.Fatalf("expected resize keyframe update")
	}
	if !resized.IsKeyframe || resized.BaseFrameId != 0 || resized.FrameId == 0 {
		t.Fatalf("expected keyframe with frame_id set, got %+v", resized)
	}
	if resized.FrameId <= initialFrame {
		t.Fatalf("expected resize frame_id to increase, got %d then %d", initialFrame, resized.FrameId)
	}
}

func TestGRPCSubscribePeriodicKeyframe(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	oldInterval := keyframeInterval
	keyframeInterval = 200 * time.Millisecond
	t.Cleanup(func() {
		keyframeInterval = oldInterval
	})

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-subscribe-periodic",
		Command: "sleep 1",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := spawnResp.GetSession().GetId()

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	stream, err := client.Subscribe(ctx, &proto.SubscribeRequest{
		Session:              &proto.SessionRef{Id: sessionID},
		IncludeScreenUpdates: true,
		IncludeRawOutput:     false,
	})
	if err != nil {
		cancel()
		t.Fatalf("Subscribe: %v", err)
	}

	event, err := stream.Recv()
	if err != nil {
		cancel()
		t.Fatalf("Recv: %v", err)
	}
	update := event.GetScreenUpdate()
	if update == nil || update.Screen == nil {
		cancel()
		t.Fatalf("expected initial screen update, got %+v", event)
	}
	initialFrame := update.FrameId

	var periodic *proto.ScreenUpdate
	deadline := time.After(1 * time.Second)
	for periodic == nil {
		select {
		case <-deadline:
			cancel()
			t.Fatalf("expected periodic keyframe update")
		default:
		}
		event, err := stream.Recv()
		if err != nil {
			cancel()
			t.Fatalf("Recv: %v", err)
		}
		update := event.GetScreenUpdate()
		if update == nil || update.Screen == nil {
			if event.GetSessionExited() != nil {
				cancel()
				t.Fatalf("session exited before periodic keyframe")
			}
			continue
		}
		if update.FrameId > initialFrame {
			periodic = update
		}
	}
	cancel()
	if !periodic.IsKeyframe || periodic.BaseFrameId != 0 || periodic.FrameId == 0 {
		t.Fatalf("expected keyframe with frame_id set, got %+v", periodic)
	}
}

func TestGRPCSubscribeLatestOnlyBackpressure(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	oldInterval := keyframeInterval
	keyframeInterval = 0
	t.Cleanup(func() {
		keyframeInterval = oldInterval
	})

	coord := newTestCoordinator()
	defer coord.CloseAll()

	info, err := coord.Spawn("grpc-subscribe-backpressure", SpawnOptions{
		Command: []string{"cat"},
	})
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := info.ID

	server := NewGRPCServer(coord)
	ctx, cancel := context.WithCancel(context.Background())
	stream := newBlockingSubscribeStream(ctx)

	errCh := make(chan error, 1)
	go func() {
		errCh <- server.Subscribe(&proto.SubscribeRequest{
			Session:              &proto.SessionRef{Id: sessionID},
			IncludeScreenUpdates: true,
			IncludeRawOutput:     false,
		}, stream)
	}()

	select {
	case <-stream.blockCh:
	case <-time.After(2 * time.Second):
		cancel()
		t.Fatal("timeout waiting for initial send to block")
	}

	for i := 0; i < 5; i++ {
		if err := coord.Send(sessionID, []byte(fmt.Sprintf("line%d\n", i))); err != nil {
			cancel()
			t.Fatalf("Send: %v", err)
		}
		time.Sleep(30 * time.Millisecond)
	}
	time.Sleep(200 * time.Millisecond)
	close(stream.unblockCh)

	var updates int
	var lastScreen string
	timeout := time.After(2 * time.Second)
	for {
		select {
		case event := <-stream.events:
			if event == nil {
				continue
			}
			if update := event.GetScreenUpdate(); update != nil && update.Screen != nil {
				updates++
				lastScreen = screenToString(update.Screen)
				if strings.Contains(lastScreen, "line4") {
					cancel()
					err := <-errCh
					if err != nil && !errors.Is(err, context.Canceled) {
						t.Fatalf("Subscribe: %v", err)
					}
					if updates > 2 {
						t.Fatalf("expected latest-only updates, got %d updates", updates)
					}
					return
				}
			}
		case <-timeout:
			cancel()
			_ = <-errCh
			t.Fatalf("timeout waiting for latest screen, last=%q updates=%d", lastScreen, updates)
		}
	}
}

func TestGRPCSubscribeRawOutput(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-subscribe-raw",
		Command: "sleep 0.4; printf 'raw-output\\n'; sleep 0.1",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := spawnResp.GetSession().GetId()

	ctx, cancel = context.WithTimeout(context.Background(), 3*time.Second)
	stream, err := client.Subscribe(ctx, &proto.SubscribeRequest{
		Session:              &proto.SessionRef{Id: sessionID},
		IncludeScreenUpdates: false,
		IncludeRawOutput:     true,
	})
	if err != nil {
		cancel()
		t.Fatalf("Subscribe: %v", err)
	}

	sawRaw := false
	for {
		event, err := stream.Recv()
		if err != nil {
			cancel()
			t.Fatalf("Recv: %v", err)
		}
		if update := event.GetScreenUpdate(); update != nil {
			cancel()
			t.Fatalf("unexpected screen update for raw-only subscribe: %+v", update)
		}
		if data := event.GetRawOutput(); len(data) > 0 {
			if strings.Contains(string(data), "raw-output") {
				sawRaw = true
				break
			}
		}
		if event.GetSessionExited() != nil {
			break
		}
	}
	cancel()
	if !sawRaw {
		t.Fatalf("expected raw output event containing %q", "raw-output")
	}
}

func TestGRPCSubscribeExitEvent(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-subscribe-exit",
		Command: "sleep 0.1; printf 'done\\n'; exit 7",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := spawnResp.GetSession().GetId()

	ctx, cancel = context.WithTimeout(context.Background(), 3*time.Second)
	stream, err := client.Subscribe(ctx, &proto.SubscribeRequest{
		Session:              &proto.SessionRef{Id: sessionID},
		IncludeScreenUpdates: true,
		IncludeRawOutput:     false,
	})
	if err != nil {
		cancel()
		t.Fatalf("Subscribe: %v", err)
	}

	var lastScreen string
	var sawScreen bool
	var exitCode int32
	for {
		event, err := stream.Recv()
		if err != nil {
			cancel()
			t.Fatalf("Recv: %v", err)
		}
		if update := event.GetScreenUpdate(); update != nil {
			if !update.IsKeyframe || update.BaseFrameId != 0 || update.FrameId == 0 {
				t.Fatalf("expected keyframe with frame_id set, got %+v", update)
			}
			lastScreen = screenToString(update.Screen)
			sawScreen = true
			continue
		}
		if exited := event.GetSessionExited(); exited != nil {
			exitCode = exited.ExitCode
			break
		}
	}
	cancel()
	if !sawScreen {
		t.Fatalf("expected screen updates before exit")
	}
	if exitCode != 7 {
		t.Fatalf("expected exit code 7, got %d", exitCode)
	}
	if !strings.Contains(lastScreen, "done") {
		t.Fatalf("expected final screen to contain done, got %q", lastScreen)
	}
}

func TestGRPCSubscribeInvalidArgs(t *testing.T) {
	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	stream, err := client.Subscribe(ctx, &proto.SubscribeRequest{
		Session:              &proto.SessionRef{},
		IncludeScreenUpdates: true,
		IncludeRawOutput:     false,
	})
	if err != nil {
		cancel()
		t.Fatalf("Subscribe: %v", err)
	}
	_, err = stream.Recv()
	cancel()
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("expected InvalidArgument, got %v", err)
	}
}

func TestGRPCSendKeyCtrlCExits(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-ctrlc",
		Command: "printf 'ready\\n'; trap 'exit 0' INT; while true; do sleep 0.2; done",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := spawnResp.GetSession().GetId()

	waitForScreenContains(t, client, sessionID, "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.SendKey(ctx, &proto.SendKeyRequest{Session: &proto.SessionRef{Id: sessionID}, Key: "ctrl+c"})
	cancel()
	if err != nil {
		t.Fatalf("SendKey: %v", err)
	}

	waitForSessionStatus(t, client, sessionID, proto.SessionStatus_SESSION_STATUS_EXITED, 2*time.Second)
}
