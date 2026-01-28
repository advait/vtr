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
	ref := sessionRequestRef(items[0].id, items[0].coord)
	if ref.GetId() != "id-1" || ref.GetCoordinator() != "spoke-a" {
		t.Fatalf("expected session ref with coordinator, got id=%q coord=%q", ref.GetId(), ref.GetCoordinator())
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
	ref := sessionRequestRef(items[0].id, items[0].coord)
	if ref.GetId() != "id-2" || ref.GetCoordinator() != "hub" {
		t.Fatalf("expected hub session ref, got id=%q coord=%q", ref.GetId(), ref.GetCoordinator())
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

func TestGroupTabSessionsByCoordinatorIncludesEmpty(t *testing.T) {
	items := []sessionListItem{
		{id: "id-1", label: "spoke-a:one", coord: "spoke-a", status: proto.SessionStatus_SESSION_STATUS_RUNNING},
	}
	coords := []coordinatorRef{
		{Name: "spoke-a"},
		{Name: "spoke-b"},
	}
	groups := groupTabSessionsByCoordinator(items, coords, "spoke-a")
	if len(groups) != 2 {
		t.Fatalf("expected two groups, got %d", len(groups))
	}
	if groups[0].name != "spoke-a" || len(groups[0].sessions) != 1 {
		t.Fatalf("expected spoke-a group with sessions, got %#v", groups[0])
	}
	if groups[1].name != "spoke-b" || len(groups[1].sessions) != 0 {
		t.Fatalf("expected spoke-b group without sessions, got %#v", groups[1])
	}
}

func TestBuildTabItemsAddsPlusPerCoordinator(t *testing.T) {
	view := headerView{
		sessions: []sessionListItem{
			{id: "id-1", label: "spoke-a:one", coord: "spoke-a", status: proto.SessionStatus_SESSION_STATUS_RUNNING},
			{id: "id-2", label: "spoke-b:two", coord: "spoke-b", status: proto.SessionStatus_SESSION_STATUS_RUNNING},
		},
		activeID:    "id-1",
		activeLabel: "spoke-a:one",
		coords: []coordinatorRef{
			{Name: "spoke-a"},
			{Name: "spoke-b"},
		},
		coordinator: "spoke-a",
		width:       200,
	}
	tabs, _ := buildTabItems(view)
	newCount := 0
	for _, tab := range tabs {
		if tab.kind == tabItemNew {
			newCount++
		}
	}
	if newCount != 2 {
		t.Fatalf("expected plus button per coordinator, got %d", newCount)
	}
}

func TestSessionFromSpawnResponseUsesRequestedCoordinator(t *testing.T) {
	resp := &proto.SpawnResponse{Session: &proto.Session{Id: "id-1", Name: "demo"}}
	id, label, coord, err := sessionFromSpawnResponse(resp, "spoke-a:demo")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if id != "id-1" || coord != "spoke-a" {
		t.Fatalf("expected id and coord, got id=%q coord=%q", id, coord)
	}
	if label != "spoke-a:demo" {
		t.Fatalf("expected prefixed label, got %q", label)
	}
}

func TestSessionFromSpawnResponsePreservesUnprefixedLabel(t *testing.T) {
	resp := &proto.SpawnResponse{Session: &proto.Session{Id: "id-2", Name: "demo"}}
	_, label, coord, err := sessionFromSpawnResponse(resp, "demo")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if coord != "" {
		t.Fatalf("expected empty coord, got %q", coord)
	}
	if label != "demo" {
		t.Fatalf("expected label demo, got %q", label)
	}
}

func TestNextSessionFromEntriesPreservesCoordinator(t *testing.T) {
	entries := []sessionListItem{
		{id: "id-1", label: "one", coord: "spoke-a", order: 1},
		{id: "id-2", label: "two", coord: "spoke-b", order: 2},
	}
	msg := nextSessionFromEntries(entries, "id-1", true)
	if msg.err != nil {
		t.Fatalf("unexpected error: %v", msg.err)
	}
	if msg.id != "id-2" || msg.coord != "spoke-b" {
		t.Fatalf("expected spoke-b selection, got id=%q coord=%q", msg.id, msg.coord)
	}
}
