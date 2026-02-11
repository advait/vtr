package main

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
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
	conn          *grpc.ClientConn
	client        proto.VTRClient
	hub           coordinatorRef
	coordinator   coordinatorRef
	coords        []coordinatorRef
	cfg           *clientConfig
	sessionID     string
	sessionLabel  string
	sessionCoord  string
	stream        proto.VTR_SubscribeClient
	streamCancel  context.CancelFunc
	streamID      int
	frameID       uint64
	streamBackoff time.Duration
	streamState   string
	lastScreenAt  time.Time

	sessionsStream       proto.VTR_SubscribeSessionsClient
	sessionsStreamCancel context.CancelFunc
	sessionsStreamID     int
	sessionsBackoff      time.Duration
	multiCoordinator     bool

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
	renameActive     bool
	renameInput      textinput.Model

	hoverTabID    string
	hoverNewCoord string

	leaderActive bool
	showExited   bool
	exited       bool
	exitCode     int32
	statusMsg    string
	statusUntil  time.Time

	profiler         *renderProfiler
	profileQuitAfter time.Duration

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

type subscribeRetryMsg struct {
	streamID int
}

type sessionsSubscribeStartMsg struct {
	stream   proto.VTR_SubscribeSessionsClient
	cancel   context.CancelFunc
	streamID int
	err      error
}

type sessionsSnapshotMsg struct {
	snapshot *proto.SessionsSnapshot
	streamID int
	err      error
}

type sessionsRetryMsg struct {
	streamID int
}

type tickMsg time.Time

type profileDoneMsg struct{}

type rpcErrMsg struct {
	err error
	op  string
}

type sessionSwitchMsg struct {
	id    string
	label string
	coord string
	err   error
}

type sessionListMsg struct {
	items    []list.Item
	sessions []sessionListItem
	activate bool
	err      error
}

type spawnSessionMsg struct {
	id    string
	label string
	coord coordinatorRef
	conn  *grpc.ClientConn
	err   error
}

type sessionListItem struct {
	id       string
	label    string
	coord    string
	status   proto.SessionStatus
	exitCode int32
	idle     bool
	order    uint32
}

func (s sessionListItem) Title() string {
	label := sessionDisplayLabel(s)
	return fmt.Sprintf("%s%s %s", sessionListIndent, renderSessionStatusIcon(s), label)
}

func (s sessionListItem) Description() string {
	prefix := sessionListIndent
	switch s.status {
	case proto.SessionStatus_SESSION_STATUS_EXITED:
		return fmt.Sprintf("%sexited (%d)", prefix, s.exitCode)
	case proto.SessionStatus_SESSION_STATUS_RUNNING:
		if s.idle {
			return prefix + "idle"
		}
		return prefix + "active"
	default:
		return prefix + "unknown"
	}
}

func (s sessionListItem) FilterValue() string {
	coord, label := splitCoordinatorPrefix(s.label, s.coord)
	if coord == "" {
		return label
	}
	return fmt.Sprintf("%s:%s %s", coord, label, label)
}

type sessionListHeader struct {
	name   string
	count  int
	filter string
}

func (s sessionListHeader) FilterValue() string {
	return s.filter
}

type sessionCreateItem struct {
	coord coordinatorRef
}

func (s sessionCreateItem) Title() string {
	return fmt.Sprintf("%s%s create session", sessionListIndent, attachListCreateStyle.Render(tabNewGlyph))
}

func (s sessionCreateItem) Description() string {
	return sessionListIndent + "press enter to create"
}

func (s sessionCreateItem) FilterValue() string {
	return fmt.Sprintf("%s create session new", s.coord.Name)
}

func sortSessionListItems(items []sessionListItem) {
	sort.Slice(items, func(i, j int) bool {
		left := items[i]
		right := items[j]
		if left.order == right.order {
			return left.label < right.label
		}
		if left.order == 0 {
			return false
		}
		if right.order == 0 {
			return true
		}
		return left.order < right.order
	})
}

func sortProtoSessions(sessions []*proto.Session) {
	sort.Slice(sessions, func(i, j int) bool {
		left := sessions[i]
		right := sessions[j]
		leftOrder := uint32(0)
		rightOrder := uint32(0)
		leftName := ""
		rightName := ""
		if left != nil {
			leftOrder = left.GetOrder()
			leftName = left.GetName()
		}
		if right != nil {
			rightOrder = right.GetOrder()
			rightName = right.GetName()
		}
		if leftOrder == rightOrder {
			return leftName < rightName
		}
		if leftOrder == 0 {
			return false
		}
		if rightOrder == 0 {
			return true
		}
		return leftOrder < rightOrder
	})
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
	attachCoordLabelStyle = attachTabBaseStyle.Copy().
				Background(lipgloss.Color("238")).
				Foreground(lipgloss.Color("229")).
				Bold(true)
	attachCoordLabelActiveStyle = attachCoordLabelStyle.Copy().
					Background(lipgloss.Color("240"))
	attachTabChipStyle = lipgloss.NewStyle().
				Background(lipgloss.Color("238")).
				Foreground(lipgloss.Color("250")).
				Padding(0, 1)
	attachTabChipActiveStyle = attachTabChipStyle.Copy().
					Background(lipgloss.Color("240")).
					Bold(true)
	attachTabChipHoverStyle = attachTabChipStyle.Copy().
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
	attachListHeaderStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("245")).
				Bold(true)
	attachListHeaderCountStyle = lipgloss.NewStyle().
					Foreground(lipgloss.Color("240"))
	attachListCreateStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("120")).
				Bold(true)
	attachOverflowStyle = attachTabBaseStyle.Copy().
				Foreground(lipgloss.Color("244"))
	attachModalStyle = lipgloss.NewStyle().
				Border(lipgloss.NormalBorder()).
				BorderForeground(lipgloss.Color("240")).
				Padding(1, 2)
)

const resolveTimeout = 5 * time.Second

var errNoSessions = errors.New("no sessions found")

func newTuiCmd() *cobra.Command {
	var hub string
	var profile bool
	var profileDump bool
	var profileDuration time.Duration
	cmd := &cobra.Command{
		Use:   "tui [name]",
		Short: "Attach to a session (TUI)",
		Args:  cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, _, err := loadConfigWithPath()
			if err != nil {
				return err
			}
			applyTuiStatusConfig(cfg)
			profileEnabled := profile || profileDump || profileDuration > 0
			targetCoord, err := resolveHubTarget(cfg, hub)
			if err != nil {
				return err
			}
			target := sessionTarget{}
			if len(args) == 0 {
				target, err = resolveFirstSessionTarget(context.Background(), targetCoord, cfg)
				if err != nil {
					if !errors.Is(err, errNoSessions) {
						return err
					}
					target = sessionTarget{}
				}
			} else {
				target.Label = args[0]
			}

			coords := initialCoordinatorRefs(cfg, targetCoord)
			activeCoord := coordinatorRef{}
			if coordName, _, ok := parseSessionRef(target.Label); ok {
				activeCoord = coordinatorRef{Name: coordName}
				coords = ensureCoordinator(coords, activeCoord)
			}
			coordIdx := 0

			conn, err := dialClient(context.Background(), targetCoord.Path, cfg)
			if err != nil {
				return err
			}
			client := proto.NewVTRClient(conn)
			if target.ID == "" && strings.TrimSpace(target.Label) != "" {
				resolved, err := ensureSessionExists(client, target.Label)
				if err != nil {
					_ = conn.Close()
					return err
				}
				target = resolved
			}
			if strings.TrimSpace(target.Coordinator.Name) != "" {
				activeCoord = target.Coordinator
				coords = ensureCoordinator(coords, activeCoord)
			}

			listActive := false
			if target.ID == "" && strings.TrimSpace(target.Label) == "" {
				listActive = true
			}

			var profiler *renderProfiler
			if profileEnabled {
				profiler = newRenderProfiler(true)
			}
			model := attachModel{
				conn:             conn,
				client:           client,
				hub:              targetCoord,
				coordinator:      activeCoord,
				coords:           coords,
				cfg:              cfg,
				sessionID:        target.ID,
				sessionLabel:     target.Label,
				sessionCoord:     activeCoord.Name,
				streamID:         1,
				streamBackoff:    time.Second,
				streamState:      "disconnected",
				sessionsStreamID: 1,
				sessionList:      newSessionListModel(nil, 0, 0),
				createInput:      newCreateInput(),
				renameInput:      newRenameInput(),
				createCoordIdx:   coordIdx,
				createFocusInput: true,
				listActive:       listActive,
				profiler:         profiler,
				profileQuitAfter: profileDuration,
				now:              time.Now(),
			}
			if strings.TrimSpace(model.sessionID) != "" || strings.TrimSpace(model.sessionLabel) != "" {
				model.streamState = "connecting"
			}

			prog := tea.NewProgram(model, tea.WithAltScreen(), tea.WithMouseAllMotion())
			finalModel, err := prog.Run()
			if profileDump && profiler != nil && err == nil {
				snapshot := profiler.Snapshot(time.Now())
				payload := map[string]any{
					"fps":            snapshot.FPS,
					"frames":         snapshot.Frames,
					"window_ms":      durationMs(snapshot.Window),
					"render_avg_ms":  durationMs(snapshot.RenderAvg),
					"render_min_ms":  durationMs(snapshot.RenderMin),
					"render_max_ms":  durationMs(snapshot.RenderMax),
					"render_last_ms": durationMs(snapshot.RenderLast),
				}
				enc := json.NewEncoder(cmd.OutOrStdout())
				if err := enc.Encode(payload); err != nil {
					return err
				}
			}
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
	cmd.Flags().BoolVar(&profile, "profile", false, "show render FPS/latency in the footer")
	cmd.Flags().BoolVar(&profileDump, "profile-dump", false, "print render profiling JSON on exit")
	cmd.Flags().DurationVar(&profileDuration, "profile-duration", 0, "auto-exit after duration when profiling")
	addHubFlag(cmd, &hub)
	return cmd
}

func initialCoordinatorRefs(cfg *clientConfig, target coordinatorRef) []coordinatorRef {
	return []coordinatorRef{target}
}

func resolveFirstSessionTarget(ctx context.Context, coord coordinatorRef, cfg *clientConfig) (sessionTarget, error) {
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
	firstID := ""
	firstLabel := ""
	firstCoord := ""
	err := withCoordinator(ctx, coord, cfg, func(client proto.VTRClient) error {
		snapshot, snapErr := fetchSessionsSnapshot(ctx, client)
		if snapErr == nil && snapshot != nil {
			items, _ := snapshotToItems(snapshot, coordinatorRef{})
			if len(items) > 0 {
				sort.Slice(items, func(i, j int) bool {
					left := items[i]
					right := items[j]
					leftName := ""
					rightName := ""
					leftOrder := uint32(0)
					rightOrder := uint32(0)
					if left.Session != nil {
						leftName = left.Session.Name
						leftOrder = left.Session.GetOrder()
					}
					if right.Session != nil {
						rightName = right.Session.Name
						rightOrder = right.Session.GetOrder()
					}
					if leftOrder == rightOrder {
						if leftName == rightName {
							return left.Coordinator < right.Coordinator
						}
						return leftName < rightName
					}
					if leftOrder == 0 {
						return false
					}
					if rightOrder == 0 {
						return true
					}
					return leftOrder < rightOrder
				})
				for _, item := range items {
					if item.Session == nil || item.Session.GetId() == "" {
						continue
					}
					firstID = item.Session.GetId()
					firstLabel = item.Session.GetName()
					firstCoord = item.Coordinator
					return nil
				}
			}
		}
		resp, err := client.List(ctx, &proto.ListRequest{})
		if err != nil {
			return err
		}
		sessions := resp.Sessions
		if len(sessions) == 0 {
			return nil
		}
		sortProtoSessions(sessions)
		for _, session := range sessions {
			if session == nil || session.GetId() == "" {
				continue
			}
			firstID = session.GetId()
			firstLabel = session.GetName()
			break
		}
		return nil
	})
	if err != nil {
		errs = append(errs, fmt.Sprintf("%s: %v", coord.Name, err))
	} else {
		hadSuccess = true
	}
	if firstID != "" {
		resolvedCoord := coordinatorRef{}
		if strings.TrimSpace(firstCoord) != "" {
			resolvedCoord = coordinatorRef{Name: firstCoord}
		} else if parsedCoord, _, ok := parseSessionRef(firstLabel); ok {
			resolvedCoord = coordinatorRef{Name: parsedCoord}
		}
		return sessionTarget{Coordinator: resolvedCoord, ID: firstID, Label: firstLabel}, nil
	}
	if !hadSuccess && len(errs) > 0 {
		return sessionTarget{}, fmt.Errorf("unable to list sessions: %s", strings.Join(errs, "; "))
	}
	if len(errs) > 0 && hadSuccess {
		return sessionTarget{}, fmt.Errorf("%w (errors: %s)", errNoSessions, strings.Join(errs, "; "))
	}
	return sessionTarget{}, errNoSessions
}

func ensureSessionExists(client proto.VTRClient, ref string) (sessionTarget, error) {
	ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
	defer cancel()
	snapshot, snapErr := fetchSessionsSnapshot(ctx, client)
	if snapErr == nil && snapshot != nil {
		items, _ := snapshotToItems(snapshot, coordinatorRef{})
		id, label, coord, err := matchSessionRefWithCoordinator(ref, items)
		if err == nil {
			return sessionTarget{Coordinator: coordinatorRef{Name: coord}, ID: id, Label: label}, nil
		}
		if !errors.Is(err, errSessionNotFound) {
			return sessionTarget{}, err
		}
	}
	resp, err := client.List(ctx, &proto.ListRequest{})
	if err != nil {
		return sessionTarget{}, err
	}
	id, label, err := matchSessionRef(ref, resp.Sessions)
	if err == nil {
		coord, _ := splitCoordinatorPrefix(label, "")
		return sessionTarget{Coordinator: coordinatorRef{Name: coord}, ID: id, Label: label}, nil
	}
	if !errors.Is(err, errSessionNotFound) {
		return sessionTarget{}, err
	}
	ok, err := confirmCreateSession(ref)
	if err != nil {
		return sessionTarget{}, err
	}
	if !ok {
		return sessionTarget{}, fmt.Errorf("session %q not found", ref)
	}
	ctx, cancel = context.WithTimeout(context.Background(), rpcTimeout)
	defer cancel()
	spawnResp, err := client.Spawn(ctx, &proto.SpawnRequest{Name: ref})
	if err != nil && status.Code(err) != codes.AlreadyExists {
		return sessionTarget{}, err
	}
	if spawnResp != nil && spawnResp.Session != nil {
		id, label, coord, err := sessionFromSpawnResponse(spawnResp, ref)
		if err != nil {
			return sessionTarget{}, err
		}
		return sessionTarget{Coordinator: coordinatorRef{Name: coord}, ID: id, Label: label}, nil
	}
	ctx, cancel = context.WithTimeout(context.Background(), rpcTimeout)
	defer cancel()
	listResp, err := client.List(ctx, &proto.ListRequest{})
	if err != nil {
		return sessionTarget{}, err
	}
	id, label, err = matchSessionRef(ref, listResp.Sessions)
	if err != nil {
		return sessionTarget{}, err
	}
	coord, _ := splitCoordinatorPrefix(label, "")
	return sessionTarget{Coordinator: coordinatorRef{Name: coord}, ID: id, Label: label}, nil
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
	cmds := []tea.Cmd{
		startSessionsStreamCmd(m.client, m.sessionsStreamID),
		tickCmd(),
	}
	if m.profileQuitAfter > 0 {
		cmds = append(cmds, profileQuitCmd(m.profileQuitAfter))
	}
	if strings.TrimSpace(m.sessionID) != "" || strings.TrimSpace(m.sessionLabel) != "" {
		cmds = append(cmds, startSubscribeCmd(m.client, m.sessionID, m.sessionCoord, m.streamID))
	}
	return tea.Batch(cmds...)
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
			m.stream = nil
			m.streamCancel = nil
			m.streamState = "reconnecting"
			m.statusMsg = fmt.Sprintf("stream: %v", msg.err)
			m.statusUntil = time.Now().Add(2 * time.Second)
			return scheduleSubscribeRetry(m)
		}
		if m.streamCancel != nil {
			m.streamCancel()
		}
		m.stream = msg.stream
		m.streamCancel = msg.cancel
		m.streamBackoff = time.Second
		m.streamState = "connected"
		m.lastScreenAt = time.Time{}
		m.exited = false
		m.exitCode = 0
		return m, waitSubscribeCmd(m.stream, m.streamID)
	case subscribeEventMsg:
		if msg.streamID != m.streamID {
			return m, nil
		}
		if msg.err != nil {
			if m.streamCancel != nil {
				m.streamCancel()
				m.streamCancel = nil
			}
			m.stream = nil
			m.streamState = "reconnecting"
			if !errors.Is(msg.err, io.EOF) && !errors.Is(msg.err, context.Canceled) {
				m.statusMsg = fmt.Sprintf("stream: %v", msg.err)
				m.statusUntil = time.Now().Add(2 * time.Second)
			}
			return scheduleSubscribeRetry(m)
		}
		if update := msg.event.GetScreenUpdate(); update != nil {
			m.lastScreenAt = time.Now()
			m.streamState = "receiving"
			next, cmd := applyScreenUpdate(m, update)
			m = next
			if cmd != nil {
				return m, cmd
			}
			return m, waitSubscribeCmd(m.stream, m.streamID)
		}
		if idle := msg.event.GetSessionIdle(); idle != nil {
			var cmd tea.Cmd
			m, cmd = applySessionIdle(m, idle.GetId(), idle.GetName(), idle.Idle)
			if cmd != nil {
				return m, tea.Batch(cmd, waitSubscribeCmd(m.stream, m.streamID))
			}
			return m, waitSubscribeCmd(m.stream, m.streamID)
		}
		if exited := msg.event.GetSessionExited(); exited != nil {
			m.exited = true
			m.exitCode = exited.ExitCode
			m.leaderActive = false
			m.streamState = "disconnected"
			m.sessionItems = ensureSessionItem(m.sessionItems, m.sessionID, m.sessionLabel, true, exited.ExitCode, m.coordinator.Name)
			if m.streamCancel != nil {
				m.streamCancel()
				m.streamCancel = nil
			}
			m.stream = nil
			cmd := m.sessionList.SetItems(sessionItemsToListItems(visibleSessionItems(m), m.coords, m.coordinator.Name))
			skipSessionListHeaders(&m.sessionList, 1)
			return m, cmd
		}
		return m, waitSubscribeCmd(m.stream, m.streamID)
	case sessionsSubscribeStartMsg:
		if msg.streamID != m.sessionsStreamID {
			if msg.cancel != nil {
				msg.cancel()
			}
			return m, nil
		}
		if msg.err != nil {
			m.statusMsg = fmt.Sprintf("sessions stream: %v", msg.err)
			m.statusUntil = time.Now().Add(2 * time.Second)
			return scheduleSessionsRetry(m)
		}
		if m.sessionsStreamCancel != nil {
			m.sessionsStreamCancel()
		}
		m.sessionsStream = msg.stream
		m.sessionsStreamCancel = msg.cancel
		m.sessionsBackoff = time.Second
		return m, waitSessionsStreamCmd(m.sessionsStream, m.sessionsStreamID)
	case sessionsSnapshotMsg:
		if msg.streamID != m.sessionsStreamID {
			return m, nil
		}
		if msg.err != nil {
			if errors.Is(msg.err, io.EOF) || errors.Is(msg.err, context.Canceled) {
				return m, nil
			}
			m.statusMsg = fmt.Sprintf("sessions stream: %v", msg.err)
			m.statusUntil = time.Now().Add(2 * time.Second)
			if m.sessionsStreamCancel != nil {
				m.sessionsStreamCancel()
				m.sessionsStreamCancel = nil
			}
			m.sessionsStream = nil
			return scheduleSessionsRetry(m)
		}
		coords, items, multi := sessionItemsFromSnapshot(msg.snapshot)
		if len(coords) == 0 {
			coords = ensureCoordinator(coords, m.coordinator)
		}
		forcePrefix := multi || shouldPrefixSnapshot(coords, m.hub.Name)
		if forcePrefix {
			items = prefixSessionItems(items)
		}
		m.coords = coords
		m.multiCoordinator = forcePrefix
		m.sessionItems = items
		if m.sessionID != "" {
			for _, item := range m.sessionItems {
				if item.id == m.sessionID && item.label != "" {
					m.sessionLabel = item.label
					m.sessionCoord = item.coord
					if coord, ok := coordinatorByName(m.coords, item.coord); ok {
						m.coordinator = coord
					} else if item.coord != "" {
						m.coordinator.Name = item.coord
					}
					break
				}
			}
		}
		if m.createCoordIdx >= len(m.coords) && len(m.coords) > 0 {
			m.createCoordIdx = len(m.coords) - 1
		}
		cmd := m.sessionList.SetItems(sessionItemsToListItems(visibleSessionItems(m), m.coords, m.coordinator.Name))
		skipSessionListHeaders(&m.sessionList, 1)
		return m, tea.Batch(cmd, waitSessionsStreamCmd(m.sessionsStream, m.sessionsStreamID))
	case sessionsRetryMsg:
		if msg.streamID != m.sessionsStreamID {
			return m, nil
		}
		return m, startSessionsStreamCmd(m.client, m.sessionsStreamID)
	case subscribeRetryMsg:
		if msg.streamID != m.streamID {
			return m, nil
		}
		m.streamState = "connecting"
		return m, startSubscribeCmd(m.client, m.sessionID, m.sessionCoord, m.streamID)
	case profileDoneMsg:
		return m, tea.Quit
	case tickMsg:
		m.now = time.Time(msg)
		if m.statusMsg != "" && !m.statusUntil.IsZero() && m.now.After(m.statusUntil) {
			m.statusMsg = ""
			m.statusUntil = time.Time{}
		}
		if m.streamState == "receiving" && !m.lastScreenAt.IsZero() && m.now.Sub(m.lastScreenAt) > 2*time.Second {
			m.streamState = "connected"
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
			if m.exited {
				return m, nil
			}
			return m, resizeCmd(m.client, m.sessionID, m.sessionCoord, m.viewportWidth, m.viewportHeight)
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
		if m.sessionID != "" {
			for _, item := range m.sessionItems {
				if item.id == m.sessionID && item.label != "" {
					m.sessionLabel = item.label
					break
				}
			}
		}
		cmd := m.sessionList.SetItems(sessionItemsToListItems(visibleSessionItems(m), m.coords, m.coordinator.Name))
		skipSessionListHeaders(&m.sessionList, 1)
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
		restartSessionsStream := false
		if msg.conn != nil {
			if m.conn != nil {
				_ = m.conn.Close()
			}
			m.conn = msg.conn
			m.client = proto.NewVTRClient(msg.conn)
			m.coordinator = msg.coord
			m.hub = msg.coord
			restartSessionsStream = true
		}
		next, cmd := switchSession(m, sessionSwitchMsg{id: msg.id, label: msg.label, coord: msg.coord.Name})
		if !restartSessionsStream {
			return next, cmd
		}
		if next.sessionsStreamCancel != nil {
			next.sessionsStreamCancel()
			next.sessionsStreamCancel = nil
		}
		next.sessionsStream = nil
		next.sessionsStreamID++
		next.sessionsBackoff = 0
		next.multiCoordinator = false
		restart := startSessionsStreamCmd(next.client, next.sessionsStreamID)
		return next, tea.Batch(cmd, restart)
	case tea.MouseMsg:
		return handleMouse(m, msg)
	case tea.KeyMsg:
		if m.renameActive {
			return updateRenameModal(m, msg)
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
	start := time.Now()
	view := "loading..."
	if m.width > 0 && m.height > 0 {
		updateStatusAnimFrame(m.now)
		innerWidth := m.width - 2
		innerHeight := m.height - 2
		if innerWidth > 0 && innerHeight > 0 {
			overlayWidth := overlayAvailableWidth(innerWidth)
			content := ""
			switch {
			case m.renameActive:
				content = renderRenameModal(m)
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
				sessions:      visibleSessionItems(m),
				activeID:      m.sessionID,
				activeLabel:   m.sessionLabel,
				coords:        m.coords,
				coordinator:   m.coordinator.Name,
				width:         overlayWidth,
				exited:        m.exited,
				exitCode:      m.exitCode,
				hoverTabID:    m.hoverTabID,
				hoverNewCoord: m.hoverNewCoord,
			})
			activeItem := currentSessionItem(m)
			footerLeft, footerRight := renderFooterSegments(footerView{
				width:       overlayWidth,
				leader:      m.leaderActive,
				statusMsg:   m.statusMsg,
				streamState: streamStateLabel(m),
				exited:      m.exited,
				coordinator: m.coordinator.Name,
				active:      activeItem,
				profiler:    m.profiler,
			})
			view = renderBorderOverlay(content, m.width, m.height, border, headerLeft, headerRight, footerLeft, footerRight)
			view = clampViewHeight(view, m.height)
		}
	}
	if m.profiler != nil {
		m.profiler.Observe(time.Since(start), time.Now())
	}
	return view
}

func startSubscribeCmd(client proto.VTRClient, id, coordinator string, streamID int) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithCancel(context.Background())
		sessionRef := sessionRequestRef(id, coordinator)
		stream, err := client.Subscribe(ctx, &proto.SubscribeRequest{
			Session:              sessionRef,
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
		if stream == nil {
			return subscribeEventMsg{err: fmt.Errorf("stream unavailable"), streamID: streamID}
		}
		event, err := stream.Recv()
		if err != nil {
			return subscribeEventMsg{err: err, streamID: streamID}
		}
		return subscribeEventMsg{event: event, streamID: streamID}
	}
}

func startSessionsStreamCmd(client proto.VTRClient, streamID int) tea.Cmd {
	return func() tea.Msg {
		if client == nil {
			return sessionsSubscribeStartMsg{err: fmt.Errorf("session stream: no client"), streamID: streamID}
		}
		ctx, cancel := context.WithCancel(context.Background())
		stream, err := client.SubscribeSessions(ctx, &proto.SubscribeSessionsRequest{
			ExcludeExited: false,
		})
		if err != nil {
			cancel()
			return sessionsSubscribeStartMsg{err: err, streamID: streamID}
		}
		return sessionsSubscribeStartMsg{stream: stream, cancel: cancel, streamID: streamID}
	}
}

func waitSessionsStreamCmd(stream proto.VTR_SubscribeSessionsClient, streamID int) tea.Cmd {
	return func() tea.Msg {
		snapshot, err := stream.Recv()
		if err != nil {
			return sessionsSnapshotMsg{err: err, streamID: streamID}
		}
		return sessionsSnapshotMsg{snapshot: snapshot, streamID: streamID}
	}
}

func scheduleSessionsRetry(m attachModel) (attachModel, tea.Cmd) {
	delay := m.sessionsBackoff
	if delay <= 0 {
		delay = time.Second
	}
	nextID := m.sessionsStreamID + 1
	m.sessionsStreamID = nextID
	m.sessionsBackoff = nextBackoff(delay)
	return m, tea.Tick(delay, func(time.Time) tea.Msg {
		return sessionsRetryMsg{streamID: nextID}
	})
}

func scheduleSubscribeRetry(m attachModel) (attachModel, tea.Cmd) {
	if strings.TrimSpace(m.sessionID) == "" || m.exited {
		m.streamState = "disconnected"
		return m, nil
	}
	delay := m.streamBackoff
	if delay <= 0 {
		delay = 500 * time.Millisecond
	}
	nextID := m.streamID + 1
	m.streamID = nextID
	m.streamBackoff = nextBackoff(delay)
	m.streamState = "reconnecting"
	return m, tea.Tick(delay, func(time.Time) tea.Msg {
		return subscribeRetryMsg{streamID: nextID}
	})
}

func tickCmd() tea.Cmd {
	return tea.Tick(statusAnimInterval, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func profileQuitCmd(after time.Duration) tea.Cmd {
	if after <= 0 {
		return nil
	}
	return tea.Tick(after, func(time.Time) tea.Msg {
		return profileDoneMsg{}
	})
}

func resizeCmd(client proto.VTRClient, id, coordinator string, cols, rows int) tea.Cmd {
	if cols <= 0 || rows <= 0 {
		return nil
	}
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		sessionRef := sessionRequestRef(id, coordinator)
		_, err := client.Resize(ctx, &proto.ResizeRequest{
			Session: sessionRef,
			Cols:    int32(cols),
			Rows:    int32(rows),
		})
		if err != nil {
			return rpcErrMsg{err: err, op: "resize"}
		}
		return nil
	}
}

func sendBytesCmd(client proto.VTRClient, id, coordinator string, data []byte) tea.Cmd {
	if len(data) == 0 {
		return nil
	}
	payload := append([]byte(nil), data...)
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		sessionRef := sessionRequestRef(id, coordinator)
		_, err := client.SendBytes(ctx, &proto.SendBytesRequest{
			Session: sessionRef,
			Data:    payload,
		})
		if err != nil {
			return rpcErrMsg{err: err, op: "send bytes"}
		}
		return nil
	}
}

func sendKeyCmd(client proto.VTRClient, id, coordinator, key string) tea.Cmd {
	if strings.TrimSpace(key) == "" {
		return nil
	}
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		sessionRef := sessionRequestRef(id, coordinator)
		_, err := client.SendKey(ctx, &proto.SendKeyRequest{
			Session: sessionRef,
			Key:     key,
		})
		if err != nil {
			return rpcErrMsg{err: err, op: "send key"}
		}
		return nil
	}
}

func renameCmd(client proto.VTRClient, id, coordinator, newName string) tea.Cmd {
	if strings.TrimSpace(id) == "" || strings.TrimSpace(newName) == "" {
		return nil
	}
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		sessionRef := sessionRequestRef(id, coordinator)
		_, err := client.Rename(ctx, &proto.RenameRequest{
			Session: sessionRef,
			NewName: newName,
		})
		if err != nil {
			return rpcErrMsg{err: err, op: "rename"}
		}
		return nil
	}
}

func killCmd(client proto.VTRClient, id, coordinator string) tea.Cmd {
	if strings.TrimSpace(id) == "" {
		return nil
	}
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		sessionRef := sessionRequestRef(id, coordinator)
		_, err := client.Kill(ctx, &proto.KillRequest{
			Session: sessionRef,
			Signal:  "TERM",
		})
		if err != nil {
			return rpcErrMsg{err: err, op: "kill"}
		}
		return nil
	}
}

func nextSessionCmd(client proto.VTRClient, currentID string, forward bool, showExited bool, hubName string) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		if snapshot, err := fetchSessionsSnapshot(ctx, client); err == nil && snapshot != nil {
			coords, items, multi := sessionItemsFromSnapshot(snapshot)
			if multi || shouldPrefixSnapshot(coords, hubName) {
				items = prefixSessionItems(items)
			}
			entries := filterVisibleSessionItems(items, showExited, currentID)
			if msg := nextSessionFromEntries(entries, currentID, forward); msg.err == nil || msg.id != "" {
				return msg
			}
		}
		resp, err := client.List(ctx, &proto.ListRequest{})
		if err != nil {
			return sessionSwitchMsg{err: err}
		}
		sessions := resp.Sessions
		sortProtoSessions(sessions)
		entries := make([]sessionListItem, 0, len(sessions))
		for _, session := range sessions {
			if session != nil && session.GetId() != "" {
				if !showExited && session.Status == proto.SessionStatus_SESSION_STATUS_EXITED {
					continue
				}
				label := session.GetName()
				coord, _ := splitCoordinatorPrefix(label, "")
				entries = append(entries, sessionListItem{
					id:       session.GetId(),
					label:    label,
					coord:    coord,
					status:   session.Status,
					exitCode: session.ExitCode,
					idle:     session.GetIdle(),
					order:    session.GetOrder(),
				})
			}
		}
		return nextSessionFromEntries(entries, currentID, forward)
	}
}

func nextSessionFromTabs(m attachModel, forward bool) (sessionSwitchMsg, bool) {
	width := 1
	if m.width > 2 {
		innerWidth := m.width - 2
		if innerWidth > 0 {
			if overlay := overlayAvailableWidth(innerWidth); overlay > 0 {
				width = overlay
			}
		}
	}
	tabs, _ := buildTabItems(headerView{
		sessions:      visibleSessionItems(m),
		activeID:      m.sessionID,
		activeLabel:   m.sessionLabel,
		coords:        m.coords,
		coordinator:   m.coordinator.Name,
		width:         width,
		exited:        m.exited,
		exitCode:      m.exitCode,
		hoverTabID:    m.hoverTabID,
		hoverNewCoord: m.hoverNewCoord,
	})
	if len(tabs) == 0 {
		return sessionSwitchMsg{}, false
	}
	sessions := make([]tabItem, 0, len(tabs))
	for _, tab := range tabs {
		if tab.kind != tabItemSession || tab.id == "" {
			continue
		}
		sessions = append(sessions, tab)
	}
	if len(sessions) == 0 {
		return sessionSwitchMsg{}, false
	}
	idx := -1
	for i, tab := range sessions {
		if tab.id == m.sessionID {
			idx = i
			break
		}
	}
	if idx == -1 {
		tab := sessions[0]
		return sessionSwitchMsg{id: tab.id, label: tab.sessionLabel, coord: tab.coord}, true
	}
	if forward {
		idx = (idx + 1) % len(sessions)
	} else {
		idx = (idx - 1 + len(sessions)) % len(sessions)
	}
	tab := sessions[idx]
	return sessionSwitchMsg{id: tab.id, label: tab.sessionLabel, coord: tab.coord}, true
}

func nextSessionFromEntries(entries []sessionListItem, currentID string, forward bool) sessionSwitchMsg {
	if len(entries) == 0 {
		return sessionSwitchMsg{err: fmt.Errorf("no sessions")}
	}
	sortSessionListItems(entries)
	idx := -1
	for i, entry := range entries {
		if entry.id == currentID {
			idx = i
			break
		}
	}
	if idx == -1 {
		entry := entries[0]
		return sessionSwitchMsg{id: entry.id, label: entry.label, coord: entry.coord}
	}
	if forward {
		idx = (idx + 1) % len(entries)
	} else {
		idx = (idx - 1 + len(entries)) % len(entries)
	}
	entry := entries[idx]
	return sessionSwitchMsg{id: entry.id, label: entry.label, coord: entry.coord}
}

func loadSessionListCmd(client proto.VTRClient, activate bool, fallbackCoord string) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		resp, err := client.List(ctx, &proto.ListRequest{})
		if err != nil {
			return sessionListMsg{err: err, activate: activate}
		}
		sessions := resp.Sessions
		sortProtoSessions(sessions)
		out := make([]sessionListItem, 0, len(sessions))
		for _, session := range sessions {
			if session == nil || session.GetId() == "" {
				continue
			}
			coord, _ := splitCoordinatorPrefix(session.GetName(), fallbackCoord)
			entry := sessionListItem{
				id:       session.GetId(),
				label:    session.GetName(),
				coord:    coord,
				status:   session.Status,
				exitCode: session.ExitCode,
				idle:     session.GetIdle(),
				order:    session.GetOrder(),
			}
			out = append(out, entry)
		}
		return sessionListMsg{sessions: out, activate: activate}
	}
}

func sessionItemsFromSnapshot(snapshot *proto.SessionsSnapshot) ([]coordinatorRef, []sessionListItem, bool) {
	if snapshot == nil {
		return nil, nil, false
	}
	coords := make([]coordinatorRef, 0, len(snapshot.Coordinators))
	for _, coord := range snapshot.Coordinators {
		if coord == nil {
			continue
		}
		name := strings.TrimSpace(coord.GetName())
		if name == "" {
			continue
		}
		coords = append(coords, coordinatorRef{
			Name: name,
			Path: strings.TrimSpace(coord.GetPath()),
		})
	}
	sort.Slice(coords, func(i, j int) bool {
		if coords[i].Name == coords[j].Name {
			return coords[i].Path < coords[j].Path
		}
		return coords[i].Name < coords[j].Name
	})
	multi := len(coords) > 1
	items := make([]sessionListItem, 0)
	for _, coord := range snapshot.Coordinators {
		if coord == nil {
			continue
		}
		coordName := strings.TrimSpace(coord.GetName())
		if coordName == "" {
			continue
		}
		for _, session := range coord.GetSessions() {
			if session == nil || session.GetId() == "" {
				continue
			}
			label := session.GetName()
			if multi {
				label = prefixSessionLabel(coordName, label)
			}
			items = append(items, sessionListItem{
				id:       session.GetId(),
				label:    label,
				coord:    coordName,
				status:   session.Status,
				exitCode: session.ExitCode,
				idle:     session.GetIdle(),
				order:    session.GetOrder(),
			})
		}
	}
	return coords, items, multi
}

func prefixSessionLabel(coord, label string) string {
	coord = strings.TrimSpace(coord)
	label = strings.TrimSpace(label)
	if coord == "" || label == "" {
		return label
	}
	if _, _, ok := parseSessionRef(label); ok {
		return label
	}
	return fmt.Sprintf("%s:%s", coord, label)
}

func shouldPrefixCoordinator(hubName, coordName string) bool {
	hubName = strings.TrimSpace(hubName)
	coordName = strings.TrimSpace(coordName)
	if hubName == "" || coordName == "" {
		return false
	}
	return coordName != hubName
}

func shouldPrefixSnapshot(coords []coordinatorRef, hubName string) bool {
	for _, coord := range coords {
		if shouldPrefixCoordinator(hubName, coord.Name) {
			return true
		}
	}
	return false
}

func prefixSessionItems(items []sessionListItem) []sessionListItem {
	for i := range items {
		if items[i].coord == "" {
			continue
		}
		items[i].label = prefixSessionLabel(items[i].coord, items[i].label)
	}
	return items
}

func sessionFromSpawnResponse(resp *proto.SpawnResponse, requestName string) (string, string, string, error) {
	if resp == nil || resp.Session == nil {
		return "", "", "", fmt.Errorf("spawn: missing session response")
	}
	label := resp.Session.GetName()
	coord, _ := splitCoordinatorPrefix(label, "")
	if coord == "" {
		if requestedCoord, _, ok := parseSessionRef(requestName); ok {
			coord = requestedCoord
			label = prefixSessionLabel(coord, label)
		}
	}
	return resp.Session.GetId(), label, coord, nil
}

func spawnCurrentCmd(client proto.VTRClient, name string) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		resp, err := client.Spawn(ctx, &proto.SpawnRequest{Name: name})
		if err != nil {
			return rpcErrMsg{err: err, op: "spawn"}
		}
		id, label, coord, err := sessionFromSpawnResponse(resp, name)
		if err != nil {
			return sessionSwitchMsg{err: err}
		}
		return sessionSwitchMsg{id: id, label: label, coord: coord}
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
			resp, err := client.Spawn(ctx, &proto.SpawnRequest{Name: candidate})
			cancel()
			if err == nil {
				id, label, coord, err := sessionFromSpawnResponse(resp, candidate)
				if err != nil {
					return sessionSwitchMsg{err: err}
				}
				return sessionSwitchMsg{id: id, label: label, coord: coord}
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

func autoSpawnBase(m attachModel, base string) (string, bool) {
	return autoSpawnBaseWithCoord(m, coordinatorRef{}, base)
}

func autoSpawnBaseForCoordinator(m attachModel, coordName, base string) (string, bool) {
	coord := coordinatorRef{Name: strings.TrimSpace(coordName)}
	if coord.Name != "" {
		if ref, ok := coordinatorByName(m.coords, coord.Name); ok {
			coord = ref
		}
	}
	return autoSpawnBaseWithCoord(m, coord, base)
}

func autoSpawnBaseWithCoord(m attachModel, coord coordinatorRef, base string) (string, bool) {
	base = strings.TrimSpace(base)
	if base == "" {
		base = "session"
	}
	if strings.TrimSpace(coord.Name) == "" && strings.TrimSpace(coord.Path) == "" {
		coord = m.coordinator
	}
	coordEmpty := strings.TrimSpace(coord.Name) == "" && strings.TrimSpace(coord.Path) == ""
	if coordEmpty || coordinatorIndex(m.coords, coord) < 0 {
		if len(m.coords) > 0 {
			coord = m.coords[0]
		} else if coordEmpty {
			return "", false
		}
	}
	if m.multiCoordinator || shouldPrefixCoordinator(m.hub.Name, coord.Name) {
		return prefixSessionLabel(coord.Name, base), true
	}
	return base, true
}

func spawnSessionCmd(coord coordinatorRef, cfg *clientConfig, name string) tea.Cmd {
	return func() tea.Msg {
		conn, err := dialClient(context.Background(), coord.Path, cfg)
		if err != nil {
			return spawnSessionMsg{err: err, coord: coord}
		}
		client := proto.NewVTRClient(conn)
		ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
		defer cancel()
		resp, err := client.Spawn(ctx, &proto.SpawnRequest{Name: name})
		if err != nil {
			_ = conn.Close()
			return spawnSessionMsg{err: err, coord: coord}
		}
		if resp == nil || resp.Session == nil {
			_ = conn.Close()
			return spawnSessionMsg{err: fmt.Errorf("spawn: missing session response"), coord: coord}
		}
		return spawnSessionMsg{id: resp.Session.GetId(), label: resp.Session.GetName(), coord: coord, conn: conn}
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
		return m, sendKeyCmd(m.client, m.sessionID, m.sessionCoord, "ctrl+b")
	case "d":
		return m, tea.Quit
	case "x":
		m.statusMsg = "kill sent"
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, killCmd(m.client, m.sessionID, m.sessionCoord)
	case "j", "n", "l":
		if msg, ok := nextSessionFromTabs(m, true); ok {
			return switchSession(m, msg)
		}
		return m, nextSessionCmd(m.client, m.sessionID, true, m.showExited, m.hub.Name)
	case "k", "p", "h":
		if msg, ok := nextSessionFromTabs(m, false); ok {
			return switchSession(m, msg)
		}
		return m, nextSessionCmd(m.client, m.sessionID, false, m.showExited, m.hub.Name)
	case "c":
		return beginCreateModal(m)
	case "r":
		return beginRenameModal(m)
	case "e":
		m.showExited = !m.showExited
		if m.showExited {
			m.statusMsg = "showing closed sessions"
		} else {
			m.statusMsg = "hiding closed sessions"
		}
		m.statusUntil = time.Now().Add(2 * time.Second)
		cmd := m.sessionList.SetItems(sessionItemsToListItems(visibleSessionItems(m), m.coords, m.coordinator.Name))
		skipSessionListHeaders(&m.sessionList, 1)
		return m, cmd
	case "w":
		m.listActive = true
		return m, nil
	default:
		m.statusMsg = fmt.Sprintf("unknown leader key: %s", key)
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, nil
	}
}

func handleMouse(m attachModel, msg tea.MouseMsg) (attachModel, tea.Cmd) {
	clearHover := func() {
		m.hoverTabID = ""
		m.hoverNewCoord = ""
	}
	if m.listActive || m.createActive || m.renameActive {
		if m.hoverTabID != "" || m.hoverNewCoord != "" {
			clearHover()
		}
		return m, nil
	}
	if msg.Action == tea.MouseActionMotion {
		if msg.Y != 0 || m.width <= 0 {
			if m.hoverTabID != "" || m.hoverNewCoord != "" {
				clearHover()
			}
			return m, nil
		}
		innerWidth := m.width - 2
		if innerWidth <= 0 {
			if m.hoverTabID != "" || m.hoverNewCoord != "" {
				clearHover()
			}
			return m, nil
		}
		leftPad, _ := overlayPadding(innerWidth)
		startX := 1 + leftPad
		localX := msg.X - startX
		if localX < 0 {
			if m.hoverTabID != "" || m.hoverNewCoord != "" {
				clearHover()
			}
			return m, nil
		}
		headerWidth := overlayAvailableWidth(innerWidth)
		if headerWidth <= 0 {
			if m.hoverTabID != "" || m.hoverNewCoord != "" {
				clearHover()
			}
			return m, nil
		}
		tab, ok := tabAtOffsetX(headerView{
			sessions:      visibleSessionItems(m),
			activeID:      m.sessionID,
			activeLabel:   m.sessionLabel,
			coords:        m.coords,
			coordinator:   m.coordinator.Name,
			width:         headerWidth,
			exited:        m.exited,
			exitCode:      m.exitCode,
			hoverTabID:    m.hoverTabID,
			hoverNewCoord: m.hoverNewCoord,
		}, localX)
		if !ok {
			if m.hoverTabID != "" || m.hoverNewCoord != "" {
				clearHover()
			}
			return m, nil
		}
		if tab.kind == tabItemNew {
			m.hoverNewCoord = tab.coord
			m.hoverTabID = ""
			return m, nil
		}
		m.hoverNewCoord = ""
		m.hoverTabID = tab.id
		return m, nil
	}
	if msg.Button == tea.MouseButtonWheelUp || msg.Button == tea.MouseButtonWheelDown || msg.Button == tea.MouseButtonWheelLeft || msg.Button == tea.MouseButtonWheelRight {
		if msg.Y != 0 {
			return m, nil
		}
		switch msg.Button {
		case tea.MouseButtonWheelUp, tea.MouseButtonWheelLeft:
			if msg, ok := nextSessionFromTabs(m, false); ok {
				return switchSession(m, msg)
			}
			return m, nextSessionCmd(m.client, m.sessionID, false, m.showExited, m.hub.Name)
		default:
			if msg, ok := nextSessionFromTabs(m, true); ok {
				return switchSession(m, msg)
			}
			return m, nextSessionCmd(m.client, m.sessionID, true, m.showExited, m.hub.Name)
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
		sessions:      visibleSessionItems(m),
		activeID:      m.sessionID,
		activeLabel:   m.sessionLabel,
		coords:        m.coords,
		coordinator:   m.coordinator.Name,
		width:         headerWidth,
		exited:        m.exited,
		exitCode:      m.exitCode,
		hoverTabID:    m.hoverTabID,
		hoverNewCoord: m.hoverNewCoord,
	}, localX)
	if !ok {
		return m, nil
	}
	if tab.kind == tabItemNew {
		if msg.Button == tea.MouseButtonLeft {
			base, ok := autoSpawnBaseForCoordinator(m, tab.coord, "session")
			if !ok {
				m.statusMsg = "create: no coordinators"
				m.statusUntil = time.Now().Add(2 * time.Second)
				return m, nil
			}
			return m, spawnAutoSessionCmd(m.client, base)
		}
		return m, nil
	}
	switch msg.Button {
	case tea.MouseButtonLeft:
		if tab.id == "" || tab.id == m.sessionID {
			return m, nil
		}
		return switchSession(m, sessionSwitchMsg{id: tab.id, label: tab.sessionLabel, coord: tab.coord})
	case tea.MouseButtonMiddle:
		if tab.id == "" {
			return m, nil
		}
		m.statusMsg = "kill sent"
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, killCmd(m.client, tab.id, tab.coord)
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
		return m, sendBytesCmd(m.client, m.sessionID, m.sessionCoord, data)
	}
	return m, sendKeyCmd(m.client, m.sessionID, m.sessionCoord, key)
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
		if looksLikeMouseSGRReport(msg.Runes) {
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

func looksLikeMouseSGRReport(runes []rune) bool {
	if len(runes) == 0 {
		return false
	}
	semiCount := 0
	hasM := false
	for _, r := range runes {
		switch {
		case r >= '0' && r <= '9':
		case r == ';':
			semiCount++
		case r == 'M' || r == 'm':
			hasM = true
		default:
			return false
		}
	}
	if semiCount < 2 || !hasM {
		return false
	}
	return true
}

func newSessionListModel(items []list.Item, width, height int) list.Model {
	delegate := newSessionListDelegate()
	model := list.New(items, delegate, width, height)
	model.Title = "Sessions"
	model.SetShowStatusBar(false)
	model.SetShowHelp(false)
	model.SetFilteringEnabled(true)
	return model
}

type sessionListDelegate struct {
	list.DefaultDelegate
}

func newSessionListDelegate() sessionListDelegate {
	return sessionListDelegate{DefaultDelegate: list.NewDefaultDelegate()}
}

func (d sessionListDelegate) Render(w io.Writer, m list.Model, index int, item list.Item) {
	if header, ok := item.(sessionListHeader); ok {
		label := attachListHeaderStyle.Render(header.name)
		if header.count > 0 {
			label = fmt.Sprintf("%s %s", label, attachListHeaderCountStyle.Render(fmt.Sprintf("(%d)", header.count)))
		}
		if width := m.Width(); width > 0 {
			label = ansi.Truncate(label, width, "")
		}
		if d.ShowDescription {
			fmt.Fprintf(w, "%s\n%s", label, "")
			return
		}
		fmt.Fprint(w, label)
		return
	}
	d.DefaultDelegate.Render(w, m, index, item)
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

func newRenameInput() textinput.Model {
	input := textinput.New()
	input.Prompt = "Rename: "
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
	m.renameActive = false
	m.createFocusInput = true
	m.createCoordIdx = coordinatorIndex(m.coords, m.coordinator)
	if m.createCoordIdx < 0 {
		m.createCoordIdx = 0
	}
	m.createInput.SetValue("")
	m.createInput.Focus()
	m.renameInput.Blur()
	return m, nil
}

func beginCreateModalForCoord(m attachModel, coord coordinatorRef) (attachModel, tea.Cmd) {
	m, cmd := beginCreateModal(m)
	if !m.createActive {
		return m, cmd
	}
	if idx := coordinatorIndex(m.coords, coord); idx >= 0 {
		m.createCoordIdx = idx
	}
	return m, cmd
}

func beginRenameModal(m attachModel) (attachModel, tea.Cmd) {
	if strings.TrimSpace(m.sessionID) == "" {
		m.statusMsg = "rename: no active session"
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, nil
	}
	m.renameActive = true
	m.listActive = false
	m.createActive = false
	m.renameInput.SetValue("")
	m.renameInput.Focus()
	m.createInput.Blur()
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
		switch selected := item.(type) {
		case sessionListItem:
			m.listActive = false
			return switchSession(m, sessionSwitchMsg{id: selected.id, label: selected.label, coord: selected.coord})
		case sessionCreateItem:
			return beginCreateModalForCoord(m, selected.coord)
		default:
			return m, nil
		}
	}
	var cmd tea.Cmd
	m.sessionList, cmd = m.sessionList.Update(msg)
	switch msg.String() {
	case "up", "k":
		skipSessionListHeaders(&m.sessionList, -1)
	case "down", "j":
		skipSessionListHeaders(&m.sessionList, 1)
	default:
		skipSessionListHeaders(&m.sessionList, 1)
	}
	return m, cmd
}

func isSessionListSelectable(item list.Item) bool {
	switch item.(type) {
	case sessionListItem, sessionCreateItem:
		return true
	default:
		return false
	}
}

func skipSessionListHeaders(model *list.Model, direction int) {
	if model == nil {
		return
	}
	items := model.VisibleItems()
	if len(items) == 0 {
		return
	}
	hasSelectable := false
	for _, item := range items {
		if isSessionListSelectable(item) {
			hasSelectable = true
			break
		}
	}
	if !hasSelectable {
		return
	}
	if direction == 0 {
		direction = 1
	}
	idx := model.Index()
	if idx < 0 || idx >= len(items) {
		idx = 0
		model.Select(0)
	}
	if isSessionListSelectable(items[idx]) {
		return
	}
	for step := 1; step <= len(items); step++ {
		next := idx + step*direction
		if next < 0 || next >= len(items) {
			break
		}
		if isSessionListSelectable(items[next]) {
			model.Select(next)
			return
		}
	}
	for step := 1; step <= len(items); step++ {
		next := idx - step*direction
		if next < 0 || next >= len(items) {
			break
		}
		if isSessionListSelectable(items[next]) {
			model.Select(next)
			return
		}
	}
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
		spawnName := name
		if m.multiCoordinator || shouldPrefixCoordinator(m.hub.Name, coord.Name) {
			spawnName = prefixSessionLabel(coord.Name, name)
		}
		return m, spawnCurrentCmd(m.client, spawnName)
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

func updateRenameModal(m attachModel, msg tea.KeyMsg) (attachModel, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.renameActive = false
		m.renameInput.Blur()
		return m, nil
	case "enter":
		name := strings.TrimSpace(m.renameInput.Value())
		if name == "" {
			m.statusMsg = "rename: name required"
			m.statusUntil = time.Now().Add(2 * time.Second)
			return m, nil
		}
		coord := strings.TrimSpace(m.sessionCoord)
		if coord == "" {
			coord = strings.TrimSpace(m.coordinator.Name)
		}
		if parsedCoord, session, ok := parseSessionRef(name); ok {
			if coord != "" && parsedCoord != coord {
				m.statusMsg = fmt.Sprintf("rename: active coordinator is %s", coord)
				m.statusUntil = time.Now().Add(2 * time.Second)
				return m, nil
			}
			name = session
		}
		name = strings.TrimSpace(name)
		if name == "" {
			m.statusMsg = "rename: name required"
			m.statusUntil = time.Now().Add(2 * time.Second)
			return m, nil
		}
		m.renameActive = false
		m.renameInput.Blur()
		return m, renameCmd(m.client, m.sessionID, coord, name)
	}
	var cmd tea.Cmd
	m.renameInput, cmd = m.renameInput.Update(msg)
	return m, cmd
}

func switchSession(m attachModel, msg sessionSwitchMsg) (attachModel, tea.Cmd) {
	if msg.err != nil {
		m.statusMsg = fmt.Sprintf("switch: %v", msg.err)
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, nil
	}
	msg = normalizeSessionSwitch(m, msg)
	if msg.id == "" || msg.id == m.sessionID {
		m.statusMsg = "switch: no other sessions"
		m.statusUntil = time.Now().Add(2 * time.Second)
		return m, nil
	}
	if m.streamCancel != nil {
		m.streamCancel()
		m.streamCancel = nil
	}
	m.streamID++
	m.streamBackoff = time.Second
	m.streamState = "connecting"
	m.lastScreenAt = time.Time{}
	m.sessionID = msg.id
	m.sessionLabel = msg.label
	m.sessionCoord = msg.coord
	if msg.coord != "" {
		if coord, ok := coordinatorByName(m.coords, msg.coord); ok {
			m.coordinator = coord
		} else {
			m.coordinator.Name = msg.coord
		}
	}
	m.screen = nil
	m.frameID = 0
	m.exited = false
	m.exitCode = 0
	m.leaderActive = false
	m.listActive = false
	m.createActive = false
	m.createInput.Blur()
	m.renameActive = false
	m.renameInput.Blur()
	if msg.label != "" {
		m.statusMsg = fmt.Sprintf("attached to %s", msg.label)
	} else {
		m.statusMsg = "attached"
	}
	m.statusUntil = time.Now().Add(2 * time.Second)
	m.sessionItems = ensureSessionItem(m.sessionItems, m.sessionID, m.sessionLabel, false, 0, m.coordinator.Name)
	cmds := []tea.Cmd{
		startSubscribeCmd(m.client, m.sessionID, m.sessionCoord, m.streamID),
	}
	cmd := m.sessionList.SetItems(sessionItemsToListItems(visibleSessionItems(m), m.coords, m.coordinator.Name))
	skipSessionListHeaders(&m.sessionList, 1)
	cmds = append(cmds, cmd)
	if m.viewportWidth > 0 && m.viewportHeight > 0 {
		cmds = append(cmds, resizeCmd(m.client, m.sessionID, m.sessionCoord, m.viewportWidth, m.viewportHeight))
	}
	return m, tea.Batch(cmds...)
}

func normalizeSessionSwitch(m attachModel, msg sessionSwitchMsg) sessionSwitchMsg {
	coord := strings.TrimSpace(msg.coord)
	label := strings.TrimSpace(msg.label)
	if coord == "" && label != "" {
		if parsedCoord, _, ok := parseSessionRef(label); ok {
			coord = parsedCoord
		}
	}
	if coord == "" && msg.id != "" {
		for _, item := range m.sessionItems {
			if item.id == msg.id && strings.TrimSpace(item.coord) != "" {
				coord = item.coord
				if label == "" {
					label = item.label
				}
				break
			}
		}
	}
	if coord == "" && len(m.coords) == 1 {
		coord = strings.TrimSpace(m.coords[0].Name)
	}
	if label != "" && coord != "" {
		if m.multiCoordinator || shouldPrefixCoordinator(m.hub.Name, coord) {
			label = prefixSessionLabel(coord, label)
		}
	}
	msg.coord = coord
	msg.label = label
	return msg
}

func applySessionIdle(m attachModel, id, label string, idle bool) (attachModel, tea.Cmd) {
	if id == "" {
		return m, nil
	}
	if id == m.sessionID {
		m = applySessionLabelUpdate(m, id, label)
	}
	updated := false
	for i := range m.sessionItems {
		if m.sessionItems[i].id == id {
			m.sessionItems[i].idle = idle
			if label != "" {
				applySessionItemLabel(&m.sessionItems[i], label, m.coordinator.Name)
			}
			updated = true
			break
		}
	}
	if !updated {
		coord, _ := splitCoordinatorPrefix(label, m.coordinator.Name)
		m.sessionItems = append(m.sessionItems, sessionListItem{
			id:     id,
			label:  label,
			coord:  coord,
			status: proto.SessionStatus_SESSION_STATUS_RUNNING,
			idle:   idle,
			order:  0,
		})
		sortSessionListItems(m.sessionItems)
	}
	cmd := m.sessionList.SetItems(sessionItemsToListItems(visibleSessionItems(m), m.coords, m.coordinator.Name))
	skipSessionListHeaders(&m.sessionList, 1)
	return m, cmd
}

func ensureSessionItem(items []sessionListItem, id, label string, exited bool, exitCode int32, fallbackCoord string) []sessionListItem {
	if id == "" {
		return items
	}
	for i := range items {
		if items[i].id == id {
			if exited {
				items[i].status = proto.SessionStatus_SESSION_STATUS_EXITED
				items[i].exitCode = exitCode
			}
			if label != "" {
				applySessionItemLabel(&items[i], label, fallbackCoord)
			}
			return items
		}
	}
	status := proto.SessionStatus_SESSION_STATUS_RUNNING
	if exited {
		status = proto.SessionStatus_SESSION_STATUS_EXITED
	}
	coord, _ := splitCoordinatorPrefix(label, fallbackCoord)
	items = append(items, sessionListItem{id: id, label: label, coord: coord, status: status, exitCode: exitCode, order: 0})
	sortSessionListItems(items)
	return items
}

func visibleSessionItems(m attachModel) []sessionListItem {
	return filterVisibleSessionItems(m.sessionItems, m.showExited, m.sessionID)
}

func filterVisibleSessionItems(items []sessionListItem, showExited bool, activeID string) []sessionListItem {
	if showExited {
		return items
	}
	out := make([]sessionListItem, 0, len(items))
	for _, item := range items {
		if item.status == proto.SessionStatus_SESSION_STATUS_EXITED && item.id != activeID {
			continue
		}
		out = append(out, item)
	}
	return out
}

func sessionItemsToListItems(items []sessionListItem, coords []coordinatorRef, fallbackCoord string) []list.Item {
	if len(items) == 0 {
		return coordinatorCreateItems(coords)
	}
	return groupSessionListItems(items, fallbackCoord)
}

func coordinatorCreateItems(coords []coordinatorRef) []list.Item {
	if len(coords) == 0 {
		return nil
	}
	out := make([]list.Item, 0, len(coords)*2)
	for _, coord := range coords {
		if strings.TrimSpace(coord.Name) == "" {
			continue
		}
		out = append(out, sessionListHeader{
			name:   coord.Name,
			count:  0,
			filter: coord.Name,
		})
		out = append(out, sessionCreateItem{coord: coord})
	}
	return out
}

func groupSessionListItems(items []sessionListItem, fallbackCoord string) []list.Item {
	if len(items) == 0 {
		return nil
	}
	byCoord := make(map[string][]sessionListItem)
	for _, item := range items {
		coord := item.coord
		if coord == "" {
			coord, _ = splitCoordinatorPrefix(item.label, fallbackCoord)
		}
		if coord == "" {
			coord = fallbackCoord
		}
		item.coord = coord
		byCoord[coord] = append(byCoord[coord], item)
	}
	coords := make([]string, 0, len(byCoord))
	for coord := range byCoord {
		coords = append(coords, coord)
	}
	sort.Strings(coords)
	if fallbackCoord != "" {
		for i, coord := range coords {
			if coord == fallbackCoord {
				if i > 0 {
					coords = append([]string{coord}, append(coords[:i], coords[i+1:]...)...)
				}
				break
			}
		}
	}
	out := make([]list.Item, 0, len(items)+len(coords))
	for _, coord := range coords {
		group := byCoord[coord]
		sortSessionListItems(group)
		var filter strings.Builder
		for i, item := range group {
			if i > 0 {
				filter.WriteByte(' ')
			}
			filter.WriteString(item.FilterValue())
		}
		out = append(out, sessionListHeader{
			name:   coord,
			count:  len(group),
			filter: filter.String(),
		})
		for _, item := range group {
			out = append(out, item)
		}
	}
	return out
}

func currentSessionItem(m attachModel) sessionListItem {
	for _, item := range m.sessionItems {
		if item.id == m.sessionID {
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
	coord, _ := splitCoordinatorPrefix(m.sessionLabel, m.coordinator.Name)
	return sessionListItem{id: m.sessionID, label: m.sessionLabel, coord: coord, status: status, exitCode: m.exitCode}
}

func applyScreenUpdate(m attachModel, update *proto.ScreenUpdate) (attachModel, tea.Cmd) {
	if update == nil {
		return m, nil
	}
	if update.IsKeyframe {
		if update.Screen != nil {
			screenID := strings.TrimSpace(update.Screen.Id)
			if screenID != "" {
				if m.sessionID != "" && screenID != m.sessionID {
					m.sessionID = screenID
					m.frameID = 0
					return resubscribe(m, "session id changed")
				}
				if m.sessionID == "" {
					m.sessionID = screenID
				}
			}
			if label := strings.TrimSpace(update.Screen.Name); label != "" {
				m = applySessionLabelUpdate(m, m.sessionID, label)
			}
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
	if update.FrameId <= update.BaseFrameId || update.FrameId <= m.frameID {
		return resubscribe(m, "non-monotonic delta frame")
	}
	screen, err := applyScreenDelta(m.screen, update.Delta)
	if err != nil {
		return resubscribe(m, "delta apply failed")
	}
	m.screen = screen
	m.frameID = update.FrameId
	return m, nil
}

func applySessionLabelUpdate(m attachModel, id, label string) attachModel {
	if id == "" || label == "" || id != m.sessionID {
		return m
	}
	if m.multiCoordinator {
		label = prefixSessionLabel(m.coordinator.Name, label)
	}
	if label == m.sessionLabel {
		return m
	}
	m.sessionLabel = label
	m.statusMsg = fmt.Sprintf("session renamed to %s", label)
	m.statusUntil = time.Now().Add(2 * time.Second)
	m.sessionItems = updateSessionLabel(m.sessionItems, id, label, m.coordinator.Name)
	m.sessionItems = ensureSessionItem(m.sessionItems, id, label, m.exited, m.exitCode, m.coordinator.Name)
	return m
}

func updateSessionLabel(items []sessionListItem, id, label string, fallbackCoord string) []sessionListItem {
	if id == "" || label == "" {
		return items
	}
	out := make([]sessionListItem, 0, len(items))
	for _, item := range items {
		if item.id == id {
			applySessionItemLabel(&item, label, fallbackCoord)
		}
		out = append(out, item)
	}
	return out
}

func applySessionItemLabel(item *sessionListItem, label string, fallbackCoord string) {
	if item == nil || label == "" {
		return
	}
	item.label = label
	coord, _ := splitCoordinatorPrefix(label, fallbackCoord)
	item.coord = coord
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
	m.streamBackoff = time.Second
	m.streamState = "connecting"
	m.lastScreenAt = time.Time{}
	m.frameID = 0
	if reason != "" {
		m.statusMsg = fmt.Sprintf("resync: %s", reason)
		m.statusUntil = time.Now().Add(2 * time.Second)
	}
	cmds := []tea.Cmd{startSubscribeCmd(m.client, m.sessionID, m.sessionCoord, m.streamID)}
	if m.viewportWidth > 0 && m.viewportHeight > 0 {
		cmds = append(cmds, resizeCmd(m.client, m.sessionID, m.sessionCoord, m.viewportWidth, m.viewportHeight))
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

func renderRenameModal(m attachModel) string {
	if m.viewportWidth <= 0 || m.viewportHeight <= 0 {
		return ""
	}
	coordName := strings.TrimSpace(m.sessionCoord)
	if coordName == "" {
		coordName = strings.TrimSpace(m.coordinator.Name)
	}
	current := strings.TrimSpace(m.sessionLabel)
	if current == "" {
		item := currentSessionItem(m)
		current = item.label
	}
	current = stripCoordinatorPrefix(current)
	lines := []string{
		"Rename session",
		"",
		fmt.Sprintf("Current: %s", current),
	}
	if coordName != "" {
		lines = append(lines, fmt.Sprintf("Coordinator: %s", coordName))
	}
	lines = append(lines, m.renameInput.View(), "Enter to rename, Esc to cancel")
	content := strings.Join(lines, "\n")
	box := attachModalStyle.Render(content)
	return lipgloss.Place(m.viewportWidth, m.viewportHeight, lipgloss.Center, lipgloss.Center, box)
}

func coordinatorIndex(coords []coordinatorRef, target coordinatorRef) int {
	targetPath := strings.TrimSpace(target.Path)
	targetName := strings.TrimSpace(target.Name)
	if targetPath != "" {
		for i, coord := range coords {
			if strings.TrimSpace(coord.Path) == targetPath {
				return i
			}
		}
	}
	if targetName != "" {
		for i, coord := range coords {
			if strings.TrimSpace(coord.Name) == targetName {
				return i
			}
		}
	}
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

func coordinatorByName(coords []coordinatorRef, name string) (coordinatorRef, bool) {
	name = strings.TrimSpace(name)
	if name == "" {
		return coordinatorRef{}, false
	}
	for _, coord := range coords {
		if strings.TrimSpace(coord.Name) == name {
			return coord, true
		}
	}
	return coordinatorRef{}, false
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
	sessions      []sessionListItem
	activeID      string
	activeLabel   string
	coords        []coordinatorRef
	coordinator   string
	width         int
	exited        bool
	exitCode      int32
	hoverTabID    string
	hoverNewCoord string
}
type footerView struct {
	width       int
	leader      bool
	statusMsg   string
	streamState string
	exited      bool
	coordinator string
	active      sessionListItem
	profiler    *renderProfiler
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
	{key: "r", label: "RENAME"},
	{key: "e", label: "CLOSED"},
	{key: "d", label: "DETACH"},
	{key: "x", label: "KILL"},
	{key: "Ctrl+b", label: "SEND"},
}

const (
	tabOverflowGlyph  = "…"
	tabNewGlyph       = ""
	tabNameMaxWidth   = 20
	tabCoordMaxWidth  = 16
	sessionListIndent = "  "
)

const borderOverlayOffset = 1

const statusAnimInterval = 200 * time.Millisecond

const (
	envTuiSpinner     = "VTR_TUI_SPINNER"
	envTuiStatusIcons = "VTR_TUI_STATUS_ICONS"
)

type statusIconSet struct {
	Idle    string
	Exited  string
	Unknown string
}

var statusIconSets = map[string]statusIconSet{
	"simple": {Idle: "○", Exited: "■", Unknown: "□"},
	"nerd":   {Idle: "○", Exited: "■", Unknown: "□"},
	"ascii":  {Idle: "o", Exited: "x", Unknown: "?"},
}

const defaultStatusIcons = "simple"

func statusIconSetByName(name string) statusIconSet {
	if set, ok := statusIconSets[name]; ok {
		return set
	}
	return statusIconSets[defaultStatusIcons]
}

var statusIcons = statusIconSetByName(defaultStatusIcons)

// Status glyphs for active sessions (single frame, no animation).
var statusSpinnerSets = map[string][]string{
	"block-wave":    {"▉", "▊", "▋", "▌", "▍", "▎", "▏", "▎", "▍", "▌", "▋", "▊", "▉"},
	"bar-wave":      {"▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▁"},
	"braille":       {"⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"},
	"tick":          {"⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"},
	"static-dot":    {"•"},
	"static-circle": {"●"},
	"static-block":  {"▉"},
	// Nerd Font Material Design Icons:
	// md-circle_small -> md-clock_time_ten -> md-clock_time_two -> md-clock_time_four
	// -> md-clock_time_eight -> md-clock_time_nine -> md-circle_medium.
	"md-clock-loader": {"󰧟", "󱑈", "󱑀", "󱑂", "󱑆", "󱑇", "󰧞"},
}

const defaultStatusSpinner = "static-dot"

func statusSpinnerFrames(name string) []string {
	if frames, ok := statusSpinnerSets[name]; ok && len(frames) > 0 {
		return frames
	}
	return statusSpinnerSets[defaultStatusSpinner]
}

var statusActiveFrames = statusSpinnerFrames(defaultStatusSpinner)

var statusAnimFrameIndex int

func updateStatusAnimFrame(now time.Time) {
	if len(statusActiveFrames) == 0 {
		statusAnimFrameIndex = 0
		return
	}
	statusAnimFrameIndex = 0
}

func resolveTuiSpinner(cfg *clientConfig) string {
	if value := strings.TrimSpace(os.Getenv(envTuiSpinner)); value != "" {
		return value
	}
	if cfg != nil {
		if value := strings.TrimSpace(cfg.TUI.Spinner); value != "" {
			return value
		}
	}
	return defaultStatusSpinner
}

func resolveTuiStatusIcons(cfg *clientConfig) string {
	if value := strings.TrimSpace(os.Getenv(envTuiStatusIcons)); value != "" {
		return value
	}
	if cfg != nil {
		if value := strings.TrimSpace(cfg.TUI.StatusIcons); value != "" {
			return value
		}
	}
	return defaultStatusIcons
}

func applyTuiStatusConfig(cfg *clientConfig) {
	statusActiveFrames = statusSpinnerFrames(resolveTuiSpinner(cfg))
	statusIcons = statusIconSetByName(resolveTuiStatusIcons(cfg))
}

const renderProfileWindow = time.Second

type renderProfiler struct {
	enabled bool

	windowStart     time.Time
	windowFrames    int
	windowRenderSum time.Duration
	windowRenderMin time.Duration
	windowRenderMax time.Duration

	lastRender   time.Duration
	lastSnapshot renderProfilerSnapshot
}

type renderProfilerSnapshot struct {
	FPS        float64
	Frames     int
	Window     time.Duration
	RenderAvg  time.Duration
	RenderMin  time.Duration
	RenderMax  time.Duration
	RenderLast time.Duration
}

func newRenderProfiler(enabled bool) *renderProfiler {
	return &renderProfiler{enabled: enabled}
}

func (p *renderProfiler) Enabled() bool {
	return p != nil && p.enabled
}

func (p *renderProfiler) Observe(render time.Duration, now time.Time) {
	if !p.Enabled() {
		return
	}
	if now.IsZero() {
		now = time.Now()
	}
	if p.windowStart.IsZero() {
		p.windowStart = now
		p.windowRenderMin = render
		p.windowRenderMax = render
	}
	p.windowFrames++
	p.windowRenderSum += render
	if p.windowRenderMin == 0 || render < p.windowRenderMin {
		p.windowRenderMin = render
	}
	if render > p.windowRenderMax {
		p.windowRenderMax = render
	}
	p.lastRender = render
	if now.Sub(p.windowStart) >= renderProfileWindow {
		p.lastSnapshot = buildRenderSnapshot(p.windowFrames, now.Sub(p.windowStart), p.windowRenderSum, p.windowRenderMin, p.windowRenderMax, p.lastRender)
		p.windowStart = now
		p.windowFrames = 0
		p.windowRenderSum = 0
		p.windowRenderMin = 0
		p.windowRenderMax = 0
	}
}

func (p *renderProfiler) Snapshot(now time.Time) renderProfilerSnapshot {
	if !p.Enabled() {
		return renderProfilerSnapshot{}
	}
	if p.windowFrames == 0 {
		return p.lastSnapshot
	}
	if now.IsZero() {
		now = time.Now()
	}
	window := now.Sub(p.windowStart)
	if window <= 0 {
		return p.lastSnapshot
	}
	return buildRenderSnapshot(p.windowFrames, window, p.windowRenderSum, p.windowRenderMin, p.windowRenderMax, p.lastRender)
}

func (p *renderProfiler) FooterText(now time.Time) string {
	snap := p.Snapshot(now)
	if snap.Frames == 0 && snap.FPS == 0 {
		return ""
	}
	return fmt.Sprintf("fps %.1f render %s", snap.FPS, formatRenderDuration(snap.RenderAvg))
}

func buildRenderSnapshot(frames int, window time.Duration, sum, min, max, last time.Duration) renderProfilerSnapshot {
	avg := time.Duration(0)
	if frames > 0 {
		avg = time.Duration(int64(sum) / int64(frames))
	}
	fps := 0.0
	if window > 0 {
		fps = float64(frames) / window.Seconds()
	}
	return renderProfilerSnapshot{
		FPS:        fps,
		Frames:     frames,
		Window:     window,
		RenderAvg:  avg,
		RenderMin:  min,
		RenderMax:  max,
		RenderLast: last,
	}
}

func formatRenderDuration(d time.Duration) string {
	if d <= 0 {
		return "0ms"
	}
	if d < time.Millisecond {
		return fmt.Sprintf("%dus", d.Microseconds())
	}
	ms := float64(d) / float64(time.Millisecond)
	switch {
	case ms < 10:
		return fmt.Sprintf("%.2fms", ms)
	case ms < 100:
		return fmt.Sprintf("%.1fms", ms)
	default:
		return fmt.Sprintf("%.0fms", ms)
	}
}

func durationMs(d time.Duration) float64 {
	if d <= 0 {
		return 0
	}
	return float64(d) / float64(time.Millisecond)
}

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
	leftSegments := make([]string, 0, 4)
	if view.coordinator != "" {
		leftSegments = append(leftSegments, attachFooterTagStyle.Render(" "+view.coordinator+" "))
	}
	if view.active.label != "" {
		state := sessionStateLabel(view.active)
		if state != "" {
			leftSegments = append(leftSegments, attachFooterTagStyle.Render(" "+state+" "))
		}
	}
	if view.streamState != "" {
		leftSegments = append(leftSegments, attachFooterTagStyle.Render(" stream "+view.streamState+" "))
	}
	if view.statusMsg != "" {
		leftSegments = append(leftSegments, attachStatusStyle.Render(" "+view.statusMsg+" "))
	}
	if view.profiler != nil && view.profiler.Enabled() {
		if text := view.profiler.FooterText(time.Now()); text != "" {
			leftSegments = append(leftSegments, attachFooterTagStyle.Render(" "+text+" "))
		}
	}
	left := strings.Join(leftSegments, " ")

	right := ""
	switch {
	case view.leader:
		right = renderLeaderLegend()
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

func sessionStatusGlyph(item sessionListItem) string {
	switch item.status {
	case proto.SessionStatus_SESSION_STATUS_RUNNING:
		if item.idle {
			return statusIcons.Idle
		}
		if len(statusActiveFrames) == 0 {
			return statusIcons.Unknown
		}
		return statusActiveFrames[statusAnimFrameIndex%len(statusActiveFrames)]
	case proto.SessionStatus_SESSION_STATUS_EXITED:
		return statusIcons.Exited
	default:
		return statusIcons.Unknown
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

func streamStateLabel(m attachModel) string {
	switch strings.TrimSpace(m.streamState) {
	case "receiving":
		return "receiving"
	case "connected":
		return "connected"
	case "reconnecting":
		return "reconnecting"
	case "connecting":
		return "connecting"
	case "disconnected":
		return "disconnected"
	default:
		if strings.TrimSpace(m.sessionID) == "" {
			return "disconnected"
		}
		return "connecting"
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

func splitCoordinatorPrefix(name, fallback string) (string, string) {
	if coord, session, ok := parseSessionRef(name); ok {
		return coord, session
	}
	return fallback, name
}

func stripCoordinatorPrefix(name string) string {
	_, label := splitCoordinatorPrefix(name, "")
	return label
}

func sessionDisplayLabel(item sessionListItem) string {
	_, label := splitCoordinatorPrefix(item.label, item.coord)
	return label
}

func sessionRequestRef(id, coordinator string) *proto.SessionRef {
	id = strings.TrimSpace(id)
	if id == "" {
		return &proto.SessionRef{}
	}
	coord := strings.TrimSpace(coordinator)
	return &proto.SessionRef{Id: id, Coordinator: coord}
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

type tabItemKind int

const (
	tabItemSession tabItemKind = iota
	tabItemCoordinator
	tabItemNew
	tabItemSeparator
	tabItemOverflow
)

type tabItem struct {
	kind         tabItemKind
	id           string
	label        string
	sessionLabel string
	coord        string
	width        int
	active       bool
	hovered      bool
}

func renderTabBar(view headerView) string {
	tabs := headerTabItems(view)
	if len(tabs) == 0 || view.width <= 0 {
		return ""
	}
	return joinTabItems(tabs)
}

func renderNewTabLabel(hovered bool) string {
	if hovered {
		return attachTabNewHoverStyle.Render(tabNewGlyph)
	}
	return attachTabNewStyle.Render(tabNewGlyph)
}

func newTabButtonItem(coord string, hovered bool) tabItem {
	label := renderNewTabLabel(hovered)
	return tabItem{
		kind:    tabItemNew,
		label:   label,
		width:   lipgloss.Width(label),
		coord:   coord,
		hovered: hovered,
	}
}

func renderCoordinatorLabel(name string, active bool) string {
	if strings.TrimSpace(name) == "" {
		return ""
	}
	label := truncateTabName(name, tabCoordMaxWidth)
	style := attachCoordLabelStyle
	if active {
		style = attachCoordLabelActiveStyle
	}
	return style.Render(" " + label + " ")
}

func coordinatorLabelItem(name string, active bool) tabItem {
	label := renderCoordinatorLabel(name, active)
	return tabItem{
		kind:  tabItemCoordinator,
		label: label,
		width: lipgloss.Width(label),
		coord: name,
	}
}

func headerTabItems(view headerView) []tabItem {
	if view.width <= 0 {
		return nil
	}
	return visibleTabs(view)
}
func collectTabSessions(items []sessionListItem, activeID, activeLabel string, exited bool, exitCode int32, fallbackCoord string) []sessionListItem {
	if activeID == "" && len(items) == 0 {
		return nil
	}
	out := append([]sessionListItem(nil), items...)
	found := false
	for i := range out {
		if out[i].coord == "" {
			coord, _ := splitCoordinatorPrefix(out[i].label, fallbackCoord)
			out[i].coord = coord
		}
		if out[i].id == activeID {
			found = true
			if exited {
				out[i].status = proto.SessionStatus_SESSION_STATUS_EXITED
				out[i].exitCode = exitCode
			}
			break
		}
	}
	if !found && activeID != "" {
		status := proto.SessionStatus_SESSION_STATUS_RUNNING
		if exited {
			status = proto.SessionStatus_SESSION_STATUS_EXITED
		}
		coord, _ := splitCoordinatorPrefix(activeLabel, fallbackCoord)
		out = append(out, sessionListItem{id: activeID, label: activeLabel, coord: coord, status: status, exitCode: exitCode, order: 0})
	}
	sortSessionListItems(out)
	return out
}

type coordinatorTabGroup struct {
	name     string
	sessions []sessionListItem
}

func groupTabSessionsByCoordinator(items []sessionListItem, coords []coordinatorRef, fallbackCoord string) []coordinatorTabGroup {
	if len(items) == 0 && len(coords) == 0 {
		return nil
	}
	seen := make(map[string]struct{})
	names := make([]string, 0, len(coords))
	addName := func(name string) {
		name = strings.TrimSpace(name)
		if name == "" {
			return
		}
		if _, ok := seen[name]; ok {
			return
		}
		seen[name] = struct{}{}
		names = append(names, name)
	}
	for _, coord := range coords {
		addName(coord.Name)
	}
	for _, item := range items {
		coord := strings.TrimSpace(item.coord)
		if coord == "" {
			coord, _ = splitCoordinatorPrefix(item.label, fallbackCoord)
		}
		if coord == "" {
			coord = strings.TrimSpace(fallbackCoord)
		}
		addName(coord)
	}
	if len(names) == 0 {
		fallbackCoord = strings.TrimSpace(fallbackCoord)
		if fallbackCoord != "" {
			names = append(names, fallbackCoord)
			seen[fallbackCoord] = struct{}{}
		}
	}
	if len(names) > 1 {
		sort.Strings(names)
	}
	grouped := make(map[string][]sessionListItem, len(names))
	for _, item := range items {
		coord := strings.TrimSpace(item.coord)
		if coord == "" {
			coord, _ = splitCoordinatorPrefix(item.label, fallbackCoord)
		}
		if coord == "" {
			coord = fallbackCoord
		}
		item.coord = coord
		grouped[coord] = append(grouped[coord], item)
	}
	groups := make([]coordinatorTabGroup, 0, len(names))
	for _, name := range names {
		sessions := grouped[name]
		if len(sessions) > 1 {
			sortSessionListItems(sessions)
		}
		groups = append(groups, coordinatorTabGroup{name: name, sessions: sessions})
	}
	return groups
}

func renderTabLabel(item sessionListItem, active, hovered bool) string {
	_, label := splitCoordinatorPrefix(item.label, item.coord)
	label = truncateTabName(label, tabNameMaxWidth)
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
	b.WriteString(textStyle.Render(label))
	b.WriteString(padStyle.Render(" "))
	return b.String()
}
func buildTabItems(view headerView) ([]tabItem, int) {
	sessions := collectTabSessions(view.sessions, view.activeID, view.activeLabel, view.exited, view.exitCode, view.coordinator)
	groups := groupTabSessionsByCoordinator(sessions, view.coords, view.coordinator)
	if len(groups) == 0 || view.width <= 0 {
		return nil, 0
	}
	tabs := make([]tabItem, 0, len(sessions)+len(groups)*2)
	activeIdx := 0
	for _, group := range groups {
		if strings.TrimSpace(group.name) == "" {
			continue
		}
		tabs = append(tabs, coordinatorLabelItem(group.name, group.name == view.coordinator))
		if len(group.sessions) == 0 {
			tabs = append(tabs, newTabButtonItem(group.name, view.hoverNewCoord == group.name))
			continue
		}
		for _, session := range group.sessions {
			active := session.id == view.activeID
			hovered := session.id == view.hoverTabID
			label := renderTabLabel(session, active, hovered)
			item := tabItem{
				kind:         tabItemSession,
				id:           session.id,
				label:        label,
				sessionLabel: session.label,
				coord:        group.name,
				width:        lipgloss.Width(label),
				active:       active,
				hovered:      hovered,
			}
			if active {
				activeIdx = len(tabs)
			}
			tabs = append(tabs, item)
		}
		tabs = append(tabs, newTabButtonItem(group.name, view.hoverNewCoord == group.name))
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
	cursor := 0
	for i, tab := range tabs {
		if offset >= cursor && offset < cursor+tab.width {
			if tab.kind == tabItemOverflow {
				return tabItem{}, false
			}
			if tab.kind == tabItemNew {
				return tab, true
			}
			if tab.kind == tabItemCoordinator || tab.kind == tabItemSeparator || tab.id == "" {
				return tabItem{}, false
			}
			return tab, true
		}
		cursor += tab.width
		if i < len(tabs)-1 {
			cursor += tabGapWidthBetween(tab, tabs[i+1])
		}
	}
	return tabItem{}, false
}

func tabGapBetween(prev, next tabItem) string {
	if next.kind == tabItemCoordinator {
		return " "
	}
	return ""
}

func tabGapWidthBetween(prev, next tabItem) int {
	return lipgloss.Width(tabGapBetween(prev, next))
}

func fitTabsToWidth(tabs []tabItem, activeIdx, width int) string {
	return joinTabItems(fitTabsToWidthItems(tabs, activeIdx, width))
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
		kind:  tabItemOverflow,
		label: label,
		width: lipgloss.Width(label),
	}
}

func fitTabsToWidthItems(tabs []tabItem, activeIdx, width int) []tabItem {
	if len(tabs) == 0 || width <= 0 {
		return nil
	}
	if tabItemsWidth(tabs) <= width {
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
			if tabItemsWidth(candidate) <= width {
				selected = candidate
				leftIndex = left
				left--
				added = true
			}
		}
		if right < len(tabs) {
			candidate := append(append([]tabItem(nil), selected...), tabs[right])
			if tabItemsWidth(candidate) <= width {
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
		return tabItemsWidth(candidate)
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
func tabItemsWidth(tabs []tabItem) int {
	if len(tabs) == 0 {
		return 0
	}
	total := 0
	for i, tab := range tabs {
		total += tab.width
		if i < len(tabs)-1 {
			total += tabGapWidthBetween(tab, tabs[i+1])
		}
	}
	return total
}

func joinTabItems(tabs []tabItem) string {
	if len(tabs) == 0 {
		return ""
	}
	var b strings.Builder
	for i, tab := range tabs {
		if i > 0 {
			b.WriteString(tabGapBetween(tabs[i-1], tab))
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
