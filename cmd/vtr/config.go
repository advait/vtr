package main

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"

	"github.com/BurntSushi/toml"
)

type clientConfig struct {
	Hub    hubConfig    `toml:"hub"`
	Auth   authConfig   `toml:"auth"`
	Server serverConfig `toml:"server"`

	// Legacy client config fields (pre-vtrpc.toml).
	Defaults defaultsConfig `toml:"defaults"`
}

type hubConfig struct {
	Addr               string `toml:"addr"`
	WebEnabled         *bool  `toml:"web_enabled"`
	CoordinatorEnabled *bool  `toml:"coordinator_enabled"`

	// Legacy fields (deprecated): prefer Addr.
	GrpcAddr    string `toml:"grpc_addr"`
	WebAddr     string `toml:"web_addr"`
	UnifiedAddr string `toml:"unified_addr"`
}

type authConfig struct {
	Mode      string `toml:"mode"`
	TokenFile string `toml:"token_file"`
	CaFile    string `toml:"ca_file"`
	CertFile  string `toml:"cert_file"`
	KeyFile   string `toml:"key_file"`
}

type serverConfig struct {
	CertFile string `toml:"cert_file"`
	KeyFile  string `toml:"key_file"`
}

type defaultsConfig struct {
	OutputFormat string `toml:"output_format"`
}

const (
	defaultConfigDirName  = "vtrpc"
	defaultConfigFileName = "vtrpc.toml"

	defaultHubAddr       = "127.0.0.1:4620"
)

func configDir() string {
	if override := strings.TrimSpace(os.Getenv("VTRPC_CONFIG_DIR")); override != "" {
		return expandPath(override)
	}
	dir, err := os.UserConfigDir()
	if err != nil || dir == "" {
		return ""
	}
	return filepath.Join(dir, defaultConfigDirName)
}

func defaultConfigPath() string {
	dir := configDir()
	if dir == "" {
		return ""
	}
	return filepath.Join(dir, defaultConfigFileName)
}

func loadConfig(path string) (*clientConfig, error) {
	cfg := &clientConfig{}
	if path == "" {
		return cfg, nil
	}
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			return cfg, nil
		}
		return nil, err
	}
	if _, err := toml.DecodeFile(path, cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}

func resolveConfigPaths(cfg *clientConfig, dir string) *clientConfig {
	if cfg == nil {
		cfg = &clientConfig{}
	}
	out := *cfg
	out.Hub = resolveHubConfig(out.Hub)
	out.Auth = resolveAuthConfig(out.Auth, dir)
	out.Server = resolveServerConfig(out.Server, out.Auth, dir)
	return &out
}

func resolveHubConfig(cfg hubConfig) hubConfig {
	if strings.TrimSpace(cfg.Addr) == "" {
		switch {
		case strings.TrimSpace(cfg.UnifiedAddr) != "":
			cfg.Addr = cfg.UnifiedAddr
		case strings.TrimSpace(cfg.WebAddr) != "":
			cfg.Addr = cfg.WebAddr
		case strings.TrimSpace(cfg.GrpcAddr) != "":
			cfg.Addr = cfg.GrpcAddr
		default:
			cfg.Addr = defaultHubAddr
		}
	}
	if cfg.WebEnabled == nil {
		value := true
		cfg.WebEnabled = &value
	}
	if cfg.CoordinatorEnabled == nil {
		value := true
		cfg.CoordinatorEnabled = &value
	}
	return cfg
}

func resolveAuthConfig(cfg authConfig, dir string) authConfig {
	cfg.TokenFile = resolvePath(cfg.TokenFile, dir, "token")
	cfg.CaFile = resolvePath(cfg.CaFile, dir, "ca.crt")
	cfg.CertFile = resolvePath(cfg.CertFile, dir, "client.crt")
	cfg.KeyFile = resolvePath(cfg.KeyFile, dir, "client.key")
	return cfg
}

func resolveServerConfig(cfg serverConfig, auth authConfig, dir string) serverConfig {
	certTrim := strings.TrimSpace(cfg.CertFile)
	keyTrim := strings.TrimSpace(cfg.KeyFile)
	mode := strings.ToLower(strings.TrimSpace(auth.Mode))
	requireTLS := mode == "mtls" || mode == "both"
	if certTrim == "" && keyTrim == "" && !requireTLS {
		return cfg
	}
	cfg.CertFile = resolvePath(cfg.CertFile, dir, "server.crt")
	cfg.KeyFile = resolvePath(cfg.KeyFile, dir, "server.key")
	return cfg
}

func resolvePath(value, dir, filename string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		if dir == "" {
			return ""
		}
		return filepath.Join(dir, filename)
	}
	return expandPath(trimmed)
}

func expandPath(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if trimmed == "~" || strings.HasPrefix(trimmed, "~/") {
		home, err := os.UserHomeDir()
		if err != nil || home == "" {
			return value
		}
		if trimmed == "~" {
			return home
		}
		return filepath.Join(home, trimmed[2:])
	}
	return value
}

func resolveCoordinatorPaths(cfg *clientConfig) ([]string, error) {
	if cfg == nil {
		return nil, nil
	}
	addr := strings.TrimSpace(cfg.Hub.Addr)
	if addr == "" {
		return nil, nil
	}
	return []string{addr}, nil
}

func resolveOutputFormat(cfg *clientConfig, jsonFlag bool) (outputFormat, error) {
	if jsonFlag {
		return outputJSON, nil
	}
	if cfg == nil {
		return outputHuman, nil
	}
	if cfg.Defaults.OutputFormat == "" {
		return outputHuman, nil
	}
	switch strings.ToLower(cfg.Defaults.OutputFormat) {
	case "human":
		return outputHuman, nil
	case "json":
		return outputJSON, nil
	default:
		return "", fmt.Errorf("unknown output_format %q", cfg.Defaults.OutputFormat)
	}
}

func coordinatorName(pathOrAddr string) string {
	value := strings.TrimSpace(pathOrAddr)
	if value == "" {
		return value
	}
	if host, _, err := net.SplitHostPort(value); err == nil {
		host = strings.Trim(host, "[]")
		if host != "" {
			return host
		}
	}
	base := filepath.Base(value)
	if strings.HasSuffix(base, ".sock") {
		base = strings.TrimSuffix(base, ".sock")
	}
	if base == "" {
		return value
	}
	return base
}
