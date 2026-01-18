// Package main provides the vtr CLI entrypoint.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/advait/vtrpc/server"
)

// Version is set at build time via ldflags.
var Version = "dev"

func main() {
	if len(os.Args) < 2 {
		usage()
		return
	}
	switch os.Args[1] {
	case "version":
		fmt.Printf("vtr %s\n", Version)
	case "serve":
		if err := serve(os.Args[2:]); err != nil {
			log.Fatalf("serve: %v", err)
		}
	default:
		usage()
	}
}

func usage() {
	fmt.Printf("vtr %s\n", Version)
	fmt.Println("Usage: vtr <command> [options]")
	fmt.Println("Commands: serve, version")
}

func serve(args []string) error {
	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	socketPath := fs.String("socket", "/var/run/vtr.sock", "path to Unix socket")
	shell := fs.String("shell", "", "default shell path")
	cols := fs.Int("cols", 80, "default columns")
	rows := fs.Int("rows", 24, "default rows")
	scrollback := fs.Uint("scrollback", 10000, "scrollback lines")
	killTimeout := fs.Duration("kill-timeout", 5*time.Second, "kill timeout (e.g. 5s)")

	if err := fs.Parse(args); err != nil {
		return err
	}

	if *cols <= 0 || *cols > int(^uint16(0)) {
		return fmt.Errorf("cols must be between 1 and %d", int(^uint16(0)))
	}
	if *rows <= 0 || *rows > int(^uint16(0)) {
		return fmt.Errorf("rows must be between 1 and %d", int(^uint16(0)))
	}
	if *scrollback > uint(^uint32(0)) {
		return fmt.Errorf("scrollback must be <= %d", uint(^uint32(0)))
	}

	opts := server.CoordinatorOptions{
		DefaultShell: *shell,
		DefaultCols:  uint16(*cols),
		DefaultRows:  uint16(*rows),
		Scrollback:   uint32(*scrollback),
		KillTimeout:  *killTimeout,
	}

	coord := server.NewCoordinator(opts)
	defer coord.Close()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	err := server.ServeUnix(ctx, coord, *socketPath)
	if errors.Is(err, context.Canceled) {
		return nil
	}
	return err
}
