package main

import (
	"bytes"
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

func TestCLIEndToEnd(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	tmpDir := t.TempDir()
	prevConfigHome := os.Getenv("XDG_CONFIG_HOME")
	if err := os.Setenv("XDG_CONFIG_HOME", tmpDir); err != nil {
		t.Fatalf("set XDG_CONFIG_HOME: %v", err)
	}
	t.Cleanup(func() {
		if prevConfigHome == "" {
			_ = os.Unsetenv("XDG_CONFIG_HOME")
			return
		}
		_ = os.Setenv("XDG_CONFIG_HOME", prevConfigHome)
	})

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
		coord.Close()
		t.Fatalf("ListenUnix: %v", err)
	}

	grpcServer := grpc.NewServer()
	proto.RegisterVTRServer(grpcServer, server.NewGRPCServer(coord))
	go func() {
		_ = grpcServer.Serve(listener)
	}()

	t.Cleanup(func() {
		grpcServer.GracefulStop()
		_ = listener.Close()
		_ = coord.Close()
	})

	_, err = runCLICommand(t, "spawn", "--socket", socketPath, "--cmd", "printf 'ready\\n'; read line; printf 'got:%s\\n' \"$line\"; sleep 0.1", "cli-e2e")
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
