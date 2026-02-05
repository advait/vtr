package pty

import (
	"errors"
	"io"
	"os"
	"os/exec"
	"sync"
	"syscall"

	"github.com/advait/vtrpc/internal/vt"
	"github.com/creack/pty"
)

type VT = vt.VT

// PTY wraps a started command running on a pseudo-terminal.
type PTY struct {
	cmd     *exec.Cmd
	file    *os.File
	writeMu sync.Mutex
}

func Start(cmd *exec.Cmd, cols, rows uint16) (*PTY, error) {
	if cmd == nil {
		return nil, errors.New("pty: command is nil")
	}
	file, err := pty.Start(cmd)
	if err != nil {
		return nil, err
	}
	p := &PTY{cmd: cmd, file: file}
	if cols > 0 && rows > 0 {
		_ = p.Resize(cols, rows)
	}
	return p, nil
}

func (p *PTY) Read(buf []byte) (int, error) {
	if p == nil || p.file == nil {
		return 0, io.EOF
	}
	return p.file.Read(buf)
}

func (p *PTY) Write(data []byte) (int, error) {
	if p == nil || p.file == nil {
		return 0, errors.New("pty: closed")
	}
	p.writeMu.Lock()
	defer p.writeMu.Unlock()
	total := 0
	for len(data) > 0 {
		n, err := p.file.Write(data)
		if n > 0 {
			total += n
			data = data[n:]
		}
		if err != nil {
			return total, err
		}
		if n == 0 {
			return total, io.ErrShortWrite
		}
	}
	return total, nil
}

func (p *PTY) Resize(cols, rows uint16) error {
	if p == nil || p.file == nil {
		return errors.New("pty: closed")
	}
	ws := &pty.Winsize{Cols: cols, Rows: rows}
	return pty.Setsize(p.file, ws)
}

func (p *PTY) Signal(sig os.Signal) error {
	if p == nil || p.cmd == nil || p.cmd.Process == nil {
		return errors.New("pty: process not started")
	}
	return p.cmd.Process.Signal(sig)
}

func (p *PTY) SignalGroup(sig os.Signal) error {
	if p == nil || p.cmd == nil || p.cmd.Process == nil {
		return errors.New("pty: process not started")
	}
	signal, ok := sig.(syscall.Signal)
	if !ok {
		return p.cmd.Process.Signal(sig)
	}
	pid := p.cmd.Process.Pid
	if pid <= 0 {
		return errors.New("pty: invalid pid")
	}
	return syscall.Kill(-pid, signal)
}

func (p *PTY) Close() error {
	if p == nil || p.file == nil {
		return nil
	}
	err := p.file.Close()
	p.file = nil
	return err
}

func (p *PTY) Wait() error {
	if p == nil || p.cmd == nil {
		return errors.New("pty: command missing")
	}
	return p.cmd.Wait()
}

func (p *PTY) ProcessState() *os.ProcessState {
	if p == nil || p.cmd == nil {
		return nil
	}
	return p.cmd.ProcessState
}

// StartReadLoop feeds PTY output into the VT engine.
func (p *PTY) StartReadLoop(vt *VT, onData func([]byte), onErr func(error)) <-chan struct{} {
	done := make(chan struct{})
	go func() {
		defer close(done)
		buf := make([]byte, 32*1024)
		scanner := newDSRScanner()
		for {
			n, err := p.Read(buf)
			if n > 0 {
				chunk := buf[:n]
				if onData != nil {
					onData(chunk)
				}
				reqs := scanner.scan(chunk)
				start := 0
				var replies []byte
				for _, req := range reqs {
					end := req.index + 1
					if end > len(chunk) {
						end = len(chunk)
					}
					if end > start {
						reply, feedErr := vt.Feed(chunk[start:end])
						if feedErr != nil {
							if onErr != nil {
								onErr(feedErr)
							}
							return
						}
						if len(reply) > 0 {
							replies = append(replies, reply...)
						}
					}
					snap, snapErr := vt.Snapshot()
					if snapErr != nil {
						if onErr != nil {
							onErr(snapErr)
						}
						return
					}
					replies = append(replies, buildCPRReply(snap, req.private)...)
					start = end
				}
				if start < len(chunk) {
					reply, feedErr := vt.Feed(chunk[start:])
					if feedErr != nil {
						if onErr != nil {
							onErr(feedErr)
						}
						return
					}
					if len(reply) > 0 {
						replies = append(replies, reply...)
					}
				}
				if len(replies) > 0 {
					if _, werr := p.Write(replies); werr != nil {
						if onErr != nil {
							onErr(werr)
						}
						return
					}
				}
			}
			if err != nil {
				if !errors.Is(err, io.EOF) && !errors.Is(err, os.ErrClosed) && onErr != nil {
					onErr(err)
				}
				return
			}
		}
	}()
	return done
}
