package main

import (
	"context"
	"encoding/hex"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"time"

	proto "github.com/advait/vtrpc/proto"
	"github.com/spf13/cobra"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

const (
	dialTimeout = 3 * time.Second
	rpcTimeout  = 10 * time.Second
)

type clientOptions struct {
	SocketPath  string
	Coordinator string
	Output      outputFormat
}

func newListCmd() *cobra.Command {
	var socket string
	var jsonOut bool
	cmd := &cobra.Command{
		Use:   "ls",
		Short: "List sessions",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return withClient(cmd, socket, jsonOut, func(ctx context.Context, client proto.VTRClient, opts clientOptions, out io.Writer) error {
				resp, err := client.List(ctx, &proto.ListRequest{})
				if err != nil {
					return err
				}
				if opts.Output == outputJSON {
					items := make([]jsonSession, 0, len(resp.Sessions))
					for _, session := range resp.Sessions {
						items = append(items, sessionToJSON(session, opts.Coordinator))
					}
					return writeJSON(out, jsonList{Sessions: items})
				}
				printListHuman(out, resp.Sessions, opts.Coordinator)
				return nil
			})
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
			return withClient(cmd, socket, jsonOut, func(ctx context.Context, client proto.VTRClient, opts clientOptions, out io.Writer) error {
				req := &proto.SpawnRequest{
					Name:       args[0],
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
				if opts.Output == outputJSON {
					return writeJSON(out, jsonSessionEnvelope{Session: sessionToJSON(resp.Session, opts.Coordinator)})
				}
				printSessionHuman(out, resp.Session, opts.Coordinator)
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
			return withClient(cmd, socket, jsonOut, func(ctx context.Context, client proto.VTRClient, opts clientOptions, out io.Writer) error {
				resp, err := client.Info(ctx, &proto.InfoRequest{Name: args[0]})
				if err != nil {
					return err
				}
				if opts.Output == outputJSON {
					return writeJSON(out, jsonSessionEnvelope{Session: sessionToJSON(resp.Session, opts.Coordinator)})
				}
				printSessionHuman(out, resp.Session, opts.Coordinator)
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
			return withClient(cmd, socket, jsonOut, func(ctx context.Context, client proto.VTRClient, opts clientOptions, out io.Writer) error {
				resp, err := client.GetScreen(ctx, &proto.GetScreenRequest{Name: args[0]})
				if err != nil {
					return err
				}
			if opts.Output == outputJSON {
				return writeJSON(out, jsonScreenEnvelope{Screen: screenToJSON(resp)})
			}
				printScreenHuman(out, resp)
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
			return withClient(cmd, socket, jsonOut, func(ctx context.Context, client proto.VTRClient, opts clientOptions, out io.Writer) error {
				_, err := client.SendText(ctx, &proto.SendTextRequest{Name: args[0], Text: text})
				if err != nil {
					return err
				}
				return writeOK(out, opts.Output)
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
			return withClient(cmd, socket, jsonOut, func(ctx context.Context, client proto.VTRClient, opts clientOptions, out io.Writer) error {
				_, err := client.SendKey(ctx, &proto.SendKeyRequest{Name: args[0], Key: args[1]})
				if err != nil {
					return err
				}
				return writeOK(out, opts.Output)
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
			return withClient(cmd, socket, jsonOut, func(ctx context.Context, client proto.VTRClient, opts clientOptions, out io.Writer) error {
				_, err := client.SendBytes(ctx, &proto.SendBytesRequest{Name: args[0], Data: data})
				if err != nil {
					return err
				}
				return writeOK(out, opts.Output)
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
			return withClient(cmd, socket, jsonOut, func(ctx context.Context, client proto.VTRClient, opts clientOptions, out io.Writer) error {
				_, err := client.Resize(ctx, &proto.ResizeRequest{Name: args[0], Cols: int32(cols), Rows: int32(rows)})
				if err != nil {
					return err
				}
				return writeOK(out, opts.Output)
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
			return withClient(cmd, socket, jsonOut, func(ctx context.Context, client proto.VTRClient, opts clientOptions, out io.Writer) error {
				_, err := client.Kill(ctx, &proto.KillRequest{Name: args[0], Signal: signal})
				if err != nil {
					return err
				}
				return writeOK(out, opts.Output)
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
			return withClient(cmd, socket, jsonOut, func(ctx context.Context, client proto.VTRClient, opts clientOptions, out io.Writer) error {
				_, err := client.Remove(ctx, &proto.RemoveRequest{Name: args[0]})
				if err != nil {
					return err
				}
				return writeOK(out, opts.Output)
			})
		},
	}
	addSocketFlag(cmd, &socket)
	addJSONFlag(cmd, &jsonOut)
	return cmd
}

func withClient(cmd *cobra.Command, socketFlag string, jsonFlag bool, fn func(context.Context, proto.VTRClient, clientOptions, io.Writer) error) error {
	opts, err := resolveClientOptions(socketFlag, jsonFlag)
	if err != nil {
		return err
	}
	conn, err := dialClient(opts.SocketPath)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
	defer cancel()

	client := proto.NewVTRClient(conn)
	return fn(ctx, client, opts, cmd.OutOrStdout())
}

func resolveClientOptions(socketFlag string, jsonFlag bool) (clientOptions, error) {
	configPath := defaultConfigPath()
	cfg, err := loadConfig(configPath)
	if err != nil {
		return clientOptions{}, err
	}
	socketPath, err := resolveSocketPath(cfg, socketFlag, configPath)
	if err != nil {
		return clientOptions{}, err
	}
	output, err := resolveOutputFormat(cfg, jsonFlag)
	if err != nil {
		return clientOptions{}, err
	}
	return clientOptions{
		SocketPath:  socketPath,
		Coordinator: coordinatorName(socketPath),
		Output:      output,
	}, nil
}

func dialClient(socketPath string) (*grpc.ClientConn, error) {
	ctx, cancel := context.WithTimeout(context.Background(), dialTimeout)
	defer cancel()
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
