package server

import (
	"testing"
	"time"
)

func newIdleTestSession(threshold time.Duration) *Session {
	now := time.Now()
	return &Session{
		state:         SessionRunning,
		exitCh:        make(chan struct{}),
		activityCh:    make(chan struct{}),
		idleCh:        make(chan struct{}),
		lastActivity:  now,
		idleThreshold: threshold,
	}
}

func waitForIdleState(t *testing.T, s *Session, want bool, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if s.isIdle() == want {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("timeout waiting for idle=%v", want)
}

func TestSessionIdleTransitions(t *testing.T) {
	session := newIdleTestSession(80 * time.Millisecond)
	go session.trackIdle()
	defer close(session.exitCh)

	if session.isIdle() {
		t.Fatalf("expected initial idle=false")
	}

	waitForIdleState(t, session, true, 400*time.Millisecond)

	session.recordActivity()
	waitForIdleState(t, session, false, 100*time.Millisecond)
}

func TestSessionIdleDebounceState(t *testing.T) {
	session := newIdleTestSession(200 * time.Millisecond)
	go session.trackIdle()
	defer close(session.exitCh)

	time.Sleep(70 * time.Millisecond)
	session.recordActivity()

	time.Sleep(100 * time.Millisecond)
	if session.isIdle() {
		t.Fatalf("expected idle=false after brief pause")
	}

	waitForIdleState(t, session, true, 500*time.Millisecond)
}
