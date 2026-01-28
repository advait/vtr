package main

import (
	"context"
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
	"google.golang.org/grpc/keepalive"
)

type spokeOptions struct {
	name          string
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

	hubTarget, err := resolveHubTarget(cfg, opts.hubAddr)
	if err != nil {
		return err
	}
	hubAddr := strings.TrimSpace(hubTarget.Path)

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
	requireToken, _, err := parseAuthMode(authMode)
	if err != nil {
		return err
	}
	token := ""
	if requireToken && hubAddr != "" {
		loaded, err := readToken(cfg.Auth.TokenFile)
		if err != nil {
			return err
		}
		token = loaded
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
	localService := server.NewGRPCServer(coord)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	spokeName := strings.TrimSpace(opts.name)
	if spokeName == "" {
		if host, err := os.Hostname(); err == nil && host != "" {
			spokeName = host
		} else {
			spokeName = "spoke"
		}
	}
	localService.SetCoordinatorInfo(spokeName, "")

	logger.Info("spoke starting",
		"name", spokeName,
		"hub", hubAddr,
		"log_level", strings.ToLower(opts.logLevel),
	)

	if hubAddr == "" {
		return errors.New("hub address is required")
	}

	if hubAddr != "" {
		info := &proto.SpokeInfo{
			Name:    spokeName,
			Version: Version,
		}
		go runSpokeTunnelLoop(ctx, hubAddr, cfg, token, info, localService, logger)
	}

	<-ctx.Done()
	if errors.Is(ctx.Err(), context.Canceled) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
		return nil
	}
	return ctx.Err()
}

func dialHub(ctx context.Context, addr string, cfg *clientConfig, token string) (*grpc.ClientConn, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	keepaliveParams := keepalive.ClientParameters{
		Time:                30 * time.Second,
		Timeout:             10 * time.Second,
		PermitWithoutStream: true,
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
	opts = append(opts, grpc.WithKeepaliveParams(keepaliveParams))
	if requireToken && token != "" {
		opts = append(opts, grpc.WithPerRPCCredentials(tokenAuth{token: token, requireTransport: requireTLS}))
	}
	return grpc.DialContext(ctx, addr, opts...)
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
