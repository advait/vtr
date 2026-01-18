package main

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	proto "github.com/advait/vtrpc/proto"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
)

type attachModel struct {
	client       proto.VTRClient
	coordinator  coordinatorRef
	session      string
	stream       proto.VTR_SubscribeClient
	streamCancel context.CancelFunc
	streamID     int

	width          int
	height         int
	viewportWidth  int
	viewportHeight int
	screen         *proto.GetScreenResponse

	leaderActive bool
	exited       bool
	exitCode     int32
	statusMsg    string
	statusUntil  time.Time

	now time.Time
	err error
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

var (
	attachBorderStyle = lipgloss.NewStyle().
				Border(lipgloss.NormalBorder()).
				BorderForeground(lipgloss.Color("240"))
	attachExitedBorderStyle = lipgloss.NewStyle().
				Border(lipgloss.NormalBorder()).
				BorderForeground(lipgloss.Color("1"))
	attachStatusStyle = lipgloss.NewStyle().
				Background(lipgloss.Color("236")).
				Foreground(lipgloss.Color("252"))
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

			conn, err := dialClient(context.Background(), target.Coordinator.Path)
			if err != nil {
				return err
			}
			defer conn.Close()

			model := attachModel{
				client:      proto.NewVTRClient(conn),
				coordinator: target.Coordinator,
				session:     target.Session,
				streamID:    1,
				now:         time.Now(),
			}

			prog := tea.NewProgram(model, tea.WithAltScreen())
			finalModel, err := prog.Run()
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
			m.screen = update.Screen
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
		m.exited = false
		m.exitCode = 0
		m.statusMsg = fmt.Sprintf("attached to %s", msg.name)
		m.statusUntil = time.Now().Add(2 * time.Second)
		cmds := []tea.Cmd{startSubscribeCmd(m.client, m.session, m.streamID)}
		if m.viewportWidth > 0 && m.viewportHeight > 0 {
			cmds = append(cmds, resizeCmd(m.client, m.session, m.viewportWidth, m.viewportHeight))
		}
		return m, tea.Batch(cmds...)
	case tea.KeyMsg:
		if m.exited {
			switch msg.String() {
			case "q", "enter":
				return m, tea.Quit
			}
			return m, nil
		}
		if m.leaderActive {
			m.leaderActive = false
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
	content := renderScreen(m.screen, m.viewportWidth, m.viewportHeight)
	border := attachBorderStyle
	if m.exited {
		border = attachExitedBorderStyle
	}
	box := border.Width(m.viewportWidth).Height(m.viewportHeight).Render(content)
	status := attachStatusStyle.Width(m.width).Render(renderStatusBar(statusView{
		session:     m.session,
		coordinator: m.coordinator.Name,
		now:         m.now,
		width:       m.width,
		leader:      m.leaderActive,
		statusMsg:   m.statusMsg,
		exited:      m.exited,
		exitCode:    m.exitCode,
	}))
	return lipgloss.JoinVertical(lipgloss.Top, box, status)
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
		m.statusMsg = "create: not ready"
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, nil
	case "w":
		m.statusMsg = "picker: not ready"
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, nil
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

func viewportSize(width, height int) (int, int) {
	cols := width - 2
	rows := height - 3
	if cols < 1 {
		cols = 1
	}
	if rows < 1 {
		rows = 1
	}
	return cols, rows
}

func renderScreen(screen *proto.GetScreenResponse, width, height int) string {
	if width <= 0 || height <= 0 {
		return ""
	}
	lines := make([]string, height)
	for row := 0; row < height; row++ {
		var screenRow *proto.ScreenRow
		if screen != nil && row < len(screen.ScreenRows) {
			screenRow = screen.ScreenRows[row]
		}
		lines[row] = renderRow(screenRow, width)
	}
	return strings.Join(lines, "\n")
}

func renderRow(row *proto.ScreenRow, width int) string {
	if width <= 0 {
		return ""
	}
	var b strings.Builder
	b.Grow(width)
	if row == nil {
		for i := 0; i < width; i++ {
			b.WriteByte(' ')
		}
		return b.String()
	}
	for col := 0; col < width; col++ {
		if col < len(row.Cells) && row.Cells[col] != nil && row.Cells[col].Char != "" {
			b.WriteString(row.Cells[col].Char)
			continue
		}
		b.WriteByte(' ')
	}
	return b.String()
}

type statusView struct {
	session     string
	coordinator string
	now         time.Time
	width       int
	leader      bool
	statusMsg   string
	exited      bool
	exitCode    int32
}

func renderStatusBar(view statusView) string {
	if view.width <= 0 {
		return ""
	}
	left := fmt.Sprintf("%s | %s", view.session, view.coordinator)
	if view.leader {
		left += " | LEADER"
	}
	if view.statusMsg != "" {
		left = view.statusMsg
	}
	right := view.now.Format("15:04:05")
	if view.exited {
		right = fmt.Sprintf("EXITED %d | %s", view.exitCode, right)
	}
	left = strings.TrimSpace(left)
	if left == "" {
		left = " "
	}
	leftWidth := len(left)
	rightWidth := len(right)
	if leftWidth+rightWidth+1 > view.width {
		if rightWidth >= view.width {
			return truncateToWidth(right, view.width)
		}
		left = truncateToWidth(left, view.width-rightWidth-1)
		return left + " " + right
	}
	padding := view.width - leftWidth - rightWidth
	if padding < 1 {
		padding = 1
	}
	return left + strings.Repeat(" ", padding) + right
}

func truncateToWidth(value string, width int) string {
	if width <= 0 {
		return ""
	}
	if len(value) <= width {
		return value
	}
	return value[:width]
}
