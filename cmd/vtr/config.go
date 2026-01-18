package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/BurntSushi/toml"
)

type clientConfig struct {
	Coordinators []coordinatorConfig `toml:"coordinators"`
	Defaults     defaultsConfig      `toml:"defaults"`
}

type coordinatorConfig struct {
	Path string `toml:"path"`
}

type defaultsConfig struct {
	OutputFormat string `toml:"output_format"`
}

func defaultConfigPath() string {
	dir, err := os.UserConfigDir()
	if err != nil || dir == "" {
		return ""
	}
	return filepath.Join(dir, "vtr", "config.toml")
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

func resolveCoordinatorPaths(cfg *clientConfig) ([]string, error) {
	if cfg == nil {
		return nil, nil
	}
	var out []string
	seen := make(map[string]struct{})
	for _, entry := range cfg.Coordinators {
		path := strings.TrimSpace(entry.Path)
		if path == "" {
			continue
		}
		var matches []string
		if containsGlob(path) {
			globMatches, err := filepath.Glob(path)
			if err != nil {
				return nil, err
			}
			matches = globMatches
		} else {
			matches = []string{path}
		}
		for _, match := range matches {
			if match == "" {
				continue
			}
			if _, ok := seen[match]; ok {
				continue
			}
			seen[match] = struct{}{}
			out = append(out, match)
		}
	}
	return out, nil
}

func containsGlob(value string) bool {
	return strings.ContainsAny(value, "*?[")
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

func coordinatorName(socketPath string) string {
	base := filepath.Base(socketPath)
	if strings.HasSuffix(base, ".sock") {
		base = strings.TrimSuffix(base, ".sock")
	}
	return base
}
