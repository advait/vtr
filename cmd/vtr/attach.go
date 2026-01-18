package main

import (
	"context"
	"fmt"
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

	width         int
	height        int
	viewportWidth int
	viewportHeight int
	screen        *proto.GetScreenResponse

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

type resizeErrMsg struct {
	err error
}

var (
	attachBorderStyle = lipgloss.NewStyle().
				Border(lipgloss.NormalBorder()).
				BorderForeground(lipgloss.Color("240"))
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
			return m, nil
		}
		return m, waitSubscribeCmd(m.stream, m.streamID)
	case tickMsg:
		m.now = time.Time(msg)
		return m, tickCmd()
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.viewportWidth, m.viewportHeight = viewportSize(msg.Width, msg.Height)
		if m.viewportWidth > 0 && m.viewportHeight > 0 {
			return m, resizeCmd(m.client, m.session, m.viewportWidth, m.viewportHeight)
		}
		return m, nil
	case resizeErrMsg:
		if msg.err != nil {
			m.err = msg.err
			return m, tea.Quit
		}
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		}
	}
	return m, nil
}

func (m attachModel) View() string {
	if m.width <= 0 || m.height <= 0 {
		return "loading..."
	}
	content := renderScreen(m.screen, m.viewportWidth, m.viewportHeight)
	box := attachBorderStyle.Width(m.viewportWidth).Height(m.viewportHeight).Render(content)
	status := attachStatusStyle.Width(m.width).Render(renderStatusBar(m.session, m.coordinator.Name, m.now, m.width))
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
			return resizeErrMsg{err: err}
		}
		return nil
	}
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

func renderStatusBar(session, coordinator string, now time.Time, width int) string {
	if width <= 0 {
		return ""
	}
	left := fmt.Sprintf("%s | %s", session, coordinator)
	right := now.Format("15:04:05")
	if len(left)+len(right) >= width {
		return padToWidth(left, width)
	}
	padding := width - len(left) - len(right)
	if padding < 1 {
		padding = 1
	}
	return left + strings.Repeat(" ", padding) + right
}

func padToWidth(value string, width int) string {
	if width <= 0 {
		return ""
	}
	if len(value) >= width {
		return value[:width]
	}
	return value + strings.Repeat(" ", width-len(value))
}
