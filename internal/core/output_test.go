package core

import (
	"bytes"
	"testing"
)

func newOutputTestSession() *Session {
	return &Session{
		outputCh:   make(chan struct{}),
		activityCh: make(chan struct{}),
		idleCh:     make(chan struct{}),
	}
}

func TestOutputSnapshotReportsGapWhenOffsetFallsBehindBuffer(t *testing.T) {
	session := newOutputTestSession()
	payload := bytes.Repeat([]byte("a"), MaxOutputBuffer+64)
	session.recordOutput(payload)

	data, total, _, dropped := session.OutputSnapshot(0)
	if !dropped {
		t.Fatalf("expected dropped=true when offset falls behind output buffer")
	}
	if total != int64(len(payload)) {
		t.Fatalf("expected total %d, got %d", len(payload), total)
	}
	if len(data) != MaxOutputBuffer {
		t.Fatalf("expected snapshot length %d, got %d", MaxOutputBuffer, len(data))
	}
}

func TestOutputSnapshotNoGapAtLatestOffset(t *testing.T) {
	session := newOutputTestSession()
	payload := []byte("hello")
	session.recordOutput(payload)
	latest, _, _ := session.OutputState()

	data, total, _, dropped := session.OutputSnapshot(latest)
	if dropped {
		t.Fatalf("expected dropped=false at latest offset")
	}
	if total != latest {
		t.Fatalf("expected total %d, got %d", latest, total)
	}
	if len(data) != 0 {
		t.Fatalf("expected no data at latest offset, got %d bytes", len(data))
	}
}
