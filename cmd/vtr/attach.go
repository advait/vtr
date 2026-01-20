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
	listActive       bool
	createActive     bool
	createInput      textinput.Model
	createCoordIdx   int
	createFocusInput bool

	leaderActive bool
	exited       bool
	exitCode     int32
	statusMsg    string
	statusUntil  time.Time

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
	items []list.Item
	err   error
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
}

func (s sessionListItem) Title() string {
	return s.name
}

func (s sessionListItem) Description() string {
	switch s.status {
	case proto.SessionStatus_SESSION_STATUS_EXITED:
		return fmt.Sprintf("exited (%d)", s.exitCode)
	case proto.SessionStatus_SESSION_STATUS_RUNNING:
		return "running"
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
	attachModalStyle = lipgloss.NewStyle().
				Border(lipgloss.NormalBorder()).
				BorderForeground(lipgloss.Color("240")).
				Padding(1, 2)
)

func newAttachCmd() *cobra.Command {
	var socket string
	cmd := &cobra.Command{
		Use:   "attach <name>",
		Short: "Attach to a session",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, _, _, err := loadConfigAndOutput(false)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), resolveTimeout)
			target, err := resolveSessionTarget(ctx, coordinatorsOrDefault(coords), socket, args[0])
			cancel()
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
			}

			prog := tea.NewProgram(model, tea.WithAltScreen())
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
	return tea.Batch(startSubscribeCmd(m.client, m.session, m.streamID), tickCmd())
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
		if exited := msg.event.GetSessionExited(); exited != nil {
			m.exited = true
			m.exitCode = exited.ExitCode
			m.leaderActive = false
			if m.streamCancel != nil {
				m.streamCancel()
				m.streamCancel = nil
			}
			return m, nil
		}
		return m, waitSubscribeCmd(m.stream, m.streamID)
	case tickMsg:
		m.now = time.Time(msg)
		if m.statusMsg != "" && !m.statusUntil.IsZero() && m.now.After(m.statusUntil) {
			m.statusMsg = ""
			m.statusUntil = time.Time{}
		}
		return m, tickCmd()
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.viewportWidth, m.viewportHeight = viewportSize(msg.Width, msg.Height)
		if m.viewportWidth > 0 && m.viewportHeight > 0 {
			m.sessionList.SetSize(m.viewportWidth, m.viewportHeight)
		}
		if m.viewportWidth > 0 && m.viewportHeight > 0 {
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
			m.listActive = false
			m.statusMsg = fmt.Sprintf("list: %v", msg.err)
			m.statusUntil = time.Now().Add(2 * time.Second)
			return m, nil
		}
		m.sessionList = newSessionListModel(msg.items, m.viewportWidth, m.viewportHeight)
		m.listActive = true
		return m, nil
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
	case tea.KeyMsg:
		if m.exited {
			switch msg.String() {
			case "q", "enter":
				return m, tea.Quit
			}
			return m, nil
		}
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
		session:     m.session,
		coordinator: m.coordinator.Name,
		width:       innerWidth,
		exited:      m.exited,
		exitCode:    m.exitCode,
	})
	footerLeft, footerRight := renderFooterSegments(footerView{
		width:     innerWidth,
		leader:    m.leaderActive,
		statusMsg: m.statusMsg,
		exited:    m.exited,
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

func nextSessionCmd(client proto.VTRClient, current string, forward bool) tea.Cmd {
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

func loadSessionListCmd(client proto.VTRClient) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		resp, err := client.List(ctx, &proto.ListRequest{})
		if err != nil {
			return sessionListMsg{err: err}
		}
		sessions := resp.Sessions
		sort.Slice(sessions, func(i, j int) bool {
			if sessions[i] == nil || sessions[j] == nil {
				return sessions[i] != nil
			}
			return sessions[i].Name < sessions[j].Name
		})
		items := make([]list.Item, 0, len(sessions))
		for _, session := range sessions {
			if session == nil || session.Name == "" {
				continue
			}
			items = append(items, sessionListItem{
				name:     session.Name,
				status:   session.Status,
				exitCode: session.ExitCode,
			})
		}
		return sessionListMsg{items: items}
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
	switch key {
	case "ctrl+b":
		return m, sendKeyCmd(m.client, m.session, "ctrl+b")
	case "d":
		return m, tea.Quit
	case "k":
		m.statusMsg = "kill sent"
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, killCmd(m.client, m.session)
	case "n":
		return m, nextSessionCmd(m.client, m.session, true)
	case "p":
		return m, nextSessionCmd(m.client, m.session, false)
	case "c":
		return beginCreateModal(m)
	case "w":
		m.listActive = true
		return m, loadSessionListCmd(m.client)
	default:
		m.statusMsg = fmt.Sprintf("unknown leader key: %s", key)
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, nil
	}
}

func handleInputKey(m attachModel, msg tea.KeyMsg) (attachModel, tea.Cmd) {
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
	cmds := []tea.Cmd{startSubscribeCmd(m.client, m.session, m.streamID)}
	if m.viewportWidth > 0 && m.viewportHeight > 0 {
		cmds = append(cmds, resizeCmd(m.client, m.session, m.viewportWidth, m.viewportHeight))
	}
	return m, tea.Batch(cmds...)
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
	session     string
	coordinator string
	width       int
	exited      bool
	exitCode    int32
}

type footerView struct {
	width     int
	leader    bool
	statusMsg string
	exited    bool
}

type leaderHint struct {
	key   string
	label string
}

var leaderHints = []leaderHint{
	{key: "w", label: "list"},
	{key: "n", label: "next"},
	{key: "p", label: "prev"},
	{key: "c", label: "create"},
	{key: "d", label: "detach"},
	{key: "k", label: "kill"},
	{key: "Ctrl+b", label: "send"},
}

const borderOverlayOffset = 1

func renderHeaderSegments(view headerView) (string, string) {
	if view.width <= 0 {
		return "", ""
	}
	left := ""
	switch {
	case view.coordinator != "" && view.session != "":
		left = fmt.Sprintf("%s:%s", view.coordinator, view.session)
	case view.coordinator != "":
		left = view.coordinator
	case view.session != "":
		left = view.session
	}
	if view.exited {
		if left != "" {
			left = fmt.Sprintf("EXITED %d | %s", view.exitCode, left)
		} else {
			left = fmt.Sprintf("EXITED %d", view.exitCode)
		}
	}
	right := fmt.Sprintf("vtr %s", Version)
	if left != "" {
		left = attachHeaderStyle.Render(" " + left + " ")
	}
	if right != "" {
		right = attachHeaderStyle.Render(" " + right + " ")
	}
	return left, right
}

func renderFooterSegments(view footerView) (string, string) {
	if view.width <= 0 {
		return "", ""
	}
	left := ""
	if view.statusMsg != "" {
		left = attachStatusStyle.Render(" " + view.statusMsg + " ")
	}
	right := ""
	switch {
	case view.exited:
		right = renderExitHints()
	case view.statusMsg == "":
		right = renderLeaderHints(view.leader)
	}
	if right != "" {
		right = " " + right + " "
	}
	return left, right
}

func renderLeaderHints(active bool) string {
	if !active {
		return renderHintSegment("Ctrl+b", "leader")
	}
	segments := make([]string, 0, len(leaderHints))
	for _, hint := range leaderHints {
		segments = append(segments, renderHintSegment(hint.key, hint.label))
	}
	return strings.Join(segments, "  ")
}

func renderExitHints() string {
	segments := []string{
		renderHintSegment("q", "quit"),
		renderHintSegment("enter", "quit"),
	}
	return strings.Join(segments, "  ")
}

func renderHintSegment(key, label string) string {
	return fmt.Sprintf("%s %s %s", attachHintKeyStyle.Render(key), attachHintChevronStyle.Render(">"), label)
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
