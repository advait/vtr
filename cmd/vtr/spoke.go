package main

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	proto "github.com/advait/vtrpc/proto"
	"github.com/advait/vtrpc/server"
	"github.com/spf13/cobra"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type spokeOptions struct {
	name          string
	socket        string
	serveSocket   bool
	grpcAddr      string
	hubAddr       string
	shell         string
	cols          int
	rows          int
	scrollback    uint
	killTimeout   time.Duration
	idleThreshold time.Duration
	logLevel      string
}

func newSpokeCmd() *cobra.Command {
	opts := spokeOptions{}
	cmd := &cobra.Command{
		Use:   "spoke",
		Short: "Start the spoke coordinator",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runSpoke(opts)
		},
	}

	cmd.Flags().StringVar(&opts.name, "name", "", "spoke name (defaults to hostname)")
	cmd.Flags().BoolVar(&opts.serveSocket, "serve-socket", false, "serve a local Unix socket for the spoke coordinator")
	cmd.Flags().StringVar(&opts.socket, "socket", "", "path to Unix socket when --serve-socket is set")
	cmd.Flags().StringVar(&opts.grpcAddr, "grpc-addr", "", "TCP gRPC address to expose (disabled by default)")
	cmd.Flags().StringVar(&opts.hubAddr, "hub", "", "hub address to register against")
	cmd.Flags().StringVar(&opts.shell, "shell", "", "default shell path")
	cmd.Flags().IntVar(&opts.cols, "cols", 80, "default columns")
	cmd.Flags().IntVar(&opts.rows, "rows", 24, "default rows")
	cmd.Flags().UintVar(&opts.scrollback, "scrollback", 10000, "scrollback lines")
	cmd.Flags().DurationVar(&opts.killTimeout, "kill-timeout", 5*time.Second, "kill timeout (e.g. 5s)")
	cmd.Flags().DurationVar(&opts.idleThreshold, "idle-threshold", 5*time.Second, "idle threshold before session is idle")
	cmd.Flags().StringVar(&opts.logLevel, "log-level", "info", "log level (debug, info, warn, error)")

	return cmd
}

func runSpoke(opts spokeOptions) error {
	level, err := parseLogLevel(opts.logLevel)
	if err != nil {
		return err
	}
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: level}))
	slog.SetDefault(logger)

	cfg, _, err := loadConfigWithPath()
	if err != nil {
		return err
	}
	if cfg == nil {
		cfg = &clientConfig{}
	}

	serveSocket := opts.serveSocket || strings.TrimSpace(opts.socket) != ""
	socketPath := strings.TrimSpace(opts.socket)
	if serveSocket && socketPath == "" {
		socketPath = defaultSocketPath
	}
	grpcAddr := strings.TrimSpace(opts.grpcAddr)
	hubAddr := strings.TrimSpace(opts.hubAddr)
	if hubAddr == "" {
		hubAddr = strings.TrimSpace(cfg.Hub.Addr)
	}
	if hubAddr != "" {
		hubAddr = expandPath(hubAddr)
	}

	if opts.cols <= 0 || opts.cols > int(^uint16(0)) {
		return fmt.Errorf("cols must be between 1 and %d", int(^uint16(0)))
	}
	if opts.rows <= 0 || opts.rows > int(^uint16(0)) {
		return fmt.Errorf("rows must be between 1 and %d", int(^uint16(0)))
	}
	if opts.scrollback > uint(^uint32(0)) {
		return fmt.Errorf("scrollback must be <= %d", uint(^uint32(0)))
	}

	authMode := strings.ToLower(strings.TrimSpace(cfg.Auth.Mode))
	requireToken, requireClientCert, err := parseAuthMode(authMode)
	if err != nil {
		return err
	}
	token := ""
	if requireToken && (hubAddr != "" || grpcAddr != "") {
		loaded, err := readToken(cfg.Auth.TokenFile)
		if err != nil {
			return err
		}
		token = loaded
	}
	var tlsConfig = (*tls.Config)(nil)
	if grpcAddr != "" {
		tlsConfig, err = buildServerTLSConfig(cfg.Server, cfg.Auth, requireClientCert)
		if err != nil {
			return err
		}
	}

	coord := server.NewCoordinator(server.CoordinatorOptions{
		DefaultShell:  opts.shell,
		DefaultCols:   uint16(opts.cols),
		DefaultRows:   uint16(opts.rows),
		Scrollback:    uint32(opts.scrollback),
		KillTimeout:   opts.killTimeout,
		IdleThreshold: opts.idleThreshold,
	})
	defer coord.CloseAll()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	spokeName := strings.TrimSpace(opts.name)
	if spokeName == "" && socketPath != "" {
		spokeName = coordinatorName(socketPath)
	}
	if spokeName == "" {
		if host, err := os.Hostname(); err == nil && host != "" {
			spokeName = host
		} else {
			spokeName = "spoke"
		}
	}

	logger.Info("spoke starting",
		"name", spokeName,
		"serve_socket", serveSocket,
		"socket", socketPath,
		"grpc_addr", grpcAddr,
		"hub", hubAddr,
		"log_level", strings.ToLower(opts.logLevel),
	)

	if hubAddr == "" && !serveSocket && grpcAddr == "" {
		return errors.New("hub address is required when not serving locally")
	}

	errCh := make(chan error, 2)
	servers := 0
	start := func(fn func() error) {
		servers++
		go func() {
			errCh <- fn()
		}()
	}

	if serveSocket {
		start(func() error {
			return server.ServeUnix(ctx, coord, socketPath)
		})
	}

	if grpcAddr != "" {
		start(func() error {
			return server.ServeTCP(ctx, coord, grpcAddr, tlsConfig, token)
		})
	}

	if hubAddr != "" {
		info := &proto.SpokeInfo{
			Name:     spokeName,
			GrpcAddr: grpcAddr,
			Version:  Version,
		}
		go registerSpokeLoop(ctx, hubAddr, cfg, token, info)
	}

	if servers == 0 {
		start(func() error {
			<-ctx.Done()
			return ctx.Err()
		})
	}

	var firstErr error
	for i := 0; i < servers; i++ {
		err := <-errCh
		if err == nil || errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			continue
		}
		if firstErr == nil {
			firstErr = err
			stop()
		}
	}
	return firstErr
}

func dialHub(ctx context.Context, addr string, cfg *clientConfig, token string) (*grpc.ClientConn, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if isUnixTarget(addr) {
		opts := []grpc.DialOption{
			grpc.WithTransportCredentials(insecure.NewCredentials()),
			grpc.WithContextDialer(unixDialer),
		}
		requireToken, _, err := parseAuthMode(cfg.Auth.Mode)
		if err != nil {
			return nil, err
		}
		if requireToken && token != "" {
			opts = append(opts, grpc.WithPerRPCCredentials(tokenAuth{token: token, requireTransport: false}))
		}
		return grpc.DialContext(ctx, addr,
			opts...,
		)
	}
	var opts []grpc.DialOption
	loopback := isLoopbackHost(addr)
	requireToken, requireClientCert, err := parseAuthMode(cfg.Auth.Mode)
	if err != nil {
		return nil, err
	}
	requireTLS := requireClientCert || !loopback
	if requireTLS {
		creds, err := buildClientTLS(cfg, requireClientCert)
		if err != nil {
			return nil, err
		}
		opts = append(opts, grpc.WithTransportCredentials(creds))
	} else {
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	}
	if requireToken && token != "" {
		opts = append(opts, grpc.WithPerRPCCredentials(tokenAuth{token: token, requireTransport: requireTLS}))
	}
	return grpc.DialContext(ctx, addr, opts...)
}

func registerSpokeLoop(ctx context.Context, addr string, cfg *clientConfig, token string, info *proto.SpokeInfo) {
	const retryDelay = 5 * time.Second
	interval := 15 * time.Second
	for {
		if ctx.Err() != nil {
			return
		}
		resp, err := registerSpokeOnce(ctx, addr, cfg, token, info)
		if err != nil {
			slog.Warn("spoke: failed to register with hub", "addr", addr, "err", err)
			if !sleepWithContext(ctx, retryDelay) {
				return
			}
			continue
		}
		slog.Info("spoke: registered with hub", "addr", addr, "name", info.GetName())
		if resp != nil && resp.HeartbeatInterval != nil {
			if next := resp.HeartbeatInterval.AsDuration(); next > 0 {
				interval = next
			}
		}
		if !sleepWithContext(ctx, interval) {
			return
		}
	}
}

func registerSpokeOnce(parent context.Context, addr string, cfg *clientConfig, token string, info *proto.SpokeInfo) (*proto.RegisterSpokeResponse, error) {
	ctx, cancel := context.WithTimeout(parent, 3*time.Second)
	defer cancel()

	conn, err := dialHub(ctx, addr, cfg, token)
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	client := proto.NewVTRClient(conn)
	return client.RegisterSpoke(ctx, &proto.RegisterSpokeRequest{Spoke: info})
}

func sleepWithContext(ctx context.Context, d time.Duration) bool {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}
