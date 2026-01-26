package server

import (
	"errors"
	"runtime"
	"strings"
	"testing"
	"time"
)

func newTestCoordinator() *Coordinator {
	return NewCoordinator(CoordinatorOptions{
		DefaultShell:  "/bin/sh",
		DefaultCols:   80,
		DefaultRows:   24,
		Scrollback:    2000,
		KillTimeout:   500 * time.Millisecond,
		IdleThreshold: 200 * time.Millisecond,
	})
}

func waitForDumpContains(t *testing.T, coord *Coordinator, id, want string, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	var lastDump string
	var lastErr error
	for time.Now().Before(deadline) {
		dump, err := coord.Dump(id, DumpViewport, false)
		if err == nil {
			normalized := strings.ReplaceAll(dump, "\r", "")
			if strings.Contains(normalized, want) {
				return
			}
			lastDump = normalized
			lastErr = nil
		} else {
			lastErr = err
		}
		time.Sleep(10 * time.Millisecond)
	}
	if lastErr != nil {
		t.Fatalf("timeout waiting for %q: last error: %v", want, lastErr)
	}
	t.Fatalf("timeout waiting for %q: last dump: %q", want, lastDump)
}

func waitForState(t *testing.T, coord *Coordinator, id string, want SessionState, timeout time.Duration) SessionInfo {
	t.Helper()
	deadline := time.Now().Add(timeout)
	var lastInfo *SessionInfo
	var lastErr error
	for time.Now().Before(deadline) {
		info, err := coord.Info(id)
		if err == nil {
			if info.State == want {
				return *info
			}
			lastInfo = info
			lastErr = nil
		} else {
			lastErr = err
		}
		time.Sleep(10 * time.Millisecond)
	}
	if lastErr != nil {
		t.Fatalf("timeout waiting for state %s: last error: %v", want.String(), lastErr)
	}
	if lastInfo == nil {
		t.Fatalf("timeout waiting for state %s: no info", want.String())
	}
	t.Fatalf("timeout waiting for state %s: last state %s", want.String(), lastInfo.State.String())
	return SessionInfo{}
}

func cellAt(t *testing.T, snap *Snapshot, x, y int) Cell {
	t.Helper()
	if snap == nil {
		t.Fatal("snapshot is nil")
	}
	idx := y*snap.Cols + x
	if idx < 0 || idx >= len(snap.Cells) {
		t.Fatalf("cell index out of range: %d", idx)
	}
	return snap.Cells[idx]
}

func TestSpawnEcho(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	coord := newTestCoordinator()
	defer coord.CloseAll()

	info, err := coord.Spawn("echo", SpawnOptions{
		Command: []string{"/bin/sh", "-c", "printf 'ready\\n'; read line; printf 'got:%s\\n' \"$line\"; sleep 0.1"},
	})
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := info.ID

	waitForDumpContains(t, coord, sessionID, "ready", 2*time.Second)

	if err := coord.Send(sessionID, []byte("hello\n")); err != nil {
		t.Fatalf("Send: %v", err)
	}

	waitForDumpContains(t, coord, sessionID, "got:hello", 2*time.Second)
}

func TestExitCode(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	coord := newTestCoordinator()
	defer coord.CloseAll()

	info, err := coord.Spawn("exit", SpawnOptions{
		Command: []string{"/bin/sh", "-c", "exit 7"},
	})
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}

	sessionInfo := waitForState(t, coord, info.ID, SessionExited, 2*time.Second)
	if sessionInfo.ExitCode != 7 {
		t.Fatalf("exit code=%d", sessionInfo.ExitCode)
	}
}

func TestKillSession(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	coord := newTestCoordinator()
	defer coord.CloseAll()

	info, err := coord.Spawn("kill", SpawnOptions{
		Command: []string{"/bin/sh", "-c", "printf 'ready\\n'; trap 'exit 0' TERM; while true; do sleep 0.1; done"},
	})
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := info.ID

	waitForDumpContains(t, coord, sessionID, "ready", 2*time.Second)

	if err := coord.Kill(sessionID, nil); err != nil {
		t.Fatalf("Kill: %v", err)
	}

	waitForState(t, coord, sessionID, SessionExited, 2*time.Second)
}

func TestRemoveSession(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	coord := newTestCoordinator()
	defer coord.CloseAll()

	info, err := coord.Spawn("remove", SpawnOptions{
		Command: []string{"/bin/sh", "-c", "printf 'ready\\n'; trap 'exit 0' TERM; while true; do sleep 0.1; done"},
	})
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := info.ID

	waitForDumpContains(t, coord, sessionID, "ready", 2*time.Second)

	if err := coord.Remove(sessionID); err != nil {
		t.Fatalf("Remove: %v", err)
	}
	if _, err := coord.Info(sessionID); !errors.Is(err, ErrSessionNotFound) {
		t.Fatalf("expected ErrSessionNotFound, got %v", err)
	}
}

func TestScreenCapture(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	coord := newTestCoordinator()
	defer coord.CloseAll()

	info, err := coord.Spawn("screen", SpawnOptions{
		Command: []string{"/bin/sh", "-c", "printf 'hi'; sleep 0.2"},
	})
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}
	sessionID := info.ID

	waitForDumpContains(t, coord, sessionID, "hi", 2*time.Second)

	snap, err := coord.Snapshot(sessionID)
	if err != nil {
		t.Fatalf("Snapshot: %v", err)
	}
	if snap.Cols != 80 || snap.Rows != 24 {
		t.Fatalf("unexpected size: %dx%d", snap.Cols, snap.Rows)
	}
	if got := cellAt(t, snap, 0, 0).Rune; got != 'h' {
		t.Fatalf("cell(0,0)=%q", got)
	}
	if got := cellAt(t, snap, 1, 0).Rune; got != 'i' {
		t.Fatalf("cell(1,0)=%q", got)
	}
}

func TestMergeEnvOverrides(t *testing.T) {
	base := []string{"PATH=/bin", "FOO=bar"}
	extra := []string{"FOO=baz", "NEW=1"}
	got := mergeEnv(base, extra)

	env := make(map[string]string)
	for _, entry := range got {
		key, value, ok := strings.Cut(entry, "=")
		if !ok {
			t.Fatalf("invalid env entry %q", entry)
		}
		if _, exists := env[key]; exists {
			t.Fatalf("duplicate env key %q", key)
		}
		env[key] = value
	}

	if env["PATH"] != "/bin" {
		t.Fatalf("PATH=%q", env["PATH"])
	}
	if env["FOO"] != "baz" {
		t.Fatalf("FOO=%q", env["FOO"])
	}
	if env["NEW"] != "1" {
		t.Fatalf("NEW=%q", env["NEW"])
	}
}

func TestSpawnDefaultWorkingDir(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	tmpDir := t.TempDir()
	t.Setenv("HOME", tmpDir)

	coord := newTestCoordinator()
	defer coord.CloseAll()

	info, err := coord.Spawn("cwd", SpawnOptions{
		Command: []string{"/bin/sh", "-c", "pwd; sleep 0.1"},
	})
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}

	waitForDumpContains(t, coord, info.ID, tmpDir, 2*time.Second)
}
