package webtransport

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	proto "github.com/advait/vtrpc/proto"
	webassets "github.com/advait/vtrpc/web"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	statuspb "google.golang.org/genproto/googleapis/rpc/status"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	goproto "google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
	"nhooyr.io/websocket"
)

type Options struct {
	Addr       string
	Dev        bool
	DevServer  string
	Version    string
	RPCTimeout time.Duration
	LogResize  bool
}

type HubTarget struct {
	Name string
	Path string
}

type HubResolver interface {
	HubTarget() (HubTarget, error)
}

type Dialer func(ctx context.Context, addr string) (*grpc.ClientConn, error)

type deps struct {
	opts     Options
	resolver HubResolver
	dial     Dialer
}

type wsProtocolError struct {
	Code    codes.Code
	Message string
}

func (e wsProtocolError) Error() string {
	return e.Message
}

type wsSender struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

var wsForcedCloseCount atomic.Int64
var wsOwnedSessionDeleteCount atomic.Int64
var webOwnedSessions sync.Map

func markWebOwnedSession(id string) {
	sessionID := strings.TrimSpace(id)
	if sessionID == "" {
		return
	}
	webOwnedSessions.Store(sessionID, struct{}{})
}

func clearWebOwnedSession(id string) {
	sessionID := strings.TrimSpace(id)
	if sessionID == "" {
		return
	}
	webOwnedSessions.Delete(sessionID)
}

func isWebOwnedSession(id string) bool {
	sessionID := strings.TrimSpace(id)
	if sessionID == "" {
		return false
	}
	_, ok := webOwnedSessions.Load(sessionID)
	return ok
}

func (s *wsSender) sendProto(ctx context.Context, msg goproto.Message) error {
	envelope, err := anypb.New(msg)
	if err != nil {
		return err
	}
	payload, err := goproto.Marshal(envelope)
	if err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.conn.Write(ctx, websocket.MessageBinary, payload)
}

func NewHandler(opts Options, resolver HubResolver, dial Dialer) (http.Handler, error) {
	d := deps{opts: opts, resolver: resolver, dial: dial}
	mux := http.NewServeMux()
	wsHandler := handleWebsocket(d)
	mux.HandleFunc("/api/ws", wsHandler)
	mux.HandleFunc("/ws", wsHandler)
	sessionsWsHandler := handleWebSessionsStream(d)
	mux.HandleFunc("/api/ws/sessions", sessionsWsHandler)
	mux.HandleFunc("/ws/sessions", sessionsWsHandler)
	mux.HandleFunc("/api/info", handleWebInfo(d))
	mux.HandleFunc("/api/sessions", handleWebSessions(d))
	mux.HandleFunc("/api/sessions/action", handleWebSessionAction(d))
	if opts.Dev {
		proxy, target, err := newViteProxy(opts.DevServer)
		if err != nil {
			return nil, err
		}
		fmt.Printf("vtr web dev proxying to %s\n", target.String())
		mux.Handle("/", proxy)
	} else {
		dist, err := fs.Sub(webassets.DistFS, "dist")
		if err != nil {
			return nil, err
		}
		mux.Handle("/", http.FileServer(http.FS(dist)))
	}
	return otelhttp.NewHandler(mux, "vtr.http"), nil
}

func NewServer(opts Options, resolver HubResolver, dial Dialer) (*http.Server, error) {
	handler, err := NewHandler(opts, resolver, dial)
	if err != nil {
		return nil, err
	}
	srv := &http.Server{
		Addr:    opts.Addr,
		Handler: handler,
	}
	return srv, nil
}

const DefaultViteDevServer = "http://127.0.0.1:5173"

func EnvBool(name string, fallback bool) bool {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(raw)
	if err != nil {
		return fallback
	}
	return parsed
}

func EnvString(name, fallback string) string {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback
	}
	return raw
}

func newViteProxy(raw string) (*httputil.ReverseProxy, *url.URL, error) {
	target, err := parseDevServerURL(raw)
	if err != nil {
		return nil, nil, err
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		http.Error(w, fmt.Sprintf("vtr web dev proxy error: %v", err), http.StatusBadGateway)
	}
	return proxy, target, nil
}

func parseDevServerURL(raw string) (*url.URL, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return nil, errors.New("dev server URL is required when --dev is set")
	}
	if !strings.Contains(value, "://") {
		value = "http://" + value
	}
	target, err := url.Parse(value)
	if err != nil {
		return nil, err
	}
	if target.Scheme == "" || target.Host == "" {
		return nil, fmt.Errorf("invalid dev server URL %q", raw)
	}
	return target, nil
}

func handleWebsocket(d deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
			CompressionMode: websocket.CompressionDisabled,
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

		sessionRef := hello.GetSession()
		sessionID := strings.TrimSpace(sessionRef.GetId())
		if sessionID == "" {
			_ = sendWSError(ctx, sender, wsProtocolError{Code: codes.InvalidArgument, Message: "session id is required"})
			return
		}

		hubTarget, err := d.resolver.HubTarget()
		if err != nil {
			_ = sendWSError(ctx, sender, wrapResolveError(err))
			return
		}

		grpcConn, err := d.dial(ctx, hubTarget.Path)
		if err != nil {
			_ = sendWSError(ctx, sender, err)
			return
		}
		defer grpcConn.Close()

		client := proto.NewVTRClient(grpcConn)
		removeOwnedSession := func(reason string) {
			removeCtx, removeCancel := context.WithTimeout(context.Background(), d.opts.RPCTimeout)
			defer removeCancel()
			_, removeErr := client.Remove(removeCtx, &proto.RemoveRequest{Session: sessionRef})
			if removeErr != nil && status.Code(removeErr) != codes.NotFound {
				slog.Warn(
					"ws owned session remove failed",
					"session_id", sessionID,
					"reason", reason,
					"err", removeErr,
				)
				return
			}
			clearWebOwnedSession(sessionID)
			deleteCount := wsOwnedSessionDeleteCount.Add(1)
			slog.Info(
				"ws owned session removed",
				"session_id", sessionID,
				"reason", reason,
				"delete_count", deleteCount,
			)
		}
		if isWebOwnedSession(sessionID) {
			defer removeOwnedSession("ws_closed_remove_session")
		}

		streamCtx, streamCancel := context.WithCancel(ctx)
		defer streamCancel()
		stream, err := client.Subscribe(streamCtx, &proto.SubscribeRequest{
			Session:              sessionRef,
			IncludeScreenUpdates: hello.GetIncludeScreenUpdates(),
			IncludeRawOutput:     hello.GetIncludeRawOutput(),
		})
		if err != nil {
			_ = sendWSError(ctx, sender, err)
			return
		}

		errCh := make(chan error, 2)
		go func() {
			errCh <- streamToWeb(ctx, sender, stream)
		}()
		go func() {
			errCh <- handleWebInput(ctx, conn, client, sessionRef, d.opts.RPCTimeout, d.opts.LogResize)
		}()

		err = <-errCh
		cancel()
		if err == nil || errors.Is(err, context.Canceled) || isNormalWSClose(err) {
			return
		}
		reason := wsCloseReason(err)
		forcedCloseCount := wsForcedCloseCount.Add(1)
		slog.Warn(
			"ws stream forced close",
			"session_id", sessionID,
			"reason", reason,
			"err", err,
			"forced_close_count", forcedCloseCount,
		)
		_ = sendWSError(ctx, sender, err)
		_ = conn.Close(websocket.StatusPolicyViolation, reason)
	}
}

func handleWebSessionsStream(d deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
			CompressionMode: websocket.CompressionDisabled,
		})
		if err != nil {
			return
		}
		defer conn.Close(websocket.StatusNormalClosure, "")

		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()

		sender := &wsSender{conn: conn}

		hello, err := readSessionsHello(ctx, conn)
		if err != nil {
			_ = sendWSError(ctx, sender, err)
			return
		}

		hubTarget, err := d.resolver.HubTarget()
		if err != nil {
			_ = sendWSError(ctx, sender, wrapResolveError(err))
			return
		}

		grpcConn, err := d.dial(ctx, hubTarget.Path)
		if err != nil {
			_ = sendWSError(ctx, sender, err)
			return
		}
		defer grpcConn.Close()

		client := proto.NewVTRClient(grpcConn)
		streamCtx, streamCancel := context.WithCancel(ctx)
		defer streamCancel()

		stream, err := client.SubscribeSessions(streamCtx, hello)
		if err != nil {
			_ = sendWSError(ctx, sender, err)
			return
		}

		err = streamSessionsToWeb(ctx, sender, stream)
		cancel()
		if err == nil || errors.Is(err, context.Canceled) || isNormalWSClose(err) {
			return
		}
		_ = sendWSError(ctx, sender, err)
	}
}

type webSession struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Status   string `json:"status"`
	Cols     int32  `json:"cols"`
	Rows     int32  `json:"rows"`
	Idle     bool   `json:"idle"`
	ExitCode int32  `json:"exit_code,omitempty"`
	Order    uint32 `json:"order"`
}

type webCoordinator struct {
	Name     string       `json:"name"`
	Path     string       `json:"path"`
	Sessions []webSession `json:"sessions"`
	Error    string       `json:"error,omitempty"`
}

type webSessionsResponse struct {
	Coordinators []webCoordinator `json:"coordinators"`
}

type webSessionCreateRequest struct {
	Name        string `json:"name"`
	Coordinator string `json:"coordinator,omitempty"`
	Command     string `json:"command,omitempty"`
	WorkingDir  string `json:"working_dir,omitempty"`
	Cols        int32  `json:"cols,omitempty"`
	Rows        int32  `json:"rows,omitempty"`
}

type webSessionCreateResponse struct {
	Coordinator string     `json:"coordinator"`
	Session     webSession `json:"session"`
}

type webSessionActionRequest struct {
	ID          string `json:"id,omitempty"`
	Coordinator string `json:"coordinator,omitempty"`
	Action      string `json:"action"`
	Key         string `json:"key,omitempty"`
	Signal      string `json:"signal,omitempty"`
	NewName     string `json:"new_name,omitempty"`
}

type webSessionActionResponse struct {
	OK bool `json:"ok"`
}

type webInfoResponse struct {
	Version string        `json:"version"`
	Web     webServerInfo `json:"web"`
	Hub     webHubInfo    `json:"hub"`
	Errors  webInfoErrors `json:"errors,omitempty"`
}

type webServerInfo struct {
	Addr string `json:"addr"`
	Dev  bool   `json:"dev"`
}

type webHubInfo struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

type webInfoErrors struct {
	Hub string `json:"hub,omitempty"`
}

func handleWebSessions(d deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handleWebSessionsList(w, r, d)
		case http.MethodPost:
			handleWebSessionCreate(w, r, d)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

func handleWebInfo(d deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		resp := webInfoResponse{
			Version: d.opts.Version,
			Web: webServerInfo{
				Addr: d.opts.Addr,
				Dev:  d.opts.Dev,
			},
		}
		hub, err := d.resolver.HubTarget()
		if err != nil {
			resp.Errors.Hub = wrapResolveError(err).Error()
		} else {
			resp.Hub = webHubInfo{
				Name: hub.Name,
				Path: hub.Path,
			}
		}
		writeWebJSON(w, resp)
	}
}

func handleWebSessionsList(w http.ResponseWriter, r *http.Request, d deps) {
	target, err := d.resolver.HubTarget()
	if err != nil {
		writeWebError(w, wrapResolveError(err))
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), d.opts.RPCTimeout)
	conn, err := d.dial(ctx, target.Path)
	cancel()
	if err != nil {
		writeWebError(w, err)
		return
	}
	defer conn.Close()

	client := proto.NewVTRClient(conn)
	ctx, cancel = context.WithTimeout(r.Context(), d.opts.RPCTimeout)
	defer cancel()
	stream, err := client.SubscribeSessions(ctx, &proto.SubscribeSessionsRequest{})
	if err != nil {
		writeWebError(w, err)
		return
	}
	snapshot, err := stream.Recv()
	if err != nil {
		if errors.Is(err, io.EOF) || errors.Is(err, context.Canceled) {
			writeWebJSON(w, webSessionsResponse{})
			return
		}
		writeWebError(w, err)
		return
	}

	writeWebJSON(w, webSessionsResponseFromSnapshot(snapshot))
}

func webSessionsResponseFromSnapshot(snapshot *proto.SessionsSnapshot) webSessionsResponse {
	if snapshot == nil {
		return webSessionsResponse{}
	}
	coords := snapshot.GetCoordinators()
	out := webSessionsResponse{Coordinators: make([]webCoordinator, 0, len(coords))}
	for _, coord := range coords {
		entry := webCoordinator{
			Name:  coord.GetName(),
			Path:  coord.GetPath(),
			Error: coord.GetError(),
		}
		sessions := coord.GetSessions()
		entry.Sessions = make([]webSession, 0, len(sessions))
		for _, session := range sessions {
			entry.Sessions = append(entry.Sessions, webSessionFromProto(session))
		}
		out.Coordinators = append(out.Coordinators, entry)
	}
	return out
}

func handleWebSessionCreate(w http.ResponseWriter, r *http.Request, d deps) {
	var req webSessionCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON payload", http.StatusBadRequest)
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		http.Error(w, "session name is required", http.StatusBadRequest)
		return
	}

	coordName := strings.TrimSpace(req.Coordinator)

	ctx, cancel := context.WithTimeout(r.Context(), d.opts.RPCTimeout)
	hubTarget, err := d.resolver.HubTarget()
	if err != nil {
		cancel()
		writeWebError(w, wrapResolveError(err))
		return
	}
	conn, err := d.dial(ctx, hubTarget.Path)
	cancel()
	if err != nil {
		writeWebError(w, err)
		return
	}
	defer conn.Close()

	client := proto.NewVTRClient(conn)
	spawnName := name
	if coordName != "" {
		prefix := coordName + ":"
		if !strings.HasPrefix(spawnName, prefix) {
			spawnName = prefix + spawnName
		}
	}
	ctx, cancel = context.WithTimeout(r.Context(), d.opts.RPCTimeout)
	resp, err := client.Spawn(ctx, &proto.SpawnRequest{
		Name:       spawnName,
		Command:    strings.TrimSpace(req.Command),
		WorkingDir: strings.TrimSpace(req.WorkingDir),
		Cols:       req.Cols,
		Rows:       req.Rows,
	})
	cancel()
	if err != nil {
		writeWebError(w, err)
		return
	}

	if coordName == "" {
		coordName = hubTarget.Name
	}
	markWebOwnedSession(resp.GetSession().GetId())
	writeWebJSON(w, webSessionCreateResponse{
		Coordinator: coordName,
		Session:     webSessionFromProto(resp.GetSession()),
	})
}

func handleWebSessionAction(d deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req webSessionActionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON payload", http.StatusBadRequest)
			return
		}

		action := strings.ToLower(strings.TrimSpace(req.Action))
		targetID := strings.TrimSpace(req.ID)
		if targetID == "" {
			http.Error(w, "session id is required", http.StatusBadRequest)
			return
		}
		if action == "" {
			http.Error(w, "action is required", http.StatusBadRequest)
			return
		}

		hubTarget, err := d.resolver.HubTarget()
		if err != nil {
			writeWebError(w, wrapResolveError(err))
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), d.opts.RPCTimeout)
		conn, err := d.dial(ctx, hubTarget.Path)
		cancel()
		if err != nil {
			writeWebError(w, err)
			return
		}
		defer conn.Close()

		client := proto.NewVTRClient(conn)
		coordName := strings.TrimSpace(req.Coordinator)
		sessionRef := &proto.SessionRef{Id: targetID, Coordinator: coordName}
		switch action {
		case "send_key":
			key := strings.TrimSpace(req.Key)
			if key == "" {
				http.Error(w, "key is required for send_key", http.StatusBadRequest)
				return
			}
			ctx, cancel = context.WithTimeout(r.Context(), d.opts.RPCTimeout)
			_, err = client.SendKey(ctx, &proto.SendKeyRequest{
				Session: sessionRef,
				Key:     key,
			})
			cancel()
		case "signal":
			sig := strings.TrimSpace(req.Signal)
			if sig == "" {
				sig = "TERM"
			}
			ctx, cancel = context.WithTimeout(r.Context(), d.opts.RPCTimeout)
			_, err = client.Kill(ctx, &proto.KillRequest{
				Session: sessionRef,
				Signal:  sig,
			})
			cancel()
		case "close":
			ctx, cancel = context.WithTimeout(r.Context(), d.opts.RPCTimeout)
			_, err = client.Close(ctx, &proto.CloseRequest{Session: sessionRef})
			cancel()
		case "remove":
			ctx, cancel = context.WithTimeout(r.Context(), d.opts.RPCTimeout)
			_, err = client.Remove(ctx, &proto.RemoveRequest{Session: sessionRef})
			cancel()
		case "rename":
			newName := strings.TrimSpace(req.NewName)
			if newName == "" {
				http.Error(w, "new name is required for rename", http.StatusBadRequest)
				return
			}
			ctx, cancel = context.WithTimeout(r.Context(), d.opts.RPCTimeout)
			_, err = client.Rename(ctx, &proto.RenameRequest{Session: sessionRef, NewName: newName})
			cancel()
		default:
			http.Error(w, fmt.Sprintf("unknown action %q", action), http.StatusBadRequest)
			return
		}
		if err != nil {
			writeWebError(w, err)
			return
		}
		if action == "remove" {
			clearWebOwnedSession(targetID)
		}

		writeWebJSON(w, webSessionActionResponse{OK: true})
	}
}

func webSessionFromProto(session *proto.Session) webSession {
	if session == nil {
		return webSession{}
	}
	return webSession{
		ID:       session.GetId(),
		Name:     session.GetName(),
		Status:   sessionStatusLabel(session),
		Cols:     session.GetCols(),
		Rows:     session.GetRows(),
		Idle:     session.GetIdle(),
		ExitCode: session.GetExitCode(),
		Order:    session.GetOrder(),
	}
}

func sessionStatusLabel(session *proto.Session) string {
	switch session.GetStatus() {
	case proto.SessionStatus_SESSION_STATUS_RUNNING:
		return "running"
	case proto.SessionStatus_SESSION_STATUS_CLOSING:
		return "closing"
	case proto.SessionStatus_SESSION_STATUS_EXITED:
		return "exited"
	default:
		return "unknown"
	}
}

func writeWebJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json")
	enc := json.NewEncoder(w)
	if err := enc.Encode(value); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func writeWebError(w http.ResponseWriter, err error) {
	code := http.StatusInternalServerError
	msg := err.Error()
	if errors.Is(err, context.Canceled) {
		code = http.StatusRequestTimeout
	} else {
		var wsErr wsProtocolError
		if errors.As(err, &wsErr) {
			switch wsErr.Code {
			case codes.InvalidArgument:
				code = http.StatusBadRequest
			case codes.NotFound:
				code = http.StatusNotFound
			case codes.FailedPrecondition:
				code = http.StatusPreconditionFailed
			default:
				code = http.StatusInternalServerError
			}
			msg = wsErr.Message
			http.Error(w, msg, code)
			return
		}
	}
	if st, ok := status.FromError(err); ok {
		switch st.Code() {
		case codes.InvalidArgument:
			code = http.StatusBadRequest
		case codes.NotFound:
			code = http.StatusNotFound
		case codes.AlreadyExists:
			code = http.StatusConflict
		case codes.FailedPrecondition:
			code = http.StatusPreconditionFailed
		case codes.Unavailable:
			code = http.StatusServiceUnavailable
		}
		msg = st.Message()
	}
	http.Error(w, msg, code)
}

func readHello(ctx context.Context, conn *websocket.Conn) (*proto.SubscribeRequest, error) {
	msgType, data, err := conn.Read(ctx)
	if err != nil {
		return nil, err
	}
	if msgType != websocket.MessageBinary {
		return nil, wsProtocolError{Code: codes.InvalidArgument, Message: "hello must be a protobuf binary frame"}
	}
	msg, err := unmarshalAny(data)
	if err != nil {
		return nil, err
	}
	hello, ok := msg.(*proto.SubscribeRequest)
	if !ok {
		return nil, wsProtocolError{Code: codes.InvalidArgument, Message: "expected SubscribeRequest hello"}
	}
	sessionID := strings.TrimSpace(hello.GetSession().GetId())
	if sessionID == "" {
		return nil, wsProtocolError{Code: codes.InvalidArgument, Message: "session id is required"}
	}
	if !hello.IncludeScreenUpdates && !hello.IncludeRawOutput {
		return nil, wsProtocolError{Code: codes.InvalidArgument, Message: "subscribe requires screen updates or raw output"}
	}
	return hello, nil
}

func readSessionsHello(ctx context.Context, conn *websocket.Conn) (*proto.SubscribeSessionsRequest, error) {
	msgType, data, err := conn.Read(ctx)
	if err != nil {
		return nil, err
	}
	if msgType != websocket.MessageBinary {
		return nil, wsProtocolError{Code: codes.InvalidArgument, Message: "hello must be a protobuf binary frame"}
	}
	msg, err := unmarshalAny(data)
	if err != nil {
		return nil, err
	}
	hello, ok := msg.(*proto.SubscribeSessionsRequest)
	if !ok {
		return nil, wsProtocolError{Code: codes.InvalidArgument, Message: "expected SubscribeSessionsRequest hello"}
	}
	return hello, nil
}

func unmarshalAny(data []byte) (goproto.Message, error) {
	var envelope anypb.Any
	if err := goproto.Unmarshal(data, &envelope); err != nil {
		return nil, wsProtocolError{Code: codes.InvalidArgument, Message: "invalid protobuf frame"}
	}
	msg, err := anypb.UnmarshalNew(&envelope, goproto.UnmarshalOptions{})
	if err != nil {
		return nil, wsProtocolError{Code: codes.InvalidArgument, Message: "unsupported message type"}
	}
	return msg, nil
}

func wrapResolveError(err error) error {
	if err == nil {
		return nil
	}
	msg := err.Error()
	lower := strings.ToLower(msg)
	switch {
	case strings.Contains(lower, "ambiguous") || strings.Contains(lower, "multiple coordinators"):
		return wsProtocolError{Code: codes.InvalidArgument, Message: msg}
	case strings.Contains(lower, "not found") || strings.Contains(lower, "unknown coordinator"):
		return wsProtocolError{Code: codes.NotFound, Message: msg}
	case strings.Contains(lower, "no coordinators configured"):
		return wsProtocolError{Code: codes.FailedPrecondition, Message: msg}
	default:
		return err
	}
}

func resizeSession(ctx context.Context, client proto.VTRClient, sessionRef *proto.SessionRef, cols, rows int32, timeout time.Duration) error {
	if cols <= 0 || rows <= 0 {
		return wsProtocolError{Code: codes.InvalidArgument, Message: "resize requires cols and rows"}
	}
	ctxTimeout, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	_, err := client.Resize(ctxTimeout, &proto.ResizeRequest{
		Session: sessionRef,
		Cols:    cols,
		Rows:    rows,
	})
	return err
}

func handleWebInput(ctx context.Context, conn *websocket.Conn, client proto.VTRClient, sessionRef *proto.SessionRef, timeout time.Duration, logResize bool) error {
	for {
		msgType, data, err := conn.Read(ctx)
		if err != nil {
			return err
		}
		if msgType != websocket.MessageBinary {
			return wsProtocolError{Code: codes.InvalidArgument, Message: "messages must be protobuf binary frames"}
		}
		msg, err := unmarshalAny(data)
		if err != nil {
			return err
		}
		switch m := msg.(type) {
		case *proto.SendTextRequest:
			ctxTimeout, cancel := context.WithTimeout(ctx, timeout)
			_, err := client.SendText(ctxTimeout, &proto.SendTextRequest{
				Session: sessionRef,
				Text:    m.GetText(),
			})
			cancel()
			if err != nil {
				return err
			}
		case *proto.SendKeyRequest:
			ctxTimeout, cancel := context.WithTimeout(ctx, timeout)
			_, err := client.SendKey(ctxTimeout, &proto.SendKeyRequest{
				Session: sessionRef,
				Key:     m.GetKey(),
			})
			cancel()
			if err != nil {
				return err
			}
		case *proto.SendBytesRequest:
			ctxTimeout, cancel := context.WithTimeout(ctx, timeout)
			_, err := client.SendBytes(ctxTimeout, &proto.SendBytesRequest{
				Session: sessionRef,
				Data:    m.GetData(),
			})
			cancel()
			if err != nil {
				return err
			}
		case *proto.ResizeRequest:
			if logResize {
				slog.Info(
					"resize web",
					"session", sessionRef.GetId(),
					"cols", m.GetCols(),
					"rows", m.GetRows(),
				)
			}
			if err := resizeSession(ctx, client, sessionRef, m.GetCols(), m.GetRows(), timeout); err != nil {
				return err
			}
		default:
			return wsProtocolError{Code: codes.InvalidArgument, Message: fmt.Sprintf("unsupported message type %T", msg)}
		}
	}
}

func streamToWeb(ctx context.Context, sender *wsSender, stream proto.VTR_SubscribeClient) error {
	for {
		event, err := stream.Recv()
		if err != nil {
			if errors.Is(err, io.EOF) || errors.Is(err, context.Canceled) {
				return nil
			}
			return err
		}
		if err := sender.sendProto(ctx, event); err != nil {
			return err
		}
	}
}

func streamSessionsToWeb(ctx context.Context, sender *wsSender, stream proto.VTR_SubscribeSessionsClient) error {
	for {
		snapshot, err := stream.Recv()
		if err != nil {
			if errors.Is(err, io.EOF) || errors.Is(err, context.Canceled) {
				return nil
			}
			return err
		}
		if err := sender.sendProto(ctx, snapshot); err != nil {
			return err
		}
	}
}

func sendWSError(ctx context.Context, sender *wsSender, err error) error {
	status := wsErrorStatus(err)
	if status == nil {
		return nil
	}
	return sender.sendProto(ctx, status)
}

func wsErrorStatus(err error) *statuspb.Status {
	if err == nil {
		return nil
	}
	if errors.Is(err, context.Canceled) {
		return nil
	}
	var wsErr wsProtocolError
	if errors.As(err, &wsErr) {
		return &statuspb.Status{
			Code:    int32(wsErr.Code),
			Message: wsErr.Message,
		}
	}
	if st, ok := status.FromError(err); ok {
		return &statuspb.Status{
			Code:    int32(st.Code()),
			Message: st.Message(),
		}
	}
	return &statuspb.Status{
		Code:    int32(codes.Internal),
		Message: err.Error(),
	}
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

func wsCloseReason(err error) string {
	if err == nil {
		return "stream_error"
	}
	if errors.Is(err, context.Canceled) {
		return "context_canceled"
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return "context_deadline"
	}
	if st, ok := status.FromError(err); ok {
		msg := strings.TrimSpace(st.Message())
		if msg != "" {
			return msg
		}
		return strings.ToLower(st.Code().String())
	}
	return "stream_error"
}
