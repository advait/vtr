package server

import (
	"runtime"
	"testing"
	"time"
)

func TestSessionIdleDebounce(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("pty tests not supported on windows")
	}

	coord := newTestCoordinator()
	defer coord.Close()

	_, err := coord.Spawn("idle-debounce", SpawnOptions{
		Command: []string{"/bin/sh", "-c", "printf 'ready\\n'; sleep 2"},
	})
	if err != nil {
		t.Fatalf("Spawn: %v", err)
	}

	waitForDumpContains(t, coord, "idle-debounce", "ready", 2*time.Second)
	if err := coord.Send("idle-debounce", []byte("x")); err != nil {
		t.Fatalf("Send: %v", err)
	}

	session, err := coord.getSession("idle-debounce")
	if err != nil {
		t.Fatalf("getSession: %v", err)
	}

	idle, idleCh := session.idleState()
	if idle {
		t.Fatal("expected session to start active")
	}

	idleThreshold := coord.opts.IdleThreshold
	half := idleThreshold / 2
	if half < 20*time.Millisecond {
		half = 20 * time.Millisecond
	}

	select {
	case <-idleCh:
		t.Fatal("idle flipped before threshold")
	case <-time.After(half):
	}

	if err := coord.Send("idle-debounce", []byte("y")); err != nil {
		t.Fatalf("Send: %v", err)
	}

	idle, idleCh = session.idleState()
	if idle {
		t.Fatal("expected session to stay active after input")
	}

	select {
	case <-idleCh:
		t.Fatal("idle flipped after brief pause")
	case <-time.After(half):
	}

	select {
	case <-idleCh:
		if !session.isIdle() {
			t.Fatal("expected session to be idle")
		}
	case <-time.After(idleThreshold + half):
		t.Fatal("timeout waiting for idle")
	}
}
