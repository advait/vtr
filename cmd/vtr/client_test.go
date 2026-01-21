package main

import (
	"bytes"
	"encoding/json"
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

func setupCLIConfigHome(t *testing.T) {
	t.Helper()
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())
}

func startCLITestServer(t *testing.T) (string, func()) {
	t.Helper()

	coord := server.NewCoordinator(server.CoordinatorOptions{
		DefaultShell: "/bin/sh",
		DefaultCols:  80,
		DefaultRows:  24,
		Scrollback:   2000,
		KillTimeout:  500 * time.Millisecond,
	})
	socketPath := filepath.Join(t.TempDir(), "vtr.sock")
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
	}
	return socketPath, cleanup
}

func TestCLIEndToEnd(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	setupCLIConfigHome(t)
	socketPath, cleanup := startCLITestServer(t)
	t.Cleanup(cleanup)

	_, err := runCLICommand(t, "spawn", "--socket", socketPath, "--cmd", "printf 'ready\\n'; read line; printf 'got:%s\\n' \"$line\"; sleep 0.1", "cli-e2e")
	if err != nil {
		t.Fatalf("spawn: %v", err)
	}

	waitForCLIScreenContains(t, socketPath, "cli-e2e", "ready", 2*time.Second)

	_, err = runCLICommand(t, "send", "--socket", socketPath, "cli-e2e", "hello")
	if err != nil {
		t.Fatalf("send: %v", err)
	}
	_, err = runCLICommand(t, "key", "--socket", socketPath, "cli-e2e", "enter")
	if err != nil {
		t.Fatalf("key: %v", err)
	}

	waitForCLIScreenContains(t, socketPath, "cli-e2e", "got:hello", 2*time.Second)
}

func TestCLIGrep(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	setupCLIConfigHome(t)
	socketPath, cleanup := startCLITestServer(t)
	t.Cleanup(cleanup)

	_, err := runCLICommand(t, "spawn", "--socket", socketPath, "--cmd", "printf 'zero\\none\\nerror here\\nthree\\n'; sleep 0.1", "cli-grep")
	if err != nil {
		t.Fatalf("spawn: %v", err)
	}

	waitForCLIScreenContains(t, socketPath, "cli-grep", "error here", 2*time.Second)

	out, err := runCLICommand(t, "grep", "--socket", socketPath, "--json", "-C", "1", "cli-grep", "error")
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

	setupCLIConfigHome(t)
	socketPath, cleanup := startCLITestServer(t)
	t.Cleanup(cleanup)

	_, err := runCLICommand(t, "spawn", "--socket", socketPath, "--cmd", "sleep 0.2; printf 'done\\n'; sleep 0.1", "cli-wait")
	if err != nil {
		t.Fatalf("spawn: %v", err)
	}

	out, err := runCLICommand(t, "wait", "--socket", socketPath, "--json", "--timeout", "1s", "cli-wait", "done")
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

	_, err = runCLICommand(t, "spawn", "--socket", socketPath, "--cmd", "sleep 0.3", "cli-wait-timeout")
	if err != nil {
		t.Fatalf("spawn timeout: %v", err)
	}

	out, err = runCLICommand(t, "wait", "--socket", socketPath, "--json", "--timeout", "200ms", "cli-wait-timeout", "never")
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

	setupCLIConfigHome(t)
	socketPath, cleanup := startCLITestServer(t)
	t.Cleanup(cleanup)

	_, err := runCLICommand(t, "spawn", "--socket", socketPath, "--cmd", "printf 'ready\\n'; sleep 0.4", "cli-idle")
	if err != nil {
		t.Fatalf("spawn: %v", err)
	}

	waitForCLIScreenContains(t, socketPath, "cli-idle", "ready", 2*time.Second)

	out, err := runCLICommand(t, "idle", "--socket", socketPath, "--json", "--idle", "100ms", "--timeout", "1s", "cli-idle")
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

func TestCLIConfigResolveHonorsOutputFormat(t *testing.T) {
	setupCLIConfigHome(t)

	configPath := defaultConfigPath()
	if configPath == "" {
		t.Fatal("default config path is empty")
	}
	if err := os.MkdirAll(filepath.Dir(configPath), 0o755); err != nil {
		t.Fatalf("mkdir config dir: %v", err)
	}
	config := strings.Join([]string{
		"[[coordinators]]",
		`path = "/tmp/vtr-test.sock"`,
		"",
		"[defaults]",
		`output_format = "json"`,
		"",
	}, "\n")
	if err := os.WriteFile(configPath, []byte(config), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	out, err := runCLICommand(t, "config", "resolve")
	if err != nil {
		t.Fatalf("config resolve: %v", err)
	}

	var resp jsonCoordinators
	if err := json.Unmarshal([]byte(out), &resp); err != nil {
		t.Fatalf("decode config resolve: %v", err)
	}
	if len(resp.Coordinators) != 1 {
		t.Fatalf("expected 1 coordinator, got %d", len(resp.Coordinators))
	}
	if resp.Coordinators[0].Path != "/tmp/vtr-test.sock" {
		t.Fatalf("coordinator path=%q", resp.Coordinators[0].Path)
	}
	if resp.Coordinators[0].Name != "vtr-test" {
		t.Fatalf("coordinator name=%q", resp.Coordinators[0].Name)
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
		out, err := runCLICommand(t, "screen", "--socket", socketPath, name)
		if err == nil {
			if strings.Contains(out, want) {
				return
			}
			lastOutput = out
			lastErr = nil
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
