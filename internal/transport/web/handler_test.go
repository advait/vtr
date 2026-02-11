package webtransport

import "testing"

func TestWebOwnedSessionReferenceCounting(t *testing.T) {
	const sessionID = "owned-session-refcount"
	clearWebOwnedSession(sessionID)
	t.Cleanup(func() { clearWebOwnedSession(sessionID) })

	markWebOwnedSession(sessionID)
	if !isWebOwnedSession(sessionID) {
		t.Fatalf("expected session to be marked as web-owned")
	}
	if !acquireWebOwnedSession(sessionID) {
		t.Fatalf("expected first acquire to succeed")
	}
	if !acquireWebOwnedSession(sessionID) {
		t.Fatalf("expected second acquire to succeed")
	}
	if releaseWebOwnedSession(sessionID) {
		t.Fatalf("expected first release not to trigger removal")
	}
	if !releaseWebOwnedSession(sessionID) {
		t.Fatalf("expected second release to trigger removal")
	}
}

func TestAcquireWebOwnedSessionRequiresOwnership(t *testing.T) {
	const sessionID = "owned-session-missing"
	clearWebOwnedSession(sessionID)
	t.Cleanup(func() { clearWebOwnedSession(sessionID) })

	if acquireWebOwnedSession(sessionID) {
		t.Fatalf("expected acquire to fail for unowned session")
	}
}
