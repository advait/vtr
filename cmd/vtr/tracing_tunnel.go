package main

import (
	"context"
	"errors"
	"sync"

	proto "github.com/advait/vtrpc/proto"
)

type traceTransport struct {
	mu     sync.RWMutex
	tunnel *tunnelSpoke
}

func (t *traceTransport) SetTunnel(tunnel *tunnelSpoke) {
	if t == nil {
		return
	}
	t.mu.Lock()
	t.tunnel = tunnel
	t.mu.Unlock()
}

func (t *traceTransport) ClearTunnel(tunnel *tunnelSpoke) {
	if t == nil {
		return
	}
	t.mu.Lock()
	if t.tunnel == tunnel {
		t.tunnel = nil
	}
	t.mu.Unlock()
}

func (t *traceTransport) Connected() bool {
	if t == nil {
		return false
	}
	t.mu.RLock()
	connected := t.tunnel != nil
	t.mu.RUnlock()
	return connected
}

func (t *traceTransport) Send(ctx context.Context, payload []byte) error {
	if t == nil {
		return errors.New("trace transport unavailable")
	}
	t.mu.RLock()
	tunnel := t.tunnel
	t.mu.RUnlock()
	if tunnel == nil {
		return errors.New("trace transport unavailable")
	}
	if ctx != nil {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
	}
	return tunnel.send(&proto.TunnelFrame{
		Kind: &proto.TunnelFrame_Trace{
			Trace: &proto.TunnelTraceBatch{Payload: payload},
		},
	})
}
