package main

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	proto "github.com/advait/vtrpc/proto"
	"github.com/charmbracelet/bubbles/list"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/ansi"
	"github.com/spf13/cobra"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type attachModel struct {
	conn         *grpc.ClientConn
	client       proto.VTRClient
	coordinator  coordinatorRef
	coords       []coordinatorRef
	session      string
	stream       proto.VTR_SubscribeClient
	streamCancel context.CancelFunc
	streamID     int
	frameID      uint64

	width          int
	height         int
	viewportWidth  int
	viewportHeight int
	screen         *proto.GetScreenResponse

	sessionList      list.Model
	sessionItems     []sessionListItem
	listActive       bool
	createActive     bool
	createInput      textinput.Model
	createCoordIdx   int
	createFocusInput bool

	hoverTab string
	hoverNew bool

	leaderActive bool
	showExited   bool
	exited       bool
	exitCode     int32
	statusMsg    string
	statusUntil  time.Time
	lastListAt   time.Time

	now time.Time
	err error
}

const (
	attrBold          uint32 = 0x01
	attrItalic        uint32 = 0x02
	attrUnderline     uint32 = 0x04
	attrFaint         uint32 = 0x08
	attrBlink         uint32 = 0x10
	attrInverse       uint32 = 0x20
	attrInvisible     uint32 = 0x40
	attrStrikethrough uint32 = 0x80
	attrOverline      uint32 = 0x100
)

type cellStyle struct {
	fg    int32
	bg    int32
	fgSet bool
	bgSet bool
	attrs uint32
}

type subscribeStartMsg struct {
	stream   proto.VTR_SubscribeClient
	cancel   context.CancelFunc
	streamID int
	err      error
}

type subscribeEventMsg struct {
	event    *proto.SubscribeEvent
	streamID int
	err      error
}

type tickMsg time.Time

type rpcErrMsg struct {
	err error
	op  string
}

type sessionSwitchMsg struct {
	name string
	err  error
}

type sessionListMsg struct {
	items    []list.Item
	sessions []sessionListItem
	activate bool
	err      error
}

type spawnSessionMsg struct {
	name  string
	coord coordinatorRef
	conn  *grpc.ClientConn
	err   error
}

type sessionListItem struct {
	name     string
	status   proto.SessionStatus
	exitCode int32
	idle     bool
}

func (s sessionListItem) Title() string {
	return fmt.Sprintf("%s %s", renderSessionStatusIcon(s), s.name)
}

func (s sessionListItem) Description() string {
	switch s.status {
	case proto.SessionStatus_SESSION_STATUS_EXITED:
		return fmt.Sprintf("exited (%d)", s.exitCode)
	case proto.SessionStatus_SESSION_STATUS_RUNNING:
		if s.idle {
			return "idle"
		}
		return "active"
	default:
		return "unknown"
	}
}

func (s sessionListItem) FilterValue() string {
	return s.name
}

var (
	attachBorderStyle = lipgloss.NewStyle().
				Border(lipgloss.NormalBorder()).
				BorderForeground(lipgloss.Color("240"))
	attachExitedBorderStyle = lipgloss.NewStyle().
				Border(lipgloss.NormalBorder()).
				BorderForeground(lipgloss.Color("1"))
	attachHeaderStyle = lipgloss.NewStyle().
				Background(lipgloss.Color("236")).
				Foreground(lipgloss.Color("252"))
	attachStatusStyle = lipgloss.NewStyle().
				Background(lipgloss.Color("236")).
				Foreground(lipgloss.Color("252"))
	attachHintKeyStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("214")).
				Bold(true)
	attachHintChevronStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("240"))
	attachTabBaseStyle = lipgloss.NewStyle().
				Background(lipgloss.Color("236")).
				Padding(0, 1)
	attachTabStyle       = attachTabBaseStyle
	attachTabActiveStyle = attachTabBaseStyle.Copy().
				Bold(true)
	attachTabHoverStyle = attachTabBaseStyle.Copy().
				Underline(true)
	attachTabNewStyle = attachTabBaseStyle.Copy().
				Foreground(lipgloss.Color("120")).
				Bold(true)
	attachTabNewHoverStyle = attachTabNewStyle.Copy().
				Underline(true)
	attachTabTextStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("252"))
	attachTabTextActiveStyle = lipgloss.NewStyle().
					Foreground(lipgloss.Color("255")).
					Bold(true)
	attachTabTextHoverStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("255")).
				Bold(true)
	attachTabTextExitedStyle = lipgloss.NewStyle().
					Foreground(lipgloss.Color("244"))
	attachStatusActiveStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("2"))
	attachStatusIdleStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("3"))
	attachStatusExitedStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("1"))
	attachStatusUnknownStyle = lipgloss.NewStyle().
					Foreground(lipgloss.Color("245"))
	attachFooterTagStyle = lipgloss.NewStyle().
				Background(lipgloss.Color("235")).
				Foreground(lipgloss.Color("250"))
	attachOverflowStyle = attachTabBaseStyle.Copy().
				Foreground(lipgloss.Color("244"))
	attachModalStyle = lipgloss.NewStyle().
				Border(lipgloss.NormalBorder()).
				BorderForeground(lipgloss.Color("240")).
				Padding(1, 2)
)

func newAttachCmd() *cobra.Command {
	var socket string
	cmd := &cobra.Command{
		Use:   "attach [name]",
		Short: "Attach to a session",
		Args:  cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, _, _, err := loadConfigAndOutput(false)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			var target sessionTarget
			if len(args) == 0 {
				target, err = resolveFirstSessionTarget(context.Background(), coords, socket)
			} else {
				ctx, cancel := context.WithTimeout(context.Background(), resolveTimeout)
				target, err = resolveSessionTarget(ctx, coordinatorsOrDefault(coords), socket, args[0])
				cancel()
			}
			if err != nil {
				return err
			}

			coords = coordinatorsOrDefault(coords)
			coords = ensureCoordinator(coords, target.Coordinator)
			coordIdx := coordinatorIndex(coords, target.Coordinator)
			if coordIdx < 0 {
				coordIdx = 0
			}

			conn, err := dialClient(context.Background(), target.Coordinator.Path)
			if err != nil {
				return err
			}
			client := proto.NewVTRClient(conn)
			if err := ensureSessionExists(client, target.Session); err != nil {
				_ = conn.Close()
				return err
			}

			model := attachModel{
				conn:             conn,
				client:           client,
				coordinator:      target.Coordinator,
				coords:           coords,
				session:          target.Session,
				streamID:         1,
				sessionList:      newSessionListModel(nil, 0, 0),
				createInput:      newCreateInput(),
				createCoordIdx:   coordIdx,
				createFocusInput: true,
				now:              time.Now(),
				lastListAt:       time.Now(),
			}

			prog := tea.NewProgram(model, tea.WithAltScreen(), tea.WithMouseAllMotion())
			finalModel, err := prog.Run()
			if fm, ok := finalModel.(attachModel); ok && fm.conn != nil {
				_ = fm.conn.Close()
			} else {
				_ = conn.Close()
			}
			if err != nil {
				return err
			}
			if fm, ok := finalModel.(attachModel); ok && fm.err != nil {
				return fm.err
			}
			return nil
		},
	}
	addSocketFlag(cmd, &socket)
	return cmd
}

func resolveFirstSessionTarget(ctx context.Context, coords []coordinatorRef, socketFlag string) (sessionTarget, error) {
	candidates := coords
	if socketFlag != "" {
		candidates = []coordinatorRef{{Name: coordinatorName(socketFlag), Path: socketFlag}}
	} else {
		candidates = coordinatorsOrDefault(coords)
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if _, ok := ctx.Deadline(); !ok {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, resolveTimeout)
		defer cancel()
	}
	var errs []string
	hadSuccess := false
	for _, coord := range candidates {
		first := ""
		err := withCoordinator(ctx, coord, func(client proto.VTRClient) error {
			resp, err := client.List(ctx, &proto.ListRequest{})
			if err != nil {
				return err
			}
			names := make([]string, 0, len(resp.Sessions))
			for _, session := range resp.Sessions {
				if session == nil || session.Name == "" {
					continue
				}
				names = append(names, session.Name)
			}
			if len(names) == 0 {
				return nil
			}
			sort.Strings(names)
			first = names[0]
			return nil
		})
		if err != nil {
			errs = append(errs, fmt.Sprintf("%s: %v", coord.Name, err))
			continue
		}
		hadSuccess = true
		if first != "" {
			return sessionTarget{Coordinator: coord, Session: first}, nil
		}
	}
	if !hadSuccess && len(errs) > 0 {
		return sessionTarget{}, fmt.Errorf("unable to list sessions: %s", strings.Join(errs, "; "))
	}
	if len(errs) > 0 && hadSuccess {
		return sessionTarget{}, fmt.Errorf("no sessions found (errors: %s)", strings.Join(errs, "; "))
	}
	return sessionTarget{}, fmt.Errorf("no sessions found")
}

func ensureSessionExists(client proto.VTRClient, name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
	defer cancel()
	_, err := client.Info(ctx, &proto.InfoRequest{Name: name})
	if err == nil {
		return nil
	}
	if status.Code(err) != codes.NotFound {
		return err
	}
	ok, err := confirmCreateSession(name)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("session %q not found", name)
	}
	ctx, cancel = context.WithTimeout(context.Background(), rpcTimeout)
	defer cancel()
	_, err = client.Spawn(ctx, &proto.SpawnRequest{Name: name})
	if err != nil && status.Code(err) != codes.AlreadyExists {
		return err
	}
	return nil
}

func confirmCreateSession(name string) (bool, error) {
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Fprintf(os.Stderr, "Session %q not found. Create it? [Y/n] ", name)
		line, err := reader.ReadString('\n')
		if err != nil {
			return false, err
		}
		answer := strings.TrimSpace(strings.ToLower(line))
		switch answer {
		case "", "y", "yes":
			return true, nil
		case "n", "no":
			return false, nil
		default:
			fmt.Fprintln(os.Stderr, "Please answer yes or no.")
		}
	}
}

func (m attachModel) Init() tea.Cmd {
	return tea.Batch(
		startSubscribeCmd(m.client, m.session, m.streamID),
		loadSessionListCmd(m.client, false),
		tickCmd(),
	)
}

func (m attachModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case subscribeStartMsg:
		if msg.streamID != m.streamID {
			if msg.cancel != nil {
				msg.cancel()
			}
			return m, nil
		}
		if msg.err != nil {
			m.err = msg.err
			return m, tea.Quit
		}
		if m.streamCancel != nil {
			m.streamCancel()
		}
		m.stream = msg.stream
		m.streamCancel = msg.cancel
		m.exited = false
		m.exitCode = 0
		return m, waitSubscribeCmd(m.stream, m.streamID)
	case subscribeEventMsg:
		if msg.streamID != m.streamID {
			return m, nil
		}
		if msg.err != nil {
			m.err = msg.err
			return m, tea.Quit
		}
		if update := msg.event.GetScreenUpdate(); update != nil {
			next, cmd := applyScreenUpdate(m, update)
			m = next
			if cmd != nil {
				return m, cmd
			}
			return m, waitSubscribeCmd(m.stream, m.streamID)
		}
		if idle := msg.event.GetSessionIdle(); idle != nil {
			var cmd tea.Cmd
			m, cmd = applySessionIdle(m, idle.Name, idle.Idle)
			if cmd != nil {
				return m, tea.Batch(cmd, waitSubscribeCmd(m.stream, m.streamID))
			}
			return m, waitSubscribeCmd(m.stream, m.streamID)
		}
		if exited := msg.event.GetSessionExited(); exited != nil {
			m.exited = true
			m.exitCode = exited.ExitCode
			m.leaderActive = false
			m.sessionItems = ensureSessionItem(m.sessionItems, m.session, true, exited.ExitCode)
			if m.streamCancel != nil {
				m.streamCancel()
				m.streamCancel = nil
			}
			return m, m.sessionList.SetItems(sessionItemsToListItems(visibleSessionItems(m)))
		}
		return m, waitSubscribeCmd(m.stream, m.streamID)
	case tickMsg:
		m.now = time.Time(msg)
		if m.statusMsg != "" && !m.statusUntil.IsZero() && m.now.After(m.statusUntil) {
			m.statusMsg = ""
			m.statusUntil = time.Time{}
		}
		cmds := []tea.Cmd{tickCmd()}
		if m.client != nil && !m.listActive && !m.createActive && (m.lastListAt.IsZero() || m.now.Sub(m.lastListAt) > 5*time.Second) {
			m.lastListAt = m.now
			cmds = append(cmds, loadSessionListCmd(m.client, false))
		}
		return m, tea.Batch(cmds...)
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.viewportWidth, m.viewportHeight = viewportSize(msg.Width, msg.Height)
		if m.viewportWidth > 0 && m.viewportHeight > 0 {
			m.sessionList.SetSize(m.viewportWidth, m.viewportHeight)
		}
		if m.viewportWidth > 0 && m.viewportHeight > 0 {
			if m.exited {
				return m, nil
			}
			return m, resizeCmd(m.client, m.session, m.viewportWidth, m.viewportHeight)
		}
		return m, nil
	case rpcErrMsg:
		if msg.err != nil {
			m.statusMsg = fmt.Sprintf("%s: %v", msg.op, msg.err)
			m.statusUntil = time.Now().Add(2 * time.Second)
		}
		return m, nil
	case sessionSwitchMsg:
		return switchSession(m, msg)
	case sessionListMsg:
		if msg.err != nil {
			if msg.activate || m.listActive {
				m.listActive = false
				m.statusMsg = fmt.Sprintf("list: %v", msg.err)
				m.statusUntil = time.Now().Add(2 * time.Second)
			}
			return m, nil
		}
		m.sessionItems = msg.sessions
		m.lastListAt = time.Now()
		cmd := m.sessionList.SetItems(sessionItemsToListItems(visibleSessionItems(m)))
		if msg.activate {
			m.listActive = true
		}
		return m, cmd
	case spawnSessionMsg:
		if msg.err != nil {
			if msg.conn != nil {
				_ = msg.conn.Close()
			}
			m.statusMsg = fmt.Sprintf("spawn: %v", msg.err)
			m.statusUntil = time.Now().Add(2 * time.Second)
			return m, nil
		}
		if msg.conn != nil {
			if m.conn != nil {
				_ = m.conn.Close()
			}
			m.conn = msg.conn
			m.client = proto.NewVTRClient(msg.conn)
			m.coordinator = msg.coord
		}
		return switchSession(m, sessionSwitchMsg{name: msg.name})
	case tea.MouseMsg:
		return handleMouse(m, msg)
	case tea.KeyMsg:
		if m.createActive {
			return updateCreateModal(m, msg)
		}
		if m.listActive {
			return updateSessionList(m, msg)
		}
		if m.leaderActive {
			m.leaderActive = false
			if msg.String() == "esc" || msg.String() == "escape" {
				return m, nil
			}
			return handleLeaderKey(m, msg)
		}
		if msg.String() == "ctrl+b" {
			m.leaderActive = true
			return m, nil
		}
		return handleInputKey(m, msg)
	}
	return m, nil
}

func (m attachModel) View() string {
	if m.width <= 0 || m.height <= 0 {
		return "loading..."
	}
	innerWidth := m.width - 2
	innerHeight := m.height - 2
	if innerWidth <= 0 || innerHeight <= 0 {
		return "loading..."
	}
	overlayWidth := overlayAvailableWidth(innerWidth)
	content := ""
	switch {
	case m.createActive:
		content = renderCreateModal(m)
	case m.listActive:
		content = renderSessionList(m)
	default:
		content = renderScreen(m.screen, m.viewportWidth, m.viewportHeight, m.now)
	}
	border := attachBorderStyle
	if m.exited {
		border = attachExitedBorderStyle
	}
	headerLeft, headerRight := renderHeaderSegments(headerView{
		sessions: visibleSessionItems(m),
		active:   m.session,
		width:    overlayWidth,
		exited:   m.exited,
		exitCode: m.exitCode,
		hoverTab: m.hoverTab,
		hoverNew: m.hoverNew,
	})
	activeItem := currentSessionItem(m)
	footerLeft, footerRight := renderFooterSegments(footerView{
		width:       overlayWidth,
		leader:      m.leaderActive,
		statusMsg:   m.statusMsg,
		exited:      m.exited,
		coordinator: m.coordinator.Name,
		active:      activeItem,
	})
	view := renderBorderOverlay(content, m.width, m.height, border, headerLeft, headerRight, footerLeft, footerRight)
	return clampViewHeight(view, m.height)
}

func startSubscribeCmd(client proto.VTRClient, name string, streamID int) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithCancel(context.Background())
		stream, err := client.Subscribe(ctx, &proto.SubscribeRequest{
			Name:                 name,
			IncludeScreenUpdates: true,
			IncludeRawOutput:     false,
		})
		if err != nil {
			cancel()
			return subscribeStartMsg{err: err, streamID: streamID}
		}
		return subscribeStartMsg{stream: stream, cancel: cancel, streamID: streamID}
	}
}

func waitSubscribeCmd(stream proto.VTR_SubscribeClient, streamID int) tea.Cmd {
	return func() tea.Msg {
		event, err := stream.Recv()
		if err != nil {
			return subscribeEventMsg{err: err, streamID: streamID}
		}
		return subscribeEventMsg{event: event, streamID: streamID}
	}
}

func tickCmd() tea.Cmd {
	return tea.Tick(time.Second, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func resizeCmd(client proto.VTRClient, name string, cols, rows int) tea.Cmd {
	if cols <= 0 || rows <= 0 {
		return nil
	}
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		_, err := client.Resize(ctx, &proto.ResizeRequest{
			Name: name,
			Cols: int32(cols),
			Rows: int32(rows),
		})
		if err != nil {
			return rpcErrMsg{err: err, op: "resize"}
		}
		return nil
	}
}

func sendBytesCmd(client proto.VTRClient, name string, data []byte) tea.Cmd {
	if len(data) == 0 {
		return nil
	}
	payload := append([]byte(nil), data...)
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		_, err := client.SendBytes(ctx, &proto.SendBytesRequest{
			Name: name,
			Data: payload,
		})
		if err != nil {
			return rpcErrMsg{err: err, op: "send bytes"}
		}
		return nil
	}
}

func sendKeyCmd(client proto.VTRClient, name, key string) tea.Cmd {
	if strings.TrimSpace(key) == "" {
		return nil
	}
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		_, err := client.SendKey(ctx, &proto.SendKeyRequest{
			Name: name,
			Key:  key,
		})
		if err != nil {
			return rpcErrMsg{err: err, op: "send key"}
		}
		return nil
	}
}

func killCmd(client proto.VTRClient, name string) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		_, err := client.Kill(ctx, &proto.KillRequest{
			Name:   name,
			Signal: "TERM",
		})
		if err != nil {
			return rpcErrMsg{err: err, op: "kill"}
		}
		return nil
	}
}

func nextSessionCmd(client proto.VTRClient, current string, forward bool, showExited bool) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		resp, err := client.List(ctx, &proto.ListRequest{})
		if err != nil {
			return sessionSwitchMsg{err: err}
		}
		names := make([]string, 0, len(resp.Sessions))
		for _, session := range resp.Sessions {
			if session != nil && session.Name != "" {
				if !showExited && session.Status == proto.SessionStatus_SESSION_STATUS_EXITED {
					continue
				}
				names = append(names, session.Name)
			}
		}
		if len(names) == 0 {
			return sessionSwitchMsg{err: fmt.Errorf("no sessions")}
		}
		sort.Strings(names)
		idx := -1
		for i, name := range names {
			if name == current {
				idx = i
				break
			}
		}
		if idx == -1 {
			return sessionSwitchMsg{name: names[0]}
		}
		if forward {
			idx = (idx + 1) % len(names)
		} else {
			idx = (idx - 1 + len(names)) % len(names)
		}
		return sessionSwitchMsg{name: names[idx]}
	}
}

func loadSessionListCmd(client proto.VTRClient, activate bool) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		resp, err := client.List(ctx, &proto.ListRequest{})
		if err != nil {
			return sessionListMsg{err: err, activate: activate}
		}
		sessions := resp.Sessions
		sort.Slice(sessions, func(i, j int) bool {
			if sessions[i] == nil || sessions[j] == nil {
				return sessions[i] != nil
			}
			return sessions[i].Name < sessions[j].Name
		})
		items := make([]list.Item, 0, len(sessions))
		out := make([]sessionListItem, 0, len(sessions))
		for _, session := range sessions {
			if session == nil || session.Name == "" {
				continue
			}
			entry := sessionListItem{
				name:     session.Name,
				status:   session.Status,
				exitCode: session.ExitCode,
				idle:     session.GetIdle(),
			}
			out = append(out, entry)
			items = append(items, entry)
		}
		return sessionListMsg{items: items, sessions: out, activate: activate}
	}
}

func spawnCurrentCmd(client proto.VTRClient, name string) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		_, err := client.Spawn(ctx, &proto.SpawnRequest{Name: name})
		if err != nil {
			return rpcErrMsg{err: err, op: "spawn"}
		}
		return sessionSwitchMsg{name: name}
	}
}
func spawnAutoSessionCmd(client proto.VTRClient, base string) tea.Cmd {
	return func() tea.Msg {
		if client == nil {
			return rpcErrMsg{err: fmt.Errorf("spawn: no client"), op: "spawn"}
		}
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		resp, err := client.List(ctx, &proto.ListRequest{})
		cancel()
		if err != nil {
			return rpcErrMsg{err: err, op: "list"}
		}
		names := make(map[string]struct{}, len(resp.Sessions))
		for _, session := range resp.Sessions {
			if session == nil || session.Name == "" {
				continue
			}
			names[session.Name] = struct{}{}
		}
		base = strings.TrimSpace(base)
		if base == "" {
			base = "session"
		}
		for i := 0; i < 1000; i++ {
			candidate := base
			if i > 0 {
				candidate = fmt.Sprintf("%s-%d", base, i)
			}
			if _, exists := names[candidate]; exists {
				continue
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			_, err = client.Spawn(ctx, &proto.SpawnRequest{Name: candidate})
			cancel()
			if err == nil {
				return sessionSwitchMsg{name: candidate}
			}
			if status.Code(err) == codes.AlreadyExists {
				names[candidate] = struct{}{}
				continue
			}
			return rpcErrMsg{err: err, op: "spawn"}
		}
		return rpcErrMsg{err: fmt.Errorf("spawn: unable to find available session name"), op: "spawn"}
	}
}

func spawnSessionCmd(coord coordinatorRef, name string) tea.Cmd {
	return func() tea.Msg {
		conn, err := dialClient(context.Background(), coord.Path)
		if err != nil {
			return spawnSessionMsg{err: err, coord: coord}
		}
		client := proto.NewVTRClient(conn)
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		_, err = client.Spawn(ctx, &proto.SpawnRequest{Name: name})
		if err != nil {
			_ = conn.Close()
			return spawnSessionMsg{err: err, coord: coord}
		}
		return spawnSessionMsg{name: name, coord: coord, conn: conn}
	}
}

func handleLeaderKey(m attachModel, msg tea.KeyMsg) (attachModel, tea.Cmd) {
	key := msg.String()
	if len(key) == 1 {
		key = strings.ToLower(key)
	}
	if m.exited {
		switch key {
		case "ctrl+b", "x":
			m.statusMsg = "session exited"
			m.statusUntil = time.Now().Add(2 * time.Second)
			return m, nil
		}
	}
	switch key {
	case "ctrl+b":
		return m, sendKeyCmd(m.client, m.session, "ctrl+b")
	case "d":
		return m, tea.Quit
	case "x":
		m.statusMsg = "kill sent"
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, killCmd(m.client, m.session)
	case "j", "n", "l":
		return m, nextSessionCmd(m.client, m.session, true, m.showExited)
	case "k", "p", "h":
		return m, nextSessionCmd(m.client, m.session, false, m.showExited)
	case "c":
		return beginCreateModal(m)
	case "e":
		m.showExited = !m.showExited
		if m.showExited {
			m.statusMsg = "showing closed sessions"
		} else {
			m.statusMsg = "hiding closed sessions"
		}
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, m.sessionList.SetItems(sessionItemsToListItems(visibleSessionItems(m)))
	case "w":
		m.listActive = true
		return m, loadSessionListCmd(m.client, true)
	default:
		m.statusMsg = fmt.Sprintf("unknown leader key: %s", key)
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, nil
	}
}

func handleMouse(m attachModel, msg tea.MouseMsg) (attachModel, tea.Cmd) {
	clearHover := func() {
		m.hoverTab = ""
		m.hoverNew = false
	}
	if m.listActive || m.createActive {
		if m.hoverTab != "" || m.hoverNew {
			clearHover()
		}
		return m, nil
	}
	if msg.Action == tea.MouseActionMotion {
		if msg.Y != 0 || m.width <= 0 {
			if m.hoverTab != "" || m.hoverNew {
				clearHover()
			}
			return m, nil
		}
		innerWidth := m.width - 2
		if innerWidth <= 0 {
			if m.hoverTab != "" || m.hoverNew {
				clearHover()
			}
			return m, nil
		}
		leftPad, _ := overlayPadding(innerWidth)
		startX := 1 + leftPad
		localX := msg.X - startX
		if localX < 0 {
			if m.hoverTab != "" || m.hoverNew {
				clearHover()
			}
			return m, nil
		}
		headerWidth := overlayAvailableWidth(innerWidth)
		if headerWidth <= 0 {
			if m.hoverTab != "" || m.hoverNew {
				clearHover()
			}
			return m, nil
		}
		tab, ok := tabAtOffsetX(headerView{
			sessions: visibleSessionItems(m),
			active:   m.session,
			width:    headerWidth,
			exited:   m.exited,
			exitCode: m.exitCode,
		}, localX)
		if !ok {
			if m.hoverTab != "" || m.hoverNew {
				clearHover()
			}
			return m, nil
		}
		if tab.newTab {
			m.hoverNew = true
			m.hoverTab = ""
			return m, nil
		}
		m.hoverNew = false
		m.hoverTab = tab.name
		return m, nil
	}
	if msg.Button == tea.MouseButtonWheelUp || msg.Button == tea.MouseButtonWheelDown || msg.Button == tea.MouseButtonWheelLeft || msg.Button == tea.MouseButtonWheelRight {
		if msg.Y != 0 {
			return m, nil
		}
		switch msg.Button {
		case tea.MouseButtonWheelUp, tea.MouseButtonWheelLeft:
			return m, nextSessionCmd(m.client, m.session, false, m.showExited)
		default:
			return m, nextSessionCmd(m.client, m.session, true, m.showExited)
		}
	}
	if msg.Action != tea.MouseActionPress {
		return m, nil
	}
	if msg.Button != tea.MouseButtonLeft && msg.Button != tea.MouseButtonMiddle {
		return m, nil
	}
	if msg.Y != 0 || m.width <= 0 {
		return m, nil
	}
	innerWidth := m.width - 2
	if innerWidth <= 0 {
		return m, nil
	}
	leftPad, _ := overlayPadding(innerWidth)
	startX := 1 + leftPad
	localX := msg.X - startX
	if localX < 0 {
		return m, nil
	}
	headerWidth := overlayAvailableWidth(innerWidth)
	if headerWidth <= 0 {
		return m, nil
	}
	tab, ok := tabAtOffsetX(headerView{
		sessions: visibleSessionItems(m),
		active:   m.session,
		width:    headerWidth,
		exited:   m.exited,
		exitCode: m.exitCode,
	}, localX)
	if !ok {
		return m, nil
	}
	if tab.newTab {
		if msg.Button == tea.MouseButtonLeft {
			return m, spawnAutoSessionCmd(m.client, "session")
		}
		return m, nil
	}
	switch msg.Button {
	case tea.MouseButtonLeft:
		if tab.name == "" || tab.name == m.session {
			return m, nil
		}
		return switchSession(m, sessionSwitchMsg{name: tab.name})
	case tea.MouseButtonMiddle:
		if tab.name == "" {
			return m, nil
		}
		m.statusMsg = "kill sent"
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, killCmd(m.client, tab.name)
	default:
		return m, nil
	}
}
func handleInputKey(m attachModel, msg tea.KeyMsg) (attachModel, tea.Cmd) {
	if m.exited {
		if m.statusMsg == "" || time.Now().After(m.statusUntil) {
			m.statusMsg = "session exited"
			m.statusUntil = time.Now().Add(2 * time.Second)
		}
		return m, nil
	}
	key, data, ok := inputForKey(msg)
	if !ok {
		return m, nil
	}
	if len(data) > 0 {
		return m, sendBytesCmd(m.client, m.session, data)
	}
	return m, sendKeyCmd(m.client, m.session, key)
}

func inputForKey(msg tea.KeyMsg) (string, []byte, bool) {
	if msg.Alt && len(msg.Runes) == 1 {
		return "alt+" + string(msg.Runes), nil, true
	}
	if msg.Type >= 0 && msg.Type <= 31 {
		return "", []byte{byte(msg.Type)}, true
	}
	if msg.Type == tea.KeyBackspace {
		return "", []byte{0x7f}, true
	}
	switch msg.Type {
	case tea.KeyRunes:
		if len(msg.Runes) == 0 {
			return "", nil, false
		}
		return "", []byte(string(msg.Runes)), true
	case tea.KeySpace:
		return "", []byte(" "), true
	}
	key := msg.String()
	switch key {
	case "enter", "tab", "backspace", "delete", "up", "down", "left", "right", "home", "end":
		return key, nil, true
	case "pgup":
		return "pageup", nil, true
	case "pgdown":
		return "pagedown", nil, true
	case "esc", "escape":
		return "esc", nil, true
	}
	if strings.HasPrefix(key, "ctrl+") || strings.HasPrefix(key, "alt+") || strings.HasPrefix(key, "meta+") {
		return key, nil, true
	}
	return "", nil, false
}

func newSessionListModel(items []list.Item, width, height int) list.Model {
	delegate := list.NewDefaultDelegate()
	model := list.New(items, delegate, width, height)
	model.Title = "Sessions"
	model.SetShowStatusBar(false)
	model.SetShowHelp(false)
	model.SetFilteringEnabled(true)
	return model
}

func newCreateInput() textinput.Model {
	input := textinput.New()
	input.Prompt = "Name: "
	input.Placeholder = "session"
	input.CharLimit = 64
	input.Width = 30
	input.Blur()
	return input
}

func beginCreateModal(m attachModel) (attachModel, tea.Cmd) {
	if len(m.coords) == 0 {
		m.statusMsg = "create: no coordinators"
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, nil
	}
	m.createActive = true
	m.listActive = false
	m.createFocusInput = true
	m.createCoordIdx = coordinatorIndex(m.coords, m.coordinator)
	if m.createCoordIdx < 0 {
		m.createCoordIdx = 0
	}
	m.createInput.SetValue("")
	m.createInput.Focus()
	return m, nil
}

func updateSessionList(m attachModel, msg tea.KeyMsg) (attachModel, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.listActive = false
		return m, nil
	case "C":
		return beginCreateModal(m)
	case "enter":
		item := m.sessionList.SelectedItem()
		if item == nil {
			return m, nil
		}
		selected, ok := item.(sessionListItem)
		if !ok {
			return m, nil
		}
		m.listActive = false
		return switchSession(m, sessionSwitchMsg{name: selected.name})
	}
	var cmd tea.Cmd
	m.sessionList, cmd = m.sessionList.Update(msg)
	return m, cmd
}

func updateCreateModal(m attachModel, msg tea.KeyMsg) (attachModel, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.createActive = false
		m.createInput.Blur()
		return m, nil
	case "tab":
		m.createFocusInput = !m.createFocusInput
		if m.createFocusInput {
			m.createInput.Focus()
		} else {
			m.createInput.Blur()
		}
		return m, nil
	case "enter":
		name := strings.TrimSpace(m.createInput.Value())
		if name == "" {
			m.statusMsg = "create: name required"
			m.statusUntil = time.Now().Add(2 * time.Second)
			return m, nil
		}
		coord := m.coordinator
		if m.createCoordIdx >= 0 && m.createCoordIdx < len(m.coords) {
			coord = m.coords[m.createCoordIdx]
		}
		m.createActive = false
		m.createInput.Blur()
		if coord.Path == m.coordinator.Path {
			return m, spawnCurrentCmd(m.client, name)
		}
		return m, spawnSessionCmd(coord, name)
	case "j", "down":
		if !m.createFocusInput && len(m.coords) > 0 {
			m.createCoordIdx = (m.createCoordIdx + 1) % len(m.coords)
		}
		return m, nil
	case "k", "up":
		if !m.createFocusInput && len(m.coords) > 0 {
			m.createCoordIdx = (m.createCoordIdx - 1 + len(m.coords)) % len(m.coords)
		}
		return m, nil
	}
	if m.createFocusInput {
		var cmd tea.Cmd
		m.createInput, cmd = m.createInput.Update(msg)
		return m, cmd
	}
	return m, nil
}

func switchSession(m attachModel, msg sessionSwitchMsg) (attachModel, tea.Cmd) {
	if msg.err != nil {
		m.statusMsg = fmt.Sprintf("switch: %v", msg.err)
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, nil
	}
	if msg.name == "" || msg.name == m.session {
		m.statusMsg = "switch: no other sessions"
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, nil
	}
	if m.streamCancel != nil {
		m.streamCancel()
		m.streamCancel = nil
	}
	m.streamID++
	m.session = msg.name
	m.screen = nil
	m.frameID = 0
	m.exited = false
	m.exitCode = 0
	m.leaderActive = false
	m.listActive = false
	m.createActive = false
	m.createInput.Blur()
	m.statusMsg = fmt.Sprintf("attached to %s", msg.name)
	m.statusUntil = time.Now().Add(2 * time.Second)
	m.sessionItems = ensureSessionItem(m.sessionItems, m.session, false, 0)
	cmds := []tea.Cmd{startSubscribeCmd(m.client, m.session, m.streamID)}
	if m.viewportWidth > 0 && m.viewportHeight > 0 {
		cmds = append(cmds, resizeCmd(m.client, m.session, m.viewportWidth, m.viewportHeight))
	}
	cmds = append(cmds, loadSessionListCmd(m.client, false))
	return m, tea.Batch(cmds...)
}

func applySessionIdle(m attachModel, name string, idle bool) (attachModel, tea.Cmd) {
	if name == "" {
		return m, nil
	}
	updated := false
	for i := range m.sessionItems {
		if m.sessionItems[i].name == name {
			m.sessionItems[i].idle = idle
			updated = true
			break
		}
	}
	if !updated {
		m.sessionItems = append(m.sessionItems, sessionListItem{
			name:   name,
			status: proto.SessionStatus_SESSION_STATUS_RUNNING,
			idle:   idle,
		})
		sort.Slice(m.sessionItems, func(i, j int) bool {
			return m.sessionItems[i].name < m.sessionItems[j].name
		})
	}
	return m, m.sessionList.SetItems(sessionItemsToListItems(visibleSessionItems(m)))
}

func ensureSessionItem(items []sessionListItem, name string, exited bool, exitCode int32) []sessionListItem {
	if name == "" {
		return items
	}
	for i := range items {
		if items[i].name == name {
			if exited {
				items[i].status = proto.SessionStatus_SESSION_STATUS_EXITED
				items[i].exitCode = exitCode
			}
			return items
		}
	}
	status := proto.SessionStatus_SESSION_STATUS_RUNNING
	if exited {
		status = proto.SessionStatus_SESSION_STATUS_EXITED
	}
	items = append(items, sessionListItem{name: name, status: status, exitCode: exitCode})
	sort.Slice(items, func(i, j int) bool {
		return items[i].name < items[j].name
	})
	return items
}

func visibleSessionItems(m attachModel) []sessionListItem {
	return filterVisibleSessionItems(m.sessionItems, m.showExited, m.session)
}

func filterVisibleSessionItems(items []sessionListItem, showExited bool, active string) []sessionListItem {
	if showExited {
		return items
	}
	out := make([]sessionListItem, 0, len(items))
	for _, item := range items {
		if item.status == proto.SessionStatus_SESSION_STATUS_EXITED && item.name != active {
			continue
		}
		out = append(out, item)
	}
	return out
}

func sessionItemsToListItems(items []sessionListItem) []list.Item {
	out := make([]list.Item, 0, len(items))
	for _, item := range items {
		out = append(out, item)
	}
	return out
}

func currentSessionItem(m attachModel) sessionListItem {
	for _, item := range m.sessionItems {
		if item.name == m.session {
			if m.exited {
				item.status = proto.SessionStatus_SESSION_STATUS_EXITED
				item.exitCode = m.exitCode
			}
			return item
		}
	}
	status := proto.SessionStatus_SESSION_STATUS_RUNNING
	if m.exited {
		status = proto.SessionStatus_SESSION_STATUS_EXITED
	}
	return sessionListItem{name: m.session, status: status, exitCode: m.exitCode}
}

func applyScreenUpdate(m attachModel, update *proto.ScreenUpdate) (attachModel, tea.Cmd) {
	if update == nil {
		return m, nil
	}
	if update.IsKeyframe {
		if update.Screen != nil {
			m.screen = update.Screen
		}
		m.frameID = update.FrameId
		return m, nil
	}
	if update.BaseFrameId == 0 || update.FrameId == 0 {
		return resubscribe(m, "invalid delta frame")
	}
	if m.frameID == 0 || update.BaseFrameId != m.frameID {
		return resubscribe(m, "stream desync")
	}
	screen, err := applyScreenDelta(m.screen, update.Delta)
	if err != nil {
		return resubscribe(m, "delta apply failed")
	}
	m.screen = screen
	m.frameID = update.FrameId
	return m, nil
}

func applyScreenDelta(screen *proto.GetScreenResponse, delta *proto.ScreenDelta) (*proto.GetScreenResponse, error) {
	if screen == nil || delta == nil {
		return nil, fmt.Errorf("missing screen or delta")
	}
	cols := int(delta.GetCols())
	rows := int(delta.GetRows())
	if cols <= 0 || rows <= 0 {
		return nil, fmt.Errorf("invalid delta size")
	}
	if int(screen.Cols) != cols || int(screen.Rows) != rows || len(screen.ScreenRows) != rows {
		return nil, fmt.Errorf("delta size mismatch")
	}
	screen.Cols = int32(cols)
	screen.Rows = int32(rows)
	screen.CursorX = delta.CursorX
	screen.CursorY = delta.CursorY
	for _, rowDelta := range delta.RowDeltas {
		rowIdx := int(rowDelta.Row)
		if rowIdx < 0 || rowIdx >= rows {
			return nil, fmt.Errorf("row delta out of range")
		}
		screen.ScreenRows[rowIdx] = rowDelta.RowData
	}
	return screen, nil
}

func resubscribe(m attachModel, reason string) (attachModel, tea.Cmd) {
	if m.streamCancel != nil {
		m.streamCancel()
		m.streamCancel = nil
	}
	m.streamID++
	m.frameID = 0
	if reason != "" {
		m.statusMsg = fmt.Sprintf("resync: %s", reason)
		m.statusUntil = time.Now().Add(2 * time.Second)
	}
	cmds := []tea.Cmd{startSubscribeCmd(m.client, m.session, m.streamID)}
	if m.viewportWidth > 0 && m.viewportHeight > 0 {
		cmds = append(cmds, resizeCmd(m.client, m.session, m.viewportWidth, m.viewportHeight))
	}
	return m, tea.Batch(cmds...)
}

func viewportSize(width, height int) (int, int) {
	cols := width - 2
	rows := height - 2
	if cols < 1 {
		cols = 1
	}
	if rows < 1 {
		rows = 1
	}
	return cols, rows
}

func renderScreen(screen *proto.GetScreenResponse, width, height int, now time.Time) string {
	if width <= 0 || height <= 0 {
		return ""
	}
	cursorX, cursorY := -1, -1
	if screen != nil {
		cursorX = int(screen.CursorX)
		cursorY = int(screen.CursorY)
	}
	cursorOn := true
	lines := make([]string, height)
	for row := 0; row < height; row++ {
		var screenRow *proto.ScreenRow
		if screen != nil && row < len(screen.ScreenRows) {
			screenRow = screen.ScreenRows[row]
		}
		lines[row] = renderRow(screenRow, width, row, cursorX, cursorY, cursorOn)
	}
	return strings.Join(lines, "\n")
}

func renderRow(row *proto.ScreenRow, width int, rowIdx, cursorX, cursorY int, cursorOn bool) string {
	if width <= 0 {
		return ""
	}
	if row == nil {
		var b strings.Builder
		b.Grow(width + 8)
		b.WriteString("\x1b[0m")
		for i := 0; i < width; i++ {
			b.WriteByte(' ')
		}
		b.WriteString("\x1b[0m")
		return b.String()
	}
	var b strings.Builder
	b.Grow(width * 4)
	b.WriteString("\x1b[0m")
	lastStyle := cellStyle{}
	styleSet := false
	for col := 0; col < width; col++ {
		cell := (*proto.ScreenCell)(nil)
		if col < len(row.Cells) {
			cell = row.Cells[col]
		}
		style, ch := styleFromCell(cell)
		if cursorOn && rowIdx == cursorY && col == cursorX {
			style = cursorStyle(style)
		}
		if !styleSet || style != lastStyle {
			writeStyleSGR(&b, style)
			lastStyle = style
			styleSet = true
		}
		b.WriteString(ch)
	}
	b.WriteString("\x1b[0m")
	return b.String()
}

func styleFromCell(cell *proto.ScreenCell) (cellStyle, string) {
	ch := " "
	if cell == nil {
		return cellStyle{}, ch
	}
	if cell.Char != "" {
		ch = cell.Char
	}
	attrs := cell.Attributes &^ attrInverse
	fgSet := cell.FgColor != 0
	bgSet := cell.BgColor != 0
	return cellStyle{
		fg:    cell.FgColor,
		bg:    cell.BgColor,
		fgSet: fgSet,
		bgSet: bgSet,
		attrs: attrs,
	}, ch
}

func cursorStyle(style cellStyle) cellStyle {
	style.attrs &^= attrBlink
	if style.fgSet || style.bgSet {
		style.fg, style.bg = style.bg, style.fg
		style.fgSet = true
		style.bgSet = true
		return style
	}
	style.attrs |= attrInverse
	return style
}

func writeStyleSGR(b *strings.Builder, style cellStyle) {
	b.WriteString("\x1b[0")
	first := false
	attrs := style.attrs
	if attrs&attrBold != 0 {
		writeSGRInt(b, &first, 1)
	}
	if attrs&attrFaint != 0 {
		writeSGRInt(b, &first, 2)
	}
	if attrs&attrItalic != 0 {
		writeSGRInt(b, &first, 3)
	}
	if attrs&attrUnderline != 0 {
		writeSGRInt(b, &first, 4)
	}
	if attrs&attrBlink != 0 {
		writeSGRInt(b, &first, 5)
	}
	if attrs&attrInverse != 0 {
		writeSGRInt(b, &first, 7)
	}
	if attrs&attrInvisible != 0 {
		writeSGRInt(b, &first, 8)
	}
	if attrs&attrStrikethrough != 0 {
		writeSGRInt(b, &first, 9)
	}
	if attrs&attrOverline != 0 {
		writeSGRInt(b, &first, 53)
	}
	if style.fgSet {
		fgR, fgG, fgB := unpackRGB(style.fg)
		writeSGRInt(b, &first, 38)
		writeSGRInt(b, &first, 2)
		writeSGRInt(b, &first, fgR)
		writeSGRInt(b, &first, fgG)
		writeSGRInt(b, &first, fgB)
	}
	if style.bgSet {
		bgR, bgG, bgB := unpackRGB(style.bg)
		writeSGRInt(b, &first, 48)
		writeSGRInt(b, &first, 2)
		writeSGRInt(b, &first, bgR)
		writeSGRInt(b, &first, bgG)
		writeSGRInt(b, &first, bgB)
	}
	b.WriteByte('m')
}

func writeSGRInt(b *strings.Builder, first *bool, value int) {
	if *first {
		*first = false
	} else {
		b.WriteByte(';')
	}
	b.WriteString(strconv.Itoa(value))
}

func unpackRGB(value int32) (int, int, int) {
	v := uint32(value)
	return int((v >> 16) & 0xff), int((v >> 8) & 0xff), int(v & 0xff)
}

func renderSessionList(m attachModel) string {
	if m.viewportWidth <= 0 || m.viewportHeight <= 0 {
		return ""
	}
	view := m.sessionList.View()
	return lipgloss.Place(m.viewportWidth, m.viewportHeight, lipgloss.Left, lipgloss.Top, view)
}

func renderCreateModal(m attachModel) string {
	if m.viewportWidth <= 0 || m.viewportHeight <= 0 {
		return ""
	}
	coordName := m.coordinator.Name
	if m.createCoordIdx >= 0 && m.createCoordIdx < len(m.coords) {
		coordName = m.coords[m.createCoordIdx].Name
	}
	focus := "name"
	if !m.createFocusInput {
		focus = "coordinator"
	}
	lines := []string{
		"Create session",
		"",
		m.createInput.View(),
		fmt.Sprintf("Coordinator: %s", coordName),
		fmt.Sprintf("Focus: %s", focus),
		"Tab switches field; j/k changes coordinator",
		"Enter to create, Esc to cancel",
	}
	content := strings.Join(lines, "\n")
	box := attachModalStyle.Render(content)
	return lipgloss.Place(m.viewportWidth, m.viewportHeight, lipgloss.Center, lipgloss.Center, box)
}

func coordinatorIndex(coords []coordinatorRef, target coordinatorRef) int {
	for i, coord := range coords {
		if coord.Path == target.Path {
			return i
		}
	}
	return -1
}

func ensureCoordinator(coords []coordinatorRef, target coordinatorRef) []coordinatorRef {
	if coordinatorIndex(coords, target) >= 0 {
		return coords
	}
	return append(coords, target)
}

func clampViewHeight(view string, height int) string {
	if height <= 0 || view == "" {
		return view
	}
	view = strings.TrimRight(view, "\n")
	lines := strings.Split(view, "\n")
	if len(lines) <= height {
		return view
	}
	return strings.Join(lines[:height], "\n")
}

type headerView struct {
	sessions []sessionListItem
	active   string
	width    int
	exited   bool
	exitCode int32
	hoverTab string
	hoverNew bool
}
type footerView struct {
	width       int
	leader      bool
	statusMsg   string
	exited      bool
	coordinator string
	active      sessionListItem
}

type legendSegment struct {
	key   string
	label string
}

var leaderLegend = []legendSegment{
	{key: "w", label: "LIST"},
	{key: "j/l", label: "NEXT"},
	{key: "k/h", label: "PREV"},
	{key: "c", label: "CREATE"},
	{key: "e", label: "CLOSED"},
	{key: "d", label: "DETACH"},
	{key: "x", label: "KILL"},
	{key: "Ctrl+b", label: "SEND"},
}

const (
	sessionIconActive  = "*"
	sessionIconIdle    = "o"
	sessionIconExited  = "x"
	sessionIconUnknown = "?"
	tabOverflowGlyph   = "…"
	tabNewGlyph        = "+"
	tabNameMaxWidth    = 20
)

const borderOverlayOffset = 1

func overlayPadding(innerWidth int) (int, int) {
	if innerWidth < 0 {
		innerWidth = 0
	}
	leftPad := borderOverlayOffset
	rightPad := borderOverlayOffset
	if leftPad+rightPad > innerWidth {
		leftPad = 0
		rightPad = 0
	}
	return leftPad, rightPad
}

func overlayAvailableWidth(innerWidth int) int {
	leftPad, rightPad := overlayPadding(innerWidth)
	return innerWidth - leftPad - rightPad
}

func renderHeaderSegments(view headerView) (string, string) {
	if view.width <= 0 {
		return "", ""
	}
	return renderTabBar(view), ""
}

func renderFooterSegments(view footerView) (string, string) {
	if view.width <= 0 {
		return "", ""
	}
	leftSegments := make([]string, 0, 3)
	if view.coordinator != "" {
		leftSegments = append(leftSegments, attachFooterTagStyle.Render(" "+view.coordinator+" "))
	}
	if view.active.name != "" {
		state := sessionStateLabel(view.active)
		if state != "" {
			leftSegments = append(leftSegments, attachFooterTagStyle.Render(" "+state+" "))
		}
	}
	if view.statusMsg != "" {
		leftSegments = append(leftSegments, attachStatusStyle.Render(" "+view.statusMsg+" "))
	}
	left := strings.Join(leftSegments, " ")

	right := ""
	switch {
	case view.leader:
		right = renderLeaderLegend()
	case view.exited:
		right = renderExitHints()
	case view.statusMsg == "":
		right = renderLeaderHint()
	}
	if right != "" {
		right = " " + right + " "
	}
	return left, right
}

func renderLeaderHint() string {
	return renderLegendSegment("Ctrl+b", "LEADER")
}

func renderLeaderLegend() string {
	segments := make([]string, 0, len(leaderLegend))
	for _, hint := range leaderLegend {
		segments = append(segments, renderLegendSegment(hint.key, hint.label))
	}
	return joinLegendSegments(segments)
}

func renderExitHints() string {
	segments := []string{
		renderLegendSegment("q", "QUIT"),
		renderLegendSegment("Ctrl+b", "LEADER"),
	}
	return joinLegendSegments(segments)
}

func sessionStatusGlyph(item sessionListItem) string {
	switch item.status {
	case proto.SessionStatus_SESSION_STATUS_RUNNING:
		if item.idle {
			return sessionIconIdle
		}
		return sessionIconActive
	case proto.SessionStatus_SESSION_STATUS_EXITED:
		return sessionIconExited
	default:
		return sessionIconUnknown
	}
}

func sessionStatusStyle(item sessionListItem) lipgloss.Style {
	switch item.status {
	case proto.SessionStatus_SESSION_STATUS_RUNNING:
		if item.idle {
			return attachStatusIdleStyle
		}
		return attachStatusActiveStyle
	case proto.SessionStatus_SESSION_STATUS_EXITED:
		return attachStatusExitedStyle
	default:
		return attachStatusUnknownStyle
	}
}

func renderSessionStatusIcon(item sessionListItem) string {
	return sessionStatusStyle(item).Render(sessionStatusGlyph(item))
}

func sessionStateLabel(item sessionListItem) string {
	switch item.status {
	case proto.SessionStatus_SESSION_STATUS_RUNNING:
		if item.idle {
			return fmt.Sprintf("%s idle", renderSessionStatusIcon(item))
		}
		return fmt.Sprintf("%s active", renderSessionStatusIcon(item))
	case proto.SessionStatus_SESSION_STATUS_EXITED:
		if item.exitCode != 0 {
			return fmt.Sprintf("%s exited (%d)", renderSessionStatusIcon(item), item.exitCode)
		}
		return fmt.Sprintf("%s exited", renderSessionStatusIcon(item))
	default:
		return fmt.Sprintf("%s unknown", renderSessionStatusIcon(item))
	}
}

func renderLegendSegment(key, label string) string {
	displayKey := strings.TrimSpace(key)
	if strings.HasPrefix(strings.ToLower(displayKey), "ctrl+") {
		displayKey = "Ctrl+" + strings.TrimSpace(displayKey[len("ctrl+"):])
	}
	return fmt.Sprintf("%s %s", attachHintKeyStyle.Render(displayKey), label)
}

func joinLegendSegments(segments []string) string {
	sep := attachHintChevronStyle.Render(">")
	return strings.Join(segments, " "+sep+" ")
}

func stripCoordinatorPrefix(name string) string {
	if idx := strings.LastIndex(name, ":"); idx >= 0 && idx < len(name)-1 {
		return name[idx+1:]
	}
	return name
}
func truncateTabName(name string, max int) string {
	if max <= 0 {
		return ""
	}
	if lipgloss.Width(name) <= max {
		return name
	}
	if max == 1 {
		return tabOverflowGlyph
	}
	return ansi.Truncate(name, max, tabOverflowGlyph)
}

type tabItem struct {
	name     string
	label    string
	width    int
	active   bool
	hovered  bool
	newTab   bool
	overflow bool
}

func renderTabBar(view headerView) string {
	tabs := headerTabItems(view)
	if len(tabs) == 0 || view.width <= 0 {
		return ""
	}
	return joinTabItems(tabs, " ")
}

func renderNewTabLabel() string {
	return attachTabNewStyle.Render(tabNewGlyph)
}

func newTabButtonItem(hovered bool) tabItem {
	label := renderNewTabLabel()
	if hovered {
		label = attachTabNewHoverStyle.Render(tabNewGlyph)
	}
	return tabItem{
		label:   label,
		width:   lipgloss.Width(label),
		hovered: hovered,
		newTab:  true,
	}
}
func headerTabItems(view headerView) []tabItem {
	if view.width <= 0 {
		return nil
	}
	plus := newTabButtonItem(view.hoverNew)
	if plus.width <= 0 {
		return visibleTabs(view)
	}
	if view.width <= plus.width {
		return []tabItem{plus}
	}
	gapWidth := lipgloss.Width(" ")
	available := view.width - plus.width
	if available <= gapWidth {
		return []tabItem{plus}
	}
	sessionWidth := available - gapWidth
	sessionTabs := visibleTabsWithWidth(view, sessionWidth)
	if len(sessionTabs) == 0 {
		return []tabItem{plus}
	}
	return append(sessionTabs, plus)
}
func collectTabSessions(items []sessionListItem, active string, exited bool, exitCode int32) []sessionListItem {
	if active == "" && len(items) == 0 {
		return nil
	}
	out := append([]sessionListItem(nil), items...)
	found := false
	for i := range out {
		if out[i].name == active {
			found = true
			if exited {
				out[i].status = proto.SessionStatus_SESSION_STATUS_EXITED
				out[i].exitCode = exitCode
			}
			break
		}
	}
	if !found && active != "" {
		status := proto.SessionStatus_SESSION_STATUS_RUNNING
		if exited {
			status = proto.SessionStatus_SESSION_STATUS_EXITED
		}
		out = append(out, sessionListItem{name: active, status: status, exitCode: exitCode})
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].name < out[j].name
	})
	return out
}

func renderTabLabel(item sessionListItem, active, hovered bool) string {
	name := stripCoordinatorPrefix(item.name)
	name = truncateTabName(name, tabNameMaxWidth)
	tabStyle := attachTabStyle
	if active {
		tabStyle = attachTabActiveStyle
	} else if hovered {
		tabStyle = attachTabHoverStyle
	}
	tabStyle = tabStyle.UnsetPadding()
	textStyle := attachTabTextStyle
	if active {
		textStyle = attachTabTextActiveStyle
	} else if hovered {
		textStyle = attachTabTextHoverStyle
	} else if item.status == proto.SessionStatus_SESSION_STATUS_EXITED {
		textStyle = attachTabTextExitedStyle
	}
	textStyle = textStyle.Inherit(tabStyle)
	statusStyle := sessionStatusStyle(item).Inherit(tabStyle)
	padStyle := tabStyle

	var b strings.Builder
	b.WriteString(padStyle.Render(" "))
	b.WriteString(statusStyle.Render(sessionStatusGlyph(item)))
	b.WriteString(padStyle.Render(" "))
	b.WriteString(textStyle.Render(name))
	b.WriteString(padStyle.Render(" "))
	return b.String()
}
func buildTabItems(view headerView) ([]tabItem, int) {
	sessions := collectTabSessions(view.sessions, view.active, view.exited, view.exitCode)
	if len(sessions) == 0 || view.width <= 0 {
		return nil, 0
	}
	tabs := make([]tabItem, 0, len(sessions))
	activeIdx := 0
	for i, session := range sessions {
		active := session.name == view.active
		if active {
			activeIdx = i
		}
		label := renderTabLabel(session, active, session.name == view.hoverTab)
		tabs = append(tabs, tabItem{
			name:   session.name,
			label:  label,
			width:  lipgloss.Width(label),
			active: active,
		})
	}
	return tabs, activeIdx
}

func visibleTabs(view headerView) []tabItem {
	return visibleTabsWithWidth(view, view.width)
}

func visibleTabsWithWidth(view headerView, width int) []tabItem {
	tabs, activeIdx := buildTabItems(view)
	if len(tabs) == 0 || width <= 0 {
		return nil
	}
	return fitTabsToWidthItems(tabs, activeIdx, width)
}
func tabAtOffsetX(view headerView, offset int) (tabItem, bool) {
	if offset < 0 {
		return tabItem{}, false
	}
	tabs := headerTabItems(view)
	if len(tabs) == 0 {
		return tabItem{}, false
	}
	gapWidth := lipgloss.Width(" ")
	cursor := 0
	for i, tab := range tabs {
		if offset >= cursor && offset < cursor+tab.width {
			if tab.overflow {
				return tabItem{}, false
			}
			if tab.newTab {
				return tab, true
			}
			if tab.name == "" {
				return tabItem{}, false
			}
			return tab, true
		}
		cursor += tab.width
		if i < len(tabs)-1 {
			cursor += gapWidth
		}
	}
	return tabItem{}, false
}

func fitTabsToWidth(tabs []tabItem, activeIdx, width int) string {
	return joinTabItems(fitTabsToWidthItems(tabs, activeIdx, width), " ")
}

func overflowLabel(count int, left bool) string {
	if count <= 0 {
		return ""
	}
	if left {
		return fmt.Sprintf("%s%d", tabOverflowGlyph, count)
	}
	return fmt.Sprintf("%d%s", count, tabOverflowGlyph)
}

func overflowTabItem(count int, left bool) tabItem {
	label := attachOverflowStyle.Render(overflowLabel(count, left))
	return tabItem{
		label:    label,
		width:    lipgloss.Width(label),
		overflow: true,
	}
}

func fitTabsToWidthItems(tabs []tabItem, activeIdx, width int) []tabItem {
	if len(tabs) == 0 || width <= 0 {
		return nil
	}
	gapWidth := lipgloss.Width(" ")
	if tabItemsWidth(tabs, gapWidth) <= width {
		return tabs
	}
	if activeIdx < 0 || activeIdx >= len(tabs) {
		activeIdx = 0
	}
	selected := []tabItem{tabs[activeIdx]}
	leftIndex := activeIdx
	rightIndex := activeIdx
	left := activeIdx - 1
	right := activeIdx + 1
	for {
		added := false
		if left >= 0 {
			candidate := append([]tabItem{tabs[left]}, selected...)
			if tabItemsWidth(candidate, gapWidth) <= width {
				selected = candidate
				leftIndex = left
				left--
				added = true
			}
		}
		if right < len(tabs) {
			candidate := append(append([]tabItem(nil), selected...), tabs[right])
			if tabItemsWidth(candidate, gapWidth) <= width {
				selected = candidate
				rightIndex = right
				right++
				added = true
			}
		}
		if !added {
			break
		}
	}
	leftHidden := leftIndex
	rightHidden := len(tabs) - 1 - rightIndex
	candidateWidth := func(leftHidden, rightHidden int) int {
		candidate := make([]tabItem, 0, len(selected)+2)
		if leftHidden > 0 {
			candidate = append(candidate, overflowTabItem(leftHidden, true))
		}
		candidate = append(candidate, selected...)
		if rightHidden > 0 {
			candidate = append(candidate, overflowTabItem(rightHidden, false))
		}
		return tabItemsWidth(candidate, gapWidth)
	}
	if leftHidden > 0 {
		for candidateWidth(leftHidden, rightHidden) > width && len(selected) > 1 {
			selected = selected[1:]
			leftIndex++
			leftHidden++
		}
	}
	if rightHidden > 0 {
		for candidateWidth(leftHidden, rightHidden) > width && len(selected) > 1 {
			selected = selected[:len(selected)-1]
			rightIndex--
			rightHidden++
		}
	}
	out := make([]tabItem, 0, len(selected)+2)
	if leftHidden > 0 {
		out = append(out, overflowTabItem(leftHidden, true))
	}
	out = append(out, selected...)
	if rightHidden > 0 {
		out = append(out, overflowTabItem(rightHidden, false))
	}
	return out
}
func tabItemsWidth(tabs []tabItem, gapWidth int) int {
	if len(tabs) == 0 {
		return 0
	}
	total := gapWidth * (len(tabs) - 1)
	for _, tab := range tabs {
		total += tab.width
	}
	return total
}

func joinTabItems(tabs []tabItem, gap string) string {
	if len(tabs) == 0 {
		return ""
	}
	var b strings.Builder
	for i, tab := range tabs {
		if i > 0 {
			b.WriteString(gap)
		}
		b.WriteString(tab.label)
	}
	return b.String()
}

func renderBorderOverlay(content string, width, height int, borderStyle lipgloss.Style, headerLeft, headerRight, footerLeft, footerRight string) string {
	if width <= 0 || height <= 0 {
		return ""
	}
	innerWidth := width - 2
	innerHeight := height - 2
	if innerWidth < 0 {
		innerWidth = 0
	}
	if innerHeight < 0 {
		innerHeight = 0
	}
	content = lipgloss.Place(innerWidth, innerHeight, lipgloss.Left, lipgloss.Top, content)
	bodyLines := strings.Split(content, "\n")

	border := borderStyle.GetBorderStyle()
	topStyle := borderEdgeStyle(borderStyle.GetBorderTopForeground(), borderStyle.GetBorderTopBackground())
	bottomStyle := borderEdgeStyle(borderStyle.GetBorderBottomForeground(), borderStyle.GetBorderBottomBackground())
	leftStyle := borderEdgeStyle(borderStyle.GetBorderLeftForeground(), borderStyle.GetBorderLeftBackground())
	rightStyle := borderEdgeStyle(borderStyle.GetBorderRightForeground(), borderStyle.GetBorderRightBackground())

	topLine := renderOverlayLine(innerWidth, border.TopLeft, border.TopRight, border.Top, topStyle, headerLeft, headerRight, borderOverlayOffset)
	bottomLine := renderOverlayLine(innerWidth, border.BottomLeft, border.BottomRight, border.Bottom, bottomStyle, footerLeft, footerRight, borderOverlayOffset)
	leftBorder := leftStyle.Render(border.Left)
	rightBorder := rightStyle.Render(border.Right)

	lines := make([]string, 0, innerHeight+2)
	lines = append(lines, topLine)
	for i := 0; i < innerHeight; i++ {
		line := ""
		if i < len(bodyLines) {
			line = bodyLines[i]
		}
		line = padRight(line, innerWidth)
		lines = append(lines, leftBorder+line+rightBorder)
	}
	lines = append(lines, bottomLine)
	return strings.Join(lines, "\n")
}

func renderOverlayLine(innerWidth int, leftCorner, rightCorner, fill string, fillStyle lipgloss.Style, leftText, rightText string, offset int) string {
	if innerWidth < 0 {
		innerWidth = 0
	}
	if offset < 0 {
		offset = 0
	}
	leftPad := offset
	rightPad := offset
	if leftPad+rightPad > innerWidth {
		leftPad = 0
		rightPad = 0
	}
	available := innerWidth - leftPad - rightPad
	leftText, rightText = fitOverlayText(leftText, rightText, available)
	leftWidth := lipgloss.Width(leftText)
	rightWidth := lipgloss.Width(rightText)
	middleFill := available - leftWidth - rightWidth
	if middleFill < 0 {
		middleFill = 0
	}
	return fillStyle.Render(leftCorner) +
		fillStyle.Render(strings.Repeat(fill, leftPad)) +
		leftText +
		fillStyle.Render(strings.Repeat(fill, middleFill)) +
		rightText +
		fillStyle.Render(strings.Repeat(fill, rightPad)) +
		fillStyle.Render(rightCorner)
}

func fitOverlayText(leftText, rightText string, width int) (string, string) {
	if width <= 0 {
		return "", ""
	}
	rightWidth := lipgloss.Width(rightText)
	if rightWidth > width {
		return "", truncateToWidth(rightText, width)
	}
	leftWidth := lipgloss.Width(leftText)
	if leftWidth+rightWidth > width {
		leftText = truncateToWidth(leftText, width-rightWidth)
	}
	return leftText, rightText
}

func borderEdgeStyle(fg, bg lipgloss.TerminalColor) lipgloss.Style {
	style := lipgloss.NewStyle()
	if fg != nil {
		style = style.Foreground(fg)
	}
	if bg != nil {
		style = style.Background(bg)
	}
	return style
}

func padRight(value string, width int) string {
	if width <= 0 {
		return ""
	}
	if gap := width - lipgloss.Width(value); gap > 0 {
		return value + strings.Repeat(" ", gap)
	}
	return truncateToWidth(value, width)
}

func truncateToWidth(value string, width int) string {
	if width <= 0 {
		return ""
	}
	return ansi.Truncate(value, width, "")
}
