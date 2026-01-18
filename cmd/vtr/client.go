package main

import (
	"context"
	"encoding/hex"
	"fmt"
	"io"
	"net"
	"sort"
	"strconv"
	"strings"
	"time"

	proto "github.com/advait/vtrpc/proto"
	"github.com/spf13/cobra"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/protobuf/types/known/durationpb"
)

const (
	dialTimeout        = 3 * time.Second
	rpcTimeout         = 10 * time.Second
	waitTimeoutDefault = 30 * time.Second
	idleTimeoutDefault = 30 * time.Second
	idleDurationDefault = 5 * time.Second
)

func newListCmd() *cobra.Command {
	var socket string
	var jsonOut bool
	cmd := &cobra.Command{
		Use:   "ls",
		Short: "List sessions",
		RunE: func(cmd *cobra.Command, _ []string) error {
			cfg, _, output, err := loadConfigAndOutput(jsonOut)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			if socket != "" {
				coords = []coordinatorRef{{Name: coordinatorName(socket), Path: socket}}
			} else {
				coords = coordinatorsOrDefault(coords)
			}
			items := make([]sessionItem, 0)
			for _, coord := range coords {
				ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
				err = withCoordinator(ctx, coord, func(client proto.VTRClient) error {
					resp, err := client.List(ctx, &proto.ListRequest{})
					if err != nil {
						return err
					}
					for _, session := range resp.Sessions {
						items = append(items, sessionItem{Coordinator: coord.Name, Session: session})
					}
					return nil
				})
				cancel()
				if err != nil {
					return err
				}
			}
			sort.Slice(items, func(i, j int) bool {
				left := items[i]
				right := items[j]
				if left.Coordinator == right.Coordinator {
					leftName := ""
					rightName := ""
					if left.Session != nil {
						leftName = left.Session.Name
					}
					if right.Session != nil {
						rightName = right.Session.Name
					}
					return leftName < rightName
				}
				return left.Coordinator < right.Coordinator
			})
			if output == outputJSON {
				return writeJSON(cmd.OutOrStdout(), sessionsToJSON(items))
			}
			printListHuman(cmd.OutOrStdout(), items)
			return nil
		},
	}
	addSocketFlag(cmd, &socket)
	addJSONFlag(cmd, &jsonOut)
	return cmd
}

func newSpawnCmd() *cobra.Command {
	var socket string
	var jsonOut bool
	var command string
	var cwd string
	var cols int
	var rows int
	cmd := &cobra.Command{
		Use:   "spawn <name>",
		Short: "Spawn a new session",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, configPath, output, err := loadConfigAndOutput(jsonOut)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			target, err := resolveSpawnTarget(configPath, coords, socket, args[0])
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			return withCoordinator(ctx, target.Coordinator, func(client proto.VTRClient) error {
				req := &proto.SpawnRequest{
					Name:       target.Session,
					Command:    command,
					WorkingDir: cwd,
				}
				if cols > 0 {
					req.Cols = int32(cols)
				}
				if rows > 0 {
					req.Rows = int32(rows)
				}
				resp, err := client.Spawn(ctx, req)
				if err != nil {
					return err
				}
				if output == outputJSON {
					return writeJSON(cmd.OutOrStdout(), jsonSessionEnvelope{Session: sessionToJSON(resp.Session, target.Coordinator.Name)})
				}
				printSessionHuman(cmd.OutOrStdout(), resp.Session, target.Coordinator.Name)
				return nil
			})
		},
	}
	addSocketFlag(cmd, &socket)
	addJSONFlag(cmd, &jsonOut)
	cmd.Flags().StringVar(&command, "cmd", "", "command to run (defaults to shell)")
	cmd.Flags().StringVar(&cwd, "cwd", "", "working directory")
	cmd.Flags().IntVar(&cols, "cols", 0, "columns (0 uses server default)")
	cmd.Flags().IntVar(&rows, "rows", 0, "rows (0 uses server default)")
	return cmd
}

func newInfoCmd() *cobra.Command {
	var socket string
	var jsonOut bool
	cmd := &cobra.Command{
		Use:   "info <name>",
		Short: "Show session info",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, _, output, err := loadConfigAndOutput(jsonOut)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			target, err := resolveSessionTarget(context.Background(), coords, socket, args[0])
			if err != nil {
				return err
			}
			return withCoordinator(ctx, target.Coordinator, func(client proto.VTRClient) error {
				resp, err := client.Info(ctx, &proto.InfoRequest{Name: target.Session})
				if err != nil {
					return err
				}
				if output == outputJSON {
					return writeJSON(cmd.OutOrStdout(), jsonSessionEnvelope{Session: sessionToJSON(resp.Session, target.Coordinator.Name)})
				}
				printSessionHuman(cmd.OutOrStdout(), resp.Session, target.Coordinator.Name)
				return nil
			})
		},
	}
	addSocketFlag(cmd, &socket)
	addJSONFlag(cmd, &jsonOut)
	return cmd
}

func newScreenCmd() *cobra.Command {
	var socket string
	var jsonOut bool
	cmd := &cobra.Command{
		Use:   "screen <name>",
		Short: "Fetch the current screen",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, _, output, err := loadConfigAndOutput(jsonOut)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			target, err := resolveSessionTarget(context.Background(), coords, socket, args[0])
			if err != nil {
				return err
			}
			return withCoordinator(ctx, target.Coordinator, func(client proto.VTRClient) error {
				resp, err := client.GetScreen(ctx, &proto.GetScreenRequest{Name: target.Session})
				if err != nil {
					return err
				}
				if output == outputJSON {
					return writeJSON(cmd.OutOrStdout(), jsonScreenEnvelope{Screen: screenToJSON(resp)})
				}
				printScreenHuman(cmd.OutOrStdout(), resp)
				return nil
			})
		},
	}
	addSocketFlag(cmd, &socket)
	addJSONFlag(cmd, &jsonOut)
	return cmd
}

func newSendCmd() *cobra.Command {
	var socket string
	var jsonOut bool
	cmd := &cobra.Command{
		Use:   "send <name> <text>",
		Short: "Send text to a session",
		Args:  cobra.MinimumNArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			text := strings.Join(args[1:], " ")
			cfg, _, output, err := loadConfigAndOutput(jsonOut)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			target, err := resolveSessionTarget(context.Background(), coords, socket, args[0])
			if err != nil {
				return err
			}
			return withCoordinator(ctx, target.Coordinator, func(client proto.VTRClient) error {
				_, err := client.SendText(ctx, &proto.SendTextRequest{Name: target.Session, Text: text})
				if err != nil {
					return err
				}
				return writeOK(cmd.OutOrStdout(), output)
			})
		},
	}
	addSocketFlag(cmd, &socket)
	addJSONFlag(cmd, &jsonOut)
	return cmd
}

func newKeyCmd() *cobra.Command {
	var socket string
	var jsonOut bool
	cmd := &cobra.Command{
		Use:   "key <name> <key>",
		Short: "Send a special key sequence",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, _, output, err := loadConfigAndOutput(jsonOut)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			target, err := resolveSessionTarget(context.Background(), coords, socket, args[0])
			if err != nil {
				return err
			}
			return withCoordinator(ctx, target.Coordinator, func(client proto.VTRClient) error {
				_, err := client.SendKey(ctx, &proto.SendKeyRequest{Name: target.Session, Key: args[1]})
				if err != nil {
					return err
				}
				return writeOK(cmd.OutOrStdout(), output)
			})
		},
	}
	addSocketFlag(cmd, &socket)
	addJSONFlag(cmd, &jsonOut)
	return cmd
}

func newRawCmd() *cobra.Command {
	var socket string
	var jsonOut bool
	cmd := &cobra.Command{
		Use:   "raw <name> <hex>",
		Short: "Send raw hex bytes to a session",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := decodeHex(args[1])
			if err != nil {
				return err
			}
			cfg, _, output, err := loadConfigAndOutput(jsonOut)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			target, err := resolveSessionTarget(context.Background(), coords, socket, args[0])
			if err != nil {
				return err
			}
			return withCoordinator(ctx, target.Coordinator, func(client proto.VTRClient) error {
				_, err := client.SendBytes(ctx, &proto.SendBytesRequest{Name: target.Session, Data: data})
				if err != nil {
					return err
				}
				return writeOK(cmd.OutOrStdout(), output)
			})
		},
	}
	addSocketFlag(cmd, &socket)
	addJSONFlag(cmd, &jsonOut)
	return cmd
}

func newResizeCmd() *cobra.Command {
	var socket string
	var jsonOut bool
	cmd := &cobra.Command{
		Use:   "resize <name> <cols> <rows>",
		Short: "Resize a session",
		Args:  cobra.ExactArgs(3),
		RunE: func(cmd *cobra.Command, args []string) error {
			cols, err := parseSize(args[1])
			if err != nil {
				return err
			}
			rows, err := parseSize(args[2])
			if err != nil {
				return err
			}
			cfg, _, output, err := loadConfigAndOutput(jsonOut)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			target, err := resolveSessionTarget(context.Background(), coords, socket, args[0])
			if err != nil {
				return err
			}
			return withCoordinator(ctx, target.Coordinator, func(client proto.VTRClient) error {
				_, err := client.Resize(ctx, &proto.ResizeRequest{Name: target.Session, Cols: int32(cols), Rows: int32(rows)})
				if err != nil {
					return err
				}
				return writeOK(cmd.OutOrStdout(), output)
			})
		},
	}
	addSocketFlag(cmd, &socket)
	addJSONFlag(cmd, &jsonOut)
	return cmd
}

func newKillCmd() *cobra.Command {
	var socket string
	var jsonOut bool
	var signal string
	cmd := &cobra.Command{
		Use:   "kill <name>",
		Short: "Send a signal to a session",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, _, output, err := loadConfigAndOutput(jsonOut)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			target, err := resolveSessionTarget(context.Background(), coords, socket, args[0])
			if err != nil {
				return err
			}
			return withCoordinator(ctx, target.Coordinator, func(client proto.VTRClient) error {
				_, err := client.Kill(ctx, &proto.KillRequest{Name: target.Session, Signal: signal})
				if err != nil {
					return err
				}
				return writeOK(cmd.OutOrStdout(), output)
			})
		},
	}
	addSocketFlag(cmd, &socket)
	addJSONFlag(cmd, &jsonOut)
	cmd.Flags().StringVar(&signal, "signal", "", "signal to send (TERM, KILL, INT)")
	return cmd
}

func newRemoveCmd() *cobra.Command {
	var socket string
	var jsonOut bool
	cmd := &cobra.Command{
		Use:   "rm <name>",
		Short: "Remove a session",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, _, output, err := loadConfigAndOutput(jsonOut)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			target, err := resolveSessionTarget(context.Background(), coords, socket, args[0])
			if err != nil {
				return err
			}
			return withCoordinator(ctx, target.Coordinator, func(client proto.VTRClient) error {
				_, err := client.Remove(ctx, &proto.RemoveRequest{Name: target.Session})
				if err != nil {
					return err
				}
				return writeOK(cmd.OutOrStdout(), output)
			})
		},
	}
	addSocketFlag(cmd, &socket)
	addJSONFlag(cmd, &jsonOut)
	return cmd
}

func newGrepCmd() *cobra.Command {
	var socket string
	var jsonOut bool
	var before int
	var after int
	var contextLines int
	var maxMatches int
	cmd := &cobra.Command{
		Use:   "grep <name> <pattern>",
		Short: "Search scrollback for a pattern",
		Args:  cobra.MinimumNArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			pattern := strings.Join(args[1:], " ")
			if contextLines > 0 {
				before = contextLines
				after = contextLines
			}
			if before < 0 || after < 0 {
				return fmt.Errorf("context must be >= 0")
			}
			if maxMatches <= 0 {
				maxMatches = 100
			}
			cfg, _, output, err := loadConfigAndOutput(jsonOut)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			target, err := resolveSessionTarget(context.Background(), coords, socket, args[0])
			if err != nil {
				return err
			}
			return withCoordinator(ctx, target.Coordinator, func(client proto.VTRClient) error {
				resp, err := client.Grep(ctx, &proto.GrepRequest{
					Name:          target.Session,
					Pattern:       pattern,
					ContextBefore: int32(before),
					ContextAfter:  int32(after),
					MaxMatches:    int32(maxMatches),
				})
				if err != nil {
					return err
				}
				if output == outputJSON {
					return writeJSON(cmd.OutOrStdout(), grepToJSON(resp.Matches))
				}
				printGrepHuman(cmd.OutOrStdout(), resp.Matches)
				return nil
			})
		},
	}
	addSocketFlag(cmd, &socket)
	addJSONFlag(cmd, &jsonOut)
	cmd.Flags().IntVarP(&before, "before", "B", 0, "lines before match")
	cmd.Flags().IntVarP(&after, "after", "A", 0, "lines after match")
	cmd.Flags().IntVarP(&contextLines, "context", "C", 0, "lines before and after match")
	cmd.Flags().IntVar(&maxMatches, "max", 100, "maximum matches")
	return cmd
}

func newWaitCmd() *cobra.Command {
	var socket string
	var jsonOut bool
	var timeout time.Duration
	cmd := &cobra.Command{
		Use:   "wait <name> <pattern>",
		Short: "Wait for a pattern in output",
		Args:  cobra.MinimumNArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			pattern := strings.Join(args[1:], " ")
			if timeout <= 0 {
				timeout = waitTimeoutDefault
			}
			cfg, _, output, err := loadConfigAndOutput(jsonOut)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			ctxTimeout := timeout + 2*time.Second
			ctx, cancel := context.WithTimeout(context.Background(), ctxTimeout)
			defer cancel()
			target, err := resolveSessionTarget(context.Background(), coords, socket, args[0])
			if err != nil {
				return err
			}
			return withCoordinator(ctx, target.Coordinator, func(client proto.VTRClient) error {
				resp, err := client.WaitFor(ctx, &proto.WaitForRequest{
					Name:    target.Session,
					Pattern: pattern,
					Timeout: durationpb.New(timeout),
				})
				if err != nil {
					return err
				}
				if output == outputJSON {
					return writeJSON(cmd.OutOrStdout(), jsonWait{Matched: resp.Matched, MatchedLine: resp.MatchedLine, TimedOut: resp.TimedOut})
				}
				printWaitHuman(cmd.OutOrStdout(), resp.Matched, resp.MatchedLine, resp.TimedOut)
				return nil
			})
		},
	}
	addSocketFlag(cmd, &socket)
	addJSONFlag(cmd, &jsonOut)
	cmd.Flags().DurationVar(&timeout, "timeout", waitTimeoutDefault, "overall timeout")
	return cmd
}

func newIdleCmd() *cobra.Command {
	var socket string
	var jsonOut bool
	var timeout time.Duration
	var idle time.Duration
	cmd := &cobra.Command{
		Use:   "idle <name>",
		Short: "Wait for a period of inactivity",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if idle <= 0 {
				idle = idleDurationDefault
			}
			if timeout <= 0 {
				timeout = idleTimeoutDefault
			}
			cfg, _, output, err := loadConfigAndOutput(jsonOut)
			if err != nil {
				return err
			}
			coords, err := resolveCoordinatorRefs(cfg)
			if err != nil {
				return err
			}
			ctxTimeout := timeout + 2*time.Second
			ctx, cancel := context.WithTimeout(context.Background(), ctxTimeout)
			defer cancel()
			target, err := resolveSessionTarget(context.Background(), coords, socket, args[0])
			if err != nil {
				return err
			}
			return withCoordinator(ctx, target.Coordinator, func(client proto.VTRClient) error {
				resp, err := client.WaitForIdle(ctx, &proto.WaitForIdleRequest{
					Name:         target.Session,
					IdleDuration: durationpb.New(idle),
					Timeout:      durationpb.New(timeout),
				})
				if err != nil {
					return err
				}
				if output == outputJSON {
					return writeJSON(cmd.OutOrStdout(), jsonIdle{Idle: resp.Idle, TimedOut: resp.TimedOut})
				}
				printIdleHuman(cmd.OutOrStdout(), resp.Idle, resp.TimedOut)
				return nil
			})
		},
	}
	addSocketFlag(cmd, &socket)
	addJSONFlag(cmd, &jsonOut)
	cmd.Flags().DurationVar(&idle, "idle", idleDurationDefault, "idle duration")
	cmd.Flags().DurationVar(&timeout, "timeout", idleTimeoutDefault, "overall timeout")
	return cmd
}

func loadConfigAndOutput(jsonFlag bool) (*clientConfig, string, outputFormat, error) {
	cfg, configPath, err := loadConfigWithPath()
	if err != nil {
		return nil, "", "", err
	}
	output, err := resolveOutputFormat(cfg, jsonFlag)
	if err != nil {
		return nil, "", "", err
	}
	return cfg, configPath, output, nil
}

func withCoordinator(ctx context.Context, coord coordinatorRef, fn func(proto.VTRClient) error) error {
	conn, err := dialClient(ctx, coord.Path)
	if err != nil {
		return err
	}
	defer conn.Close()
	client := proto.NewVTRClient(conn)
	return fn(client)
}

func dialClient(ctx context.Context, socketPath string) (*grpc.ClientConn, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if _, ok := ctx.Deadline(); !ok {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, dialTimeout)
		defer cancel()
	}
	return grpc.DialContext(ctx, socketPath,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithContextDialer(unixDialer),
	)
}

func unixDialer(ctx context.Context, addr string) (net.Conn, error) {
	var d net.Dialer
	return d.DialContext(ctx, "unix", addr)
}

func addSocketFlag(cmd *cobra.Command, target *string) {
	cmd.Flags().StringVar(target, "socket", "", "path to coordinator socket")
}

func addJSONFlag(cmd *cobra.Command, target *bool) {
	cmd.Flags().BoolVar(target, "json", false, "output as JSON")
}

func writeOK(w io.Writer, format outputFormat) error {
	if format == outputJSON {
		return writeJSON(w, jsonOK{OK: true})
	}
	return nil
}

func decodeHex(value string) ([]byte, error) {
	trimmed := strings.TrimSpace(value)
	trimmed = strings.TrimPrefix(trimmed, "0x")
	trimmed = strings.ReplaceAll(trimmed, " ", "")
	trimmed = strings.ReplaceAll(trimmed, ":", "")
	if trimmed == "" {
		return nil, fmt.Errorf("hex string is required")
	}
	if len(trimmed)%2 != 0 {
		return nil, fmt.Errorf("hex string must have even length")
	}
	return hex.DecodeString(trimmed)
}

func parseSize(value string) (int, error) {
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("invalid size %q", value)
	}
	if parsed <= 0 || parsed > int(^uint16(0)) {
		return 0, fmt.Errorf("size must be between 1 and %d", int(^uint16(0)))
	}
	return parsed, nil
}
