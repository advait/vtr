package main

import (
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"github.com/spf13/cobra"
)

const hubServiceName = "vtr-hub.service"

type serviceInstallOptions struct {
	force   bool
	noStart bool
}

type serviceLogsOptions struct {
	follow bool
	lines  int
	since  string
}

func newServiceCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "service",
		Short: "Manage the systemd user service for the hub",
	}
	cmd.AddCommand(
		newServiceInstallCmd(),
		newServiceStatusCmd(),
		newServiceStartCmd(),
		newServiceStopCmd(),
		newServiceRestartCmd(),
		newServiceLogsCmd(),
		newServiceUninstallCmd(),
	)
	return cmd
}

func newServiceInstallCmd() *cobra.Command {
	opts := serviceInstallOptions{}
	cmd := &cobra.Command{
		Use:   "install",
		Short: "Install the user service for vtr hub",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runServiceInstall(cmd.OutOrStdout(), cmd.ErrOrStderr(), opts)
		},
	}
	cmd.Flags().BoolVar(&opts.force, "force", false, "overwrite the unit file if it already exists")
	cmd.Flags().BoolVar(&opts.noStart, "no-start", false, "do not start the service after installing")
	return cmd
}

func newServiceStatusCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "status",
		Short: "Show hub service status",
		RunE: func(cmd *cobra.Command, _ []string) error {
			if err := requireSystemctl("service status"); err != nil {
				return err
			}
			return runSystemctl(cmd.OutOrStdout(), cmd.ErrOrStderr(), "--user", "status", "--no-pager", "--full", hubServiceName)
		},
	}
	return cmd
}

func newServiceStartCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "start",
		Short: "Start the hub service",
		RunE: func(cmd *cobra.Command, _ []string) error {
			if err := requireSystemctl("service start"); err != nil {
				return err
			}
			return runSystemctl(cmd.OutOrStdout(), cmd.ErrOrStderr(), "--user", "start", hubServiceName)
		},
	}
	return cmd
}

func newServiceStopCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "stop",
		Short: "Stop the hub service",
		RunE: func(cmd *cobra.Command, _ []string) error {
			if err := requireSystemctl("service stop"); err != nil {
				return err
			}
			return runSystemctl(cmd.OutOrStdout(), cmd.ErrOrStderr(), "--user", "stop", hubServiceName)
		},
	}
	return cmd
}

func newServiceRestartCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "restart",
		Short: "Restart the hub service",
		RunE: func(cmd *cobra.Command, _ []string) error {
			if err := requireSystemctl("service restart"); err != nil {
				return err
			}
			return runSystemctl(cmd.OutOrStdout(), cmd.ErrOrStderr(), "--user", "restart", hubServiceName)
		},
	}
	return cmd
}

func newServiceLogsCmd() *cobra.Command {
	opts := serviceLogsOptions{lines: 200}
	cmd := &cobra.Command{
		Use:   "logs",
		Short: "View hub service logs",
		RunE: func(cmd *cobra.Command, _ []string) error {
			if err := requireJournalctl(); err != nil {
				return err
			}
			return runServiceLogs(cmd.OutOrStdout(), cmd.ErrOrStderr(), opts)
		},
	}
	cmd.Flags().BoolVarP(&opts.follow, "follow", "f", false, "follow log output")
	cmd.Flags().IntVarP(&opts.lines, "lines", "n", 200, "number of lines to show")
	cmd.Flags().StringVar(&opts.since, "since", "", "show logs since a time (e.g. \"1h ago\")")
	return cmd
}

func newServiceUninstallCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "uninstall",
		Short: "Remove the user service for vtr hub",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runServiceUninstall(cmd.OutOrStdout(), cmd.ErrOrStderr())
		},
	}
	return cmd
}

func runServiceInstall(out io.Writer, errOut io.Writer, opts serviceInstallOptions) error {
	if err := requireSystemctl("service install"); err != nil {
		return err
	}
	unitPath, err := hubServicePath()
	if err != nil {
		return err
	}
	if !opts.force && exists(unitPath) {
		return fmt.Errorf("unit already exists at %s (use --force to overwrite)", unitPath)
	}
	unitDir := filepath.Dir(unitPath)
	if err := os.MkdirAll(unitDir, 0o755); err != nil {
		return fmt.Errorf("unable to create %s: %w", unitDir, err)
	}
	execPath, err := resolveVtrExec()
	if err != nil {
		return err
	}
	unit := buildHubUnit(execPath)
	if err := os.WriteFile(unitPath, []byte(unit), 0o644); err != nil {
		return fmt.Errorf("unable to write %s: %w", unitPath, err)
	}
	if err := runSystemctl(out, errOut, "--user", "daemon-reload"); err != nil {
		return err
	}
	if opts.noStart {
		if err := runSystemctl(out, errOut, "--user", "enable", hubServiceName); err != nil {
			return err
		}
		fmt.Fprintf(out, "Installed %s (enabled)\n", hubServiceName)
	} else {
		if err := runSystemctl(out, errOut, "--user", "enable", "--now", hubServiceName); err != nil {
			return err
		}
		fmt.Fprintf(out, "Installed %s (enabled and started)\n", hubServiceName)
	}
	fmt.Fprintf(out, "Unit file: %s\n", unitPath)
	return nil
}

func runServiceLogs(out io.Writer, errOut io.Writer, opts serviceLogsOptions) error {
	args := []string{"--user-unit", hubServiceName, "--no-pager"}
	if opts.since != "" {
		args = append(args, "--since", opts.since)
	}
	if opts.lines > 0 {
		args = append(args, "-n", strconv.Itoa(opts.lines))
	}
	if opts.follow {
		args = append(args, "-f")
	}
	return runCommand(out, errOut, "journalctl", args...)
}

func runServiceUninstall(out io.Writer, errOut io.Writer) error {
	if err := requireSystemctl("service uninstall"); err != nil {
		return err
	}
	unitPath, err := hubServicePath()
	if err != nil {
		return err
	}
	_ = runSystemctl(out, errOut, "--user", "disable", "--now", hubServiceName)
	removed := false
	if err := os.Remove(unitPath); err == nil {
		removed = true
	} else if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("unable to remove %s: %w", unitPath, err)
	}
	if err := runSystemctl(out, errOut, "--user", "daemon-reload"); err != nil {
		return err
	}
	if removed {
		fmt.Fprintf(out, "Removed %s\n", unitPath)
	} else {
		fmt.Fprintf(out, "No unit file to remove at %s\n", unitPath)
	}
	return nil
}

func buildHubUnit(execPath string) string {
	var out strings.Builder
	out.WriteString("[Unit]\n")
	out.WriteString("Description=VTR Hub\n")
	out.WriteString("After=network.target\n\n")
	out.WriteString("[Service]\n")
	out.WriteString("Type=simple\n")
	if v := strings.TrimSpace(os.Getenv("VTRPC_CONFIG_DIR")); v != "" {
		fmt.Fprintf(&out, "Environment=VTRPC_CONFIG_DIR=%s\n", v)
	}
	out.WriteString("ExecStart=")
	out.WriteString(systemdQuote(execPath))
	out.WriteString(" hub\n")
	out.WriteString("Restart=on-failure\n")
	out.WriteString("RestartSec=2\n\n")
	out.WriteString("[Install]\n")
	out.WriteString("WantedBy=default.target\n")
	return out.String()
}

func hubServicePath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil || strings.TrimSpace(dir) == "" {
		return "", errors.New("unable to resolve user config directory")
	}
	return filepath.Join(dir, "systemd", "user", hubServiceName), nil
}

func resolveVtrExec() (string, error) {
	if path, err := exec.LookPath("vtr"); err == nil {
		return path, nil
	}
	path, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("unable to resolve vtr executable: %w", err)
	}
	return path, nil
}

func systemdQuote(value string) string {
	if value == "" {
		return value
	}
	if strings.IndexFunc(value, isWhitespace) == -1 && !strings.ContainsAny(value, "\"\\") {
		return value
	}
	return strconv.Quote(value)
}

func isWhitespace(r rune) bool {
	return r == ' ' || r == '\t' || r == '\n' || r == '\r'
}

func requireSystemctl(label string) error {
	if runtime.GOOS != "linux" {
		return fmt.Errorf("%s is only supported on Linux with systemd", label)
	}
	if _, err := exec.LookPath("systemctl"); err != nil {
		return errors.New("systemctl not found; systemd user services are unavailable")
	}
	return nil
}

func requireJournalctl() error {
	if runtime.GOOS != "linux" {
		return errors.New("service logs are only supported on Linux with systemd")
	}
	if _, err := exec.LookPath("journalctl"); err != nil {
		return errors.New("journalctl not found; systemd user logs are unavailable")
	}
	return nil
}

func runSystemctl(out io.Writer, errOut io.Writer, args ...string) error {
	return runCommand(out, errOut, "systemctl", args...)
}

func runCommand(out io.Writer, errOut io.Writer, bin string, args ...string) error {
	cmd := exec.Command(bin, args...)
	cmd.Stdout = out
	cmd.Stderr = errOut
	cmd.Stdin = os.Stdin
	return cmd.Run()
}
