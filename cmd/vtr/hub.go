package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
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
	"google.golang.org/grpc"
)

type hubOptions struct {
	socket        string
	addr          string
	noWeb         bool
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

	cmd.Flags().StringVar(&opts.socket, "socket", "", "path to Unix socket (default from vtrpc.toml)")
	cmd.Flags().StringVar(&opts.addr, "addr", "", "single listener for gRPC + web (default from vtrpc.toml)")
	cmd.Flags().BoolVar(&opts.noWeb, "no-web", false, "disable the web UI")
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

	socketPath := opts.socket
	if strings.TrimSpace(socketPath) == "" {
		socketPath = cfg.Hub.GrpcSocket
	}
	addr := opts.addr
	if strings.TrimSpace(addr) == "" {
		addr = cfg.Hub.Addr
	}
	webEnabled := true
	if cfg.Hub.WebEnabled != nil {
		webEnabled = *cfg.Hub.WebEnabled
	}
	if opts.noWeb {
		webEnabled = false
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

	localService := server.NewGRPCServer(coord)
	staticSpokes := federationSpokesFromConfig(cfg)
	federated := newFederatedServer(
		localService,
		coordinatorName(socketPath),
		staticSpokes,
		localService.SpokeRegistry(),
		func(ctx context.Context, addr string) (*grpc.ClientConn, error) {
			return dialClient(ctx, addr, cfg)
		},
		logger,
	)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	logger.Info("hub starting",
		"socket", socketPath,
		"addr", addr,
		"web_enabled", webEnabled,
		"log_level", strings.ToLower(opts.logLevel),
	)

	errCh := make(chan error, 3)
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

	if strings.TrimSpace(addr) != "" {
		if !isLoopbackHost(addr) && tlsConfig == nil {
			return errors.New("addr requires TLS when binding to a non-loopback address")
		}
		resolver := webResolver{
			cfg: cfg,
			coordsFn: func() ([]coordinatorRef, error) {
				return federatedCoordinatorRefs(socketPath, staticSpokes, localService.SpokeRegistry()), nil
			},
		}
		webHandler := http.NotFoundHandler()
		if webEnabled {
			webOpts := webOptions{
				addr:      addr,
				socket:    socketPath,
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
		start(func() error {
			if tlsConfig != nil {
				err := srv.ListenAndServeTLS("", "")
				if errors.Is(err, http.ErrServerClosed) {
					return nil
				}
				return err
			}
			err := srv.ListenAndServe()
			if errors.Is(err, http.ErrServerClosed) {
				return nil
			}
			return err
		})
	} else if webEnabled {
		return errors.New("web UI requires addr")
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

// auth helpers in auth.go
