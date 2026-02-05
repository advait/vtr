package server

import (
	"context"
	"crypto/tls"

	corepkg "github.com/advait/vtrpc/internal/core"
	vtpkg "github.com/advait/vtrpc/internal/vt"
	proto "github.com/advait/vtrpc/proto"
	"google.golang.org/grpc"
)

type SessionState = corepkg.SessionState

const (
	SessionRunning SessionState = corepkg.SessionRunning
	SessionClosing SessionState = corepkg.SessionClosing
	SessionExited  SessionState = corepkg.SessionExited
)

var (
	ErrSessionNotFound   = corepkg.ErrSessionNotFound
	ErrSessionExists     = corepkg.ErrSessionExists
	ErrSessionNotRunning = corepkg.ErrSessionNotRunning
	ErrInvalidName       = corepkg.ErrInvalidName
	ErrInvalidSize       = corepkg.ErrInvalidSize
)

type CoordinatorOptions = corepkg.CoordinatorOptions
type SpawnOptions = corepkg.SpawnOptions
type SessionInfo = corepkg.SessionInfo
type Coordinator = corepkg.Coordinator
type Session = corepkg.Session
type GrepMatch = corepkg.GrepMatch

type DumpScope = vtpkg.DumpScope

type Snapshot = vtpkg.Snapshot
type Cell = vtpkg.Cell

const (
	DumpViewport DumpScope = vtpkg.DumpViewport
	DumpScreen   DumpScope = vtpkg.DumpScreen
	DumpHistory  DumpScope = vtpkg.DumpHistory
)

type GRPCServer = corepkg.GRPCServer
type SpokeRecord = corepkg.SpokeRecord
type SpokeRegistry = corepkg.SpokeRegistry

func NewCoordinator(opts CoordinatorOptions) *Coordinator {
	return corepkg.NewCoordinator(opts)
}

func NewGRPCServer(coord *Coordinator) *GRPCServer {
	return corepkg.NewGRPCServer(coord)
}

func NewGRPCServerWithToken(coord *Coordinator, token string) *grpc.Server {
	return corepkg.NewGRPCServerWithToken(coord, token)
}

func NewGRPCServerWithTokenAndService(service proto.VTRServer, token string) *grpc.Server {
	return corepkg.NewGRPCServerWithTokenAndService(service, token)
}

func ServeTCP(ctx context.Context, coord *Coordinator, addr string, tlsConfig *tls.Config, token string) error {
	return corepkg.ServeTCP(ctx, coord, addr, tlsConfig, token)
}

func NewSpokeRegistry() *SpokeRegistry {
	return corepkg.NewSpokeRegistry()
}
