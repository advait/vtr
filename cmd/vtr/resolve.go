package main

import (
	"context"
	"errors"
	"fmt"
	"net"
	"sort"
	"strings"
	"time"

	proto "github.com/advait/vtrpc/proto"
)

const (
	defaultSocketPath = "/var/run/vtrpc.sock"
	resolveTimeout    = 5 * time.Second
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
		if strings.TrimSpace(cfg.Hub.GrpcSocket) != "" {
			value = cfg.Hub.GrpcSocket
		} else if strings.TrimSpace(cfg.Hub.Addr) != "" {
			value = cfg.Hub.Addr
		}
	}
	if value == "" {
		return coordinatorRef{}, errors.New("hub address is required")
	}
	value = expandPath(value)
	name := hubName(value)
	return coordinatorRef{Name: name, Path: value}, nil
}

func hubName(value string) string {
	if isUnixTarget(value) {
		return coordinatorName(value)
	}
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

func coordinatorsOrDefault(coords []coordinatorRef) []coordinatorRef {
	if len(coords) > 0 {
		return coords
	}
	return []coordinatorRef{{Name: coordinatorName(defaultSocketPath), Path: defaultSocketPath}}
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

func findCoordinatorByName(coords []coordinatorRef, name string) (coordinatorRef, error) {
	var matches []coordinatorRef
	for _, coord := range coords {
		if coord.Name == name {
			matches = append(matches, coord)
		}
	}
	if len(matches) == 1 {
		return matches[0], nil
	}
	if len(matches) == 0 {
		return coordinatorRef{}, fmt.Errorf("unknown coordinator %q", name)
	}
	paths := make([]string, 0, len(matches))
	for _, match := range matches {
		paths = append(paths, match.Path)
	}
	return coordinatorRef{}, fmt.Errorf("coordinator name %q is ambiguous (%s)", name, strings.Join(paths, ", "))
}

func resolveSpawnTarget(configPath string, coords []coordinatorRef, socketFlag string, arg string) (sessionTarget, error) {
	if socketFlag != "" {
		return sessionTarget{
			Coordinator: coordinatorRef{Name: coordinatorName(socketFlag), Path: socketFlag},
			Label:       arg,
		}, nil
	}
	if coordName, session, ok := parseSessionRef(arg); ok {
		if len(coords) == 0 {
			return sessionTarget{}, errors.New("no coordinators configured")
		}
		coord, err := findCoordinatorByName(coords, coordName)
		if err != nil {
			return sessionTarget{}, err
		}
		return sessionTarget{Coordinator: coord, Label: session}, nil
	}
	if len(coords) == 0 {
		return sessionTarget{Coordinator: coordinatorRef{Name: coordinatorName(defaultSocketPath), Path: defaultSocketPath}, Label: arg}, nil
	}
	if len(coords) == 1 {
		return sessionTarget{Coordinator: coords[0], Label: arg}, nil
	}
	if configPath == "" {
		return sessionTarget{}, errors.New("multiple coordinators configured; use --socket or prefix with coordinator")
	}
	return sessionTarget{}, fmt.Errorf("multiple coordinators configured in %s; use --socket or prefix with coordinator", configPath)
}

func resolveSessionTarget(ctx context.Context, coords []coordinatorRef, socketFlag string, arg string) (sessionTarget, error) {
	return resolveSessionTargetWithConfig(ctx, coords, socketFlag, arg, nil)
}

func resolveSessionTargetWithConfig(ctx context.Context, coords []coordinatorRef, socketFlag string, arg string, cfg *clientConfig) (sessionTarget, error) {
	if socketFlag != "" {
		if _, _, ok := parseSessionRef(arg); ok {
			return sessionTarget{}, errors.New("cannot use --socket with coordinator prefix")
		}
		return resolveSessionOnCoordinatorWithConfig(ctx, coordinatorRef{Name: coordinatorName(socketFlag), Path: socketFlag}, arg, cfg)
	}
	if coordName, session, ok := parseSessionRef(arg); ok {
		if len(coords) == 0 {
			return sessionTarget{}, errors.New("no coordinators configured")
		}
		coord, err := findCoordinatorByName(coords, coordName)
		if err != nil {
			return sessionTarget{}, err
		}
		return resolveSessionOnCoordinatorWithConfig(ctx, coord, session, cfg)
	}
	if len(coords) == 0 {
		return resolveSessionOnCoordinatorWithConfig(ctx, coordinatorRef{Name: coordinatorName(defaultSocketPath), Path: defaultSocketPath}, arg, cfg)
	}
	if len(coords) == 1 {
		return resolveSessionOnCoordinatorWithConfig(ctx, coords[0], arg, cfg)
	}
	if ctx == nil {
		ctx = context.Background()
	}
	ctx, cancel := context.WithTimeout(ctx, resolveTimeout)
	defer cancel()

	matches, err := findSessionAcrossCoordinatorsWithConfig(ctx, coords, arg, cfg)
	if err != nil {
		return sessionTarget{}, err
	}
	if len(matches) == 1 {
		return matches[0], nil
	}
	if len(matches) == 0 {
		return sessionTarget{}, fmt.Errorf("session %q not found in configured coordinators", arg)
	}
	var names []string
	for _, match := range matches {
		names = append(names, match.Coordinator.Name)
	}
	return sessionTarget{}, fmt.Errorf("session %q is ambiguous (matches: %s)", arg, strings.Join(names, ", "))
}

var errSessionNotFound = errors.New("session not found")

func resolveSessionOnCoordinator(ctx context.Context, coord coordinatorRef, ref string) (sessionTarget, error) {
	return resolveSessionOnCoordinatorWithConfig(ctx, coord, ref, nil)
}

func resolveSessionOnCoordinatorWithConfig(ctx context.Context, coord coordinatorRef, ref string, cfg *clientConfig) (sessionTarget, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	ctx, cancel := context.WithTimeout(ctx, resolveTimeout)
	defer cancel()

	var sessionID string
	var sessionLabel string
	err := withCoordinator(ctx, coord, cfg, func(client proto.VTRClient) error {
		resp, err := client.List(ctx, &proto.ListRequest{})
		if err != nil {
			return err
		}
		id, label, err := matchSessionRef(ref, resp.Sessions)
		if err != nil {
			return err
		}
		sessionID = id
		sessionLabel = label
		return nil
	})
	if err != nil {
		if errors.Is(err, errSessionNotFound) {
			return sessionTarget{}, errSessionNotFound
		}
		return sessionTarget{}, err
	}
	return sessionTarget{Coordinator: coord, ID: sessionID, Label: sessionLabel}, nil
}

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

func findSessionAcrossCoordinators(ctx context.Context, coords []coordinatorRef, ref string) ([]sessionTarget, error) {
	return findSessionAcrossCoordinatorsWithConfig(ctx, coords, ref, nil)
}

func findSessionAcrossCoordinatorsWithConfig(ctx context.Context, coords []coordinatorRef, ref string, cfg *clientConfig) ([]sessionTarget, error) {
	var matches []sessionTarget
	var errs []string
	for _, coord := range coords {
		target, err := resolveSessionOnCoordinatorWithConfig(ctx, coord, ref, cfg)
		if err == nil {
			matches = append(matches, target)
			continue
		}
		if errors.Is(err, errSessionNotFound) {
			continue
		}
		errs = append(errs, fmt.Sprintf("%s: %v", coord.Name, err))
	}
	if len(matches) == 0 && len(errs) > 0 {
		return nil, errors.New(strings.Join(errs, "; "))
	}
	return matches, nil
}
