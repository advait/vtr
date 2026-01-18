package server

import (
	"errors"
	"os"
	"os/exec"
	"sort"
	"strings"
	"sync"
	"syscall"
	"time"
)

// SessionState tracks the lifecycle of a session.
type SessionState int

const (
	SessionRunning SessionState = iota + 1
	SessionExited
)

func (s SessionState) String() string {
	switch s {
	case SessionRunning:
		return "running"
	case SessionExited:
		return "exited"
	default:
		return "unknown"
	}
}

var (
	ErrSessionNotFound   = errors.New("session not found")
	ErrSessionExists     = errors.New("session already exists")
	ErrSessionNotRunning = errors.New("session not running")
	ErrInvalidName       = errors.New("session name is required")
	ErrInvalidSize       = errors.New("cols/rows must be > 0")
)

// CoordinatorOptions configures the session coordinator.
type CoordinatorOptions struct {
	DefaultShell string
	DefaultCols  uint16
	DefaultRows  uint16
	Scrollback   uint32
	KillTimeout  time.Duration
}

// SpawnOptions configures a new session.
type SpawnOptions struct {
	Command    []string
	WorkingDir string
	Env        []string
	Cols       uint16
	Rows       uint16
}

// SessionInfo reports session metadata and status.
type SessionInfo struct {
	Name      string
	State     SessionState
	Cols      uint16
	Rows      uint16
	ExitCode  int
	CreatedAt time.Time
	ExitedAt  time.Time
}

// Coordinator manages named PTY sessions.
type Coordinator struct {
	mu       sync.Mutex
	sessions map[string]*Session
	opts     CoordinatorOptions
}

// NewCoordinator creates a coordinator with defaults applied.
func NewCoordinator(opts CoordinatorOptions) *Coordinator {
	if opts.DefaultShell == "" {
		if shell := os.Getenv("SHELL"); shell != "" {
			opts.DefaultShell = shell
		} else {
			opts.DefaultShell = "/bin/sh"
		}
	}
	if opts.DefaultCols == 0 {
		opts.DefaultCols = 80
	}
	if opts.DefaultRows == 0 {
		opts.DefaultRows = 24
	}
	if opts.Scrollback == 0 {
		opts.Scrollback = 10000
	}
	if opts.KillTimeout == 0 {
		opts.KillTimeout = 5 * time.Second
	}
	return &Coordinator{
		sessions: make(map[string]*Session),
		opts:     opts,
	}
}

// Spawn creates and starts a new session.
func (c *Coordinator) Spawn(name string, opts SpawnOptions) (*SessionInfo, error) {
	if strings.TrimSpace(name) == "" {
		return nil, ErrInvalidName
	}

	cmdArgs := opts.Command
	if len(cmdArgs) == 0 {
		cmdArgs = []string{c.opts.DefaultShell}
	}
	cmd := exec.Command(cmdArgs[0], cmdArgs[1:]...)
	if opts.WorkingDir != "" {
		cmd.Dir = opts.WorkingDir
	}
	if len(opts.Env) > 0 {
		cmd.Env = mergeEnv(os.Environ(), opts.Env)
	}

	cols := opts.Cols
	rows := opts.Rows
	if cols == 0 {
		cols = c.opts.DefaultCols
	}
	if rows == 0 {
		rows = c.opts.DefaultRows
	}
	if cols == 0 || rows == 0 {
		return nil, ErrInvalidSize
	}

	c.mu.Lock()
	if _, ok := c.sessions[name]; ok {
		c.mu.Unlock()
		return nil, ErrSessionExists
	}
	c.sessions[name] = nil
	c.mu.Unlock()

	reserved := true
	defer func() {
		if !reserved {
			return
		}
		c.mu.Lock()
		if c.sessions[name] == nil {
			delete(c.sessions, name)
		}
		c.mu.Unlock()
	}()

	vt, err := NewVT(uint32(cols), uint32(rows), c.opts.Scrollback)
	if err != nil {
		return nil, err
	}
	ptyHandle, err := startPTY(cmd, cols, rows)
	if err != nil {
		_ = vt.Close()
		return nil, err
	}

	session := newSession(name, cols, rows, vt, ptyHandle)

	c.mu.Lock()
	c.sessions[name] = session
	c.mu.Unlock()
	reserved = false

	session.start()
	info := session.Info()
	return &info, nil
}

// Info returns session metadata.
func (c *Coordinator) Info(name string) (*SessionInfo, error) {
	session, err := c.getSession(name)
	if err != nil {
		return nil, err
	}
	info := session.Info()
	return &info, nil
}

// List returns a snapshot of all sessions.
func (c *Coordinator) List() []SessionInfo {
	c.mu.Lock()
	sessions := make([]*Session, 0, len(c.sessions))
	for _, session := range c.sessions {
		if session != nil {
			sessions = append(sessions, session)
		}
	}
	c.mu.Unlock()

	out := make([]SessionInfo, 0, len(sessions))
	for _, session := range sessions {
		out = append(out, session.Info())
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Name < out[j].Name
	})
	return out
}

// DefaultShell returns the configured shell path.
func (c *Coordinator) DefaultShell() string {
	return c.opts.DefaultShell
}

// Send writes bytes into a running session.
func (c *Coordinator) Send(name string, data []byte) error {
	session, err := c.getSession(name)
	if err != nil {
		return err
	}
	if !session.IsRunning() {
		return ErrSessionNotRunning
	}
	_, err = session.pty.Write(data)
	return err
}

// Resize updates PTY and VT dimensions.
func (c *Coordinator) Resize(name string, cols, rows uint16) error {
	if cols == 0 || rows == 0 {
		return ErrInvalidSize
	}
	session, err := c.getSession(name)
	if err != nil {
		return err
	}
	if !session.IsRunning() {
		return ErrSessionNotRunning
	}
	if err := session.pty.Resize(cols, rows); err != nil {
		return err
	}
	if err := session.vt.Resize(uint32(cols), uint32(rows)); err != nil {
		return err
	}
	session.SetSize(cols, rows)
	return nil
}

// Snapshot returns the current viewport snapshot.
func (c *Coordinator) Snapshot(name string) (*Snapshot, error) {
	session, err := c.getSession(name)
	if err != nil {
		return nil, err
	}
	return session.vt.Snapshot()
}

// Dump returns a text dump of the requested scope.
func (c *Coordinator) Dump(name string, scope DumpScope, unwrap bool) (string, error) {
	session, err := c.getSession(name)
	if err != nil {
		return "", err
	}
	return session.vt.Dump(scope, unwrap)
}

// Kill sends a signal to the session process.
func (c *Coordinator) Kill(name string, sig os.Signal) error {
	session, err := c.getSession(name)
	if err != nil {
		return err
	}
	if !session.IsRunning() {
		return ErrSessionNotRunning
	}
	if sig == nil {
		sig = syscall.SIGTERM
	}
	return session.pty.Signal(sig)
}

// Remove stops a session and removes it from the registry.
func (c *Coordinator) Remove(name string) error {
	session, err := c.getSession(name)
	if err != nil {
		return err
	}
	if session.IsRunning() {
		_ = session.pty.Signal(syscall.SIGTERM)
		if !session.WaitExited(c.opts.KillTimeout) {
			_ = session.pty.Signal(syscall.SIGKILL)
			_ = session.WaitExited(c.opts.KillTimeout)
		}
	}
	session.Close(500 * time.Millisecond)

	c.mu.Lock()
	delete(c.sessions, name)
	c.mu.Unlock()
	return nil
}

// Close removes all sessions.
func (c *Coordinator) Close() error {
	c.mu.Lock()
	names := make([]string, 0, len(c.sessions))
	for name := range c.sessions {
		names = append(names, name)
	}
	c.mu.Unlock()

	var firstErr error
	for _, name := range names {
		if err := c.Remove(name); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}

func (c *Coordinator) getSession(name string) (*Session, error) {
	c.mu.Lock()
	session := c.sessions[name]
	c.mu.Unlock()
	if session == nil {
		return nil, ErrSessionNotFound
	}
	return session, nil
}

func mergeEnv(base []string, extra []string) []string {
	out := append([]string(nil), base...)
	out = append(out, extra...)
	return out
}

type Session struct {
	name      string
	cols      uint16
	rows      uint16
	pty       *PTY
	vt        *VT
	createdAt time.Time

	mu       sync.Mutex
	state    SessionState
	exitCode int
	exitedAt time.Time

	exitCh   chan struct{}
	exitOnce sync.Once
	ioDone   <-chan struct{}
}

func newSession(name string, cols, rows uint16, vt *VT, ptyHandle *PTY) *Session {
	return &Session{
		name:      name,
		cols:      cols,
		rows:      rows,
		pty:       ptyHandle,
		vt:        vt,
		createdAt: time.Now(),
		state:     SessionRunning,
		exitCh:    make(chan struct{}),
	}
}

func (s *Session) start() {
	s.ioDone = s.pty.StartReadLoop(s.vt, nil)
	go s.waitForExit()
}

func (s *Session) waitForExit() {
	err := s.pty.Wait()
	code := exitCodeFromErr(err, s.pty.ProcessState())
	s.markExited(code)
}

func (s *Session) markExited(code int) {
	s.exitOnce.Do(func() {
		s.mu.Lock()
		s.state = SessionExited
		s.exitCode = code
		s.exitedAt = time.Now()
		s.mu.Unlock()
		close(s.exitCh)
	})
}

// Info returns a copy of the session info.
func (s *Session) Info() SessionInfo {
	s.mu.Lock()
	defer s.mu.Unlock()
	return SessionInfo{
		Name:      s.name,
		State:     s.state,
		Cols:      s.cols,
		Rows:      s.rows,
		ExitCode:  s.exitCode,
		CreatedAt: s.createdAt,
		ExitedAt:  s.exitedAt,
	}
}

func (s *Session) IsRunning() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.state == SessionRunning
}

func (s *Session) SetSize(cols, rows uint16) {
	s.mu.Lock()
	s.cols = cols
	s.rows = rows
	s.mu.Unlock()
}

func (s *Session) WaitExited(timeout time.Duration) bool {
	if timeout <= 0 {
		timeout = time.Second
	}
	select {
	case <-s.exitCh:
		return true
	case <-time.After(timeout):
		return false
	}
}

func (s *Session) Close(ioTimeout time.Duration) {
	_ = s.pty.Close()
	if s.ioDone != nil {
		select {
		case <-s.ioDone:
		case <-time.After(ioTimeout):
		}
	}
	_ = s.vt.Close()
}

func exitCodeFromErr(err error, state *os.ProcessState) int {
	if state != nil {
		return state.ExitCode()
	}
	if err == nil {
		return 0
	}
	if exitErr, ok := err.(*exec.ExitError); ok {
		return exitErr.ExitCode()
	}
	return -1
}
