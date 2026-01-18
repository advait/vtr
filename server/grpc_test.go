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

	badText := string([]byte{0xff, 0xfe})
	ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
	_, err = client.SendText(ctx, &proto.SendTextRequest{Name: "grpc-errors", Text: badText})
	cancel()
	if status.Code(err) != codes.InvalidArgument {
		t.Fatalf("expected InvalidArgument for bad utf-8, got %v", err)
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
