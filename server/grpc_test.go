package server

import (
	"context"
	"net"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	proto "github.com/advait/vtrpc/proto"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/durationpb"
)

func startGRPCTestServer(t *testing.T) (proto.VTRClient, func()) {
	t.Helper()

	coord := newTestCoordinator()
	socketPath := filepath.Join(t.TempDir(), "vtr.sock")
	listener, err := ListenUnix(socketPath)
	if err != nil {
		coord.Close()
		t.Fatalf("ListenUnix: %v", err)
	}

	grpcServer := grpc.NewServer()
	proto.RegisterVTRServer(grpcServer, NewGRPCServer(coord))
	go func() {
		_ = grpcServer.Serve(listener)
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	conn, err := grpc.DialContext(ctx, socketPath,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithContextDialer(unixDialer),
	)
	cancel()
	if err != nil {
		listener.Close()
		coord.Close()
		t.Fatalf("Dial: %v", err)
	}

	client := proto.NewVTRClient(conn)
	cleanup := func() {
		_ = conn.Close()
		grpcServer.GracefulStop()
		_ = listener.Close()
		_ = coord.Close()
	}
	return client, cleanup
}

func unixDialer(ctx context.Context, addr string) (net.Conn, error) {
	var d net.Dialer
	return d.DialContext(ctx, "unix", addr)
}

func waitForScreenContains(t *testing.T, client proto.VTRClient, name, want string, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	var lastScreen string
	var lastErr error
	for time.Now().Before(deadline) {
		ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
		resp, err := client.GetScreen(ctx, &proto.GetScreenRequest{Name: name})
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

func waitForSessionStatus(t *testing.T, client proto.VTRClient, name string, want proto.SessionStatus, timeout time.Duration) *proto.Session {
	t.Helper()
	deadline := time.Now().Add(timeout)
	var lastSession *proto.Session
	var lastErr error
	for time.Now().Before(deadline) {
		ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
		resp, err := client.Info(ctx, &proto.InfoRequest{Name: name})
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
	_, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-echo",
		Command: "printf 'ready\\n'; read line; printf 'got:%s\\n' \"$line\"; sleep 0.1",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}

	waitForScreenContains(t, client, "grpc-echo", "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.SendText(ctx, &proto.SendTextRequest{Name: "grpc-echo", Text: "hello"})
	cancel()
	if err != nil {
		t.Fatalf("SendText: %v", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.SendKey(ctx, &proto.SendKeyRequest{Name: "grpc-echo", Key: "enter"})
	cancel()
	if err != nil {
		t.Fatalf("SendKey: %v", err)
	}

	waitForScreenContains(t, client, "grpc-echo", "got:hello", 2*time.Second)
}

func TestGRPCListInfoResize(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	_, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-info",
		Command: "printf 'ready\\n'; while true; do sleep 0.2; done",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}

	waitForScreenContains(t, client, "grpc-info", "ready", 2*time.Second)

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
	infoResp, err := client.Info(ctx, &proto.InfoRequest{Name: "grpc-info"})
	cancel()
	if err != nil {
		t.Fatalf("Info: %v", err)
	}
	if infoResp.Session == nil || infoResp.Session.Status != proto.SessionStatus_SESSION_STATUS_RUNNING {
		t.Fatalf("Info status=%v", infoResp.Session)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.Resize(ctx, &proto.ResizeRequest{Name: "grpc-info", Cols: 100, Rows: 30})
	cancel()
	if err != nil {
		t.Fatalf("Resize: %v", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	screenResp, err := client.GetScreen(ctx, &proto.GetScreenRequest{Name: "grpc-info"})
	cancel()
	if err != nil {
		t.Fatalf("GetScreen: %v", err)
	}
	if screenResp.Cols != 100 || screenResp.Rows != 30 {
		t.Fatalf("screen size=%dx%d", screenResp.Cols, screenResp.Rows)
	}
}

func TestGRPCKillRemove(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	_, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-kill",
		Command: "printf 'ready\\n'; trap 'exit 0' TERM; while true; do sleep 0.2; done",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}

	waitForScreenContains(t, client, "grpc-kill", "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.Kill(ctx, &proto.KillRequest{Name: "grpc-kill", Signal: "TERM"})
	cancel()
	if err != nil {
		t.Fatalf("Kill: %v", err)
	}

	waitForSessionStatus(t, client, "grpc-kill", proto.SessionStatus_SESSION_STATUS_EXITED, 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.Remove(ctx, &proto.RemoveRequest{Name: "grpc-kill"})
	cancel()
	if err != nil {
		t.Fatalf("Remove: %v", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.Info(ctx, &proto.InfoRequest{Name: "grpc-kill"})
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
	_, err = client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-errors",
		Command: "printf 'ready\\n'; while true; do sleep 0.2; done",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}

	waitForScreenContains(t, client, "grpc-errors", "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.Spawn(ctx, &proto.SpawnRequest{Name: "grpc-errors"})
	cancel()
	if status.Code(err) != codes.AlreadyExists {
		t.Fatalf("expected AlreadyExists for duplicate spawn, got %v", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.SendKey(ctx, &proto.SendKeyRequest{Name: "grpc-errors", Key: "not-a-key"})
	cancel()
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("expected InvalidArgument for bad key, got %v", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.SendText(ctx, &proto.SendTextRequest{Name: "missing", Text: "hi"})
	cancel()
	if status.Code(err) != codes.NotFound {
		t.Fatalf("expected NotFound for missing session, got %v", err)
	}

	tooLarge := make([]byte, maxRawInputBytes+1)
	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.SendBytes(ctx, &proto.SendBytesRequest{Name: "grpc-errors", Data: tooLarge})
	cancel()
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("expected InvalidArgument for oversized data, got %v", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.Spawn(ctx, &proto.SpawnRequest{Name: "grpc-exit", Command: "exit 0"})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}

	waitForSessionStatus(t, client, "grpc-exit", proto.SessionStatus_SESSION_STATUS_EXITED, 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.SendText(ctx, &proto.SendTextRequest{Name: "grpc-exit", Text: "hi"})
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
	_, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-grep",
		Command: "printf 'zero\\none\\nerror here\\nthree\\n'; sleep 0.1",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}

	waitForScreenContains(t, client, "grpc-grep", "error here", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	resp, err := client.Grep(ctx, &proto.GrepRequest{
		Name:          "grpc-grep",
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
	_, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-wait",
		Command: "printf 'ready\\n'; sleep 0.2; printf 'done\\n'; sleep 0.1",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}

	waitForScreenContains(t, client, "grpc-wait", "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	resp, err := client.WaitFor(ctx, &proto.WaitForRequest{
		Name:    "grpc-wait",
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
		Name:    "grpc-wait",
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
	_, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-idle",
		Command: "printf 'ready\\n'; sleep 0.5",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}

	waitForScreenContains(t, client, "grpc-idle", "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	resp, err := client.WaitForIdle(ctx, &proto.WaitForIdleRequest{
		Name:         "grpc-idle",
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
}

func TestGRPCSubscribeInitialSnapshot(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	_, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-subscribe",
		Command: "printf 'ready\\n'; sleep 0.5",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}

	waitForScreenContains(t, client, "grpc-subscribe", "ready", 2*time.Second)

	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	stream, err := client.Subscribe(ctx, &proto.SubscribeRequest{
		Name:                 "grpc-subscribe",
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

func TestGRPCSubscribeRawOutput(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	client, cleanup := startGRPCTestServer(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	_, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-subscribe-raw",
		Command: "sleep 0.4; printf 'raw-output\\n'; sleep 0.1",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 3*time.Second)
	stream, err := client.Subscribe(ctx, &proto.SubscribeRequest{
		Name:                 "grpc-subscribe-raw",
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
	_, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:    "grpc-subscribe-exit",
		Command: "sleep 0.1; printf 'done\\n'; exit 7",
	})
	cancel()
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 3*time.Second)
	stream, err := client.Subscribe(ctx, &proto.SubscribeRequest{
		Name:                 "grpc-subscribe-exit",
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
		Name:                 "missing",
		IncludeScreenUpdates: false,
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
