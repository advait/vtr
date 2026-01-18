package server

import (
	"errors"
	"io"
	"os"
	"os/exec"
	"sync"

	"github.com/creack/pty"
)

// PTY wraps a started command running on a pseudo-terminal.
type PTY struct {
	cmd     *exec.Cmd
	file    *os.File
	writeMu sync.Mutex
}

func startPTY(cmd *exec.Cmd, cols, rows uint16) (*PTY, error) {
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
	return p.file.Write(data)
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
func (p *PTY) StartReadLoop(vt *VT, onErr func(error)) <-chan struct{} {
	done := make(chan struct{})
	go func() {
		defer close(done)
		buf := make([]byte, 32*1024)
		for {
			n, err := p.Read(buf)
			if n > 0 {
				reply, feedErr := vt.Feed(buf[:n])
				if feedErr != nil {
					if onErr != nil {
						onErr(feedErr)
					}
					return
				}
				if len(reply) > 0 {
					if _, werr := p.Write(reply); werr != nil {
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
