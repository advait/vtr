package vt

import (
	"errors"
	"sync"

	ghostty "github.com/advait/vtrpc/go-ghostty"
)

// DumpScope describes which buffer to dump.
type DumpScope = ghostty.DumpScope

const (
	DumpViewport DumpScope = ghostty.DumpViewport
	DumpScreen   DumpScope = ghostty.DumpScreen
	DumpHistory  DumpScope = ghostty.DumpHistory
)

// Snapshot captures the viewport state.
type Snapshot = ghostty.Snapshot

// Cell mirrors the snapshot cell data.
type Cell = ghostty.Cell

// VT wraps the Ghostty terminal with a mutex for safe concurrent access.
type VT struct {
	mu   sync.Mutex
	term *ghostty.Terminal
}

var errVTClosed = errors.New("vt: terminal is closed")

// NewVT creates a new VT engine with the provided dimensions.
func NewVT(cols, rows, scrollback uint32) (*VT, error) {
	term, err := ghostty.New(ghostty.Options{
		Cols:          cols,
		Rows:          rows,
		MaxScrollback: scrollback,
	})
	if err != nil {
		return nil, err
	}
	return &VT{term: term}, nil
}

// Close releases the VT resources.
func (v *VT) Close() error {
	if v == nil {
		return nil
	}
	v.mu.Lock()
	defer v.mu.Unlock()
	if v.term == nil {
		return nil
	}
	err := v.term.Close()
	v.term = nil
	return err
}

// Feed sends bytes into the terminal stream.
func (v *VT) Feed(data []byte) ([]byte, error) {
	if v == nil {
		return nil, errVTClosed
	}
	v.mu.Lock()
	defer v.mu.Unlock()
	if v.term == nil {
		return nil, errVTClosed
	}
	return v.term.Feed(data)
}

// Resize updates terminal dimensions.
func (v *VT) Resize(cols, rows uint32) error {
	if v == nil {
		return errVTClosed
	}
	v.mu.Lock()
	defer v.mu.Unlock()
	if v.term == nil {
		return errVTClosed
	}
	return v.term.Resize(cols, rows)
}

// Snapshot returns a copy of the current viewport.
func (v *VT) Snapshot() (*Snapshot, error) {
	if v == nil {
		return nil, errVTClosed
	}
	v.mu.Lock()
	defer v.mu.Unlock()
	if v.term == nil {
		return nil, errVTClosed
	}
	return v.term.Snapshot()
}

// Dump returns a text dump for the specified scope.
func (v *VT) Dump(scope DumpScope, unwrap bool) (string, error) {
	if v == nil {
		return "", errVTClosed
	}
	v.mu.Lock()
	defer v.mu.Unlock()
	if v.term == nil {
		return "", errVTClosed
	}
	return v.term.Dump(scope, unwrap)
}
