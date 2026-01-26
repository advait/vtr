package main

import (
	"context"
	"fmt"
	"net"
	"testing"
	"time"

	proto "github.com/advait/vtrpc/proto"
	"github.com/advait/vtrpc/server"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
)

const bufSize = 1024 * 1024

type fakeVTRServer struct {
	proto.UnimplementedVTRServer
	listSessions []*proto.Session
	infoHandler  func(name string) (*proto.InfoResponse, error)
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

func startBufServer(t *testing.T, svc proto.VTRServer) (*bufconn.Listener, *grpc.Server) {
	t.Helper()
	listener := bufconn.Listen(bufSize)
	grpcServer := grpc.NewServer()
	proto.RegisterVTRServer(grpcServer, svc)
	go func() {
		_ = grpcServer.Serve(listener)
	}()
	return listener, grpcServer
}

func bufDialer(listeners map[string]*bufconn.Listener) spokeDialer {
	return func(ctx context.Context, addr string) (*grpc.ClientConn, error) {
		listener := listeners[addr]
		if listener == nil {
			return nil, fmt.Errorf("unknown addr %q", addr)
		}
		return grpc.DialContext(ctx, addr,
			grpc.WithTransportCredentials(insecure.NewCredentials()),
			grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
				return listener.DialContext(ctx)
			}),
		)
	}
}

func TestFederatedListPrefixesSpokeSessions(t *testing.T) {
	coord := server.NewCoordinator(server.CoordinatorOptions{})
	defer coord.CloseAll()
	local := server.NewGRPCServer(coord)

	spokeA := &fakeVTRServer{listSessions: []*proto.Session{{Name: "alpha"}}}
	spokeB := &fakeVTRServer{listSessions: []*proto.Session{{Name: "beta"}}}

	listeners := make(map[string]*bufconn.Listener)
	servers := make([]*grpc.Server, 0, 2)
	la, sa := startBufServer(t, spokeA)
	listeners["spoke-a"] = la
	servers = append(servers, sa)
	lb, sb := startBufServer(t, spokeB)
	listeners["spoke-b"] = lb
	servers = append(servers, sb)
	t.Cleanup(func() {
		for _, srv := range servers {
			srv.Stop()
		}
		for _, l := range listeners {
			_ = l.Close()
		}
	})

	federated := newFederatedServer(
		local,
		"hub",
		[]spokeTarget{{Name: "spoke-a", Addr: "spoke-a"}, {Name: "spoke-b", Addr: "spoke-b"}},
		nil,
		bufDialer(listeners),
		nil,
	)

	resp, err := federated.List(context.Background(), &proto.ListRequest{})
	if err != nil {
		t.Fatalf("List: %v", err)
	}

	seen := make(map[string]struct{})
	for _, session := range resp.GetSessions() {
		if session != nil {
			seen[session.GetName()] = struct{}{}
		}
	}

	if _, ok := seen["spoke-a:alpha"]; !ok {
		t.Fatalf("missing spoke-a:alpha in list: %#v", seen)
	}
	if _, ok := seen["spoke-b:beta"]; !ok {
		t.Fatalf("missing spoke-b:beta in list: %#v", seen)
	}
}

func TestFederatedInfoRoutesToSpoke(t *testing.T) {
	coord := server.NewCoordinator(server.CoordinatorOptions{})
	defer coord.CloseAll()
	local := server.NewGRPCServer(coord)

	var called string
	spoke := &fakeVTRServer{
		infoHandler: func(name string) (*proto.InfoResponse, error) {
			called = name
			return &proto.InfoResponse{Session: &proto.Session{Name: name}}, nil
		},
	}

	listener, grpcServer := startBufServer(t, spoke)
	listeners := map[string]*bufconn.Listener{"spoke-a": listener}
	t.Cleanup(func() {
		grpcServer.Stop()
		_ = listener.Close()
	})

	federated := newFederatedServer(
		local,
		"hub",
		[]spokeTarget{{Name: "spoke-a", Addr: "spoke-a"}},
		nil,
		bufDialer(listeners),
		nil,
	)

	resp, err := federated.Info(context.Background(), &proto.InfoRequest{Name: "spoke-a:alpha"})
	if err != nil {
		t.Fatalf("Info: %v", err)
	}
	if called != "alpha" {
		t.Fatalf("expected spoke to receive alpha, got %q", called)
	}
	if resp.GetSession().GetName() != "spoke-a:alpha" {
		t.Fatalf("expected prefixed name, got %q", resp.GetSession().GetName())
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
	federated := newFederatedServer(local, "hub", nil, nil, nil, nil)
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
