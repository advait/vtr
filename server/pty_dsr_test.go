package server

import (
	"os"
	"testing"
	"time"

	"github.com/charmbracelet/x/term"
	"github.com/creack/pty"
)

func TestHeadlessCPRResponse(t *testing.T) {
	ptyHandle, slave, cleanup := openTestPTY(t)

	vt, err := NewVT(80, 24, 0)
	if err != nil {
		t.Fatalf("new vt: %v", err)
	}
	defer vt.Close()

	done := ptyHandle.StartReadLoop(vt, nil, nil)
	t.Cleanup(func() {
		cleanup()
		waitDone(t, done)
	})

	if _, err := slave.Write([]byte("\x1b[2;5H\x1b[6n")); err != nil {
		t.Fatalf("write DSR: %v", err)
	}

	reply := readWithTimeout(t, slave, time.Second)
	if got, want := string(reply), "\x1b[2;5R"; got != want {
		t.Fatalf("unexpected reply: got %q want %q", got, want)
	}
}

func TestHeadlessCPRPrivateResponse(t *testing.T) {
	ptyHandle, slave, cleanup := openTestPTY(t)

	vt, err := NewVT(80, 24, 0)
	if err != nil {
		t.Fatalf("new vt: %v", err)
	}
	defer vt.Close()

	done := ptyHandle.StartReadLoop(vt, nil, nil)
	t.Cleanup(func() {
		cleanup()
		waitDone(t, done)
	})

	if _, err := slave.Write([]byte("\x1b[2;5H\x1b[?6n")); err != nil {
		t.Fatalf("write DSR: %v", err)
	}

	reply := readWithTimeout(t, slave, time.Second)
	if got, want := string(reply), "\x1b[?2;5R"; got != want {
		t.Fatalf("unexpected reply: got %q want %q", got, want)
	}
}

func openTestPTY(t *testing.T) (*PTY, *os.File, func()) {
	t.Helper()
	master, slave, err := pty.Open()
	if err != nil {
		t.Fatalf("open pty: %v", err)
	}

	oldState, err := term.MakeRaw(slave.Fd())
	if err != nil {
		_ = master.Close()
		_ = slave.Close()
		t.Fatalf("make raw: %v", err)
	}

	handle := &PTY{file: master}
	cleanup := func() {
		_ = term.Restore(slave.Fd(), oldState)
		_ = slave.Close()
		_ = handle.Close()
	}
	return handle, slave, cleanup
}

func readWithTimeout(t *testing.T, f *os.File, timeout time.Duration) []byte {
	t.Helper()
	type result struct {
		n   int
		buf []byte
		err error
	}
	ch := make(chan result, 1)
	go func() {
		buf := make([]byte, 64)
		n, err := f.Read(buf)
		ch <- result{n: n, buf: buf, err: err}
	}()
	select {
	case res := <-ch:
		if res.err != nil {
			t.Fatalf("read reply: %v", res.err)
		}
		return res.buf[:res.n]
	case <-time.After(timeout):
		t.Fatalf("timeout waiting for reply")
		return nil
	}
}

func waitDone(t *testing.T, done <-chan struct{}) {
	t.Helper()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatalf("read loop did not exit")
	}
}
