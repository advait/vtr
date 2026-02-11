package main

import (
	"context"
	"io"
	"testing"
	"time"

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

func TestNormalizeSessionSwitchResolvesCoordFromItems(t *testing.T) {
	model := attachModel{
		hub:              coordinatorRef{Name: "hub"},
		multiCoordinator: true,
		sessionItems: []sessionListItem{{
			id:    "id-1",
			label: "spoke-a:demo",
			coord: "spoke-a",
		}},
	}
	msg := normalizeSessionSwitch(model, sessionSwitchMsg{id: "id-1", label: "demo"})
	if msg.coord != "spoke-a" {
		t.Fatalf("expected coord spoke-a, got %q", msg.coord)
	}
	if msg.label != "spoke-a:demo" {
		t.Fatalf("expected prefixed label, got %q", msg.label)
	}
}

func TestNormalizeSessionSwitchUsesSingleCoordinatorFallback(t *testing.T) {
	model := attachModel{
		hub:    coordinatorRef{Name: "hub"},
		coords: []coordinatorRef{{Name: "spoke-a"}},
	}
	msg := normalizeSessionSwitch(model, sessionSwitchMsg{id: "id-2", label: "demo"})
	if msg.coord != "spoke-a" {
		t.Fatalf("expected fallback coord spoke-a, got %q", msg.coord)
	}
}

func TestScheduleSubscribeRetryWithoutSessionStops(t *testing.T) {
	model := attachModel{
		streamID:    9,
		streamState: "reconnecting",
	}
	next, cmd := scheduleSubscribeRetry(model)
	if cmd != nil {
		t.Fatalf("expected no retry command without session")
	}
	if next.streamID != 9 {
		t.Fatalf("expected stream id unchanged, got %d", next.streamID)
	}
	if next.streamState != "disconnected" {
		t.Fatalf("expected disconnected state, got %q", next.streamState)
	}
}

func TestScheduleSubscribeRetrySchedulesRetry(t *testing.T) {
	model := attachModel{
		sessionID:     "session-1",
		streamID:      2,
		streamBackoff: time.Millisecond,
	}
	next, cmd := scheduleSubscribeRetry(model)
	if cmd == nil {
		t.Fatalf("expected retry command")
	}
	if next.streamID != 3 {
		t.Fatalf("expected stream id increment, got %d", next.streamID)
	}
	if next.streamState != "reconnecting" {
		t.Fatalf("expected reconnecting state, got %q", next.streamState)
	}
	if next.streamBackoff <= time.Millisecond {
		t.Fatalf("expected backoff growth, got %s", next.streamBackoff)
	}
	msg := cmd()
	retry, ok := msg.(subscribeRetryMsg)
	if !ok {
		t.Fatalf("expected subscribeRetryMsg, got %T", msg)
	}
	if retry.streamID != 3 {
		t.Fatalf("expected retry stream id 3, got %d", retry.streamID)
	}
}

func TestUpdateTickDowngradesReceivingState(t *testing.T) {
	now := time.Unix(1000, 0)
	model := attachModel{
		streamState:  "receiving",
		lastScreenAt: now.Add(-3 * time.Second),
	}
	updated, _ := model.Update(tickMsg(now))
	next, ok := updated.(attachModel)
	if !ok {
		t.Fatalf("expected attachModel update result, got %T", updated)
	}
	if next.streamState != "connected" {
		t.Fatalf("expected connected state after stale tick, got %q", next.streamState)
	}
}

func TestSessionsSnapshotEOFSchedulesRetry(t *testing.T) {
	canceled := false
	model := attachModel{
		sessionsStreamID:     5,
		sessionsBackoff:      time.Second,
		sessionsStreamCancel: func() { canceled = true },
	}
	updated, cmd := model.Update(sessionsSnapshotMsg{streamID: 5, err: io.EOF})
	next, ok := updated.(attachModel)
	if !ok {
		t.Fatalf("expected attachModel update result, got %T", updated)
	}
	if cmd == nil {
		t.Fatalf("expected retry command on EOF")
	}
	if !canceled {
		t.Fatalf("expected existing sessions stream to be canceled")
	}
	if next.sessionsStreamID != 6 {
		t.Fatalf("expected incremented sessions stream id, got %d", next.sessionsStreamID)
	}
	if next.sessionsStreamCancel != nil {
		t.Fatalf("expected cleared sessions stream cancel function")
	}
	if next.sessionsStream != nil {
		t.Fatalf("expected cleared sessions stream")
	}
}

func TestSessionsSnapshotCanceledSchedulesRetry(t *testing.T) {
	model := attachModel{
		sessionsStreamID: 2,
		sessionsBackoff:  time.Second,
	}
	updated, cmd := model.Update(sessionsSnapshotMsg{streamID: 2, err: context.Canceled})
	next, ok := updated.(attachModel)
	if !ok {
		t.Fatalf("expected attachModel update result, got %T", updated)
	}
	if cmd == nil {
		t.Fatalf("expected retry command on canceled stream")
	}
	if next.sessionsStreamID != 3 {
		t.Fatalf("expected incremented sessions stream id, got %d", next.sessionsStreamID)
	}
}

func TestStreamStateLabelDefaults(t *testing.T) {
	tests := []struct {
		name     string
		model    attachModel
		expected string
	}{
		{
			name:     "known state",
			model:    attachModel{streamState: "receiving"},
			expected: "receiving",
		},
		{
			name:     "unknown no session",
			model:    attachModel{streamState: "mystery"},
			expected: "disconnected",
		},
		{
			name:     "unknown with session",
			model:    attachModel{streamState: "mystery", sessionID: "id-1"},
			expected: "connecting",
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := streamStateLabel(tc.model); got != tc.expected {
				t.Fatalf("expected %q, got %q", tc.expected, got)
			}
		})
	}
}

func TestApplyScreenUpdateSessionIDChangeAdoptsNewID(t *testing.T) {
	model := attachModel{
		sessionID:    "session-old",
		sessionCoord: "hub",
		streamID:     7,
		frameID:      11,
	}
	update := &proto.ScreenUpdate{
		IsKeyframe: true,
		FrameId:    12,
		Screen: &proto.GetScreenResponse{
			Id:   "session-new",
			Name: "renamed",
			Cols: 2,
			Rows: 1,
		},
	}

	next, cmd := applyScreenUpdate(model, update)
	if cmd == nil {
		t.Fatalf("expected resubscribe command for session id change")
	}
	if next.sessionID != "session-new" {
		t.Fatalf("expected session id to switch, got %q", next.sessionID)
	}
	if next.streamID != model.streamID+1 {
		t.Fatalf("expected stream id increment, got %d", next.streamID)
	}
	if next.frameID != 0 {
		t.Fatalf("expected frame id reset during resubscribe, got %d", next.frameID)
	}
}

func TestApplyScreenUpdateRejectsDeltaFrameEqualBase(t *testing.T) {
	model := attachModel{
		sessionID: "session-1",
		streamID:  3,
		frameID:   10,
		screen:    makeAttachTestScreen(2, 1),
	}
	update := &proto.ScreenUpdate{
		BaseFrameId: 10,
		FrameId:     10,
		Delta: &proto.ScreenDelta{
			Cols: 2,
			Rows: 1,
		},
	}

	next, cmd := applyScreenUpdate(model, update)
	if cmd == nil {
		t.Fatalf("expected resubscribe command for non-monotonic delta frame")
	}
	if next.streamID != model.streamID+1 {
		t.Fatalf("expected stream id increment, got %d", next.streamID)
	}
	if next.frameID != 0 {
		t.Fatalf("expected frame id reset, got %d", next.frameID)
	}
}

func TestApplyScreenUpdateRejectsDeltaFrameRollback(t *testing.T) {
	model := attachModel{
		sessionID: "session-1",
		streamID:  3,
		frameID:   10,
		screen:    makeAttachTestScreen(2, 1),
	}
	update := &proto.ScreenUpdate{
		BaseFrameId: 10,
		FrameId:     9,
		Delta: &proto.ScreenDelta{
			Cols: 2,
			Rows: 1,
		},
	}

	next, cmd := applyScreenUpdate(model, update)
	if cmd == nil {
		t.Fatalf("expected resubscribe command for non-monotonic delta frame")
	}
	if next.streamID != model.streamID+1 {
		t.Fatalf("expected stream id increment, got %d", next.streamID)
	}
	if next.frameID != 0 {
		t.Fatalf("expected frame id reset, got %d", next.frameID)
	}
}

func makeAttachTestScreen(cols, rows int32) *proto.GetScreenResponse {
	screenRows := make([]*proto.ScreenRow, rows)
	for r := int32(0); r < rows; r++ {
		cells := make([]*proto.ScreenCell, cols)
		for c := int32(0); c < cols; c++ {
			cells[c] = &proto.ScreenCell{Char: " "}
		}
		screenRows[r] = &proto.ScreenRow{Cells: cells}
	}
	return &proto.GetScreenResponse{
		Cols:      cols,
		Rows:      rows,
		ScreenRows: screenRows,
	}
}
