package main

import (
	"testing"

	proto "github.com/advait/vtrpc/proto"
)

func TestSessionSnapshotPrefixingForSpokeOnly(t *testing.T) {
	snapshot := &proto.SessionsSnapshot{
		Coordinators: []*proto.CoordinatorSessions{{
			Name: "spoke-a",
			Path: "/tmp/spoke.sock",
			Sessions: []*proto.Session{{
				Id:   "id-1",
				Name: "demo",
			}},
		}},
	}

	coords, items, multi := sessionItemsFromSnapshot(snapshot)
	if multi {
		t.Fatalf("expected single coordinator snapshot to be non-multi")
	}
	if !shouldPrefixSnapshot(coords, "hub") {
		t.Fatalf("expected prefixing when hub name differs from coordinator")
	}
	items = prefixSessionItems(items)
	if len(items) != 1 {
		t.Fatalf("expected one session item, got %d", len(items))
	}
	if items[0].label != "spoke-a:demo" {
		t.Fatalf("expected prefixed label, got %q", items[0].label)
	}
	name, id := sessionRequestRef(items[0].id, items[0].label)
	if name != "spoke-a:demo" || id != "" {
		t.Fatalf("expected name-only request for federated session, got name=%q id=%q", name, id)
	}
}

func TestSessionSnapshotNoPrefixForHubOnly(t *testing.T) {
	snapshot := &proto.SessionsSnapshot{
		Coordinators: []*proto.CoordinatorSessions{{
			Name: "hub",
			Path: "/tmp/hub.sock",
			Sessions: []*proto.Session{{
				Id:   "id-2",
				Name: "demo",
			}},
		}},
	}

	coords, items, multi := sessionItemsFromSnapshot(snapshot)
	if multi {
		t.Fatalf("expected single coordinator snapshot to be non-multi")
	}
	if shouldPrefixSnapshot(coords, "hub") {
		t.Fatalf("did not expect prefixing when hub matches coordinator")
	}
	if len(items) != 1 {
		t.Fatalf("expected one session item, got %d", len(items))
	}
	name, id := sessionRequestRef(items[0].id, items[0].label)
	if name != "" || id != "id-2" {
		t.Fatalf("expected id-based request for hub session, got name=%q id=%q", name, id)
	}
}

func TestSessionSnapshotPrefixingForMultiCoordinator(t *testing.T) {
	snapshot := &proto.SessionsSnapshot{
		Coordinators: []*proto.CoordinatorSessions{
			{
				Name: "hub",
				Path: "/tmp/hub.sock",
				Sessions: []*proto.Session{{
					Id:   "id-hub",
					Name: "local",
				}},
			},
			{
				Name: "spoke-a",
				Path: "/tmp/spoke.sock",
				Sessions: []*proto.Session{{
					Id:   "id-spoke",
					Name: "remote",
				}},
			},
		},
	}

	coords, items, multi := sessionItemsFromSnapshot(snapshot)
	if !multi {
		t.Fatalf("expected multi-coordinator snapshot to be multi")
	}
	if len(coords) != 2 {
		t.Fatalf("expected two coordinators, got %d", len(coords))
	}
	items = prefixSessionItems(items)
	if len(items) != 2 {
		t.Fatalf("expected two session items, got %d", len(items))
	}
	for _, item := range items {
		if _, _, ok := parseSessionRef(item.label); !ok {
			t.Fatalf("expected prefixed label for %q", item.label)
		}
	}
}

func TestAutoSpawnBasePrefixesForSpoke(t *testing.T) {
	base, ok := autoSpawnBase(attachModel{
		hub:         coordinatorRef{Name: "hub"},
		coordinator: coordinatorRef{Name: "spoke-a"},
		coords:      []coordinatorRef{{Name: "spoke-a"}},
	}, "session")
	if !ok {
		t.Fatalf("expected auto spawn base to resolve")
	}
	if base != "spoke-a:session" {
		t.Fatalf("expected prefixed base, got %q", base)
	}
}

func TestAutoSpawnBaseUsesHubNameWhenSame(t *testing.T) {
	base, ok := autoSpawnBase(attachModel{
		hub:         coordinatorRef{Name: "hub"},
		coordinator: coordinatorRef{Name: "hub"},
		coords:      []coordinatorRef{{Name: "hub"}},
	}, "session")
	if !ok {
		t.Fatalf("expected auto spawn base to resolve")
	}
	if base != "session" {
		t.Fatalf("expected base without prefix, got %q", base)
	}
}

func TestAutoSpawnBaseFallsBackToFirstCoordinator(t *testing.T) {
	base, ok := autoSpawnBase(attachModel{
		hub:    coordinatorRef{Name: "hub"},
		coords: []coordinatorRef{{Name: "spoke-b"}},
	}, "session")
	if !ok {
		t.Fatalf("expected auto spawn base to resolve")
	}
	if base != "spoke-b:session" {
		t.Fatalf("expected fallback prefixed base, got %q", base)
	}
}

func TestAutoSpawnBaseFailsWithoutCoordinator(t *testing.T) {
	_, ok := autoSpawnBase(attachModel{}, "session")
	if ok {
		t.Fatalf("expected auto spawn base to fail without coordinator")
	}
}
