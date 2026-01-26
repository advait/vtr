package server

import (
	"errors"
	"os"
	"os/exec"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/google/uuid"
)

// SessionState tracks the lifecycle of a session.
type SessionState int

const (
	SessionRunning SessionState = iota + 1
	SessionClosing
	SessionExited
)

func (s SessionState) String() string {
	switch s {
	case SessionRunning:
		return "running"
	case SessionClosing:
		return "closing"
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
	DefaultShell  string
	DefaultCols   uint16
	DefaultRows   uint16
	Scrollback    uint32
	KillTimeout   time.Duration
	IdleThreshold time.Duration
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
	ID        string
	Label     string
	State     SessionState
	Cols      uint16
	Rows      uint16
	ExitCode  int
	Idle      bool
	Order     uint32
	CreatedAt time.Time
	ExitedAt  time.Time
}

// Coordinator manages named PTY sessions.
type Coordinator struct {
	mu       sync.Mutex
	sessions map[string]*Session
	labels   map[string]string
	opts     CoordinatorOptions

	nextOrder uint32
	changeMu  sync.Mutex
	changeCh  chan struct{}
}

// NewCoordinator creates a coordinator with defaults applied.
func NewCoordinator(opts CoordinatorOptions) *Coordinator {
	if opts.DefaultShell == "" {
		if shell := os.Getenv("SHELL"); shell != "" {
			opts.DefaultShell = shell
		} else if _, err := os.Stat("/bin/bash"); err == nil {
			opts.DefaultShell = "/bin/bash"
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
	if opts.IdleThreshold == 0 {
		opts.IdleThreshold = 5 * time.Second
	}
	return &Coordinator{
		sessions: make(map[string]*Session),
		labels:   make(map[string]string),
		opts:     opts,
		changeCh: make(chan struct{}),
	}
}

// Spawn creates and starts a new session.
func (c *Coordinator) Spawn(label string, opts SpawnOptions) (*SessionInfo, error) {
	label = strings.TrimSpace(label)
	if label == "" {
		return nil, ErrInvalidName
	}

	cmdArgs := opts.Command
	if len(cmdArgs) == 0 {
		cmdArgs = []string{c.opts.DefaultShell}
	}
	cmd := exec.Command(cmdArgs[0], cmdArgs[1:]...)
	if opts.WorkingDir != "" {
		cmd.Dir = opts.WorkingDir
	} else if home := defaultWorkingDir(); home != "" {
		cmd.Dir = home
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

	id := uuid.NewString()
	c.mu.Lock()
	if _, ok := c.labels[label]; ok {
		c.mu.Unlock()
		return nil, ErrSessionExists
	}
	c.labels[label] = id
	c.sessions[id] = nil
	c.mu.Unlock()

	reserved := true
	defer func() {
		if !reserved {
			return
		}
		c.mu.Lock()
		if c.sessions[id] == nil {
			delete(c.sessions, id)
		}
		delete(c.labels, label)
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

	order := atomic.AddUint32(&c.nextOrder, 1)
	session := newSession(id, label, cols, rows, order, vt, ptyHandle, c.opts.IdleThreshold, c.signalSessionsChanged)

	c.mu.Lock()
	c.sessions[id] = session
	c.mu.Unlock()
	reserved = false

	session.start()
	info := session.Info()
	c.signalSessionsChanged()
	return &info, nil
}

// Info returns session metadata.
func (c *Coordinator) Info(id string) (*SessionInfo, error) {
	session, err := c.getSession(id)
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
		if out[i].Order == out[j].Order {
			return out[i].Label < out[j].Label
		}
		if out[i].Order == 0 {
			return false
		}
		if out[j].Order == 0 {
			return true
		}
		return out[i].Order < out[j].Order
	})
	return out
}

func (c *Coordinator) sessionsChanged() <-chan struct{} {
	c.changeMu.Lock()
	ch := c.changeCh
	c.changeMu.Unlock()
	return ch
}

func (c *Coordinator) signalSessionsChanged() {
	c.changeMu.Lock()
	ch := c.changeCh
	close(ch)
	c.changeCh = make(chan struct{})
	c.changeMu.Unlock()
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
	if err == nil {
		session.recordActivity()
	}
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
	c.signalSessionsChanged()
	return nil
}

// Snapshot returns the current viewport snapshot.
func (c *Coordinator) Snapshot(id string) (*Snapshot, error) {
	session, err := c.getSession(id)
	if err != nil {
		return nil, err
	}
	return session.vt.Snapshot()
}

// Dump returns a text dump of the requested scope.
func (c *Coordinator) Dump(id string, scope DumpScope, unwrap bool) (string, error) {
	session, err := c.getSession(id)
	if err != nil {
		return "", err
	}
	return session.vt.Dump(scope, unwrap)
}

// Kill sends a signal to the session process.
func (c *Coordinator) Kill(id string, sig os.Signal) error {
	session, err := c.getSession(id)
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

// Close sends SIGHUP and schedules a SIGKILL if the session does not exit.
func (c *Coordinator) Close(id string) error {
	session, err := c.getSession(id)
	if err != nil {
		return err
	}
	if session.IsExited() {
		return nil
	}
	if session.MarkClosing() {
		c.signalSessionsChanged()
	}
	if err := session.pty.SignalGroup(syscall.SIGHUP); err != nil {
		return err
	}
	if c.opts.KillTimeout <= 0 {
		return nil
	}
	go func() {
		time.Sleep(c.opts.KillTimeout)
		if session.IsExited() {
			return
		}
		_ = session.pty.SignalGroup(syscall.SIGKILL)
	}()
	return nil
}

// Remove stops a session and removes it from the registry.
func (c *Coordinator) Remove(id string) error {
	session, err := c.getSession(id)
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
	delete(c.sessions, id)
	delete(c.labels, session.Label())
	c.mu.Unlock()
	c.signalSessionsChanged()
	return nil
}

// Rename updates a session name.
func (c *Coordinator) Rename(id, newLabel string) error {
	newLabel = strings.TrimSpace(newLabel)
	if newLabel == "" {
		return ErrInvalidName
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	session := c.sessions[id]
	if session == nil {
		return ErrSessionNotFound
	}
	if session.Label() == newLabel {
		return nil
	}
	if _, exists := c.labels[newLabel]; exists {
		return ErrSessionExists
	}
	oldLabel := session.Label()
	if oldLabel != "" {
		delete(c.labels, oldLabel)
	}
	c.labels[newLabel] = id
	session.SetLabel(newLabel)
	c.signalSessionsChanged()
	return nil
}

// LookupIDByLabel returns the session ID for the given label.
func (c *Coordinator) LookupIDByLabel(label string) (string, error) {
	label = strings.TrimSpace(label)
	if label == "" {
		return "", ErrInvalidName
	}
	c.mu.Lock()
	id := c.labels[label]
	c.mu.Unlock()
	if id == "" {
		return "", ErrSessionNotFound
	}
	return id, nil
}

// InfoByLabel returns session info for a label.
func (c *Coordinator) InfoByLabel(label string) (*SessionInfo, error) {
	id, err := c.LookupIDByLabel(label)
	if err != nil {
		return nil, err
	}
	return c.Info(id)
}

// Close removes all sessions.
func (c *Coordinator) CloseAll() error {
	c.mu.Lock()
	ids := make([]string, 0, len(c.sessions))
	for id := range c.sessions {
		ids = append(ids, id)
	}
	c.mu.Unlock()

	var firstErr error
	for _, id := range ids {
		if err := c.Remove(id); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}

func (c *Coordinator) getSession(id string) (*Session, error) {
	c.mu.Lock()
	session := c.sessions[id]
	c.mu.Unlock()
	if session == nil {
		return nil, ErrSessionNotFound
	}
	return session, nil
}

func mergeEnv(base []string, extra []string) []string {
	if len(extra) == 0 {
		return append([]string(nil), base...)
	}
	entries := make(map[string]string, len(base)+len(extra))
	order := make([]string, 0, len(base)+len(extra))
	add := func(entry string) {
		key, _, ok := strings.Cut(entry, "=")
		if !ok || key == "" {
			return
		}
		if _, seen := entries[key]; !seen {
			order = append(order, key)
		}
		entries[key] = entry
	}
	for _, entry := range base {
		add(entry)
	}
	for _, entry := range extra {
		add(entry)
	}
	out := make([]string, 0, len(order))
	for _, key := range order {
		if entry, ok := entries[key]; ok {
			out = append(out, entry)
		}
	}
	return out
}

func defaultWorkingDir() string {
	if dir, err := os.UserHomeDir(); err == nil && dir != "" {
		return dir
	}
	if dir := os.Getenv("HOME"); dir != "" {
		return dir
	}
	return ""
}

type Session struct {
	id           string
	label        string
	cols         uint16
	rows         uint16
	order        uint32
	pty          *PTY
	vt           *VT
	createdAt    time.Time
	onListChange func()

	mu       sync.Mutex
	state    SessionState
	exitCode int
	exitedAt time.Time

	exitCh   chan struct{}
	exitOnce sync.Once
	ioDone   <-chan struct{}

	outputMu    sync.Mutex
	outputBuf   []byte
	outputTotal int64
	outputCh    chan struct{}
	lastOutput  time.Time

	activityMu    sync.Mutex
	lastActivity  time.Time
	activityCh    chan struct{}
	idle          bool
	idleCh        chan struct{}
	idleThreshold time.Duration

	resizeMu sync.Mutex
	resizeCh chan struct{}

	frameID uint64
}

func newSession(id, label string, cols, rows uint16, order uint32, vt *VT, ptyHandle *PTY, idleThreshold time.Duration, onListChange func()) *Session {
	now := time.Now()
	return &Session{
		id:            id,
		label:         label,
		cols:          cols,
		rows:          rows,
		order:         order,
		pty:           ptyHandle,
		vt:            vt,
		createdAt:     now,
		onListChange:  onListChange,
		state:         SessionRunning,
		exitCh:        make(chan struct{}),
		outputCh:      make(chan struct{}),
		resizeCh:      make(chan struct{}),
		lastOutput:    now,
		lastActivity:  now,
		activityCh:    make(chan struct{}),
		idleCh:        make(chan struct{}),
		idleThreshold: idleThreshold,
	}
}

func (s *Session) start() {
	s.ioDone = s.pty.StartReadLoop(s.vt, s.recordOutput, nil)
	go s.trackIdle()
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
		if s.onListChange != nil {
			s.onListChange()
		}
		close(s.exitCh)
	})
}

// Info returns a copy of the session info.
func (s *Session) Info() SessionInfo {
	s.mu.Lock()
	id := s.id
	label := s.label
	state := s.state
	cols := s.cols
	rows := s.rows
	exitCode := s.exitCode
	order := s.order
	createdAt := s.createdAt
	exitedAt := s.exitedAt
	s.mu.Unlock()
	idle := s.isIdle()
	return SessionInfo{
		ID:        id,
		Label:     label,
		State:     state,
		Cols:      cols,
		Rows:      rows,
		ExitCode:  exitCode,
		Idle:      idle,
		Order:     order,
		CreatedAt: createdAt,
		ExitedAt:  exitedAt,
	}
}

func (s *Session) ID() string {
	s.mu.Lock()
	id := s.id
	s.mu.Unlock()
	return id
}

func (s *Session) Label() string {
	s.mu.Lock()
	label := s.label
	s.mu.Unlock()
	return label
}

func (s *Session) SetLabel(label string) {
	s.mu.Lock()
	s.label = label
	s.mu.Unlock()
}

func (s *Session) MarkClosing() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.state == SessionExited || s.state == SessionClosing {
		return false
	}
	s.state = SessionClosing
	return true
}

func (s *Session) IsExited() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.state == SessionExited
}

func (s *Session) IsRunning() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.state == SessionRunning || s.state == SessionClosing
}

func (s *Session) SetSize(cols, rows uint16) {
	s.mu.Lock()
	s.cols = cols
	s.rows = rows
	s.mu.Unlock()
	s.signalResize()
}

func (s *Session) nextFrameID() uint64 {
	return atomic.AddUint64(&s.frameID, 1)
}

func (s *Session) resizeState() <-chan struct{} {
	s.resizeMu.Lock()
	ch := s.resizeCh
	s.resizeMu.Unlock()
	return ch
}

func (s *Session) signalResize() {
	s.resizeMu.Lock()
	ch := s.resizeCh
	close(ch)
	s.resizeCh = make(chan struct{})
	s.resizeMu.Unlock()
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
