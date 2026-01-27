package main

import (
	"context"
	"net"
	"strings"
	"testing"
	"time"

	proto "github.com/advait/vtrpc/proto"
	"github.com/advait/vtrpc/server"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"
)

const bufSize = 1024 * 1024

type fakeVTRServer struct {
	proto.UnimplementedVTRServer
	listSessions             []*proto.Session
	infoHandler              func(name string) (*proto.InfoResponse, error)
	subscribeSessionsName    string
	subscribeSessionsHandler func(req *proto.SubscribeSessionsRequest, stream proto.VTR_SubscribeSessionsServer) error
}

func (f *fakeVTRServer) List(_ context.Context, _ *proto.ListRequest) (*proto.ListResponse, error) {
	return &proto.ListResponse{Sessions: f.listSessions}, nil
}

func (f *fakeVTRServer) Info(_ context.Context, req *proto.InfoRequest) (*proto.InfoResponse, error) {
	if f.infoHandler != nil {
		return f.infoHandler(req.GetName())
	}
	return &proto.InfoResponse{Session: &proto.Session{Name: req.GetName()}}, nil
}

func (f *fakeVTRServer) SubscribeSessions(req *proto.SubscribeSessionsRequest, stream proto.VTR_SubscribeSessionsServer) error {
	if f.subscribeSessionsHandler != nil {
		return f.subscribeSessionsHandler(req, stream)
	}
	name := strings.TrimSpace(f.subscribeSessionsName)
	if name == "" {
		name = "spoke"
	}
	return stream.Send(&proto.SessionsSnapshot{
		Coordinators: []*proto.CoordinatorSessions{{
			Name:     name,
			Sessions: f.listSessions,
		}},
	})
}

func TestFederatedHubOnlyRejectsLocalSpawn(t *testing.T) {
	coord := server.NewCoordinator(server.CoordinatorOptions{})
	defer coord.CloseAll()
	local := server.NewGRPCServer(coord)

	federated := newFederatedServer(local, "hub", "", false, nil, nil)
	_, err := federated.Spawn(context.Background(), &proto.SpawnRequest{Name: "local-session"})
	if status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("expected FailedPrecondition, got %v", err)
	}
}

func TestTunnelListAndInfoRoutesToSpoke(t *testing.T) {
	coord := server.NewCoordinator(server.CoordinatorOptions{})
	defer coord.CloseAll()
	local := server.NewGRPCServer(coord)

	spoke := &fakeVTRServer{
		listSessions: []*proto.Session{{Name: "alpha"}},
	}

	listener := bufconn.Listen(bufSize)
	grpcServer := grpc.NewServer()
	federated := newFederatedServer(local, "hub", "", true, nil, nil)
	proto.RegisterVTRServer(grpcServer, federated)
	go func() {
		_ = grpcServer.Serve(listener)
	}()
	t.Cleanup(func() {
		grpcServer.Stop()
		_ = listener.Close()
	})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	conn, err := grpc.DialContext(ctx, "hub",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
			return listener.DialContext(ctx)
		}),
	)
	if err != nil {
		t.Fatalf("dial hub: %v", err)
	}
	defer conn.Close()

	client := proto.NewVTRClient(conn)
	stream, err := client.Tunnel(ctx)
	if err != nil {
		t.Fatalf("tunnel: %v", err)
	}
	tunnel := &tunnelSpoke{
		ctx:     ctx,
		stream:  stream,
		service: spoke,
		calls:   make(map[string]context.CancelFunc),
	}
	go func() {
		_ = tunnel.serve("spoke-a", &proto.SpokeInfo{Name: "spoke-a"})
	}()

	deadline := time.After(500 * time.Millisecond)
	for {
		if federated.tunnels.Get("spoke-a") != nil {
			break
		}
		select {
		case <-deadline:
			t.Fatal("tunnel did not register")
		case <-time.After(10 * time.Millisecond):
		}
	}

	listResp, err := client.List(ctx, &proto.ListRequest{})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(listResp.GetSessions()) == 0 || listResp.GetSessions()[0].GetName() != "spoke-a:alpha" {
		t.Fatalf("expected prefixed session, got %#v", listResp.GetSessions())
	}

	infoResp, err := client.Info(ctx, &proto.InfoRequest{Name: "spoke-a:alpha"})
	if err != nil {
		t.Fatalf("Info: %v", err)
	}
	if infoResp.GetSession().GetName() != "spoke-a:alpha" {
		t.Fatalf("expected prefixed info, got %q", infoResp.GetSession().GetName())
	}
}

func TestTunnelRegistersAndRemovesSpoke(t *testing.T) {
	coord := server.NewCoordinator(server.CoordinatorOptions{})
	defer coord.CloseAll()
	local := server.NewGRPCServer(coord)

	registry := server.NewSpokeRegistry()
	federated := newFederatedServer(local, "hub", "", true, registry, nil)

	listener := bufconn.Listen(bufSize)
	grpcServer := grpc.NewServer()
	proto.RegisterVTRServer(grpcServer, federated)
	go func() {
		_ = grpcServer.Serve(listener)
	}()
	t.Cleanup(func() {
		grpcServer.Stop()
		_ = listener.Close()
	})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	conn, err := grpc.DialContext(ctx, "hub",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
			return listener.DialContext(ctx)
		}),
	)
	if err != nil {
		t.Fatalf("dial hub: %v", err)
	}
	defer conn.Close()

	client := proto.NewVTRClient(conn)
	stream, err := client.Tunnel(ctx)
	if err != nil {
		t.Fatalf("tunnel: %v", err)
	}
	spoke := &fakeVTRServer{}
	tunnel := &tunnelSpoke{
		ctx:     ctx,
		stream:  stream,
		service: spoke,
		calls:   make(map[string]context.CancelFunc),
	}
	go func() {
		_ = tunnel.serve("spoke-a", &proto.SpokeInfo{Name: "spoke-a"})
	}()

	waitForRegistry(t, registry, "spoke-a")
	before := time.Time{}
	for _, record := range registry.List() {
		if record.Info != nil && record.Info.Name == "spoke-a" {
			before = record.LastSeen
			break
		}
	}
	if before.IsZero() {
		t.Fatal("missing spoke-a last_seen")
	}

	time.Sleep(20 * time.Millisecond)
	if _, err := client.List(ctx, &proto.ListRequest{}); err != nil {
		t.Fatalf("List: %v", err)
	}
	waitForRegistryTouch(t, registry, "spoke-a", before)

	_ = conn.Close()
	waitForRegistryRemoved(t, registry, "spoke-a")
}

func TestFederatedSubscribeSessionsAddsEmptyCoordinator(t *testing.T) {
	coord := server.NewCoordinator(server.CoordinatorOptions{})
	defer coord.CloseAll()
	local := server.NewGRPCServer(coord)

	registry := server.NewSpokeRegistry()
	federated := newFederatedServer(local, "hub", "", true, registry, nil)

	listener := bufconn.Listen(bufSize)
	grpcServer := grpc.NewServer()
	proto.RegisterVTRServer(grpcServer, federated)
	go func() {
		_ = grpcServer.Serve(listener)
	}()
	t.Cleanup(func() {
		grpcServer.Stop()
		_ = listener.Close()
	})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	conn, err := grpc.DialContext(ctx, "hub",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
			return listener.DialContext(ctx)
		}),
	)
	if err != nil {
		t.Fatalf("dial hub: %v", err)
	}
	defer conn.Close()

	client := proto.NewVTRClient(conn)
	stream, err := client.SubscribeSessions(ctx, &proto.SubscribeSessionsRequest{})
	if err != nil {
		t.Fatalf("SubscribeSessions: %v", err)
	}

	first, err := stream.Recv()
	if err != nil {
		t.Fatalf("SubscribeSessions recv: %v", err)
	}
	if coord := snapshotCoordinator(first, "spoke-a"); coord != nil {
		t.Fatalf("unexpected spoke-a coordinator in initial snapshot: %#v", coord)
	}

	tunnelStream, err := client.Tunnel(ctx)
	if err != nil {
		t.Fatalf("tunnel: %v", err)
	}
	spoke := &fakeVTRServer{}
	tunnel := &tunnelSpoke{
		ctx:     ctx,
		stream:  tunnelStream,
		service: spoke,
		calls:   make(map[string]context.CancelFunc),
	}
	go func() {
		_ = tunnel.serve("spoke-a", &proto.SpokeInfo{Name: "spoke-a"})
	}()

	deadline := time.After(500 * time.Millisecond)
	for {
		if federated.tunnels.Get("spoke-a") != nil {
			break
		}
		select {
		case <-deadline:
			t.Fatal("tunnel did not register")
		case <-time.After(10 * time.Millisecond):
		}
	}
	deadline = time.After(1 * time.Second)
	for {
		select {
		case <-deadline:
			t.Fatal("timed out waiting for spoke-a snapshot")
		default:
		}
		snapshot, err := stream.Recv()
		if err != nil {
			t.Fatalf("SubscribeSessions recv after add: %v", err)
		}
		coord := snapshotCoordinator(snapshot, "spoke-a")
		if coord == nil {
			continue
		}
		if len(coord.GetSessions()) != 0 {
			t.Fatalf("expected empty sessions for spoke-a, got %#v", coord.GetSessions())
		}
		break
	}
}

func TestFederatedSubscribeSessionsPrefixesSpokeIDs(t *testing.T) {
	coord := server.NewCoordinator(server.CoordinatorOptions{})
	defer coord.CloseAll()
	local := server.NewGRPCServer(coord)

	federated := newFederatedServer(local, "hub", "", true, nil, nil)

	listener := bufconn.Listen(bufSize)
	grpcServer := grpc.NewServer()
	proto.RegisterVTRServer(grpcServer, federated)
	go func() {
		_ = grpcServer.Serve(listener)
	}()
	t.Cleanup(func() {
		grpcServer.Stop()
		_ = listener.Close()
	})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	conn, err := grpc.DialContext(ctx, "hub",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
			return listener.DialContext(ctx)
		}),
	)
	if err != nil {
		t.Fatalf("dial hub: %v", err)
	}
	defer conn.Close()

	client := proto.NewVTRClient(conn)
	tunnelStream, err := client.Tunnel(ctx)
	if err != nil {
		t.Fatalf("tunnel: %v", err)
	}
	spoke := &fakeVTRServer{
		listSessions:          []*proto.Session{{Id: "sess-1", Name: "alpha"}},
		subscribeSessionsName: "spoke-a",
	}
	tunnel := &tunnelSpoke{
		ctx:     ctx,
		stream:  tunnelStream,
		service: spoke,
		calls:   make(map[string]context.CancelFunc),
	}
	go func() {
		_ = tunnel.serve("spoke-a", &proto.SpokeInfo{Name: "spoke-a"})
	}()

	deadline := time.After(500 * time.Millisecond)
	for {
		if federated.tunnels.Get("spoke-a") != nil {
			break
		}
		select {
		case <-deadline:
			t.Fatal("tunnel did not register")
		case <-time.After(10 * time.Millisecond):
		}
	}

	stream, err := client.SubscribeSessions(ctx, &proto.SubscribeSessionsRequest{})
	if err != nil {
		t.Fatalf("SubscribeSessions: %v", err)
	}

	deadline = time.After(1 * time.Second)
	for {
		select {
		case <-deadline:
			t.Fatal("timed out waiting for spoke-a sessions")
		default:
		}
		snapshot, err := stream.Recv()
		if err != nil {
			t.Fatalf("SubscribeSessions recv: %v", err)
		}
		coord := snapshotCoordinator(snapshot, "spoke-a")
		if coord == nil || len(coord.GetSessions()) == 0 {
			continue
		}
		session := coord.GetSessions()[0]
		if got := session.GetId(); got != "spoke-a:sess-1" {
			t.Fatalf("expected prefixed id, got %q", got)
		}
		if got := session.GetName(); got != "spoke-a:alpha" {
			t.Fatalf("expected prefixed name, got %q", got)
		}
		break
	}
}

func snapshotCoordinator(snapshot *proto.SessionsSnapshot, name string) *proto.CoordinatorSessions {
	if snapshot == nil {
		return nil
	}
	for _, coord := range snapshot.Coordinators {
		if coord != nil && coord.Name == name {
			return coord
		}
	}
	return nil
}

func waitForRegistry(t *testing.T, registry *server.SpokeRegistry, name string) {
	t.Helper()
	deadline := time.After(500 * time.Millisecond)
	for {
		for _, record := range registry.List() {
			if record.Info != nil && record.Info.Name == name {
				return
			}
		}
		select {
		case <-deadline:
			t.Fatalf("timed out waiting for %s registration", name)
		case <-time.After(10 * time.Millisecond):
		}
	}
}

func waitForRegistryTouch(t *testing.T, registry *server.SpokeRegistry, name string, before time.Time) {
	t.Helper()
	deadline := time.After(500 * time.Millisecond)
	for {
		for _, record := range registry.List() {
			if record.Info != nil && record.Info.Name == name && record.LastSeen.After(before) {
				return
			}
		}
		select {
		case <-deadline:
			t.Fatalf("timed out waiting for %s last_seen update", name)
		case <-time.After(10 * time.Millisecond):
		}
	}
}

func waitForRegistryRemoved(t *testing.T, registry *server.SpokeRegistry, name string) {
	t.Helper()
	deadline := time.After(500 * time.Millisecond)
	for {
		found := false
		for _, record := range registry.List() {
			if record.Info != nil && record.Info.Name == name {
				found = true
				break
			}
		}
		if !found {
			return
		}
		select {
		case <-deadline:
			t.Fatalf("timed out waiting for %s removal", name)
		case <-time.After(10 * time.Millisecond):
		}
	}
}
