package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	proto "github.com/advait/vtrpc/proto"
	"github.com/advait/vtrpc/server"
	"google.golang.org/grpc"
)

const testSocketPath = "/tmp/vtrpc.sock"

func setupCLIConfig(t *testing.T, socketPath string) {
	t.Helper()
	configDir := t.TempDir()
	t.Setenv("VTRPC_CONFIG_DIR", configDir)
	config := strings.Join([]string{
		"[hub]",
		fmt.Sprintf("grpc_socket = %q", socketPath),
		fmt.Sprintf("addr = %q", "127.0.0.1:4620"),
		"web_enabled = true",
		"",
	}, "\n")
	if err := os.WriteFile(filepath.Join(configDir, "vtrpc.toml"), []byte(config), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}
}

func startCLITestServer(t *testing.T, socketPath string) (string, func()) {
	t.Helper()

	coord := server.NewCoordinator(server.CoordinatorOptions{
		DefaultShell: "/bin/sh",
		DefaultCols:  80,
		DefaultRows:  24,
		Scrollback:   2000,
		KillTimeout:  500 * time.Millisecond,
	})
	listener, err := server.ListenUnix(socketPath)
	if err != nil {
		coord.CloseAll()
		t.Fatalf("ListenUnix: %v", err)
	}

	grpcServer := grpc.NewServer()
	proto.RegisterVTRServer(grpcServer, server.NewGRPCServer(coord))
	go func() {
		_ = grpcServer.Serve(listener)
	}()

	cleanup := func() {
		grpcServer.GracefulStop()
		_ = listener.Close()
		_ = coord.CloseAll()
		_ = os.Remove(socketPath)
	}
	return socketPath, cleanup
}

func TestCLIEndToEnd(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	setupCLIConfig(t, testSocketPath)
	socketPath, cleanup := startCLITestServer(t, testSocketPath)
	t.Cleanup(cleanup)

	_, err := runCLICommand(t, "agent", "spawn", "--hub", socketPath, "--cmd", "printf 'ready\\n'; read line; printf 'got:%s\\n' \"$line\"; sleep 0.1", "cli-e2e")
	if err != nil {
		t.Fatalf("spawn: %v", err)
	}

	waitForCLIScreenContains(t, socketPath, "cli-e2e", "ready", 2*time.Second)

	_, err = runCLICommand(t, "agent", "send", "--hub", socketPath, "cli-e2e", "hello\n")
	if err != nil {
		t.Fatalf("send: %v", err)
	}

	waitForCLIScreenContains(t, socketPath, "cli-e2e", "got:hello", 2*time.Second)
}

func TestCLIGrep(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	setupCLIConfig(t, testSocketPath)
	socketPath, cleanup := startCLITestServer(t, testSocketPath)
	t.Cleanup(cleanup)

	_, err := runCLICommand(t, "agent", "spawn", "--hub", socketPath, "--cmd", "printf 'zero\\none\\nerror here\\nthree\\n'; sleep 0.1", "cli-grep")
	if err != nil {
		t.Fatalf("spawn: %v", err)
	}

	waitForCLIScreenContains(t, socketPath, "cli-grep", "error here", 2*time.Second)

	out, err := runCLICommand(t, "agent", "grep", "--hub", socketPath, "-C", "1", "cli-grep", "error")
	if err != nil {
		t.Fatalf("grep: %v", err)
	}

	var resp jsonGrep
	if err := json.Unmarshal([]byte(out), &resp); err != nil {
		t.Fatalf("decode grep: %v", err)
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

func TestCLIWait(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	setupCLIConfig(t, testSocketPath)
	socketPath, cleanup := startCLITestServer(t, testSocketPath)
	t.Cleanup(cleanup)

	_, err := runCLICommand(t, "agent", "spawn", "--hub", socketPath, "--cmd", "sleep 0.2; printf 'done\\n'; sleep 0.1", "cli-wait")
	if err != nil {
		t.Fatalf("spawn: %v", err)
	}

	out, err := runCLICommand(t, "agent", "wait", "--hub", socketPath, "--timeout", "1s", "cli-wait", "done")
	if err != nil {
		t.Fatalf("wait: %v", err)
	}

	var resp jsonWait
	if err := json.Unmarshal([]byte(out), &resp); err != nil {
		t.Fatalf("decode wait: %v", err)
	}
	if resp.TimedOut || !resp.Matched {
		t.Fatalf("expected match, got %+v", resp)
	}
	if !strings.Contains(resp.MatchedLine, "done") {
		t.Fatalf("matched line=%q", resp.MatchedLine)
	}

	_, err = runCLICommand(t, "agent", "spawn", "--hub", socketPath, "--cmd", "sleep 0.3", "cli-wait-timeout")
	if err != nil {
		t.Fatalf("spawn timeout: %v", err)
	}

	out, err = runCLICommand(t, "agent", "wait", "--hub", socketPath, "--timeout", "200ms", "cli-wait-timeout", "never")
	if err != nil {
		t.Fatalf("wait timeout: %v", err)
	}
	if err := json.Unmarshal([]byte(out), &resp); err != nil {
		t.Fatalf("decode wait timeout: %v", err)
	}
	if !resp.TimedOut || resp.Matched {
		t.Fatalf("expected timeout, got %+v", resp)
	}
}

func TestCLIIdle(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	setupCLIConfig(t, testSocketPath)
	socketPath, cleanup := startCLITestServer(t, testSocketPath)
	t.Cleanup(cleanup)

	_, err := runCLICommand(t, "agent", "spawn", "--hub", socketPath, "--cmd", "printf 'ready\\n'; sleep 0.4", "cli-idle")
	if err != nil {
		t.Fatalf("spawn: %v", err)
	}

	waitForCLIScreenContains(t, socketPath, "cli-idle", "ready", 2*time.Second)

	out, err := runCLICommand(t, "agent", "idle", "--hub", socketPath, "--idle", "100ms", "--timeout", "1s", "cli-idle")
	if err != nil {
		t.Fatalf("idle: %v", err)
	}

	var resp jsonIdle
	if err := json.Unmarshal([]byte(out), &resp); err != nil {
		t.Fatalf("decode idle: %v", err)
	}
	if resp.TimedOut || !resp.Idle {
		t.Fatalf("expected idle, got %+v", resp)
	}
}

func runCLICommand(t *testing.T, args ...string) (string, error) {
	t.Helper()
	cmd := newRootCmd()
	buf := &bytes.Buffer{}
	cmd.SetOut(buf)
	cmd.SetErr(buf)
	cmd.SetArgs(args)
	err := cmd.Execute()
	return buf.String(), err
}

func waitForCLIScreenContains(t *testing.T, socketPath, name, want string, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	var lastOutput string
	var lastErr error
	for time.Now().Before(deadline) {
		out, err := runCLICommand(t, "agent", "screen", "--json", "--hub", socketPath, name)
		if err == nil {
			var resp jsonScreenEnvelope
			if err := json.Unmarshal([]byte(out), &resp); err != nil {
				lastErr = err
				lastOutput = out
			} else {
				screen := screenJSONToString(resp.Screen)
				if strings.Contains(screen, want) {
					return
				}
				lastOutput = screen
				lastErr = nil
			}
		} else {
			lastErr = err
		}
		time.Sleep(20 * time.Millisecond)
	}
	if lastErr != nil {
		t.Fatalf("timeout waiting for %q: last error: %v", want, lastErr)
	}
	t.Fatalf("timeout waiting for %q: last output: %q", want, lastOutput)
}

func screenJSONToString(screen jsonScreen) string {
	var b strings.Builder
	for _, row := range screen.ScreenRows {
		for _, cell := range row.Cells {
			if cell.Char == "" {
				b.WriteByte(' ')
			} else {
				b.WriteString(cell.Char)
			}
		}
		b.WriteByte('\n')
	}
	return b.String()
}
