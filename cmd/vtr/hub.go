package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/advait/vtrpc/server"
	"github.com/spf13/cobra"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

type hubOptions struct {
	addr          string
	noWeb         bool
	noCoordinator bool
	shell         string
	cols          int
	rows          int
	scrollback    uint
	killTimeout   time.Duration
	idleThreshold time.Duration
	logLevel      string
}

func newHubCmd() *cobra.Command {
	opts := hubOptions{}
	cmd := &cobra.Command{
		Use:   "hub",
		Short: "Start the hub coordinator",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runHub(opts)
		},
	}

	cmd.Flags().StringVar(&opts.addr, "addr", "", "single listener for gRPC + web (default from vtrpc.toml)")
	cmd.Flags().BoolVar(&opts.noWeb, "no-web", false, "disable the web UI")
	cmd.Flags().BoolVar(&opts.noCoordinator, "no-coordinator", false, "disable the local coordinator (hub-only mode)")
	cmd.Flags().StringVar(&opts.shell, "shell", "", "default shell path")
	cmd.Flags().IntVar(&opts.cols, "cols", 80, "default columns")
	cmd.Flags().IntVar(&opts.rows, "rows", 24, "default rows")
	cmd.Flags().UintVar(&opts.scrollback, "scrollback", 10000, "scrollback lines")
	cmd.Flags().DurationVar(&opts.killTimeout, "kill-timeout", 5*time.Second, "kill timeout (e.g. 5s)")
	cmd.Flags().DurationVar(&opts.idleThreshold, "idle-threshold", 5*time.Second, "idle threshold before session is idle")
	cmd.Flags().StringVar(&opts.logLevel, "log-level", "info", "log level (debug, info, warn, error)")

	return cmd
}

func runHub(opts hubOptions) error {
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

	addr := opts.addr
	if strings.TrimSpace(addr) == "" {
		addr = cfg.Hub.Addr
	}
	if strings.TrimSpace(addr) == "" {
		addr = defaultHubAddr
	}
	webEnabled := true
	if cfg.Hub.WebEnabled != nil {
		webEnabled = *cfg.Hub.WebEnabled
	}
	if opts.noWeb {
		webEnabled = false
	}
	coordinatorEnabled := true
	if cfg.Hub.CoordinatorEnabled != nil {
		coordinatorEnabled = *cfg.Hub.CoordinatorEnabled
	}
	if opts.noCoordinator {
		coordinatorEnabled = false
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

	var coord *server.Coordinator
	if coordinatorEnabled {
		coord = server.NewCoordinator(server.CoordinatorOptions{
			DefaultShell:  opts.shell,
			DefaultCols:   uint16(opts.cols),
			DefaultRows:   uint16(opts.rows),
			Scrollback:    uint32(opts.scrollback),
			KillTimeout:   opts.killTimeout,
			IdleThreshold: opts.idleThreshold,
		})
		defer coord.CloseAll()
	}

	localService := server.NewGRPCServer(coord)
	dialAddr := hubDialAddr(addr)
	localService.SetCoordinatorInfo(hubName(dialAddr), dialAddr)
	federated := newFederatedServer(
		localService,
		hubName(dialAddr),
		dialAddr,
		coordinatorEnabled,
		localService.SpokeRegistry(),
		logger,
	)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	logger.Info("hub starting",
		"addr", addr,
		"web_enabled", webEnabled,
		"coordinator_enabled", coordinatorEnabled,
		"log_level", strings.ToLower(opts.logLevel),
	)

	if !isLoopbackHost(addr) && tlsConfig == nil {
		return errors.New("addr requires TLS when binding to a non-loopback address")
	}
	resolver := webResolver{
		cfg: cfg,
		hub: coordinatorRef{Name: hubName(dialAddr), Path: dialAddr},
		// coords are now derived from federation snapshots via the hub.
	}
	webHandler := http.NotFoundHandler()
	if webEnabled {
		webOpts := webOptions{
			addr:      addr,
			dev:       envBool("VTR_WEB_DEV", false),
			devServer: envString("VTR_WEB_DEV_SERVER", defaultViteDevServer),
		}
		handler, err := newWebHandler(webOpts, resolver)
		if err != nil {
			return err
		}
		webHandler = handler
	}
	grpcServer := server.NewGRPCServerWithTokenAndService(federated, token)
	handler := grpcOrHTTPHandler(grpcServer, webHandler)
	srv := &http.Server{
		Addr: addr,
	}
	if tlsConfig == nil {
		srv.Handler = h2c.NewHandler(handler, &http2.Server{})
	} else {
		srv.TLSConfig = tlsConfig
		srv.Handler = handler
	}
	logger.Info("unified listener", "addr", addr, "web_enabled", webEnabled, "tls", tlsConfig != nil)
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	errCh := make(chan error, 1)
	go func() {
		if tlsConfig != nil {
			err := srv.ListenAndServeTLS("", "")
			if errors.Is(err, http.ErrServerClosed) {
				errCh <- nil
				return
			}
			errCh <- err
			return
		}
		err := srv.ListenAndServe()
		if errors.Is(err, http.ErrServerClosed) {
			errCh <- nil
			return
		}
		errCh <- err
	}()

	var firstErr error
	err = <-errCh
	if err != nil && !errors.Is(err, context.Canceled) && !errors.Is(err, context.DeadlineExceeded) {
		firstErr = err
		stop()
	}
	return firstErr
}

// auth helpers in auth.go

func hubDialAddr(addr string) string {
	addr = strings.TrimSpace(addr)
	if addr == "" {
		return ""
	}
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return addr
	}
	host = strings.Trim(host, "[]")
	switch host {
	case "", "0.0.0.0":
		return net.JoinHostPort("127.0.0.1", port)
	case "::":
		return net.JoinHostPort("::1", port)
	default:
		return addr
	}
}
