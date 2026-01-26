package server

import (
	"sync"
	"time"

	proto "github.com/advait/vtrpc/proto"
)

const defaultSpokeHeartbeat = 15 * time.Second

type SpokeRecord struct {
	Info     *proto.SpokeInfo
	LastSeen time.Time
	PeerAddr string
}

type SpokeRegistry struct {
	mu        sync.RWMutex
	spokes    map[string]SpokeRecord
	heartbeat time.Duration
	changed   chan struct{}
}

func NewSpokeRegistry() *SpokeRegistry {
	return &SpokeRegistry{
		spokes:    make(map[string]SpokeRecord),
		heartbeat: defaultSpokeHeartbeat,
		changed:   make(chan struct{}),
	}
}

func (r *SpokeRegistry) HeartbeatInterval() time.Duration {
	if r == nil {
		return 0
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.heartbeat
}

func (r *SpokeRegistry) Changed() <-chan struct{} {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.changed
}

func (r *SpokeRegistry) Upsert(info *proto.SpokeInfo, peerAddr string) {
	if r == nil || info == nil {
		return
	}
	name := info.GetName()
	if name == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.spokes[name] = SpokeRecord{
		Info:     cloneSpokeInfo(info),
		LastSeen: time.Now(),
		PeerAddr: peerAddr,
	}
	r.signalChangedLocked()
}

func (r *SpokeRegistry) List() []SpokeRecord {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]SpokeRecord, 0, len(r.spokes))
	for _, record := range r.spokes {
		copy := record
		copy.Info = cloneSpokeInfo(record.Info)
		out = append(out, copy)
	}
	return out
}

func (r *SpokeRegistry) signalChangedLocked() {
	if r.changed == nil {
		r.changed = make(chan struct{})
		return
	}
	close(r.changed)
	r.changed = make(chan struct{})
}

func cloneSpokeInfo(info *proto.SpokeInfo) *proto.SpokeInfo {
	if info == nil {
		return nil
	}
	out := &proto.SpokeInfo{
		Name:     info.Name,
		GrpcAddr: info.GrpcAddr,
		Version:  info.Version,
	}
	if len(info.Labels) > 0 {
		out.Labels = make(map[string]string, len(info.Labels))
		for k, v := range info.Labels {
			out.Labels[k] = v
		}
	}
	return out
}
