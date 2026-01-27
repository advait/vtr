package main

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
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
	dialTimeout         = 3 * time.Second
	rpcTimeout          = 10 * time.Second
	waitTimeoutDefault  = 30 * time.Second
	idleTimeoutDefault  = 30 * time.Second
	idleDurationDefault = 5 * time.Second
)

func newListCmd() *cobra.Command {
	var hub string
	cmd := &cobra.Command{
		Use:   "ls",
		Short: "List sessions",
		RunE: func(cmd *cobra.Command, _ []string) error {
			cfg, _, err := loadConfigWithPath()
			if err != nil {
				return err
			}
			target, err := resolveHubTarget(cfg, hub)
			if err != nil {
				return err
			}
			items := make([]sessionItem, 0)
			coords := make([]jsonCoordinator, 0)
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			err = withCoordinator(ctx, target, cfg, func(client proto.VTRClient) error {
				snapshot, snapErr := fetchSessionsSnapshot(ctx, client)
				if snapErr == nil && snapshot != nil {
					items, coords = snapshotToItems(snapshot, target)
					return nil
				}
				resp, err := client.List(ctx, &proto.ListRequest{})
				if err != nil {
					if snapErr != nil {
						return fmt.Errorf("subscribe sessions: %w", snapErr)
					}
					return err
				}
				for _, session := range resp.Sessions {
					items = append(items, sessionItem{Coordinator: target.Name, Session: session})
				}
				if snapErr != nil {
					coords = []jsonCoordinator{{Name: target.Name, Path: target.Path, Error: snapErr.Error()}}
				} else {
					coords = []jsonCoordinator{{Name: target.Name, Path: target.Path}}
				}
				return nil
			})
			cancel()
			if err != nil {
				return err
			}
			sort.Slice(items, func(i, j int) bool {
				left := items[i]
				right := items[j]
				leftName := ""
				rightName := ""
				leftOrder := uint32(0)
				rightOrder := uint32(0)
				if left.Session != nil {
					leftName = left.Session.Name
					leftOrder = left.Session.GetOrder()
				}
				if right.Session != nil {
					rightName = right.Session.Name
					rightOrder = right.Session.GetOrder()
				}
				if leftOrder == rightOrder {
					if leftName == rightName {
						return left.Coordinator < right.Coordinator
					}
					return leftName < rightName
				}
				if leftOrder == 0 {
					return false
				}
				if rightOrder == 0 {
					return true
				}
				return leftOrder < rightOrder
			})
			return writeJSON(cmd.OutOrStdout(), listToJSON(items, coords))
		},
	}
	addHubFlag(cmd, &hub)
	return cmd
}

func fetchSessionsSnapshot(ctx context.Context, client proto.VTRClient) (*proto.SessionsSnapshot, error) {
	stream, err := client.SubscribeSessions(ctx, &proto.SubscribeSessionsRequest{})
	if err != nil {
		return nil, err
	}
	snapshot, err := stream.Recv()
	if err != nil {
		return nil, err
	}
	return snapshot, nil
}

func snapshotToItems(snapshot *proto.SessionsSnapshot, fallback coordinatorRef) ([]sessionItem, []jsonCoordinator) {
	if snapshot == nil {
		return nil, nil
	}
	coords := snapshot.GetCoordinators()
	items := make([]sessionItem, 0)
	out := make([]jsonCoordinator, 0, len(coords))
	for _, coord := range coords {
		if coord == nil {
			continue
		}
		name := strings.TrimSpace(coord.GetName())
		path := strings.TrimSpace(coord.GetPath())
		if name == "" && path != "" {
			name = coordinatorName(path)
		}
		if name == "" {
			name = fallback.Name
		}
		if name == "" {
			name = "unknown"
		}
		out = append(out, jsonCoordinator{
			Name:  name,
			Path:  path,
			Error: strings.TrimSpace(coord.GetError()),
		})
		for _, session := range coord.GetSessions() {
			items = append(items, sessionItem{Coordinator: name, Session: session})
		}
	}
	if len(out) == 0 && (fallback.Name != "" || fallback.Path != "") {
		out = append(out, jsonCoordinator{Name: fallback.Name, Path: fallback.Path})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Name == out[j].Name {
			return out[i].Path < out[j].Path
		}
		return out[i].Name < out[j].Name
	})
	return items, out
}

func listToJSON(items []sessionItem, coords []jsonCoordinator) jsonList {
	out := sessionsToJSON(items)
	if len(coords) > 0 {
		out.Coordinators = coords
	}
	return out
}

func newSpawnCmd() *cobra.Command {
	var hub string
	var command string
	var cwd string
	var cols int
	var rows int
	cmd := &cobra.Command{
		Use:   "spawn <name>",
		Short: "Spawn a new session",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, _, err := loadConfigWithPath()
			if err != nil {
				return err
			}
			target, err := resolveHubTarget(cfg, hub)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			return withCoordinator(ctx, target, cfg, func(client proto.VTRClient) error {
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
				return writeJSON(cmd.OutOrStdout(), jsonSessionEnvelope{Session: sessionToJSON(resp.Session, target.Name)})
			})
		},
	}
	addHubFlag(cmd, &hub)
	cmd.Flags().StringVar(&command, "cmd", "", "command to run (defaults to shell)")
	cmd.Flags().StringVar(&cwd, "cwd", "", "working directory")
	cmd.Flags().IntVar(&cols, "cols", 0, "columns (0 uses server default)")
	cmd.Flags().IntVar(&rows, "rows", 0, "rows (0 uses server default)")
	return cmd
}

func newInfoCmd() *cobra.Command {
	var hub string
	cmd := &cobra.Command{
		Use:   "info <name>",
		Short: "Show session info",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, _, err := loadConfigWithPath()
			if err != nil {
				return err
			}
			target, err := resolveHubTarget(cfg, hub)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			return withCoordinator(ctx, target, cfg, func(client proto.VTRClient) error {
				sessionRef, _, err := resolveSessionRef(ctx, client, args[0], "")
				if err != nil {
					return err
				}
				resp, err := client.Info(ctx, &proto.InfoRequest{Session: sessionRef})
				if err != nil {
					return err
				}
				return writeJSON(cmd.OutOrStdout(), jsonSessionEnvelope{Session: sessionToJSON(resp.Session, target.Name)})
			})
		},
	}
	addHubFlag(cmd, &hub)
	return cmd
}

func newScreenCmd() *cobra.Command {
	var hub string
	var jsonOut bool
	var ansi bool
	cmd := &cobra.Command{
		Use:   "screen <name>",
		Short: "Fetch the current screen",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if jsonOut && ansi {
				return fmt.Errorf("--json and --ansi are mutually exclusive")
			}
			cfg, _, err := loadConfigWithPath()
			if err != nil {
				return err
			}
			target, err := resolveHubTarget(cfg, hub)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			return withCoordinator(ctx, target, cfg, func(client proto.VTRClient) error {
				sessionRef, _, err := resolveSessionRef(ctx, client, args[0], "")
				if err != nil {
					return err
				}
				resp, err := client.GetScreen(ctx, &proto.GetScreenRequest{Session: sessionRef})
				if err != nil {
					return err
				}
				if jsonOut {
					return writeJSON(cmd.OutOrStdout(), jsonScreenEnvelope{Screen: screenToJSON(resp)})
				}
				text := screenToText(resp, ansi)
				if text == "" {
					return nil
				}
				if _, err := io.WriteString(cmd.OutOrStdout(), text); err != nil {
					return err
				}
				if !strings.HasSuffix(text, "\n") {
					_, err = io.WriteString(cmd.OutOrStdout(), "\n")
					return err
				}
				return nil
			})
		},
	}
	addHubFlag(cmd, &hub)
	cmd.Flags().BoolVar(&jsonOut, "json", false, "Output structured JSON")
	cmd.Flags().BoolVar(&ansi, "ansi", false, "Include ANSI colors/attributes in text output")
	return cmd
}

func newSendCmd() *cobra.Command {
	var hub string
	cmd := &cobra.Command{
		Use:   "send <name> <text>",
		Short: "Send text to a session",
		Args:  cobra.MinimumNArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			text := strings.Join(args[1:], " ")
			if !strings.HasSuffix(text, "\n") && !strings.HasSuffix(text, "\r") {
				fmt.Fprintln(cmd.ErrOrStderr(), "warning: text does not end with newline; input will not be submitted.")
			}
			cfg, _, err := loadConfigWithPath()
			if err != nil {
				return err
			}
			target, err := resolveHubTarget(cfg, hub)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			return withCoordinator(ctx, target, cfg, func(client proto.VTRClient) error {
				sessionRef, _, err := resolveSessionRef(ctx, client, args[0], "")
				if err != nil {
					return err
				}
				_, err = client.SendText(ctx, &proto.SendTextRequest{Session: sessionRef, Text: text})
				if err != nil {
					return err
				}
				return writeOK(cmd.OutOrStdout())
			})
		},
	}
	addHubFlag(cmd, &hub)
	return cmd
}

func newKeyCmd() *cobra.Command {
	var hub string
	cmd := &cobra.Command{
		Use:   "key <name> <key>",
		Short: "Send a special key sequence",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, _, err := loadConfigWithPath()
			if err != nil {
				return err
			}
			target, err := resolveHubTarget(cfg, hub)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			return withCoordinator(ctx, target, cfg, func(client proto.VTRClient) error {
				sessionRef, _, err := resolveSessionRef(ctx, client, args[0], "")
				if err != nil {
					return err
				}
				_, err = client.SendKey(ctx, &proto.SendKeyRequest{Session: sessionRef, Key: args[1]})
				if err != nil {
					return err
				}
				return writeOK(cmd.OutOrStdout())
			})
		},
	}
	addHubFlag(cmd, &hub)
	return cmd
}

func newRawCmd() *cobra.Command {
	var hub string
	cmd := &cobra.Command{
		Use:   "raw <name> <hex>",
		Short: "Send raw hex bytes to a session",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := decodeHex(args[1])
			if err != nil {
				return err
			}
			cfg, _, err := loadConfigWithPath()
			if err != nil {
				return err
			}
			target, err := resolveHubTarget(cfg, hub)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			return withCoordinator(ctx, target, cfg, func(client proto.VTRClient) error {
				sessionRef, _, err := resolveSessionRef(ctx, client, args[0], "")
				if err != nil {
					return err
				}
				_, err = client.SendBytes(ctx, &proto.SendBytesRequest{Session: sessionRef, Data: data})
				if err != nil {
					return err
				}
				return writeOK(cmd.OutOrStdout())
			})
		},
	}
	addHubFlag(cmd, &hub)
	return cmd
}

func newResizeCmd() *cobra.Command {
	var hub string
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
			cfg, _, err := loadConfigWithPath()
			if err != nil {
				return err
			}
			target, err := resolveHubTarget(cfg, hub)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			return withCoordinator(ctx, target, cfg, func(client proto.VTRClient) error {
				sessionRef, _, err := resolveSessionRef(ctx, client, args[0], "")
				if err != nil {
					return err
				}
				_, err = client.Resize(ctx, &proto.ResizeRequest{Session: sessionRef, Cols: int32(cols), Rows: int32(rows)})
				if err != nil {
					return err
				}
				return writeOK(cmd.OutOrStdout())
			})
		},
	}
	addHubFlag(cmd, &hub)
	return cmd
}

func newKillCmd() *cobra.Command {
	var hub string
	var signal string
	cmd := &cobra.Command{
		Use:   "kill <name>",
		Short: "Send a signal to a session",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, _, err := loadConfigWithPath()
			if err != nil {
				return err
			}
			target, err := resolveHubTarget(cfg, hub)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			return withCoordinator(ctx, target, cfg, func(client proto.VTRClient) error {
				sessionRef, _, err := resolveSessionRef(ctx, client, args[0], "")
				if err != nil {
					return err
				}
				_, err = client.Kill(ctx, &proto.KillRequest{Session: sessionRef, Signal: signal})
				if err != nil {
					return err
				}
				return writeOK(cmd.OutOrStdout())
			})
		},
	}
	addHubFlag(cmd, &hub)
	cmd.Flags().StringVar(&signal, "signal", "", "signal to send (TERM, KILL, INT)")
	return cmd
}

func newRemoveCmd() *cobra.Command {
	var hub string
	cmd := &cobra.Command{
		Use:   "rm <name>",
		Short: "Remove a session",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, _, err := loadConfigWithPath()
			if err != nil {
				return err
			}
			target, err := resolveHubTarget(cfg, hub)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			return withCoordinator(ctx, target, cfg, func(client proto.VTRClient) error {
				sessionRef, _, err := resolveSessionRef(ctx, client, args[0], "")
				if err != nil {
					return err
				}
				_, err = client.Remove(ctx, &proto.RemoveRequest{Session: sessionRef})
				if err != nil {
					return err
				}
				return writeOK(cmd.OutOrStdout())
			})
		},
	}
	addHubFlag(cmd, &hub)
	return cmd
}

func newGrepCmd() *cobra.Command {
	var hub string
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
			cfg, _, err := loadConfigWithPath()
			if err != nil {
				return err
			}
			target, err := resolveHubTarget(cfg, hub)
			if err != nil {
				return err
			}
			ctx, cancel := context.WithTimeout(context.Background(), rpcTimeout)
			defer cancel()
			return withCoordinator(ctx, target, cfg, func(client proto.VTRClient) error {
				sessionRef, _, err := resolveSessionRef(ctx, client, args[0], "")
				if err != nil {
					return err
				}
				resp, err := client.Grep(ctx, &proto.GrepRequest{
					Session:       sessionRef,
					Pattern:       pattern,
					ContextBefore: int32(before),
					ContextAfter:  int32(after),
					MaxMatches:    int32(maxMatches),
				})
				if err != nil {
					return err
				}
				return writeJSON(cmd.OutOrStdout(), grepToJSON(resp.Matches))
			})
		},
	}
	addHubFlag(cmd, &hub)
	cmd.Flags().IntVarP(&before, "before", "B", 0, "lines before match")
	cmd.Flags().IntVarP(&after, "after", "A", 0, "lines after match")
	cmd.Flags().IntVarP(&contextLines, "context", "C", 0, "lines before and after match")
	cmd.Flags().IntVar(&maxMatches, "max", 100, "maximum matches")
	return cmd
}

func newWaitCmd() *cobra.Command {
	var hub string
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
			cfg, _, err := loadConfigWithPath()
			if err != nil {
				return err
			}
			target, err := resolveHubTarget(cfg, hub)
			if err != nil {
				return err
			}
			ctxTimeout := timeout + 2*time.Second
			ctx, cancel := context.WithTimeout(context.Background(), ctxTimeout)
			defer cancel()
			return withCoordinator(ctx, target, cfg, func(client proto.VTRClient) error {
				sessionRef, _, err := resolveSessionRef(ctx, client, args[0], "")
				if err != nil {
					return err
				}
				resp, err := client.WaitFor(ctx, &proto.WaitForRequest{
					Session: sessionRef,
					Pattern: pattern,
					Timeout: durationpb.New(timeout),
				})
				if err != nil {
					return err
				}
				return writeJSON(cmd.OutOrStdout(), jsonWait{Matched: resp.Matched, MatchedLine: resp.MatchedLine, TimedOut: resp.TimedOut})
			})
		},
	}
	addHubFlag(cmd, &hub)
	cmd.Flags().DurationVar(&timeout, "timeout", waitTimeoutDefault, "overall timeout")
	return cmd
}

func newIdleCmd() *cobra.Command {
	var hub string
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
			cfg, _, err := loadConfigWithPath()
			if err != nil {
				return err
			}
			target, err := resolveHubTarget(cfg, hub)
			if err != nil {
				return err
			}
			ctxTimeout := timeout + 2*time.Second
			ctx, cancel := context.WithTimeout(context.Background(), ctxTimeout)
			defer cancel()
			return withCoordinator(ctx, target, cfg, func(client proto.VTRClient) error {
				sessionRef, _, err := resolveSessionRef(ctx, client, args[0], "")
				if err != nil {
					return err
				}
				resp, err := client.WaitForIdle(ctx, &proto.WaitForIdleRequest{
					Session:      sessionRef,
					IdleDuration: durationpb.New(idle),
					Timeout:      durationpb.New(timeout),
				})
				if err != nil {
					return err
				}
				return writeJSON(cmd.OutOrStdout(), jsonIdle{Idle: resp.Idle, TimedOut: resp.TimedOut})
			})
		},
	}
	addHubFlag(cmd, &hub)
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

func withCoordinator(ctx context.Context, coord coordinatorRef, cfg *clientConfig, fn func(proto.VTRClient) error) error {
	conn, err := dialClient(ctx, coord.Path, cfg)
	if err != nil {
		return err
	}
	defer conn.Close()
	client := proto.NewVTRClient(conn)
	return fn(client)
}

func resolveSessionRef(ctx context.Context, client proto.VTRClient, ref string, defaultCoordinator string) (*proto.SessionRef, string, error) {
	snapshot, err := fetchSessionsSnapshot(ctx, client)
	if err == nil && snapshot != nil {
		items, _ := snapshotToItems(snapshot, coordinatorRef{})
		id, label, coord, err := matchSessionRefWithCoordinator(ref, items)
		if err == nil {
			if coord == "" {
				coord = strings.TrimSpace(defaultCoordinator)
			}
			return &proto.SessionRef{Id: id, Coordinator: coord}, label, nil
		}
		if !errors.Is(err, errSessionNotFound) {
			return nil, "", err
		}
	}

	resp, err := client.List(ctx, &proto.ListRequest{})
	if err != nil {
		return nil, "", err
	}
	id, label, err := matchSessionRef(ref, resp.Sessions)
	if err != nil {
		if errors.Is(err, errSessionNotFound) {
			return nil, "", fmt.Errorf("session %q not found", ref)
		}
		return nil, "", err
	}
	coord := ""
	if parsedCoord, _, ok := parseSessionRef(label); ok {
		coord = parsedCoord
	} else if parsedCoord, _, ok := parseSessionRef(ref); ok {
		coord = parsedCoord
	}
	if coord == "" {
		coord = strings.TrimSpace(defaultCoordinator)
	}
	return &proto.SessionRef{Id: id, Coordinator: coord}, label, nil
}

func dialClient(ctx context.Context, target string, cfg *clientConfig) (*grpc.ClientConn, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if _, ok := ctx.Deadline(); !ok {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, dialTimeout)
		defer cancel()
	}
	return dialTCP(ctx, target, cfg)
}

func dialTCP(ctx context.Context, addr string, cfg *clientConfig) (*grpc.ClientConn, error) {
	if cfg == nil {
		cfg = &clientConfig{}
	}
	requireToken, requireClientCert, err := parseAuthMode(cfg.Auth.Mode)
	if err != nil {
		return nil, err
	}
	loopback := isLoopbackHost(addr)
	requireTLS := requireClientCert || !loopback
	var opts []grpc.DialOption
	if requireTLS {
		creds, err := buildClientTLS(cfg, requireClientCert)
		if err != nil {
			return nil, err
		}
		opts = append(opts, grpc.WithTransportCredentials(creds))
	} else {
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	}
	if requireToken {
		token, err := readToken(cfg.Auth.TokenFile)
		if err != nil {
			return nil, err
		}
		opts = append(opts, grpc.WithPerRPCCredentials(tokenAuth{token: token, requireTransport: requireTLS}))
	}
	return grpc.DialContext(ctx, addr, opts...)
}

func addHubFlag(cmd *cobra.Command, target *string) {
	cmd.Flags().StringVar(target, "hub", "", "hub address (host:port)")
}

func writeOK(w io.Writer) error {
	return writeJSON(w, jsonOK{OK: true})
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
