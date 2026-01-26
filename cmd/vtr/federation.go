package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"sort"
	"strings"
	"sync"
	"time"

	proto "github.com/advait/vtrpc/proto"
	"github.com/advait/vtrpc/server"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	goproto "google.golang.org/protobuf/proto"
)

type spokeTarget struct {
	Name string
	Addr string
}

type spokeDialer func(ctx context.Context, addr string) (*grpc.ClientConn, error)

type federatedServer struct {
	proto.UnimplementedVTRServer
	local     *server.GRPCServer
	localName string
	static    []spokeTarget
	registry  *server.SpokeRegistry
	dialer    spokeDialer
	tunnels   *tunnelRegistry
	logger    *slog.Logger
}

func newFederatedServer(local *server.GRPCServer, localName string, static []spokeTarget, registry *server.SpokeRegistry, dialer spokeDialer, logger *slog.Logger) *federatedServer {
	if logger == nil {
		logger = slog.Default()
	}
	return &federatedServer{
		local:     local,
		localName: strings.TrimSpace(localName),
		static:    static,
		registry:  registry,
		dialer:    dialer,
		tunnels:   newTunnelRegistry(),
		logger:    logger,
	}
}

func federationSpokesFromConfig(cfg *clientConfig) []spokeTarget {
	if cfg == nil || len(cfg.Federation.Spokes) == 0 {
		return nil
	}
	out := make([]spokeTarget, 0, len(cfg.Federation.Spokes))
	for _, entry := range cfg.Federation.Spokes {
		name := strings.TrimSpace(entry.Name)
		addr := strings.TrimSpace(entry.Address)
		if name == "" || addr == "" {
			continue
		}
		out = append(out, spokeTarget{Name: name, Addr: addr})
	}
	return out
}

func federatedCoordinatorRefs(localSocket string, static []spokeTarget, registry *server.SpokeRegistry, tunnels *tunnelRegistry) []coordinatorRef {
	refs := make([]coordinatorRef, 0, 1+len(static))
	socketPath := strings.TrimSpace(localSocket)
	if socketPath != "" {
		refs = append(refs, coordinatorRef{
			Name: coordinatorName(socketPath),
			Path: socketPath,
		})
	}
	seen := make(map[string]struct{}, len(refs))
	for _, ref := range refs {
		seen[ref.Name] = struct{}{}
	}
	targets := mergeSpokeTargets(static, registry, "", tunnelNames(tunnels))
	for _, target := range targets {
		if _, ok := seen[target.Name]; ok {
			continue
		}
		if strings.TrimSpace(target.Addr) != "" {
			refs = append(refs, coordinatorRef{Name: target.Name, Path: target.Addr})
			seen[target.Name] = struct{}{}
		}
	}
	return refs
}

func mergeSpokeTargets(static []spokeTarget, registry *server.SpokeRegistry, localName string, tunnels []string) []spokeTarget {
	targets := make(map[string]spokeTarget)
	localName = strings.TrimSpace(localName)
	for _, entry := range static {
		name := strings.TrimSpace(entry.Name)
		addr := strings.TrimSpace(entry.Addr)
		if name == "" || addr == "" {
			continue
		}
		if localName != "" && name == localName {
			continue
		}
		targets[name] = spokeTarget{Name: name, Addr: addr}
	}
	if registry != nil {
		for _, record := range registry.List() {
			if record.Info == nil {
				continue
			}
			name := strings.TrimSpace(record.Info.Name)
			addr := strings.TrimSpace(record.Info.GrpcAddr)
			if name == "" || addr == "" {
				continue
			}
			if localName != "" && name == localName {
				continue
			}
			targets[name] = spokeTarget{Name: name, Addr: addr}
		}
	}
	for _, entry := range tunnels {
		name := strings.TrimSpace(entry)
		if name == "" {
			continue
		}
		if localName != "" && name == localName {
			continue
		}
		if _, ok := targets[name]; ok {
			continue
		}
		targets[name] = spokeTarget{Name: name}
	}
	names := make([]string, 0, len(targets))
	for name := range targets {
		names = append(names, name)
	}
	sort.Strings(names)
	out := make([]spokeTarget, 0, len(names))
	for _, name := range names {
		out = append(out, targets[name])
	}
	return out
}

func (s *federatedServer) RegisterSpoke(ctx context.Context, req *proto.RegisterSpokeRequest) (*proto.RegisterSpokeResponse, error) {
	resp, err := s.local.RegisterSpoke(ctx, req)
	if resp != nil && resp.HubName == "" && s.localName != "" {
		resp.HubName = s.localName
	}
	return resp, err
}

func (s *federatedServer) Tunnel(stream proto.VTR_TunnelServer) error {
	if stream == nil {
		return status.Error(codes.InvalidArgument, "tunnel stream is required")
	}
	frame, err := stream.Recv()
	if err != nil {
		return err
	}
	if frame == nil || frame.GetHello() == nil {
		return status.Error(codes.InvalidArgument, "first tunnel frame must be hello")
	}
	name := strings.TrimSpace(frame.GetSpokeName())
	if name == "" {
		return status.Error(codes.InvalidArgument, "spoke_name is required")
	}
	endpoint := newTunnelEndpoint(name, stream, s.logger)
	if s.tunnels == nil {
		s.tunnels = newTunnelRegistry()
	}
	if prev := s.tunnels.Set(name, endpoint); prev != nil {
		prev.close(errors.New("replaced by new tunnel"))
	}
	defer func() {
		s.tunnels.Remove(name, endpoint)
		endpoint.close(nil)
	}()

	for {
		frame, err := stream.Recv()
		if err != nil {
			return err
		}
		if frame == nil {
			continue
		}
		switch {
		case frame.GetResponse() != nil || frame.GetEvent() != nil || frame.GetError() != nil:
			endpoint.dispatch(frame)
		default:
		}
	}
}

func (s *federatedServer) Spawn(ctx context.Context, req *proto.SpawnRequest) (*proto.SpawnResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.Spawn(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.Spawn(ctx, req)
	}
	reqCopy := *req
	reqCopy.Name = session
	resp, err := s.callSpawn(ctx, spoke, &reqCopy)
	if err != nil {
		return nil, err
	}
	if resp.Session != nil {
		resp.Session = prefixSession(spoke, resp.Session)
	}
	return resp, nil
}

func (s *federatedServer) List(ctx context.Context, _ *proto.ListRequest) (*proto.ListResponse, error) {
	localResp, err := s.local.List(ctx, &proto.ListRequest{})
	if err != nil {
		return nil, err
	}
	sessions := make([]*proto.Session, 0, len(localResp.GetSessions()))
	sessions = append(sessions, localResp.GetSessions()...)

	targets := s.spokeTargets()
	if len(targets) == 0 {
		return &proto.ListResponse{Sessions: sessions}, nil
	}

	var mu sync.Mutex
	var wg sync.WaitGroup
	for _, target := range targets {
		target := target
		wg.Add(1)
		go func() {
			defer wg.Done()
			resp, err := s.callList(ctx, target)
			if err != nil {
				s.logger.Warn("hub: spoke list failed", "spoke", target.Name, "addr", target.Addr, "err", err)
				return
			}
			for _, session := range resp.GetSessions() {
				mu.Lock()
				sessions = append(sessions, prefixSession(target.Name, session))
				mu.Unlock()
			}
		}()
	}
	wg.Wait()

	return &proto.ListResponse{Sessions: sessions}, nil
}

func (s *federatedServer) SubscribeSessions(req *proto.SubscribeSessionsRequest, stream proto.VTR_SubscribeSessionsServer) error {
	ctx := stream.Context()
	excludeExited := req != nil && req.ExcludeExited
	state := newFederatedSessionState()
	signal := newSignal()

	if localSessions, err := s.local.List(ctx, &proto.ListRequest{}); err == nil {
		state.setLocal(filterSessions(localSessions.GetSessions(), excludeExited))
	}

	go s.watchLocalSessions(ctx, excludeExited, state, signal)

	for _, target := range s.spokeTargets() {
		go s.watchSpokeSessions(ctx, target, excludeExited, state, signal)
	}

	if s.registry != nil {
		go s.watchRegistry(ctx, excludeExited, state, signal)
	}

	if err := stream.Send(&proto.SubscribeSessionsEvent{Sessions: state.snapshot()}); err != nil {
		return err
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-signal.ch:
			if err := stream.Send(&proto.SubscribeSessionsEvent{Sessions: state.snapshot()}); err != nil {
				return err
			}
		}
	}
}

func (s *federatedServer) watchLocalSessions(ctx context.Context, excludeExited bool, state *federatedSessionState, signal *updateSignal) {
	stream := &localSessionsStream{
		ctx: ctx,
		send: func(event *proto.SubscribeSessionsEvent) error {
			if event == nil {
				return nil
			}
			state.setLocal(filterSessions(event.GetSessions(), excludeExited))
			signal.pulse()
			return nil
		},
	}
	_ = s.local.SubscribeSessions(&proto.SubscribeSessionsRequest{ExcludeExited: excludeExited}, stream)
}

func (s *federatedServer) Info(ctx context.Context, req *proto.InfoRequest) (*proto.InfoResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.Info(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.Info(ctx, req)
	}
	resp, err := s.callInfo(ctx, spoke, session)
	if err != nil {
		return nil, err
	}
	if resp.Session != nil {
		resp.Session = prefixSession(spoke, resp.Session)
	}
	return resp, nil
}

func (s *federatedServer) Kill(ctx context.Context, req *proto.KillRequest) (*proto.KillResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.Kill(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.Kill(ctx, req)
	}
	reqCopy := *req
	reqCopy.Name = session
	return s.callKill(ctx, spoke, &reqCopy)
}

func (s *federatedServer) Close(ctx context.Context, req *proto.CloseRequest) (*proto.CloseResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.Close(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.Close(ctx, req)
	}
	reqCopy := *req
	reqCopy.Name = session
	return s.callClose(ctx, spoke, &reqCopy)
}

func (s *federatedServer) Remove(ctx context.Context, req *proto.RemoveRequest) (*proto.RemoveResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.Remove(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.Remove(ctx, req)
	}
	reqCopy := *req
	reqCopy.Name = session
	return s.callRemove(ctx, spoke, &reqCopy)
}

func (s *federatedServer) Rename(ctx context.Context, req *proto.RenameRequest) (*proto.RenameResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.Rename(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.Rename(ctx, req)
	}
	newName := strings.TrimSpace(req.NewName)
	if newName == "" {
		return nil, status.Error(codes.InvalidArgument, "new name is required")
	}
	if coord, name, ok := parseSessionRef(newName); ok {
		if coord != spoke {
			return nil, status.Error(codes.InvalidArgument, "new name must use the same spoke prefix")
		}
		newName = name
	}
	reqCopy := *req
	reqCopy.Name = session
	reqCopy.NewName = newName
	return s.callRename(ctx, spoke, &reqCopy)
}

func (s *federatedServer) GetScreen(ctx context.Context, req *proto.GetScreenRequest) (*proto.GetScreenResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.GetScreen(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.GetScreen(ctx, req)
	}
	reqCopy := *req
	reqCopy.Name = session
	resp, err := s.callGetScreen(ctx, spoke, &reqCopy)
	if err != nil {
		return nil, err
	}
	if resp != nil {
		resp.Name = prefixName(spoke, resp.Name)
	}
	return resp, nil
}

func (s *federatedServer) Grep(ctx context.Context, req *proto.GrepRequest) (*proto.GrepResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.Grep(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.Grep(ctx, req)
	}
	reqCopy := *req
	reqCopy.Name = session
	return s.callGrep(ctx, spoke, &reqCopy)
}

func (s *federatedServer) SendText(ctx context.Context, req *proto.SendTextRequest) (*proto.SendTextResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.SendText(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.SendText(ctx, req)
	}
	reqCopy := *req
	reqCopy.Name = session
	return s.callSendText(ctx, spoke, &reqCopy)
}

func (s *federatedServer) SendKey(ctx context.Context, req *proto.SendKeyRequest) (*proto.SendKeyResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.SendKey(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.SendKey(ctx, req)
	}
	reqCopy := *req
	reqCopy.Name = session
	return s.callSendKey(ctx, spoke, &reqCopy)
}

func (s *federatedServer) SendBytes(ctx context.Context, req *proto.SendBytesRequest) (*proto.SendBytesResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.SendBytes(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.SendBytes(ctx, req)
	}
	reqCopy := *req
	reqCopy.Name = session
	return s.callSendBytes(ctx, spoke, &reqCopy)
}

func (s *federatedServer) Resize(ctx context.Context, req *proto.ResizeRequest) (*proto.ResizeResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.Resize(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.Resize(ctx, req)
	}
	reqCopy := *req
	reqCopy.Name = session
	return s.callResize(ctx, spoke, &reqCopy)
}

func (s *federatedServer) WaitFor(ctx context.Context, req *proto.WaitForRequest) (*proto.WaitForResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.WaitFor(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.WaitFor(ctx, req)
	}
	reqCopy := *req
	reqCopy.Name = session
	return s.callWaitFor(ctx, spoke, &reqCopy)
}

func (s *federatedServer) WaitForIdle(ctx context.Context, req *proto.WaitForIdleRequest) (*proto.WaitForIdleResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.WaitForIdle(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.WaitForIdle(ctx, req)
	}
	reqCopy := *req
	reqCopy.Name = session
	return s.callWaitForIdle(ctx, spoke, &reqCopy)
}

func (s *federatedServer) Subscribe(req *proto.SubscribeRequest, stream proto.VTR_SubscribeServer) error {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.Subscribe(req, stream)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return err
	}
	if !routed {
		return s.local.Subscribe(req, stream)
	}

	reqCopy := *req
	reqCopy.Name = session
	if tunnel := s.tunnel(spoke); tunnel != nil {
		return tunnel.CallStream(stream.Context(), tunnelMethodSubscribe, &reqCopy, func(payload []byte) error {
			event := &proto.SubscribeEvent{}
			if err := goproto.Unmarshal(payload, event); err != nil {
				return err
			}
			prefixSubscribeEvent(spoke, event)
			return stream.Send(event)
		})
	}

	client, conn, err := s.dialSpoke(stream.Context(), spoke)
	if err != nil {
		return err
	}
	defer conn.Close()

	remote, err := client.Subscribe(stream.Context(), &reqCopy)
	if err != nil {
		return err
	}

	for {
		event, err := remote.Recv()
		if err != nil {
			if errors.Is(err, io.EOF) {
				return nil
			}
			return err
		}
		prefixSubscribeEvent(spoke, event)
		if err := stream.Send(event); err != nil {
			return err
		}
	}
}

func (s *federatedServer) DumpAsciinema(ctx context.Context, req *proto.DumpAsciinemaRequest) (*proto.DumpAsciinemaResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		return s.local.DumpAsciinema(ctx, req)
	}
	spoke, session, routed, err := s.routeSession(req.Name)
	if err != nil {
		return nil, err
	}
	if !routed {
		return s.local.DumpAsciinema(ctx, req)
	}
	reqCopy := *req
	reqCopy.Name = session
	return s.callDumpAsciinema(ctx, spoke, &reqCopy)
}

func (s *federatedServer) routeSession(name string) (string, string, bool, error) {
	coord, session, ok := parseSessionRef(name)
	if !ok {
		return "", name, false, nil
	}
	if coord != "" && coord == s.localName {
		return "", session, false, nil
	}
	if _, ok := s.resolveSpoke(coord); ok {
		return coord, session, true, nil
	}
	return "", "", false, status.Error(codes.NotFound, fmt.Sprintf("unknown coordinator %q", coord))
}

func (s *federatedServer) resolveSpoke(name string) (spokeTarget, bool) {
	for _, target := range s.spokeTargets() {
		if target.Name == name {
			return target, true
		}
	}
	return spokeTarget{}, false
}

func (s *federatedServer) spokeTargets() []spokeTarget {
	return mergeSpokeTargets(s.static, s.registry, s.localName, tunnelNames(s.tunnels))
}

func (s *federatedServer) tunnel(name string) *tunnelEndpoint {
	if s == nil || s.tunnels == nil {
		return nil
	}
	return s.tunnels.Get(name)
}

func (s *federatedServer) dialSpoke(ctx context.Context, name string) (proto.VTRClient, *grpc.ClientConn, error) {
	target, ok := s.resolveSpoke(name)
	if !ok {
		return nil, nil, status.Error(codes.NotFound, fmt.Sprintf("unknown coordinator %q", name))
	}
	if s.dialer == nil {
		return nil, nil, errors.New("spoke dialer not configured")
	}
	dialCtx, cancel := context.WithTimeout(ctx, dialTimeout)
	defer cancel()
	conn, err := s.dialer(dialCtx, target.Addr)
	if err != nil {
		return nil, nil, err
	}
	return proto.NewVTRClient(conn), conn, nil
}

func (s *federatedServer) callList(ctx context.Context, target spokeTarget) (*proto.ListResponse, error) {
	if tunnel := s.tunnel(target.Name); tunnel != nil {
		resp := &proto.ListResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodList, &proto.ListRequest{}, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	if s.dialer == nil {
		return nil, errors.New("spoke dialer not configured")
	}
	if strings.TrimSpace(target.Addr) == "" {
		return nil, errors.New("spoke address is required")
	}
	callCtx, cancel := context.WithTimeout(ctx, rpcTimeout)
	defer cancel()
	conn, err := s.dialer(callCtx, target.Addr)
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	client := proto.NewVTRClient(conn)
	resp, err := client.List(callCtx, &proto.ListRequest{})
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callSpawn(ctx context.Context, spoke string, req *proto.SpawnRequest) (*proto.SpawnResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.SpawnResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodSpawn, req, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.SpawnResponse, error) {
		return client.Spawn(ctx, req)
	})
}

func (s *federatedServer) callInfo(ctx context.Context, spoke, session string) (*proto.InfoResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.InfoResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodInfo, &proto.InfoRequest{Name: session}, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.InfoResponse, error) {
		return client.Info(ctx, &proto.InfoRequest{Name: session})
	})
}

func (s *federatedServer) callKill(ctx context.Context, spoke string, req *proto.KillRequest) (*proto.KillResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.KillResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodKill, req, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.KillResponse, error) {
		return client.Kill(ctx, req)
	})
}

func (s *federatedServer) callClose(ctx context.Context, spoke string, req *proto.CloseRequest) (*proto.CloseResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.CloseResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodClose, req, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.CloseResponse, error) {
		return client.Close(ctx, req)
	})
}

func (s *federatedServer) callRemove(ctx context.Context, spoke string, req *proto.RemoveRequest) (*proto.RemoveResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.RemoveResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodRemove, req, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.RemoveResponse, error) {
		return client.Remove(ctx, req)
	})
}

func (s *federatedServer) callRename(ctx context.Context, spoke string, req *proto.RenameRequest) (*proto.RenameResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.RenameResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodRename, req, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.RenameResponse, error) {
		return client.Rename(ctx, req)
	})
}

func (s *federatedServer) callGetScreen(ctx context.Context, spoke string, req *proto.GetScreenRequest) (*proto.GetScreenResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.GetScreenResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodGetScreen, req, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.GetScreenResponse, error) {
		return client.GetScreen(ctx, req)
	})
}

func (s *federatedServer) callGrep(ctx context.Context, spoke string, req *proto.GrepRequest) (*proto.GrepResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.GrepResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodGrep, req, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.GrepResponse, error) {
		return client.Grep(ctx, req)
	})
}

func (s *federatedServer) callSendText(ctx context.Context, spoke string, req *proto.SendTextRequest) (*proto.SendTextResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.SendTextResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodSendText, req, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.SendTextResponse, error) {
		return client.SendText(ctx, req)
	})
}

func (s *federatedServer) callSendKey(ctx context.Context, spoke string, req *proto.SendKeyRequest) (*proto.SendKeyResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.SendKeyResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodSendKey, req, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.SendKeyResponse, error) {
		return client.SendKey(ctx, req)
	})
}

func (s *federatedServer) callSendBytes(ctx context.Context, spoke string, req *proto.SendBytesRequest) (*proto.SendBytesResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.SendBytesResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodSendBytes, req, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.SendBytesResponse, error) {
		return client.SendBytes(ctx, req)
	})
}

func (s *federatedServer) callResize(ctx context.Context, spoke string, req *proto.ResizeRequest) (*proto.ResizeResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.ResizeResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodResize, req, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.ResizeResponse, error) {
		return client.Resize(ctx, req)
	})
}

func (s *federatedServer) callWaitFor(ctx context.Context, spoke string, req *proto.WaitForRequest) (*proto.WaitForResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.WaitForResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodWaitFor, req, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.WaitForResponse, error) {
		return client.WaitFor(ctx, req)
	})
}

func (s *federatedServer) callWaitForIdle(ctx context.Context, spoke string, req *proto.WaitForIdleRequest) (*proto.WaitForIdleResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.WaitForIdleResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodWaitForIdle, req, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.WaitForIdleResponse, error) {
		return client.WaitForIdle(ctx, req)
	})
}

func (s *federatedServer) callDumpAsciinema(ctx context.Context, spoke string, req *proto.DumpAsciinemaRequest) (*proto.DumpAsciinemaResponse, error) {
	if tunnel := s.tunnel(spoke); tunnel != nil {
		resp := &proto.DumpAsciinemaResponse{}
		if err := tunnel.CallUnary(ctx, tunnelMethodDumpAsciinema, req, resp); err != nil {
			return nil, err
		}
		return resp, nil
	}
	return callUnary(ctx, spoke, s, func(client proto.VTRClient) (*proto.DumpAsciinemaResponse, error) {
		return client.DumpAsciinema(ctx, req)
	})
}

func callUnary[T any](ctx context.Context, spoke string, srv *federatedServer, fn func(client proto.VTRClient) (*T, error)) (*T, error) {
	client, conn, err := srv.dialSpoke(ctx, spoke)
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	return fn(client)
}

type federatedSessionState struct {
	mu     sync.RWMutex
	local  []*proto.Session
	spokes map[string][]*proto.Session
}

func newFederatedSessionState() *federatedSessionState {
	return &federatedSessionState{spokes: make(map[string][]*proto.Session)}
}

func (s *federatedSessionState) setLocal(sessions []*proto.Session) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.local = sessions
}

func (s *federatedSessionState) setSpoke(name string, sessions []*proto.Session) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if sessions == nil {
		delete(s.spokes, name)
		return
	}
	s.spokes[name] = sessions
}

func (s *federatedSessionState) snapshot() []*proto.Session {
	s.mu.RLock()
	defer s.mu.RUnlock()
	count := len(s.local)
	for _, sessions := range s.spokes {
		count += len(sessions)
	}
	out := make([]*proto.Session, 0, count)
	out = append(out, s.local...)
	for _, sessions := range s.spokes {
		out = append(out, sessions...)
	}
	return out
}

type updateSignal struct {
	ch chan struct{}
	mu sync.Mutex
}

func newSignal() *updateSignal {
	return &updateSignal{ch: make(chan struct{}, 1)}
}

func (s *updateSignal) pulse() {
	s.mu.Lock()
	defer s.mu.Unlock()
	select {
	case s.ch <- struct{}{}:
	default:
	}
}

func (s *federatedServer) watchSpokeSessions(ctx context.Context, target spokeTarget, excludeExited bool, state *federatedSessionState, signal *updateSignal) {
	backoff := time.Second
	for {
		if ctx.Err() != nil {
			return
		}
		if tunnel := s.tunnel(target.Name); tunnel != nil {
			state.setSpoke(target.Name, nil)
			signal.pulse()
			err := tunnel.CallStream(ctx, tunnelMethodSubscribeSessions, &proto.SubscribeSessionsRequest{
				ExcludeExited: excludeExited,
			}, func(payload []byte) error {
				event := &proto.SubscribeSessionsEvent{}
				if err := goproto.Unmarshal(payload, event); err != nil {
					return err
				}
				state.setSpoke(target.Name, prefixSessions(target.Name, event.GetSessions(), excludeExited))
				signal.pulse()
				return nil
			})
			state.setSpoke(target.Name, nil)
			signal.pulse()
			if err != nil {
				if waitOrDone(ctx, backoff) {
					return
				}
				backoff = nextBackoff(backoff)
				continue
			}
			backoff = time.Second
			continue
		}

		if s.dialer == nil {
			state.setSpoke(target.Name, nil)
			signal.pulse()
			return
		}
		dialCtx, cancel := context.WithTimeout(ctx, rpcTimeout)
		conn, err := s.dialer(dialCtx, target.Addr)
		cancel()
		if err != nil {
			state.setSpoke(target.Name, nil)
			signal.pulse()
			if waitOrDone(ctx, backoff) {
				return
			}
			backoff = nextBackoff(backoff)
			continue
		}
		client := proto.NewVTRClient(conn)
		streamCtx, streamCancel := context.WithCancel(ctx)
		stream, err := client.SubscribeSessions(streamCtx, &proto.SubscribeSessionsRequest{
			ExcludeExited: excludeExited,
		})
		if err != nil {
			streamCancel()
			_ = conn.Close()
			state.setSpoke(target.Name, nil)
			signal.pulse()
			if waitOrDone(ctx, backoff) {
				return
			}
			backoff = nextBackoff(backoff)
			continue
		}

		state.setSpoke(target.Name, nil)
		signal.pulse()
		backoff = time.Second
		for {
			event, err := stream.Recv()
			if err != nil {
				streamCancel()
				_ = conn.Close()
				state.setSpoke(target.Name, nil)
				signal.pulse()
				break
			}
			state.setSpoke(target.Name, prefixSessions(target.Name, event.GetSessions(), excludeExited))
			signal.pulse()
		}
	}
}

func (s *federatedServer) watchRegistry(ctx context.Context, excludeExited bool, state *federatedSessionState, signal *updateSignal) {
	known := make(map[string]struct{})
	for _, target := range s.spokeTargets() {
		known[target.Name] = struct{}{}
	}
	ch := s.registry.Changed()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ch:
			ch = s.registry.Changed()
			for _, target := range s.spokeTargets() {
				if _, ok := known[target.Name]; ok {
					continue
				}
				known[target.Name] = struct{}{}
				go s.watchSpokeSessions(ctx, target, excludeExited, state, signal)
			}
		}
	}
}

func prefixSession(spoke string, session *proto.Session) *proto.Session {
	if session == nil {
		return nil
	}
	clone := *session
	clone.Name = prefixName(spoke, clone.Name)
	return &clone
}

func prefixSessions(spoke string, sessions []*proto.Session, excludeExited bool) []*proto.Session {
	if len(sessions) == 0 {
		return nil
	}
	out := make([]*proto.Session, 0, len(sessions))
	for _, session := range sessions {
		if session == nil {
			continue
		}
		if excludeExited && session.Status == proto.SessionStatus_SESSION_STATUS_EXITED {
			continue
		}
		out = append(out, prefixSession(spoke, session))
	}
	return out
}

func prefixName(spoke, name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return name
	}
	return fmt.Sprintf("%s:%s", spoke, name)
}

func filterSessions(sessions []*proto.Session, excludeExited bool) []*proto.Session {
	if !excludeExited || len(sessions) == 0 {
		return sessions
	}
	out := make([]*proto.Session, 0, len(sessions))
	for _, session := range sessions {
		if session == nil {
			continue
		}
		if session.Status == proto.SessionStatus_SESSION_STATUS_EXITED {
			continue
		}
		out = append(out, session)
	}
	return out
}

func prefixSubscribeEvent(spoke string, event *proto.SubscribeEvent) {
	if event == nil {
		return
	}
	switch payload := event.Event.(type) {
	case *proto.SubscribeEvent_ScreenUpdate:
		if payload.ScreenUpdate != nil && payload.ScreenUpdate.Screen != nil {
			payload.ScreenUpdate.Screen.Name = prefixName(spoke, payload.ScreenUpdate.Screen.Name)
		}
	case *proto.SubscribeEvent_SessionIdle:
		if payload.SessionIdle != nil {
			payload.SessionIdle.Name = prefixName(spoke, payload.SessionIdle.Name)
		}
	}
}

type localSessionsStream struct {
	ctx  context.Context
	send func(*proto.SubscribeSessionsEvent) error
}

func (s *localSessionsStream) Send(event *proto.SubscribeSessionsEvent) error {
	if s.send == nil {
		return nil
	}
	return s.send(event)
}

func (s *localSessionsStream) Context() context.Context {
	if s.ctx != nil {
		return s.ctx
	}
	return context.Background()
}

func (s *localSessionsStream) SetHeader(metadata.MD) error  { return nil }
func (s *localSessionsStream) SendHeader(metadata.MD) error { return nil }
func (s *localSessionsStream) SetTrailer(metadata.MD)       {}
func (s *localSessionsStream) SendMsg(interface{}) error    { return nil }
func (s *localSessionsStream) RecvMsg(interface{}) error    { return nil }
