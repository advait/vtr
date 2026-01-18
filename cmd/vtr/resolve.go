package main

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	proto "github.com/advait/vtrpc/proto"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const (
	defaultSocketPath = "/var/run/vtr.sock"
	resolveTimeout    = 5 * time.Second
)

type coordinatorRef struct {
	Name string
	Path string
}

type sessionTarget struct {
	Coordinator coordinatorRef
	Session     string
}

func loadConfigWithPath() (*clientConfig, string, error) {
	configPath := defaultConfigPath()
	cfg, err := loadConfig(configPath)
	if err != nil {
		return nil, "", err
	}
	return cfg, configPath, nil
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
			Session:     arg,
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
		return sessionTarget{Coordinator: coord, Session: session}, nil
	}
	if len(coords) == 0 {
		return sessionTarget{Coordinator: coordinatorRef{Name: coordinatorName(defaultSocketPath), Path: defaultSocketPath}, Session: arg}, nil
	}
	if len(coords) == 1 {
		return sessionTarget{Coordinator: coords[0], Session: arg}, nil
	}
	if configPath == "" {
		return sessionTarget{}, errors.New("multiple coordinators configured; use --socket or prefix with coordinator")
	}
	return sessionTarget{}, fmt.Errorf("multiple coordinators configured in %s; use --socket or prefix with coordinator", configPath)
}

func resolveSessionTarget(ctx context.Context, coords []coordinatorRef, socketFlag string, arg string) (sessionTarget, error) {
	if socketFlag != "" {
		if _, _, ok := parseSessionRef(arg); ok {
			return sessionTarget{}, errors.New("cannot use --socket with coordinator prefix")
		}
		return sessionTarget{
			Coordinator: coordinatorRef{Name: coordinatorName(socketFlag), Path: socketFlag},
			Session:     arg,
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
		return sessionTarget{Coordinator: coord, Session: session}, nil
	}
	if len(coords) == 0 {
		return sessionTarget{Coordinator: coordinatorRef{Name: coordinatorName(defaultSocketPath), Path: defaultSocketPath}, Session: arg}, nil
	}
	if len(coords) == 1 {
		return sessionTarget{Coordinator: coords[0], Session: arg}, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	ctx, cancel := context.WithTimeout(ctx, resolveTimeout)
	defer cancel()

	matches, err := findSessionAcrossCoordinators(ctx, coords, arg)
	if err != nil {
		return sessionTarget{}, err
	}
	if len(matches) == 1 {
		return sessionTarget{Coordinator: matches[0], Session: arg}, nil
	}
	if len(matches) == 0 {
		return sessionTarget{}, fmt.Errorf("session %q not found in configured coordinators", arg)
	}
	var names []string
	for _, match := range matches {
		names = append(names, match.Name)
	}
	return sessionTarget{}, fmt.Errorf("session %q is ambiguous (matches: %s)", arg, strings.Join(names, ", "))
}

func findSessionAcrossCoordinators(ctx context.Context, coords []coordinatorRef, name string) ([]coordinatorRef, error) {
	var matches []coordinatorRef
	var errs []string
	for _, coord := range coords {
		err := withCoordinator(ctx, coord, func(client proto.VTRClient) error {
			resp, err := client.Info(ctx, &proto.InfoRequest{Name: name})
			if err != nil {
				return err
			}
			if resp.Session != nil {
				matches = append(matches, coord)
			}
			return nil
		})
		if err == nil {
			continue
		}
		if status.Code(err) == codes.NotFound {
			continue
		}
		errs = append(errs, fmt.Sprintf("%s: %v", coord.Name, err))
	}
	if len(matches) == 0 && len(errs) > 0 {
		return nil, errors.New(strings.Join(errs, "; "))
	}
	return matches, nil
}
