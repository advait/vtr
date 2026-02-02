package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"

	proto "github.com/advait/vtrpc/proto"
	webassets "github.com/advait/vtrpc/web"
	"github.com/spf13/cobra"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	statuspb "google.golang.org/genproto/googleapis/rpc/status"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	goproto "google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
	"nhooyr.io/websocket"
)

type webOptions struct {
	addr      string
	hub       string
	dev       bool
	devServer string
}

type webResolver struct {
	cfg *clientConfig
	hub coordinatorRef
}

func (r webResolver) hubTarget() (coordinatorRef, error) {
	if strings.TrimSpace(r.hub.Path) != "" {
		return r.hub, nil
	}
	return resolveHubTarget(r.cfg, "")
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

func newWebCmd() *cobra.Command {
	opts := webOptions{
		dev:       envBool("VTR_WEB_DEV", false),
		devServer: envString("VTR_WEB_DEV_SERVER", defaultViteDevServer),
	}
	cmd := &cobra.Command{
		Use:   "web",
		Short: "Serve the web UI",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runWeb(opts)
		},
	}

	cmd.Flags().StringVar(&opts.addr, "listen", "127.0.0.1:8080", "address to listen on")
	cmd.Flags().StringVar(&opts.addr, "addr", "127.0.0.1:8080", "address to listen on (deprecated)")
	_ = cmd.Flags().MarkDeprecated("addr", "use --listen")
	cmd.Flags().StringVar(&opts.hub, "hub", "", "hub address (host:port)")
	cmd.Flags().BoolVar(&opts.dev, "dev", opts.dev, "serve the web UI via the Vite dev server (HMR)")
	cmd.Flags().StringVar(&opts.devServer, "dev-server", opts.devServer, "Vite dev server URL for --dev")

	return cmd
}

func runWeb(opts webOptions) error {
	resolver, err := newWebResolver(opts)
	if err != nil {
		return err
	}
	srv, err := newWebServer(opts, resolver)
	if err != nil {
		return err
	}

	url := webURL(opts.addr)
	fmt.Printf("vtr web listening on %s\n", url)
	if err := openBrowser(url); err != nil {
		fmt.Fprintf(os.Stderr, "vtr web: unable to open browser: %v\n", err)
	}

	return srv.ListenAndServe()
}

func newWebHandler(opts webOptions, resolver webResolver) (http.Handler, error) {
	mux := http.NewServeMux()
	wsHandler := handleWebsocket(resolver)
	mux.HandleFunc("/api/ws", wsHandler)
	mux.HandleFunc("/ws", wsHandler)
	sessionsWsHandler := handleWebSessionsStream(resolver)
	mux.HandleFunc("/api/ws/sessions", sessionsWsHandler)
	mux.HandleFunc("/ws/sessions", sessionsWsHandler)
	mux.HandleFunc("/api/info", handleWebInfo(opts, resolver))
	mux.HandleFunc("/api/sessions", handleWebSessions(resolver))
	mux.HandleFunc("/api/sessions/action", handleWebSessionAction(resolver))
	if opts.dev {
		proxy, target, err := newViteProxy(opts.devServer)
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

func newWebServer(opts webOptions, resolver webResolver) (*http.Server, error) {
	handler, err := newWebHandler(opts, resolver)
	if err != nil {
		return nil, err
	}
	srv := &http.Server{
		Addr:    opts.addr,
		Handler: handler,
	}
	return srv, nil
}

const defaultViteDevServer = "http://127.0.0.1:5173"

func envBool(name string, fallback bool) bool {
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

func envString(name, fallback string) string {
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

func webURL(addr string) string {
	if strings.Contains(addr, "://") {
		return addr
	}
	host := addr
	port := ""
	if splitHost, splitPort, err := net.SplitHostPort(addr); err == nil {
		host = splitHost
		port = splitPort
	}
	if port == "" {
		return "http://" + addr
	}
	if host == "" || host == "0.0.0.0" || host == "::" {
		host = "127.0.0.1"
	}
	if strings.Contains(host, ":") && !strings.HasPrefix(host, "[") {
		host = "[" + host + "]"
	}
	return fmt.Sprintf("http://%s:%s", host, port)
}

func openBrowser(url string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		return err
	}
	go func() {
		_ = cmd.Wait()
	}()
	return nil
}

func handleWebsocket(resolver webResolver) http.HandlerFunc {
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

		hubTarget, err := resolver.hubTarget()
		if err != nil {
			_ = sendWSError(ctx, sender, err)
			return
		}

		grpcConn, err := dialClient(ctx, hubTarget.Path, resolver.cfg)
		if err != nil {
			_ = sendWSError(ctx, sender, err)
			return
		}
		defer grpcConn.Close()

		client := proto.NewVTRClient(grpcConn)
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
			errCh <- handleWebInput(ctx, conn, client, sessionRef)
		}()

		err = <-errCh
		cancel()
		if err == nil || errors.Is(err, context.Canceled) || isNormalWSClose(err) {
			return
		}
		_ = sendWSError(ctx, sender, err)
	}
}

func handleWebSessionsStream(resolver webResolver) http.HandlerFunc {
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

		hubTarget, err := resolver.hubTarget()
		if err != nil {
			_ = sendWSError(ctx, sender, err)
			return
		}

		grpcConn, err := dialClient(ctx, hubTarget.Path, resolver.cfg)
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

func handleWebSessions(resolver webResolver) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handleWebSessionsList(w, r, resolver)
		case http.MethodPost:
			handleWebSessionCreate(w, r, resolver)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

func handleWebInfo(opts webOptions, resolver webResolver) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		resp := webInfoResponse{
			Version: Version,
			Web: webServerInfo{
				Addr: opts.addr,
				Dev:  opts.dev,
			},
		}
		hub, err := resolver.hubTarget()
		if err != nil {
			resp.Errors.Hub = err.Error()
		} else {
			resp.Hub = webHubInfo{
				Name: hub.Name,
				Path: hub.Path,
			}
		}
		writeWebJSON(w, resp)
	}
}

func handleWebSessionsList(w http.ResponseWriter, r *http.Request, resolver webResolver) {
	target, err := resolver.hubTarget()
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), rpcTimeout)
	conn, err := dialClient(ctx, target.Path, resolver.cfg)
	cancel()
	if err != nil {
		writeWebError(w, err)
		return
	}
	defer conn.Close()

	client := proto.NewVTRClient(conn)
	ctx, cancel = context.WithTimeout(r.Context(), rpcTimeout)
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

func handleWebSessionCreate(w http.ResponseWriter, r *http.Request, resolver webResolver) {
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

	ctx, cancel := context.WithTimeout(r.Context(), rpcTimeout)
	hubTarget, err := resolver.hubTarget()
	if err != nil {
		cancel()
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	conn, err := dialClient(ctx, hubTarget.Path, resolver.cfg)
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
	ctx, cancel = context.WithTimeout(r.Context(), rpcTimeout)
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
	writeWebJSON(w, webSessionCreateResponse{
		Coordinator: coordName,
		Session:     webSessionFromProto(resp.GetSession()),
	})
}

func handleWebSessionAction(resolver webResolver) http.HandlerFunc {
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

		hubTarget, err := resolver.hubTarget()
		if err != nil {
			writeWebError(w, err)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), rpcTimeout)
		conn, err := dialClient(ctx, hubTarget.Path, resolver.cfg)
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
			ctx, cancel = context.WithTimeout(r.Context(), rpcTimeout)
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
			ctx, cancel = context.WithTimeout(r.Context(), rpcTimeout)
			_, err = client.Kill(ctx, &proto.KillRequest{
				Session: sessionRef,
				Signal:  sig,
			})
			cancel()
		case "close":
			ctx, cancel = context.WithTimeout(r.Context(), rpcTimeout)
			_, err = client.Close(ctx, &proto.CloseRequest{Session: sessionRef})
			cancel()
		case "remove":
			ctx, cancel = context.WithTimeout(r.Context(), rpcTimeout)
			_, err = client.Remove(ctx, &proto.RemoveRequest{Session: sessionRef})
			cancel()
		case "rename":
			newName := strings.TrimSpace(req.NewName)
			if newName == "" {
				http.Error(w, "new name is required for rename", http.StatusBadRequest)
				return
			}
			ctx, cancel = context.WithTimeout(r.Context(), rpcTimeout)
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

func newWebResolver(opts webOptions) (webResolver, error) {
	cfg, _, err := loadConfigWithPath()
	if err != nil {
		return webResolver{}, err
	}
	hub, err := resolveHubTarget(cfg, opts.hub)
	if err != nil {
		return webResolver{}, err
	}
	return webResolver{hub: hub, cfg: cfg}, nil
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

func resizeSession(ctx context.Context, client proto.VTRClient, sessionRef *proto.SessionRef, cols, rows int32) error {
	if cols <= 0 || rows <= 0 {
		return wsProtocolError{Code: codes.InvalidArgument, Message: "resize requires cols and rows"}
	}
	ctxTimeout, cancel := context.WithTimeout(ctx, rpcTimeout)
	defer cancel()
	_, err := client.Resize(ctxTimeout, &proto.ResizeRequest{
		Session: sessionRef,
		Cols:    cols,
		Rows:    rows,
	})
	return err
}

func handleWebInput(ctx context.Context, conn *websocket.Conn, client proto.VTRClient, sessionRef *proto.SessionRef) error {
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
			ctxTimeout, cancel := context.WithTimeout(ctx, rpcTimeout)
			_, err := client.SendText(ctxTimeout, &proto.SendTextRequest{
				Session: sessionRef,
				Text:    m.GetText(),
			})
			cancel()
			if err != nil {
				return err
			}
		case *proto.SendKeyRequest:
			ctxTimeout, cancel := context.WithTimeout(ctx, rpcTimeout)
			_, err := client.SendKey(ctxTimeout, &proto.SendKeyRequest{
				Session: sessionRef,
				Key:     m.GetKey(),
			})
			cancel()
			if err != nil {
				return err
			}
		case *proto.SendBytesRequest:
			ctxTimeout, cancel := context.WithTimeout(ctx, rpcTimeout)
			_, err := client.SendBytes(ctxTimeout, &proto.SendBytesRequest{
				Session: sessionRef,
				Data:    m.GetData(),
			})
			cancel()
			if err != nil {
				return err
			}
		case *proto.ResizeRequest:
			if envBool("VTR_LOG_RESIZE", false) {
				log.Printf("resize web session=%s cols=%d rows=%d", sessionRef.GetId(), m.GetCols(), m.GetRows())
			}
			if err := resizeSession(ctx, client, sessionRef, m.GetCols(), m.GetRows()); err != nil {
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
