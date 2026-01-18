package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/advait/vtrpc/server"
	"github.com/spf13/cobra"
)

type serveOptions struct {
	socket      string
	shell       string
	cols        int
	rows        int
	scrollback  uint
	killTimeout time.Duration
}

func newServeCmd() *cobra.Command {
	opts := serveOptions{}
	cmd := &cobra.Command{
		Use:   "serve",
		Short: "Start the coordinator",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runServe(opts)
		},
	}

	cmd.Flags().StringVar(&opts.socket, "socket", "/var/run/vtr.sock", "path to Unix socket")
	cmd.Flags().StringVar(&opts.shell, "shell", "", "default shell path")
	cmd.Flags().IntVar(&opts.cols, "cols", 80, "default columns")
	cmd.Flags().IntVar(&opts.rows, "rows", 24, "default rows")
	cmd.Flags().UintVar(&opts.scrollback, "scrollback", 10000, "scrollback lines")
	cmd.Flags().DurationVar(&opts.killTimeout, "kill-timeout", 5*time.Second, "kill timeout (e.g. 5s)")

	return cmd
}

func runServe(opts serveOptions) error {
	if opts.cols <= 0 || opts.cols > int(^uint16(0)) {
		return fmt.Errorf("cols must be between 1 and %d", int(^uint16(0)))
	}
	if opts.rows <= 0 || opts.rows > int(^uint16(0)) {
		return fmt.Errorf("rows must be between 1 and %d", int(^uint16(0)))
	}
	if opts.scrollback > uint(^uint32(0)) {
		return fmt.Errorf("scrollback must be <= %d", uint(^uint32(0)))
	}

	coord := server.NewCoordinator(server.CoordinatorOptions{
		DefaultShell: opts.shell,
		DefaultCols:  uint16(opts.cols),
		DefaultRows:  uint16(opts.rows),
		Scrollback:   uint32(opts.scrollback),
		KillTimeout:  opts.killTimeout,
	})
	defer coord.Close()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	err := server.ServeUnix(ctx, coord, opts.socket)
	if errors.Is(err, context.Canceled) {
		return nil
	}
	return err
}
