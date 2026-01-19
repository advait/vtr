package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"strings"
	"sync"

	proto "github.com/advait/vtrpc/proto"
	webassets "github.com/advait/vtrpc/web"
	"github.com/spf13/cobra"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"nhooyr.io/websocket"
)

const (
	wsCodeNotFound        = "not_found"
	wsCodeAlreadyExists   = "already_exists"
	wsCodeNotRunning      = "not_running"
	wsCodeInternal        = "internal_error"
	wsCodeInvalidArgument = "invalid_argument"
	wsCodeAmbiguous       = "ambiguous"
)

type webOptions struct {
	addr string
}

type wsHello struct {
	Type        string `json:"type"`
	Coordinator string `json:"coordinator,omitempty"`
	Session     string `json:"session"`
	Cols        int32  `json:"cols,omitempty"`
	Rows        int32  `json:"rows,omitempty"`
}

type wsClientMessage struct {
	Type string `json:"type"`
	Kind string `json:"kind,omitempty"`
	Data string `json:"data,omitempty"`
	Cols int32  `json:"cols,omitempty"`
	Rows int32  `json:"rows,omitempty"`
}

type wsReady struct {
	Type        string `json:"type"`
	Coordinator string `json:"coordinator"`
	Session     string `json:"session"`
	Cols        int32  `json:"cols"`
	Rows        int32  `json:"rows"`
}

type wsErrorMessage struct {
	Type    string `json:"type"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

type wsCursor struct {
	X int32 `json:"x"`
	Y int32 `json:"y"`
}

type wsScreenSnapshot struct {
	Cols   int32      `json:"cols"`
	Cursor wsCursor   `json:"cursor"`
	Rows   [][]wsCell `json:"rows"`
}

type wsScreenFullMessage struct {
	Type   string           `json:"type"`
	Screen wsScreenSnapshot `json:"screen"`
}

type wsRowDelta struct {
	Y     int32    `json:"y"`
	Cells []wsCell `json:"cells"`
}

type wsScreenDelta struct {
	Cursor wsCursor     `json:"cursor"`
	Rows   []wsRowDelta `json:"rows"`
}

type wsScreenDeltaMessage struct {
	Type  string        `json:"type"`
	Delta wsScreenDelta `json:"delta"`
}

type wsSessionExitedMessage struct {
	Type     string `json:"type"`
	ExitCode int32  `json:"exit_code"`
}

type wsCell struct {
	Char       string
	FgColor    int32
	BgColor    int32
	Attributes uint32
}

func (c wsCell) MarshalJSON() ([]byte, error) {
	return json.Marshal([]any{c.Char, c.FgColor, c.BgColor, c.Attributes})
}

type wsProtocolError struct {
	Code    string
	Message string
}

func (e wsProtocolError) Error() string {
	return e.Message
}

type wsSender struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

func (s *wsSender) sendJSON(ctx context.Context, value any) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.conn.Write(ctx, websocket.MessageText, payload)
}

type wsScreenState struct {
	cols     int32
	rows     int32
	cursor   wsCursor
	rowsData [][]wsCell
}

func newWebCmd() *cobra.Command {
	opts := webOptions{}
	cmd := &cobra.Command{
		Use:   "web",
		Short: "Serve the web UI",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runWeb(opts)
		},
	}

	cmd.Flags().StringVar(&opts.addr, "addr", ":8080", "address to listen on")

	return cmd
}

func runWeb(opts webOptions) error {
	dist, err := fs.Sub(webassets.DistFS, "dist")
	if err != nil {
		return err
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handleWebsocket)
	mux.Handle("/", http.FileServer(http.FS(dist)))

	srv := &http.Server{
		Addr:    opts.addr,
		Handler: mux,
	}

	return srv.ListenAndServe()
}

func handleWebsocket(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		CompressionMode: websocket.CompressionContextTakeover,
	})
	if err != nil {
		return
	}
	defer conn.Close(websocket.StatusNormalClosure, "")

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	sender := &wsSender{conn: conn}

	hello, err := readHello(ctx, conn)
	if err != nil {
		_ = sendWSError(ctx, sender, err)
		return
	}

	target, err := resolveWebTarget(ctx, hello)
	if err != nil {
		_ = sendWSError(ctx, sender, err)
		return
	}

	grpcConn, err := dialClient(ctx, target.Coordinator.Path)
	if err != nil {
		_ = sendWSError(ctx, sender, err)
		return
	}
	defer grpcConn.Close()

	client := proto.NewVTRClient(grpcConn)

	if hello.Cols > 0 && hello.Rows > 0 {
		if err := resizeSession(ctx, client, target.Session, hello.Cols, hello.Rows); err != nil {
			_ = sendWSError(ctx, sender, err)
			return
		}
	}

	streamCtx, streamCancel := context.WithCancel(ctx)
	defer streamCancel()
	stream, err := client.Subscribe(streamCtx, &proto.SubscribeRequest{
		Name:                 target.Session,
		IncludeScreenUpdates: true,
		IncludeRawOutput:     false,
	})
	if err != nil {
		_ = sendWSError(ctx, sender, err)
		return
	}

	errCh := make(chan error, 2)
	go func() {
		errCh <- streamToWeb(ctx, sender, stream, target)
	}()
	go func() {
		errCh <- handleWebInput(ctx, conn, client, target.Session)
	}()

	err = <-errCh
	cancel()
	if err == nil || errors.Is(err, context.Canceled) || isNormalWSClose(err) {
		return
	}
	_ = sendWSError(ctx, sender, err)
}

func readHello(ctx context.Context, conn *websocket.Conn) (wsHello, error) {
	msgType, data, err := conn.Read(ctx)
	if err != nil {
		return wsHello{}, err
	}
	if msgType != websocket.MessageText {
		return wsHello{}, wsProtocolError{Code: wsCodeInvalidArgument, Message: "hello must be text"}
	}
	var hello wsHello
	if err := json.Unmarshal(data, &hello); err != nil {
		return wsHello{}, wsProtocolError{Code: wsCodeInvalidArgument, Message: "invalid hello JSON"}
	}
	if hello.Type != "hello" {
		return wsHello{}, wsProtocolError{Code: wsCodeInvalidArgument, Message: "expected hello message"}
	}
	hello.Session = strings.TrimSpace(hello.Session)
	hello.Coordinator = strings.TrimSpace(hello.Coordinator)
	if hello.Session == "" {
		return wsHello{}, wsProtocolError{Code: wsCodeInvalidArgument, Message: "session is required"}
	}
	if hello.Cols < 0 || hello.Rows < 0 {
		return wsHello{}, wsProtocolError{Code: wsCodeInvalidArgument, Message: "cols and rows must be >= 0"}
	}
	return hello, nil
}

func resolveWebTarget(ctx context.Context, hello wsHello) (sessionTarget, error) {
	cfg, _, err := loadConfigWithPath()
	if err != nil {
		return sessionTarget{}, err
	}
	coords, err := resolveCoordinatorRefs(cfg)
	if err != nil {
		return sessionTarget{}, err
	}
	coords = coordinatorsOrDefault(coords)

	if hello.Coordinator != "" {
		if _, _, ok := parseSessionRef(hello.Session); ok {
			return sessionTarget{}, wsProtocolError{Code: wsCodeInvalidArgument, Message: "session must not include coordinator prefix"}
		}
		coord, err := findCoordinatorByName(coords, hello.Coordinator)
		if err != nil {
			return sessionTarget{}, wrapResolveError(err)
		}
		return sessionTarget{Coordinator: coord, Session: hello.Session}, nil
	}

	target, err := resolveSessionTarget(ctx, coords, "", hello.Session)
	if err != nil {
		return sessionTarget{}, wrapResolveError(err)
	}
	return target, nil
}

func wrapResolveError(err error) error {
	if err == nil {
		return nil
	}
	msg := err.Error()
	lower := strings.ToLower(msg)
	switch {
	case strings.Contains(lower, "ambiguous") || strings.Contains(lower, "multiple coordinators"):
		return wsProtocolError{Code: wsCodeAmbiguous, Message: msg}
	case strings.Contains(lower, "not found") || strings.Contains(lower, "unknown coordinator") || strings.Contains(lower, "no coordinators configured"):
		return wsProtocolError{Code: wsCodeNotFound, Message: msg}
	default:
		return err
	}
}

func resizeSession(ctx context.Context, client proto.VTRClient, session string, cols, rows int32) error {
	if cols <= 0 || rows <= 0 {
		return wsProtocolError{Code: wsCodeInvalidArgument, Message: "resize requires cols and rows"}
	}
	ctxTimeout, cancel := context.WithTimeout(ctx, rpcTimeout)
	defer cancel()
	_, err := client.Resize(ctxTimeout, &proto.ResizeRequest{
		Name: session,
		Cols: cols,
		Rows: rows,
	})
	return err
}

func handleWebInput(ctx context.Context, conn *websocket.Conn, client proto.VTRClient, session string) error {
	for {
		msgType, data, err := conn.Read(ctx)
		if err != nil {
			return err
		}
		if msgType != websocket.MessageText {
			return wsProtocolError{Code: wsCodeInvalidArgument, Message: "messages must be text"}
		}
		var msg wsClientMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			return wsProtocolError{Code: wsCodeInvalidArgument, Message: "invalid message JSON"}
		}
		switch msg.Type {
		case "input":
			if err := handleInputMessage(ctx, client, session, msg); err != nil {
				return err
			}
		case "resize":
			if err := resizeSession(ctx, client, session, msg.Cols, msg.Rows); err != nil {
				return err
			}
		default:
			return wsProtocolError{Code: wsCodeInvalidArgument, Message: fmt.Sprintf("unknown message type %q", msg.Type)}
		}
	}
}

func handleInputMessage(ctx context.Context, client proto.VTRClient, session string, msg wsClientMessage) error {
	kind := strings.TrimSpace(msg.Kind)
	switch kind {
	case "text":
		ctxTimeout, cancel := context.WithTimeout(ctx, rpcTimeout)
		defer cancel()
		_, err := client.SendText(ctxTimeout, &proto.SendTextRequest{
			Name: session,
			Text: msg.Data,
		})
		return err
	case "key":
		ctxTimeout, cancel := context.WithTimeout(ctx, rpcTimeout)
		defer cancel()
		_, err := client.SendKey(ctxTimeout, &proto.SendKeyRequest{
			Name: session,
			Key:  msg.Data,
		})
		return err
	default:
		return wsProtocolError{Code: wsCodeInvalidArgument, Message: fmt.Sprintf("unknown input kind %q", msg.Kind)}
	}
}

func streamToWeb(ctx context.Context, sender *wsSender, stream proto.VTR_SubscribeClient, target sessionTarget) error {
	var prev wsScreenState
	hasPrev := false
	readySent := false
	for {
		event, err := stream.Recv()
		if err != nil {
			if errors.Is(err, io.EOF) || errors.Is(err, context.Canceled) {
				return nil
			}
			return err
		}
		switch ev := event.Event.(type) {
		case *proto.SubscribeEvent_ScreenUpdate:
			screen := ev.ScreenUpdate.GetScreen()
			if screen == nil {
				continue
			}
			current := screenStateFromProto(screen)
			if !readySent {
				ready := wsReady{
					Type:        "ready",
					Coordinator: target.Coordinator.Name,
					Session:     target.Session,
					Cols:        current.cols,
					Rows:        current.rows,
				}
				if err := sender.sendJSON(ctx, ready); err != nil {
					return err
				}
				readySent = true
			}
			if !hasPrev || prev.cols != current.cols || prev.rows != current.rows {
				msg := wsScreenFullMessage{
					Type: "screen_full",
					Screen: wsScreenSnapshot{
						Cols:   current.cols,
						Cursor: current.cursor,
						Rows:   current.rowsData,
					},
				}
				if err := sender.sendJSON(ctx, msg); err != nil {
					return err
				}
				prev = current
				hasPrev = true
				continue
			}
			rowDeltas := diffScreenRows(prev.rowsData, current.rowsData)
			cursorChanged := prev.cursor != current.cursor
			if cursorChanged || len(rowDeltas) > 0 {
				msg := wsScreenDeltaMessage{
					Type: "screen_delta",
					Delta: wsScreenDelta{
						Cursor: current.cursor,
						Rows:   rowDeltas,
					},
				}
				if err := sender.sendJSON(ctx, msg); err != nil {
					return err
				}
			}
			prev = current
		case *proto.SubscribeEvent_SessionExited:
			msg := wsSessionExitedMessage{
				Type:     "session_exited",
				ExitCode: ev.SessionExited.GetExitCode(),
			}
			if err := sender.sendJSON(ctx, msg); err != nil {
				return err
			}
			return nil
		case *proto.SubscribeEvent_RawOutput:
			// Ignored for the web bridge.
		}
	}
}

func screenStateFromProto(screen *proto.GetScreenResponse) wsScreenState {
	cols := screen.GetCols()
	rows := screen.GetRows()
	if cols < 0 {
		cols = 0
	}
	if rows < 0 {
		rows = 0
	}
	rowCount := int(rows)
	colCount := int(cols)
	rowsData := make([][]wsCell, rowCount)
	screenRows := screen.GetScreenRows()
	for y := 0; y < rowCount; y++ {
		rowCells := make([]wsCell, colCount)
		if y < len(screenRows) {
			cells := screenRows[y].GetCells()
			for x := 0; x < colCount; x++ {
				if x < len(cells) {
					rowCells[x] = wsCellFromProto(cells[x])
				}
			}
		}
		rowsData[y] = rowCells
	}
	return wsScreenState{
		cols:     cols,
		rows:     rows,
		cursor:   wsCursor{X: screen.GetCursorX(), Y: screen.GetCursorY()},
		rowsData: rowsData,
	}
}

func wsCellFromProto(cell *proto.ScreenCell) wsCell {
	if cell == nil {
		return wsCell{}
	}
	return wsCell{
		Char:       cell.GetChar(),
		FgColor:    cell.GetFgColor(),
		BgColor:    cell.GetBgColor(),
		Attributes: cell.GetAttributes(),
	}
}

func diffScreenRows(prev, current [][]wsCell) []wsRowDelta {
	rowCount := len(current)
	if rowCount == 0 {
		return nil
	}
	deltas := make([]wsRowDelta, 0, rowCount)
	for y := 0; y < rowCount; y++ {
		row := current[y]
		if y >= len(prev) || !rowsEqual(prev[y], row) {
			deltas = append(deltas, wsRowDelta{Y: int32(y), Cells: row})
		}
	}
	return deltas
}

func rowsEqual(left, right []wsCell) bool {
	if len(left) != len(right) {
		return false
	}
	for i := range left {
		if left[i] != right[i] {
			return false
		}
	}
	return true
}

func sendWSError(ctx context.Context, sender *wsSender, err error) error {
	if err == nil {
		return nil
	}
	code := wsErrorCode(err)
	if code == "" {
		return nil
	}
	return sender.sendJSON(ctx, wsErrorMessage{
		Type:    "error",
		Code:    code,
		Message: err.Error(),
	})
}

func wsErrorCode(err error) string {
	if err == nil {
		return ""
	}
	var wsErr wsProtocolError
	if errors.As(err, &wsErr) {
		return wsErr.Code
	}
	if errors.Is(err, context.Canceled) {
		return ""
	}
	if st, ok := status.FromError(err); ok {
		switch st.Code() {
		case codes.NotFound:
			return wsCodeNotFound
		case codes.AlreadyExists:
			return wsCodeAlreadyExists
		case codes.FailedPrecondition:
			return wsCodeNotRunning
		case codes.InvalidArgument:
			return wsCodeInvalidArgument
		default:
			return wsCodeInternal
		}
	}
	return wsCodeInternal
}

func isNormalWSClose(err error) bool {
	code := websocket.CloseStatus(err)
	switch code {
	case websocket.StatusNormalClosure, websocket.StatusGoingAway, websocket.StatusNoStatusRcvd:
		return true
	default:
		return false
	}
}
