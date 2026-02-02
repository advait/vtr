package tracing

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const (
	defaultMaxFileBytes = int64(64 << 20)
	maxTransportPayload = int64(256 << 10)
)

type Sink interface {
	Write(ctx context.Context, payload []byte) error
}

type Transport interface {
	Send(ctx context.Context, payload []byte) error
	Connected() bool
}

type transportSetter interface {
	SetTransport(transport Transport)
}

type flusher interface {
	Flush(ctx context.Context) error
}

type fileSink struct {
	writer *rotatingWriter
}

type discardSink struct{}

func newFileSink(path string) (*fileSink, error) {
	if strings.TrimSpace(path) == "" {
		return nil, errors.New("trace path is required")
	}
	writer, err := newRotatingWriter(path, defaultMaxFileBytes, renameWithTimestamp)
	if err != nil {
		return nil, err
	}
	return &fileSink{writer: writer}, nil
}

func (s *fileSink) Write(_ context.Context, payload []byte) error {
	if s == nil || len(payload) == 0 {
		return nil
	}
	return s.writer.Write(payload)
}

func (s *fileSink) Flush(ctx context.Context) error {
	if s == nil || s.writer == nil {
		return nil
	}
	return s.writer.Flush(ctx)
}

func (s *fileSink) Close() error {
	if s == nil || s.writer == nil {
		return nil
	}
	return s.writer.Close()
}

func (discardSink) Write(_ context.Context, _ []byte) error { return nil }

func registerHubSink(sink Sink) {
	storeHubSink(sink)
}

func Ingest(payload []byte) error {
	sink := loadHubSink()
	if sink == nil {
		return nil
	}
	return sink.Write(context.Background(), payload)
}

type hybridSink struct {
	mu        sync.RWMutex
	transport Transport
	spool     *spoolWriter
}

func newHybridSink(transport Transport, spool *spoolWriter) *hybridSink {
	return &hybridSink{transport: transport, spool: spool}
}

func (s *hybridSink) SetTransport(transport Transport) {
	if s == nil {
		return
	}
	s.mu.Lock()
	s.transport = transport
	s.mu.Unlock()
}

func (s *hybridSink) Write(ctx context.Context, payload []byte) error {
	if s == nil || len(payload) == 0 {
		return nil
	}
	transport := s.currentTransport()
	if transport != nil && transport.Connected() {
		if err := sendPayload(ctx, transport, payload); err == nil {
			return nil
		}
	}
	return s.writeSpool(payload)
}

func (s *hybridSink) Flush(ctx context.Context) error {
	if s == nil || s.spool == nil {
		return nil
	}
	transport := s.currentTransport()
	if transport == nil || !transport.Connected() {
		return nil
	}
	return s.spool.Flush(ctx, transport)
}

func (s *hybridSink) writeSpool(payload []byte) error {
	if s.spool == nil {
		return nil
	}
	return s.spool.Write(payload)
}

func (s *hybridSink) currentTransport() Transport {
	if s == nil {
		return nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.transport
}

type rotatingWriter struct {
	mu       sync.Mutex
	path     string
	maxBytes int64
	renamer  func(string, time.Time) string
	file     *os.File
	size     int64
}

func newRotatingWriter(path string, maxBytes int64, renamer func(string, time.Time) string) (*rotatingWriter, error) {
	if strings.TrimSpace(path) == "" {
		return nil, errors.New("path is required")
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	writer := &rotatingWriter{
		path:     path,
		maxBytes: maxBytes,
		renamer:  renamer,
	}
	if err := writer.openLocked(); err != nil {
		return nil, err
	}
	return writer, nil
}

func (w *rotatingWriter) Write(payload []byte) error {
	if w == nil || len(payload) == 0 {
		return nil
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	if err := w.openLocked(); err != nil {
		return err
	}
	if w.maxBytes > 0 && w.size+int64(len(payload)) > w.maxBytes {
		if err := w.rotateLocked(time.Now()); err != nil {
			return err
		}
	}
	if w.file == nil {
		return errors.New("trace file is not open")
	}
	n, err := w.file.Write(payload)
	if err != nil {
		return err
	}
	w.size += int64(n)
	return nil
}

func (w *rotatingWriter) Rotate() error {
	if w == nil {
		return nil
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.rotateLocked(time.Now())
}

func (w *rotatingWriter) Flush(ctx context.Context) error {
	if w == nil {
		return nil
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.file == nil {
		return nil
	}
	done := make(chan error, 1)
	go func() {
		done <- w.file.Sync()
	}()
	if ctx == nil {
		return <-done
	}
	select {
	case <-ctx.Done():
		return ctx.Err()
	case err := <-done:
		return err
	}
}

func (w *rotatingWriter) Close() error {
	if w == nil {
		return nil
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.file == nil {
		return nil
	}
	err := w.file.Close()
	w.file = nil
	w.size = 0
	return err
}

func (w *rotatingWriter) openLocked() error {
	if w.file != nil {
		return nil
	}
	file, err := os.OpenFile(w.path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	info, err := file.Stat()
	if err != nil {
		_ = file.Close()
		return err
	}
	w.file = file
	w.size = info.Size()
	return nil
}

func (w *rotatingWriter) rotateLocked(now time.Time) error {
	if w.file != nil {
		_ = w.file.Close()
		w.file = nil
		w.size = 0
	}
	if _, err := os.Stat(w.path); err == nil {
		rotated := w.path
		if w.renamer != nil {
			rotated = w.renamer(w.path, now)
		}
		if rotated != "" && rotated != w.path {
			_ = os.Rename(w.path, rotated)
		}
	}
	return w.openLocked()
}

func renameWithTimestamp(path string, now time.Time) string {
	stamp := now.UTC().Format("20060102-150405")
	base := strings.TrimSuffix(path, filepath.Ext(path))
	ext := filepath.Ext(path)
	return fmt.Sprintf("%s-%s%s", base, stamp, ext)
}

type spoolWriter struct {
	mu     sync.Mutex
	dir    string
	prefix string
	writer *rotatingWriter
}

func newSpoolWriter(dir string, prefix string) (*spoolWriter, error) {
	dir = strings.TrimSpace(dir)
	if dir == "" {
		return nil, errors.New("spool dir is required")
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	prefix = strings.TrimSpace(prefix)
	if prefix == "" {
		prefix = "spoke"
	}
	path := filepath.Join(dir, fmt.Sprintf("spool-%s.jsonl", prefix))
	writer, err := newRotatingWriter(path, defaultMaxFileBytes, func(path string, now time.Time) string {
		return spoolRenamer(path, now, prefix)
	})
	if err != nil {
		return nil, err
	}
	return &spoolWriter{dir: dir, prefix: prefix, writer: writer}, nil
}

func (s *spoolWriter) Write(payload []byte) error {
	if s == nil || len(payload) == 0 {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.writer == nil {
		return errors.New("spool writer is not initialized")
	}
	return s.writer.Write(payload)
}

func (s *spoolWriter) Flush(ctx context.Context, transport Transport) error {
	if s == nil || transport == nil || !transport.Connected() {
		return nil
	}
	s.mu.Lock()
	if s.writer != nil {
		_ = s.writer.Rotate()
	}
	files := listSpoolFilesLocked(s.dir, s.prefix)
	s.mu.Unlock()

	for _, path := range files {
		if err := sendFile(ctx, transport, path); err != nil {
			return err
		}
		_ = os.Remove(path)
	}
	return nil
}

func spoolRenamer(path string, now time.Time, prefix string) string {
	dir := filepath.Dir(path)
	stamp := now.UTC().Format("20060102-150405")
	return filepath.Join(dir, fmt.Sprintf("spool-%s-%s.jsonl", prefix, stamp))
}

func listSpoolFilesLocked(dir string, prefix string) []string {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	files := make([]string, 0, len(entries))
	prefix = strings.TrimSpace(prefix)
	if prefix == "" {
		prefix = "spoke"
	}
	prefix = "spool-" + prefix + "-"
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasPrefix(name, prefix) || !strings.HasSuffix(name, ".jsonl") {
			continue
		}
		files = append(files, filepath.Join(dir, name))
	}
	sort.Strings(files)
	return files
}

func sendFile(ctx context.Context, transport Transport, path string) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()
	buf := make([]byte, maxTransportPayload)
	for {
		if ctx != nil {
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
			}
		}
		n, readErr := file.Read(buf)
		if n > 0 {
			if err := sendPayload(ctx, transport, buf[:n]); err != nil {
				return err
			}
		}
		if readErr != nil {
			if errors.Is(readErr, io.EOF) {
				return nil
			}
			return readErr
		}
	}
}

func sendPayload(ctx context.Context, transport Transport, payload []byte) error {
	if transport == nil {
		return errors.New("transport unavailable")
	}
	if len(payload) == 0 {
		return nil
	}
	if int64(len(payload)) <= maxTransportPayload {
		return transport.Send(ctx, payload)
	}
	reader := bytes.NewReader(payload)
	chunk := make([]byte, maxTransportPayload)
	for {
		if ctx != nil {
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
			}
		}
		n, err := reader.Read(chunk)
		if n > 0 {
			if sendErr := transport.Send(ctx, chunk[:n]); sendErr != nil {
				return sendErr
			}
		}
		if err != nil {
			if errors.Is(err, io.EOF) {
				return nil
			}
			return err
		}
	}
}

var hubSink atomic.Value

func storeHubSink(sink Sink) {
	if sink == nil {
		return
	}
	hubSink.Store(sink)
}

func loadHubSink() Sink {
	if value := hubSink.Load(); value != nil {
		if sink, ok := value.(Sink); ok {
			return sink
		}
	}
	return nil
}
