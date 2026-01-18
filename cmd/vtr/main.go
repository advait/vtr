// Package main provides the vtr CLI entrypoint.
package main

import (
	"fmt"
	"os"
)

// Version is set at build time via ldflags.
var Version = "dev"

func main() {
	if len(os.Args) > 1 && os.Args[1] == "version" {
		fmt.Printf("vtr %s\n", Version)
		return
	}
	fmt.Printf("vtr %s\n", Version)
	fmt.Println("Usage: vtr <command> [options]")
	fmt.Println("Commands: serve, ls, spawn, screen, send, key, rm, kill, grep, wait, idle, attach")
}
