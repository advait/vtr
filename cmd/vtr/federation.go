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
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/peer"
	"google.golang.org/grpc/status"
	goproto "google.golang.org/protobuf/proto"
)

type spokeTarget struct {
	Name string
	Addr string
}

type federatedServer struct {
	proto.UnimplementedVTRServer
	local        *server.GRPCServer
	localName    string
	localPath    string
	localEnabled bool
	registry     *server.SpokeRegistry
	tunnels      *tunnelRegistry
	logger       *slog.Logger
}

func newFederatedServer(local *server.GRPCServer, localName string, localPath string, localEnabled bool, registry *server.SpokeRegistry, logger *slog.Logger) *federatedServer {
	if logger == nil {
		logger = slog.Default()
	}
	if local == nil {
		local = server.NewGRPCServer(nil)
	}
	localName = strings.TrimSpace(localName)
	localPath = strings.TrimSpace(localPath)
	if localName == "" && localPath != "" {
		localName = hubName(localPath)
	}
	return &federatedServer{
		local:        local,
		localName:    localName,
		localPath:    localPath,
		localEnabled: localEnabled,
		registry:     registry,
		tunnels:      newTunnelRegistry(),
		logger:       logger,
	}
}

func (s *federatedServer) localActive() bool {
	return s != nil && s.localEnabled
}

func (s *federatedServer) localNameForTargets() string {
	if s == nil || !s.localEnabled {
		return ""
	}
	return s.localName
}

func (s *federatedServer) localDisabledError() error {
	return status.Error(codes.FailedPrecondition, "hub coordinator is disabled")
}

func mergeSpokeTargets(registry *server.SpokeRegistry, localName string, tunnels []string) []spokeTarget {
	targets := make(map[string]spokeTarget)
	localName = strings.TrimSpace(localName)
	if registry != nil {
		for _, record := range registry.List() {
			if record.Info == nil {
				continue
			}
			name := strings.TrimSpace(record.Info.Name)
			if name == "" {
				continue
			}
			if localName != "" && name == localName {
				continue
			}
			targets[name] = spokeTarget{Name: name}
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
	hello := frame.GetHello()
	name := strings.TrimSpace(hello.GetName())
	if name == "" {
		return status.Error(codes.InvalidArgument, "spoke name is required")
	}
	info := &proto.SpokeInfo{
		Name:    name,
		Version: hello.GetVersion(),
		Labels:  hello.GetLabels(),
	}
	if s.registry == nil {
		s.registry = server.NewSpokeRegistry()
	}
	peerAddr := ""
	if p, ok := peer.FromContext(stream.Context()); ok && p.Addr != nil {
		peerAddr = p.Addr.String()
	}
	s.registry.Upsert(info, peerAddr)
	endpoint := newTunnelEndpoint(name, stream, s.logger)
	if s.tunnels == nil {
		s.tunnels = newTunnelRegistry()
	}
	if prev := s.tunnels.Set(name, endpoint); prev != nil {
		prev.close(errors.New("replaced by new tunnel"))
	}
	if s.logger != nil {
		s.logger.Info("spoke connected", "name", name)
	}
	var closeErr error
	defer func() {
		if s.tunnel(name) == endpoint {
			s.registry.Remove(name)
		}
		s.tunnels.Remove(name, endpoint)
		endpoint.close(nil)
		if s.logger != nil {
			if closeErr != nil && !errors.Is(closeErr, io.EOF) {
				s.logger.Info("spoke disconnected", "name", name, "err", closeErr)
			} else {
				s.logger.Info("spoke disconnected", "name", name)
			}
		}
	}()

	for {
		frame, err := stream.Recv()
		if err != nil {
			closeErr = err
			return err
		}
		if frame == nil {
			continue
		}
		s.registry.Touch(name)
		switch {
		case frame.GetResponse() != nil || frame.GetEvent() != nil || frame.GetError() != nil:
			endpoint.dispatch(frame)
		default:
		}
	}
}

func (s *federatedServer) Spawn(ctx context.Context, req *proto.SpawnRequest) (*proto.SpawnResponse, error) {
	if req == nil || strings.TrimSpace(req.Name) == "" {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.Spawn(ctx, req)
	}
	spoke, session, routed, _, err := s.routeSession(req.Name, "")
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
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
	sessions := make([]*proto.Session, 0)
	if s.localActive() {
		localResp, err := s.local.List(ctx, &proto.ListRequest{})
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, localResp.GetSessions()...)
	}

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

	if s.localActive() && s.localName != "" {
		state.ensureCoordinator(s.localName, s.localPath)
		if localSessions, err := s.local.List(ctx, &proto.ListRequest{}); err == nil {
			state.setCoordinatorSessions(s.localName, s.localPath, filterSessions(localSessions.GetSessions(), excludeExited))
		} else {
			state.setCoordinatorError(s.localName, s.localPath, err)
		}
	}

	targets := s.spokeTargets()
	for _, target := range targets {
		state.ensureCoordinator(target.Name, target.Addr)
	}

	if s.localActive() {
		go s.watchLocalSessions(ctx, excludeExited, state, signal)
	}

	for _, target := range targets {
		go s.watchSpokeSessions(ctx, target, excludeExited, state, signal)
	}

	if s.registry != nil {
		go s.watchRegistry(ctx, excludeExited, state, signal)
	}

	if err := stream.Send(state.snapshot()); err != nil {
		return err
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-signal.ch:
			if err := stream.Send(state.snapshot()); err != nil {
				return err
			}
		}
	}
}

func (s *federatedServer) watchLocalSessions(ctx context.Context, excludeExited bool, state *federatedSessionState, signal *updateSignal) {
	stream := &localSessionsStream{
		ctx: ctx,
		send: func(snapshot *proto.SessionsSnapshot) error {
			if snapshot == nil {
				return nil
			}
			sessions := snapshotSessions(snapshot, s.localName)
			if excludeExited {
				sessions = filterSessions(sessions, true)
			}
			state.setCoordinatorSessions(s.localName, s.localPath, sessions)
			signal.pulse()
			return nil
		},
	}
	err := s.local.SubscribeSessions(&proto.SubscribeSessionsRequest{ExcludeExited: excludeExited}, stream)
	if err != nil && ctx.Err() == nil {
		state.setCoordinatorError(s.localName, s.localPath, err)
		signal.pulse()
	}
}

func (s *federatedServer) Info(ctx context.Context, req *proto.InfoRequest) (*proto.InfoResponse, error) {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.Info(ctx, req)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.Info(ctx, &reqCopy)
	}
	reqCopy := *req
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	resp, err := s.callInfo(ctx, spoke, &reqCopy)
	if err != nil {
		return nil, err
	}
	if resp.Session != nil {
		resp.Session = prefixSession(spoke, resp.Session)
	}
	return resp, nil
}

func (s *federatedServer) Kill(ctx context.Context, req *proto.KillRequest) (*proto.KillResponse, error) {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.Kill(ctx, req)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.Kill(ctx, &reqCopy)
	}
	reqCopy := *req
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	return s.callKill(ctx, spoke, &reqCopy)
}

func (s *federatedServer) Close(ctx context.Context, req *proto.CloseRequest) (*proto.CloseResponse, error) {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.Close(ctx, req)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.Close(ctx, &reqCopy)
	}
	reqCopy := *req
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	return s.callClose(ctx, spoke, &reqCopy)
}

func (s *federatedServer) Remove(ctx context.Context, req *proto.RemoveRequest) (*proto.RemoveResponse, error) {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.Remove(ctx, req)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.Remove(ctx, &reqCopy)
	}
	reqCopy := *req
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	return s.callRemove(ctx, spoke, &reqCopy)
}

func (s *federatedServer) Rename(ctx context.Context, req *proto.RenameRequest) (*proto.RenameResponse, error) {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.Rename(ctx, req)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.Rename(ctx, &reqCopy)
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
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	reqCopy.NewName = newName
	return s.callRename(ctx, spoke, &reqCopy)
}

func (s *federatedServer) GetScreen(ctx context.Context, req *proto.GetScreenRequest) (*proto.GetScreenResponse, error) {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.GetScreen(ctx, req)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.GetScreen(ctx, &reqCopy)
	}
	reqCopy := *req
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	resp, err := s.callGetScreen(ctx, spoke, &reqCopy)
	if err != nil {
		return nil, err
	}
	if resp != nil {
		resp.Name = prefixName(spoke, resp.Name)
		resp.Id = prefixID(spoke, resp.Id)
	}
	return resp, nil
}

func (s *federatedServer) Grep(ctx context.Context, req *proto.GrepRequest) (*proto.GrepResponse, error) {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.Grep(ctx, req)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.Grep(ctx, &reqCopy)
	}
	reqCopy := *req
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	return s.callGrep(ctx, spoke, &reqCopy)
}

func (s *federatedServer) SendText(ctx context.Context, req *proto.SendTextRequest) (*proto.SendTextResponse, error) {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.SendText(ctx, req)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.SendText(ctx, &reqCopy)
	}
	reqCopy := *req
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	return s.callSendText(ctx, spoke, &reqCopy)
}

func (s *federatedServer) SendKey(ctx context.Context, req *proto.SendKeyRequest) (*proto.SendKeyResponse, error) {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.SendKey(ctx, req)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.SendKey(ctx, &reqCopy)
	}
	reqCopy := *req
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	return s.callSendKey(ctx, spoke, &reqCopy)
}

func (s *federatedServer) SendBytes(ctx context.Context, req *proto.SendBytesRequest) (*proto.SendBytesResponse, error) {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.SendBytes(ctx, req)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.SendBytes(ctx, &reqCopy)
	}
	reqCopy := *req
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	return s.callSendBytes(ctx, spoke, &reqCopy)
}

func (s *federatedServer) Resize(ctx context.Context, req *proto.ResizeRequest) (*proto.ResizeResponse, error) {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.Resize(ctx, req)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.Resize(ctx, &reqCopy)
	}
	reqCopy := *req
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	return s.callResize(ctx, spoke, &reqCopy)
}

func (s *federatedServer) WaitFor(ctx context.Context, req *proto.WaitForRequest) (*proto.WaitForResponse, error) {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.WaitFor(ctx, req)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.WaitFor(ctx, &reqCopy)
	}
	reqCopy := *req
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	return s.callWaitFor(ctx, spoke, &reqCopy)
}

func (s *federatedServer) WaitForIdle(ctx context.Context, req *proto.WaitForIdleRequest) (*proto.WaitForIdleResponse, error) {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.WaitForIdle(ctx, req)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.WaitForIdle(ctx, &reqCopy)
	}
	reqCopy := *req
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	return s.callWaitForIdle(ctx, spoke, &reqCopy)
}

func (s *federatedServer) Subscribe(req *proto.SubscribeRequest, stream proto.VTR_SubscribeServer) error {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return s.localDisabledError()
		}
		return s.local.Subscribe(req, stream)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return err
	}
	if !routed {
		if !s.localActive() {
			return s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.Subscribe(&reqCopy, stream)
	}

	reqCopy := *req
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return err
	}
	return tunnel.CallStream(stream.Context(), tunnelMethodSubscribe, &reqCopy, func(payload []byte) error {
		event := &proto.SubscribeEvent{}
		if err := goproto.Unmarshal(payload, event); err != nil {
			return err
		}
		prefixSubscribeEvent(spoke, event)
		return stream.Send(event)
	})
}

func (s *federatedServer) DumpAsciinema(ctx context.Context, req *proto.DumpAsciinemaRequest) (*proto.DumpAsciinemaResponse, error) {
	if req == nil || (strings.TrimSpace(req.Name) == "" && strings.TrimSpace(req.Id) == "") {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		return s.local.DumpAsciinema(ctx, req)
	}
	spoke, session, routed, useID, err := s.routeSession(req.Name, req.Id)
	if err != nil {
		return nil, err
	}
	if !routed {
		if !s.localActive() {
			return nil, s.localDisabledError()
		}
		reqCopy := *req
		if useID {
			reqCopy.Id = session
			reqCopy.Name = ""
		} else {
			reqCopy.Name = session
			reqCopy.Id = ""
		}
		return s.local.DumpAsciinema(ctx, &reqCopy)
	}
	reqCopy := *req
	if useID {
		reqCopy.Id = session
		reqCopy.Name = ""
	} else {
		reqCopy.Name = session
		reqCopy.Id = ""
	}
	return s.callDumpAsciinema(ctx, spoke, &reqCopy)
}

func (s *federatedServer) routeSession(name string, id string) (string, string, bool, bool, error) {
	id = strings.TrimSpace(id)
	if id != "" {
		if coord, session, ok := parseSessionRef(id); ok {
			if coord != "" && coord == s.localName {
				if s.localActive() {
					return "", session, false, true, nil
				}
				return "", "", false, true, s.localDisabledError()
			}
			if _, ok := s.resolveSpoke(coord); ok {
				return coord, session, true, true, nil
			}
			return "", "", false, true, status.Error(codes.NotFound, fmt.Sprintf("unknown coordinator %q", coord))
		}
		if s.localActive() {
			return "", id, false, true, nil
		}
		return "", "", false, true, s.localDisabledError()
	}

	name = strings.TrimSpace(name)
	if coord, session, ok := parseSessionRef(name); ok {
		if coord != "" && coord == s.localName {
			if s.localActive() {
				return "", session, false, false, nil
			}
			return "", "", false, false, s.localDisabledError()
		}
		if _, ok := s.resolveSpoke(coord); ok {
			return coord, session, true, false, nil
		}
		return "", "", false, false, status.Error(codes.NotFound, fmt.Sprintf("unknown coordinator %q", coord))
	}
	if s.localActive() {
		return "", name, false, false, nil
	}
	return "", "", false, false, s.localDisabledError()
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
	return mergeSpokeTargets(s.registry, s.localNameForTargets(), tunnelNames(s.tunnels))
}

func (s *federatedServer) tunnel(name string) *tunnelEndpoint {
	if s == nil || s.tunnels == nil {
		return nil
	}
	return s.tunnels.Get(name)
}

func (s *federatedServer) requireTunnel(name string) (*tunnelEndpoint, error) {
	tunnel := s.tunnel(name)
	if tunnel == nil {
		return nil, status.Error(codes.Unavailable, "spoke tunnel is not connected")
	}
	return tunnel, nil
}

func (s *federatedServer) callList(ctx context.Context, target spokeTarget) (*proto.ListResponse, error) {
	tunnel, err := s.requireTunnel(target.Name)
	if err != nil {
		return nil, err
	}
	resp := &proto.ListResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodList, &proto.ListRequest{}, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callSpawn(ctx context.Context, spoke string, req *proto.SpawnRequest) (*proto.SpawnResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.SpawnResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodSpawn, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callInfo(ctx context.Context, spoke string, req *proto.InfoRequest) (*proto.InfoResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.InfoResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodInfo, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callKill(ctx context.Context, spoke string, req *proto.KillRequest) (*proto.KillResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.KillResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodKill, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callClose(ctx context.Context, spoke string, req *proto.CloseRequest) (*proto.CloseResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.CloseResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodClose, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callRemove(ctx context.Context, spoke string, req *proto.RemoveRequest) (*proto.RemoveResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.RemoveResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodRemove, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callRename(ctx context.Context, spoke string, req *proto.RenameRequest) (*proto.RenameResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.RenameResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodRename, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callGetScreen(ctx context.Context, spoke string, req *proto.GetScreenRequest) (*proto.GetScreenResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.GetScreenResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodGetScreen, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callGrep(ctx context.Context, spoke string, req *proto.GrepRequest) (*proto.GrepResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.GrepResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodGrep, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callSendText(ctx context.Context, spoke string, req *proto.SendTextRequest) (*proto.SendTextResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.SendTextResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodSendText, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callSendKey(ctx context.Context, spoke string, req *proto.SendKeyRequest) (*proto.SendKeyResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.SendKeyResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodSendKey, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callSendBytes(ctx context.Context, spoke string, req *proto.SendBytesRequest) (*proto.SendBytesResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.SendBytesResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodSendBytes, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callResize(ctx context.Context, spoke string, req *proto.ResizeRequest) (*proto.ResizeResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.ResizeResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodResize, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callWaitFor(ctx context.Context, spoke string, req *proto.WaitForRequest) (*proto.WaitForResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.WaitForResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodWaitFor, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callWaitForIdle(ctx context.Context, spoke string, req *proto.WaitForIdleRequest) (*proto.WaitForIdleResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.WaitForIdleResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodWaitForIdle, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *federatedServer) callDumpAsciinema(ctx context.Context, spoke string, req *proto.DumpAsciinemaRequest) (*proto.DumpAsciinemaResponse, error) {
	tunnel, err := s.requireTunnel(spoke)
	if err != nil {
		return nil, err
	}
	resp := &proto.DumpAsciinemaResponse{}
	if err := tunnel.CallUnary(ctx, tunnelMethodDumpAsciinema, req, resp); err != nil {
		return nil, err
	}
	return resp, nil
}

type federatedSessionState struct {
	mu           sync.RWMutex
	coordinators map[string]*coordinatorSessionState
}

func newFederatedSessionState() *federatedSessionState {
	return &federatedSessionState{coordinators: make(map[string]*coordinatorSessionState)}
}

func (s *federatedSessionState) ensureCoordinator(name, path string) {
	name = strings.TrimSpace(name)
	if name == "" {
		return
	}
	path = strings.TrimSpace(path)
	s.mu.Lock()
	defer s.mu.Unlock()
	entry := s.coordinators[name]
	if entry == nil {
		entry = &coordinatorSessionState{name: name}
		s.coordinators[name] = entry
	}
	if path != "" {
		entry.path = path
	}
}

func (s *federatedSessionState) setCoordinatorSessions(name, path string, sessions []*proto.Session) {
	name = strings.TrimSpace(name)
	if name == "" {
		return
	}
	path = strings.TrimSpace(path)
	s.mu.Lock()
	defer s.mu.Unlock()
	entry := s.coordinators[name]
	if entry == nil {
		entry = &coordinatorSessionState{name: name}
		s.coordinators[name] = entry
	}
	if path != "" {
		entry.path = path
	}
	entry.sessions = cloneProtoSessions(sessions)
	entry.err = ""
}

func (s *federatedSessionState) setCoordinatorError(name, path string, err error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return
	}
	path = strings.TrimSpace(path)
	s.mu.Lock()
	defer s.mu.Unlock()
	entry := s.coordinators[name]
	if entry == nil {
		entry = &coordinatorSessionState{name: name}
		s.coordinators[name] = entry
	}
	if path != "" {
		entry.path = path
	}
	if err == nil {
		entry.err = ""
		return
	}
	entry.err = err.Error()
	entry.sessions = nil
}

func (s *federatedSessionState) snapshot() *proto.SessionsSnapshot {
	s.mu.RLock()
	names := make([]string, 0, len(s.coordinators))
	for name := range s.coordinators {
		names = append(names, name)
	}
	s.mu.RUnlock()

	sort.Strings(names)
	out := make([]*proto.CoordinatorSessions, 0, len(names))
	s.mu.RLock()
	for _, name := range names {
		entry := s.coordinators[name]
		if entry == nil {
			continue
		}
		out = append(out, &proto.CoordinatorSessions{
			Name:     entry.name,
			Path:     entry.path,
			Sessions: cloneProtoSessions(entry.sessions),
			Error:    entry.err,
		})
	}
	s.mu.RUnlock()
	return &proto.SessionsSnapshot{Coordinators: out}
}

type coordinatorSessionState struct {
	name     string
	path     string
	sessions []*proto.Session
	err      string
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

func nextBackoff(current time.Duration) time.Duration {
	if current <= 0 {
		return time.Second
	}
	next := current * 2
	if next > 5*time.Second {
		return 5 * time.Second
	}
	return next
}

func waitOrDone(ctx context.Context, d time.Duration) bool {
	if d <= 0 {
		return ctx.Err() != nil
	}
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return true
	case <-timer.C:
		return false
	}
}

func (s *federatedServer) watchSpokeSessions(ctx context.Context, target spokeTarget, excludeExited bool, state *federatedSessionState, signal *updateSignal) {
	backoff := time.Second
	for {
		if ctx.Err() != nil {
			return
		}
		if tunnel := s.tunnel(target.Name); tunnel != nil {
			state.ensureCoordinator(target.Name, target.Addr)
			state.setCoordinatorError(target.Name, target.Addr, nil)
			signal.pulse()
			err := tunnel.CallStream(ctx, tunnelMethodSubscribeSessions, &proto.SubscribeSessionsRequest{
				ExcludeExited: excludeExited,
			}, func(payload []byte) error {
				snapshot := &proto.SessionsSnapshot{}
				if err := goproto.Unmarshal(payload, snapshot); err != nil {
					return err
				}
				sessions := snapshotSessions(snapshot, target.Name)
				if excludeExited {
					sessions = filterSessions(sessions, true)
				}
				sessions = prefixSessions(target.Name, sessions, false)
				state.setCoordinatorSessions(target.Name, target.Addr, sessions)
				signal.pulse()
				return nil
			})
			if err != nil {
				state.setCoordinatorError(target.Name, target.Addr, err)
				signal.pulse()
				if waitOrDone(ctx, backoff) {
					return
				}
				backoff = nextBackoff(backoff)
				continue
			}
			backoff = time.Second
			continue
		}
		state.ensureCoordinator(target.Name, target.Addr)
		state.setCoordinatorError(target.Name, target.Addr, status.Error(codes.Unavailable, "spoke tunnel is not connected"))
		signal.pulse()
		if waitOrDone(ctx, backoff) {
			return
		}
		backoff = nextBackoff(backoff)
	}
}

func (s *federatedServer) watchRegistry(ctx context.Context, excludeExited bool, state *federatedSessionState, signal *updateSignal) {
	if s.registry == nil {
		return
	}
	known := make(map[string]struct{})
	for _, target := range s.spokeTargets() {
		known[target.Name] = struct{}{}
		state.ensureCoordinator(target.Name, target.Addr)
	}
	ch := s.registry.Changed()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ch:
			ch = s.registry.Changed()
			for _, target := range s.spokeTargets() {
				state.ensureCoordinator(target.Name, target.Addr)
				if _, ok := known[target.Name]; ok {
					continue
				}
				known[target.Name] = struct{}{}
				signal.pulse()
				go s.watchSpokeSessions(ctx, target, excludeExited, state, signal)
			}
			signal.pulse()
		}
	}
}

func prefixSession(spoke string, session *proto.Session) *proto.Session {
	if session == nil {
		return nil
	}
	clone := *session
	clone.Name = prefixName(spoke, clone.Name)
	clone.Id = prefixID(spoke, clone.Id)
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

func prefixID(spoke, id string) string {
	id = strings.TrimSpace(id)
	if id == "" {
		return id
	}
	return fmt.Sprintf("%s:%s", spoke, id)
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

func snapshotSessions(snapshot *proto.SessionsSnapshot, targetName string) []*proto.Session {
	if snapshot == nil {
		return nil
	}
	targetName = strings.TrimSpace(targetName)
	if targetName != "" {
		for _, coord := range snapshot.Coordinators {
			if coord != nil && coord.Name == targetName {
				return coord.Sessions
			}
		}
	}
	if len(snapshot.Coordinators) == 1 {
		if coord := snapshot.Coordinators[0]; coord != nil {
			return coord.Sessions
		}
	}
	return nil
}

func cloneProtoSessions(sessions []*proto.Session) []*proto.Session {
	if len(sessions) == 0 {
		return nil
	}
	out := make([]*proto.Session, len(sessions))
	copy(out, sessions)
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
			payload.ScreenUpdate.Screen.Id = prefixID(spoke, payload.ScreenUpdate.Screen.Id)
		}
	case *proto.SubscribeEvent_SessionExited:
		if payload.SessionExited != nil {
			payload.SessionExited.Id = prefixID(spoke, payload.SessionExited.Id)
		}
	case *proto.SubscribeEvent_SessionIdle:
		if payload.SessionIdle != nil {
			payload.SessionIdle.Name = prefixName(spoke, payload.SessionIdle.Name)
			payload.SessionIdle.Id = prefixID(spoke, payload.SessionIdle.Id)
		}
	}
}

type localSessionsStream struct {
	ctx  context.Context
	send func(*proto.SessionsSnapshot) error
}

func (s *localSessionsStream) Send(snapshot *proto.SessionsSnapshot) error {
	if s.send == nil {
		return nil
	}
	return s.send(snapshot)
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
