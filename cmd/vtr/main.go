// Package main provides the vtr CLI entrypoint.
package main

import (
	"fmt"
	"os"
)

// Version is set at build time via ldflags.
var Version = "dev"

func main() {
	if err := newRootCmd().Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
