package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/advait/vtrpc/server"
	"github.com/spf13/cobra"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
)

type spokeOptions struct {
	socket        string
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

	cmd.Flags().StringVar(&opts.socket, "socket", "", "path to Unix socket (default from vtrpc.toml)")
	cmd.Flags().StringVar(&opts.grpcAddr, "grpc-addr", "", "TCP gRPC address (default from vtrpc.toml)")
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

	socketPath := opts.socket
	if strings.TrimSpace(socketPath) == "" {
		socketPath = cfg.Hub.GrpcSocket
	}
	grpcAddr := opts.grpcAddr
	if strings.TrimSpace(grpcAddr) == "" {
		grpcAddr = cfg.Hub.GrpcAddr
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
	if requireToken {
		loaded, err := readToken(cfg.Auth.TokenFile)
		if err != nil {
			return err
		}
		token = loaded
	}

	tlsConfig, err := buildServerTLSConfig(cfg.Server, cfg.Auth, requireClientCert)
	if err != nil {
		return err
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

	logger.Info("spoke starting",
		"socket", socketPath,
		"grpc_addr", grpcAddr,
		"hub", opts.hubAddr,
		"log_level", strings.ToLower(opts.logLevel),
	)

	errCh := make(chan error, 2)
	servers := 0
	start := func(fn func() error) {
		servers++
		go func() {
			errCh <- fn()
		}()
	}

	start(func() error {
		return server.ServeUnix(ctx, coord, socketPath)
	})

	if strings.TrimSpace(grpcAddr) != "" {
		start(func() error {
			return server.ServeTCP(ctx, coord, grpcAddr, tlsConfig, token)
		})
	}

	if strings.TrimSpace(opts.hubAddr) != "" {
		go validateHubConnection(opts.hubAddr, cfg, token)
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

func validateHubConnection(addr string, cfg *clientConfig, token string) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	conn, err := dialHub(ctx, addr, cfg, token)
	if err != nil {
		slog.Warn("spoke: failed to reach hub", "addr", addr, "err", err)
		return
	}
	_ = conn.Close()
	slog.Info("spoke: hub reachable", "addr", addr)
}

func dialHub(ctx context.Context, addr string, cfg *clientConfig, token string) (*grpc.ClientConn, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	var opts []grpc.DialOption
	if isLoopbackHost(addr) {
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	} else {
		creds, err := buildClientTLS(cfg)
		if err != nil {
			return nil, err
		}
		opts = append(opts, grpc.WithTransportCredentials(creds))
	}
	if token != "" {
		opts = append(opts, grpc.WithPerRPCCredentials(tokenAuth{token: token}))
	}
	return grpc.DialContext(ctx, addr, opts...)
}

type tokenAuth struct {
	token string
}

func (t tokenAuth) GetRequestMetadata(ctx context.Context, _ ...string) (map[string]string, error) {
	return map[string]string{"authorization": "Bearer " + t.token}, nil
}

func (t tokenAuth) RequireTransportSecurity() bool {
	return true
}

func buildClientTLS(cfg *clientConfig) (credentials.TransportCredentials, error) {
	if cfg == nil {
		return nil, errors.New("auth config is required")
	}
	certPath := strings.TrimSpace(cfg.Auth.CertFile)
	keyPath := strings.TrimSpace(cfg.Auth.KeyFile)
	caPath := strings.TrimSpace(cfg.Auth.CaFile)
	if certPath == "" || keyPath == "" || caPath == "" {
		return nil, errors.New("auth cert_file, key_file, and ca_file are required for TLS")
	}
	cert, err := tls.LoadX509KeyPair(certPath, keyPath)
	if err != nil {
		return nil, err
	}
	caData, err := os.ReadFile(caPath)
	if err != nil {
		return nil, err
	}
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(caData) {
		return nil, errors.New("failed to parse CA certificate")
	}
	return credentials.NewTLS(&tls.Config{
		Certificates: []tls.Certificate{cert},
		RootCAs:      pool,
		MinVersion:   tls.VersionTLS12,
	}), nil
}

func isLoopbackHost(addr string) bool {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return false
	}
	if host == "" {
		return false
	}
	trimmed := strings.Trim(host, "[]")
	if strings.EqualFold(trimmed, "localhost") {
		return true
	}
	if ip := net.ParseIP(trimmed); ip != nil {
		return ip.IsLoopback()
	}
	return false
}
