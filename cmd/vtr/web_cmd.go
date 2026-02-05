package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"

	webtransport "github.com/advait/vtrpc/internal/transport/web"
	"github.com/spf13/cobra"
	"google.golang.org/grpc"
)

type webOptions struct {
	addr      string
	hub       string
	dev       bool
	devServer string
}

type webResolver struct {
	cfg *clientConfig
	hub coordinatorRef
}

func (r webResolver) HubTarget() (webtransport.HubTarget, error) {
	target := r.hub
	if strings.TrimSpace(target.Path) == "" {
		resolved, err := resolveHubTarget(r.cfg, "")
		if err != nil {
			return webtransport.HubTarget{}, err
		}
		target = resolved
	}
	return webtransport.HubTarget{Name: target.Name, Path: target.Path}, nil
}

func newWebCmd() *cobra.Command {
	opts := webOptions{
		dev:       webtransport.EnvBool("VTR_WEB_DEV", false),
		devServer: webtransport.EnvString("VTR_WEB_DEV_SERVER", webtransport.DefaultViteDevServer),
	}
	cmd := &cobra.Command{
		Use:   "web",
		Short: "Serve the web UI",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runWeb(opts)
		},
	}

	cmd.Flags().StringVar(&opts.addr, "listen", "127.0.0.1:8080", "address to listen on")
	cmd.Flags().StringVar(&opts.addr, "addr", "127.0.0.1:8080", "address to listen on (deprecated)")
	_ = cmd.Flags().MarkDeprecated("addr", "use --listen")
	cmd.Flags().StringVar(&opts.hub, "hub", "", "hub address (host:port)")
	cmd.Flags().BoolVar(&opts.dev, "dev", opts.dev, "serve the web UI via the Vite dev server (HMR)")
	cmd.Flags().StringVar(&opts.devServer, "dev-server", opts.devServer, "Vite dev server URL for --dev")

	return cmd
}

func runWeb(opts webOptions) error {
	resolver, err := newWebResolver(opts)
	if err != nil {
		return err
	}
	srv, err := newWebServer(opts, resolver)
	if err != nil {
		return err
	}

	url := webURL(opts.addr)
	fmt.Printf("vtr web listening on %s\n", url)
	if err := openBrowser(url); err != nil {
		fmt.Fprintf(os.Stderr, "vtr web: unable to open browser: %v\n", err)
	}

	return srv.ListenAndServe()
}

func newWebHandler(opts webOptions, resolver webResolver) (http.Handler, error) {
	return webtransport.NewHandler(webtransport.Options{
		Addr:       opts.addr,
		Dev:        opts.dev,
		DevServer:  opts.devServer,
		Version:    Version,
		RPCTimeout: rpcTimeout,
		LogResize:  webtransport.EnvBool("VTR_LOG_RESIZE", false),
	}, resolver, func(ctx context.Context, addr string) (*grpc.ClientConn, error) {
		return dialClient(ctx, addr, resolver.cfg)
	})
}

func newWebServer(opts webOptions, resolver webResolver) (*http.Server, error) {
	handler, err := newWebHandler(opts, resolver)
	if err != nil {
		return nil, err
	}
	return &http.Server{Addr: opts.addr, Handler: handler}, nil
}

func newWebResolver(opts webOptions) (webResolver, error) {
	cfg, _, err := loadConfigWithPath()
	if err != nil {
		return webResolver{}, err
	}
	hub, err := resolveHubTarget(cfg, opts.hub)
	if err != nil {
		return webResolver{}, err
	}
	return webResolver{hub: hub, cfg: cfg}, nil
}

func webURL(addr string) string {
	if strings.Contains(addr, "://") {
		return addr
	}
	host := addr
	port := ""
	if splitHost, splitPort, err := net.SplitHostPort(addr); err == nil {
		host = splitHost
		port = splitPort
	}
	if port == "" {
		return "http://" + addr
	}
	if host == "" || host == "0.0.0.0" || host == "::" {
		host = "127.0.0.1"
	}
	if strings.Contains(host, ":") && !strings.HasPrefix(host, "[") {
		host = "[" + host + "]"
	}
	return fmt.Sprintf("http://%s:%s", host, port)
}

func openBrowser(url string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		return err
	}
	go func() {
		_ = cmd.Wait()
	}()
	return nil
}
