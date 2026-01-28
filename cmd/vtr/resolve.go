package main

import (
	"errors"
	"net"
	"sort"
	"strings"

	proto "github.com/advait/vtrpc/proto"
)

type coordinatorRef struct {
	Name string
	Path string
}

type sessionTarget struct {
	Coordinator coordinatorRef
	ID          string
	Label       string
}

func loadConfigWithPath() (*clientConfig, string, error) {
	dir := configDir()
	configPath := defaultConfigPath()
	cfg, err := loadConfig(configPath)
	if err != nil {
		return nil, "", err
	}
	return resolveConfigPaths(cfg, dir), configPath, nil
}

func resolveHubTarget(cfg *clientConfig, hubFlag string) (coordinatorRef, error) {
	value := strings.TrimSpace(hubFlag)
	if value == "" && cfg != nil {
		if strings.TrimSpace(cfg.Hub.Addr) != "" {
			value = cfg.Hub.Addr
		}
	}
	if value == "" {
		value = defaultHubAddr
	}
	if value == "" {
		return coordinatorRef{}, errors.New("hub address is required")
	}
	value = expandPath(value)
	name := hubName(value)
	return coordinatorRef{Name: name, Path: value}, nil
}

func hubName(value string) string {
	host, _, err := net.SplitHostPort(value)
	if err != nil {
		return value
	}
	host = strings.Trim(host, "[]")
	if host == "" {
		return value
	}
	return host
}

func resolveCoordinatorRefs(cfg *clientConfig) ([]coordinatorRef, error) {
	paths, err := resolveCoordinatorPaths(cfg)
	if err != nil {
		return nil, err
	}
	refs := make([]coordinatorRef, 0, len(paths))
	for _, path := range paths {
		refs = append(refs, coordinatorRef{Name: coordinatorName(path), Path: path})
	}
	sort.Slice(refs, func(i, j int) bool {
		if refs[i].Name == refs[j].Name {
			return refs[i].Path < refs[j].Path
		}
		return refs[i].Name < refs[j].Name
	})
	return refs, nil
}

func parseSessionRef(value string) (string, string, bool) {
	parts := strings.SplitN(value, ":", 2)
	if len(parts) != 2 {
		return "", "", false
	}
	coord := strings.TrimSpace(parts[0])
	session := strings.TrimSpace(parts[1])
	if coord == "" || session == "" {
		return "", "", false
	}
	return coord, session, true
}

var errSessionNotFound = errors.New("session not found")

func matchSessionRef(ref string, sessions []*proto.Session) (string, string, error) {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return "", "", errSessionNotFound
	}
	for _, session := range sessions {
		if session != nil && session.GetId() == ref {
			return session.GetId(), session.GetName(), nil
		}
	}
	for _, session := range sessions {
		if session != nil && session.GetName() == ref {
			return session.GetId(), session.GetName(), nil
		}
	}
	return "", "", errSessionNotFound
}

func matchSessionRefWithCoordinator(ref string, items []sessionItem) (string, string, string, error) {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return "", "", "", errSessionNotFound
	}
	for _, item := range items {
		if item.Session != nil && item.Session.GetId() == ref {
			return item.Session.GetId(), item.Session.GetName(), item.Coordinator, nil
		}
	}
	for _, item := range items {
		if item.Session != nil && item.Session.GetName() == ref {
			return item.Session.GetId(), item.Session.GetName(), item.Coordinator, nil
		}
	}
	if coord, session, ok := parseSessionRef(ref); ok {
		for _, item := range items {
			if item.Session == nil || item.Coordinator != coord {
				continue
			}
			if item.Session.GetId() == session || item.Session.GetName() == session {
				return item.Session.GetId(), item.Session.GetName(), item.Coordinator, nil
			}
		}
	}
	return "", "", "", errSessionNotFound
}
