package main

import (
	"context"
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
	statuspb "google.golang.org/genproto/googleapis/rpc/status"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	goproto "google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
	"nhooyr.io/websocket"
)

type webOptions struct {
	addr         string
	socket       string
	coordinators []string
}

type webResolver struct {
	coords       []coordinatorRef
	allowDefault bool
}

func (r webResolver) coordinators() ([]coordinatorRef, error) {
	if len(r.coords) == 0 && !r.allowDefault {
		return nil, errors.New("no coordinators configured")
	}
	if r.allowDefault {
		return coordinatorsOrDefault(r.coords), nil
	}
	return r.coords, nil
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
	opts := webOptions{}
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
	cmd.Flags().StringVar(&opts.socket, "socket", "", "path to coordinator socket")
	cmd.Flags().StringArrayVar(&opts.coordinators, "coordinator", nil, "coordinator socket path or glob (repeatable)")

	return cmd
}

func runWeb(opts webOptions) error {
	dist, err := fs.Sub(webassets.DistFS, "dist")
	if err != nil {
		return err
	}

	resolver, err := newWebResolver(opts)
	if err != nil {
		return err
	}

	mux := http.NewServeMux()
	wsHandler := handleWebsocket(resolver)
	mux.HandleFunc("/api/ws", wsHandler)
	mux.HandleFunc("/ws", wsHandler)
	mux.Handle("/", http.FileServer(http.FS(dist)))

	srv := &http.Server{
		Addr:    opts.addr,
		Handler: mux,
	}

	return srv.ListenAndServe()
}

func handleWebsocket(resolver webResolver) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		target, err := resolveWebTarget(ctx, hello.GetName(), resolver)
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

		streamCtx, streamCancel := context.WithCancel(ctx)
		defer streamCancel()
		stream, err := client.Subscribe(streamCtx, &proto.SubscribeRequest{
			Name:                 target.Session,
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
			errCh <- handleWebInput(ctx, conn, client, target.Session)
		}()

		err = <-errCh
		cancel()
		if err == nil || errors.Is(err, context.Canceled) || isNormalWSClose(err) {
			return
		}
		_ = sendWSError(ctx, sender, err)
	}
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
	hello.Name = strings.TrimSpace(hello.Name)
	if hello.Name == "" {
		return nil, wsProtocolError{Code: codes.InvalidArgument, Message: "session is required"}
	}
	if !hello.IncludeScreenUpdates && !hello.IncludeRawOutput {
		return nil, wsProtocolError{Code: codes.InvalidArgument, Message: "subscribe requires screen updates or raw output"}
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

func resolveWebTarget(ctx context.Context, sessionRef string, resolver webResolver) (sessionTarget, error) {
	coords, err := resolver.coordinators()
	if err != nil {
		return sessionTarget{}, err
	}
	sessionRef = strings.TrimSpace(sessionRef)
	if sessionRef == "" {
		return sessionTarget{}, wsProtocolError{Code: codes.InvalidArgument, Message: "session is required"}
	}
	target, err := resolveSessionTarget(ctx, coords, "", sessionRef)
	if err != nil {
		return sessionTarget{}, wrapResolveError(err)
	}
	return target, nil
}

func newWebResolver(opts webOptions) (webResolver, error) {
	if opts.socket != "" && len(opts.coordinators) > 0 {
		return webResolver{}, errors.New("cannot use --socket with --coordinator")
	}
	if opts.socket != "" {
		return webResolver{
			coords: []coordinatorRef{{
				Name: coordinatorName(opts.socket),
				Path: opts.socket,
			}},
		}, nil
	}
	if len(opts.coordinators) > 0 {
		coords, err := resolveCoordinatorOverrides(opts.coordinators)
		if err != nil {
			return webResolver{}, err
		}
		return webResolver{coords: coords}, nil
	}

	cfg, _, err := loadConfigWithPath()
	if err != nil {
		return webResolver{}, err
	}
	coords, err := resolveCoordinatorRefs(cfg)
	if err != nil {
		return webResolver{}, err
	}
	return webResolver{coords: coords, allowDefault: true}, nil
}

func resolveCoordinatorOverrides(paths []string) ([]coordinatorRef, error) {
	cfg := &clientConfig{Coordinators: make([]coordinatorConfig, 0, len(paths))}
	for _, path := range paths {
		cfg.Coordinators = append(cfg.Coordinators, coordinatorConfig{Path: path})
	}
	return resolveCoordinatorRefs(cfg)
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

func resizeSession(ctx context.Context, client proto.VTRClient, session string, cols, rows int32) error {
	if cols <= 0 || rows <= 0 {
		return wsProtocolError{Code: codes.InvalidArgument, Message: "resize requires cols and rows"}
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
			defer cancel()
			_, err := client.SendText(ctxTimeout, &proto.SendTextRequest{
				Name: session,
				Text: m.GetText(),
			})
			if err != nil {
				return err
			}
		case *proto.SendKeyRequest:
			ctxTimeout, cancel := context.WithTimeout(ctx, rpcTimeout)
			defer cancel()
			_, err := client.SendKey(ctxTimeout, &proto.SendKeyRequest{
				Name: session,
				Key:  m.GetKey(),
			})
			if err != nil {
				return err
			}
		case *proto.SendBytesRequest:
			ctxTimeout, cancel := context.WithTimeout(ctx, rpcTimeout)
			defer cancel()
			_, err := client.SendBytes(ctxTimeout, &proto.SendBytesRequest{
				Name: session,
				Data: m.GetData(),
			})
			if err != nil {
				return err
			}
		case *proto.ResizeRequest:
			if err := resizeSession(ctx, client, session, m.GetCols(), m.GetRows()); err != nil {
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
