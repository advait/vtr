package ghostty

import (
	"strings"
	"testing"
)

func cellAt(t *testing.T, snap *Snapshot, x, y int) Cell {
	if snap == nil {
		t.Fatal("snapshot is nil")
	}
	idx := y*snap.Cols + x
	if idx < 0 || idx >= len(snap.Cells) {
		t.Fatalf("cell index out of range: %d", idx)
	}
	return snap.Cells[idx]
}

func TestSnapshotBasic(t *testing.T) {
	term, err := New(Options{Cols: 8, Rows: 2, MaxScrollback: 10})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	defer term.Close()

	if _, err := term.Feed([]byte("hi")); err != nil {
		t.Fatalf("Feed: %v", err)
	}

	snap, err := term.Snapshot()
	if err != nil {
		t.Fatalf("Snapshot: %v", err)
	}
	if snap.Cols != 8 || snap.Rows != 2 {
		t.Fatalf("unexpected size: %dx%d", snap.Cols, snap.Rows)
	}

	if got := cellAt(t, snap, 0, 0).Rune; got != 'h' {
		t.Fatalf("cell(0,0)=%q", got)
	}
	if got := cellAt(t, snap, 1, 0).Rune; got != 'i' {
		t.Fatalf("cell(1,0)=%q", got)
	}
	if snap.CursorX != 2 || snap.CursorY != 0 {
		t.Fatalf("cursor=%d,%d", snap.CursorX, snap.CursorY)
	}
	if !snap.CursorVisible {
		t.Fatalf("expected cursor visible")
	}
}

func TestSnapshotNewline(t *testing.T) {
	term, err := New(Options{Cols: 6, Rows: 2, MaxScrollback: 10})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	defer term.Close()

	if _, err := term.Feed([]byte("a\r\nb")); err != nil {
		t.Fatalf("Feed: %v", err)
	}

	snap, err := term.Snapshot()
	if err != nil {
		t.Fatalf("Snapshot: %v", err)
	}
	if got := cellAt(t, snap, 0, 0).Rune; got != 'a' {
		t.Fatalf("cell(0,0)=%q", got)
	}
	if got := cellAt(t, snap, 0, 1).Rune; got != 'b' {
		t.Fatalf("cell(0,1)=%q", got)
	}
	if snap.CursorX != 1 || snap.CursorY != 1 {
		t.Fatalf("cursor=%d,%d", snap.CursorX, snap.CursorY)
	}
}

func TestSnapshotAttrs(t *testing.T) {
	term, err := New(Options{Cols: 4, Rows: 1, MaxScrollback: 10})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	defer term.Close()

	if _, err := term.Feed([]byte("\x1b[1mX")); err != nil {
		t.Fatalf("Feed: %v", err)
	}

	snap, err := term.Snapshot()
	if err != nil {
		t.Fatalf("Snapshot: %v", err)
	}
	cell := cellAt(t, snap, 0, 0)
	if cell.Rune != 'X' {
		t.Fatalf("cell(0,0)=%q", cell.Rune)
	}
	if cell.Attrs&AttrBold == 0 {
		t.Fatalf("expected bold attr")
	}
}

func TestDumpViewport(t *testing.T) {
	term, err := New(Options{Cols: 6, Rows: 2, MaxScrollback: 10})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	defer term.Close()

	if _, err := term.Feed([]byte("hi")); err != nil {
		t.Fatalf("Feed: %v", err)
	}

	dump, err := term.Dump(DumpViewport, false)
	if err != nil {
		t.Fatalf("Dump: %v", err)
	}
	if !strings.HasPrefix(dump, "hi") {
		t.Fatalf("unexpected dump prefix: %q", dump)
	}
}
