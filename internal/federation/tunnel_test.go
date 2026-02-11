package federation

import (
	"context"
	"io"
	"log/slog"
	"strings"
	"sync"
	"testing"
	"time"

	proto "github.com/advait/vtrpc/proto"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type fakeTunnelServerStream struct {
	ctx context.Context

	mu   sync.Mutex
	sent []*proto.TunnelFrame
}

func (f *fakeTunnelServerStream) Send(frame *proto.TunnelFrame) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.sent = append(f.sent, frame)
	return nil
}

func (f *fakeTunnelServerStream) Recv() (*proto.TunnelFrame, error) {
	return nil, io.EOF
}

func (f *fakeTunnelServerStream) SetHeader(metadata.MD) error  { return nil }
func (f *fakeTunnelServerStream) SendHeader(metadata.MD) error { return nil }
func (f *fakeTunnelServerStream) SetTrailer(metadata.MD)       {}
func (f *fakeTunnelServerStream) Context() context.Context     { return f.ctx }
func (f *fakeTunnelServerStream) SendMsg(interface{}) error    { return nil }
func (f *fakeTunnelServerStream) RecvMsg(interface{}) error    { return nil }

func TestTunnelDispatchDropFailsStreamingCall(t *testing.T) {
	stream := &fakeTunnelServerStream{ctx: context.Background()}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	endpoint := newTunnelEndpoint("spoke-a", stream, logger)

	call, err := endpoint.startCall(true)
	if err != nil {
		t.Fatalf("startCall: %v", err)
	}

	for i := 0; i < cap(call.ch); i++ {
		frame := &proto.TunnelFrame{
			CallId: call.id,
			Kind: &proto.TunnelFrame_Event{
				Event: &proto.TunnelStreamEvent{Payload: []byte("x")},
			},
		}
		if result := call.send(frame); result != tunnelSendOk {
			t.Fatalf("expected tunnelSendOk while priming queue, got %v at %d", result, i)
		}
	}

	prevDropCount := tunnelBacklogDropCount.Load()
	endpoint.dispatch(&proto.TunnelFrame{
		CallId: call.id,
		Kind: &proto.TunnelFrame_Event{
			Event: &proto.TunnelStreamEvent{Payload: []byte("overflow")},
		},
	})
	if tunnelBacklogDropCount.Load() <= prevDropCount {
		t.Fatalf("expected backlog drop counter increment")
	}

	if st := status.Code(call.terminalErr()); st != codes.Unavailable {
		t.Fatalf("expected unavailable terminal error, got %v (%v)", st, call.terminalErr())
	}
	endpoint.mu.Lock()
	_, stillPresent := endpoint.calls[call.id]
	endpoint.mu.Unlock()
	if stillPresent {
		t.Fatalf("expected dropped stream call to be removed from endpoint call map")
	}
}

func TestTunnelCallStreamReturnsBacklogDropError(t *testing.T) {
	stream := &fakeTunnelServerStream{ctx: context.Background()}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	endpoint := newTunnelEndpoint("spoke-a", stream, logger)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	blockEvent := make(chan struct{})
	errCh := make(chan error, 1)
	go func() {
		errCh <- endpoint.CallStream(ctx, tunnelMethodSubscribe, &proto.SubscribeRequest{}, func([]byte) error {
			<-blockEvent
			return nil
		})
	}()

	var call *tunnelCall
	deadline := time.After(500 * time.Millisecond)
	for call == nil {
		select {
		case <-deadline:
			t.Fatal("timed out waiting for stream call registration")
		default:
		}
		endpoint.mu.Lock()
		for _, registered := range endpoint.calls {
			call = registered
			break
		}
		endpoint.mu.Unlock()
		if call == nil {
			time.Sleep(5 * time.Millisecond)
		}
	}

	endpoint.dispatch(&proto.TunnelFrame{
		CallId: call.id,
		Kind: &proto.TunnelFrame_Event{
			Event: &proto.TunnelStreamEvent{Payload: []byte("initial")},
		},
	})
	time.Sleep(20 * time.Millisecond)
	for i := 0; i < 64; i++ {
		endpoint.dispatch(&proto.TunnelFrame{
			CallId: call.id,
			Kind: &proto.TunnelFrame_Event{
				Event: &proto.TunnelStreamEvent{Payload: []byte("flood")},
			},
		})
	}
	close(blockEvent)

	select {
	case err := <-errCh:
		if status.Code(err) != codes.Unavailable {
			t.Fatalf("expected unavailable error from dropped stream, got %v", err)
		}
		if !strings.Contains(err.Error(), tunnelBacklogDropReason) {
			t.Fatalf("expected reason %q in error, got %v", tunnelBacklogDropReason, err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for CallStream to return drop error")
	}
}
