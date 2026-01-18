package ghostty

import (
	"fmt"
	"image/color"
	"strings"
	"testing"
)

func rgb(r, g, b uint8) color.RGBA {
	return color.RGBA{R: r, G: g, B: b, A: 255}
}

// defaultANSI matches ghostty/src/terminal/color.zig Name.default values.
var defaultANSI = [...]color.RGBA{
	rgb(0x1D, 0x1F, 0x21),
	rgb(0xCC, 0x66, 0x66),
	rgb(0xB5, 0xBD, 0x68),
	rgb(0xF0, 0xC6, 0x74),
	rgb(0x81, 0xA2, 0xBE),
	rgb(0xB2, 0x94, 0xBB),
	rgb(0x8A, 0xBE, 0xB7),
	rgb(0xC5, 0xC8, 0xC6),
	rgb(0x66, 0x66, 0x66),
	rgb(0xD5, 0x4E, 0x53),
	rgb(0xB9, 0xCA, 0x4A),
	rgb(0xE7, 0xC5, 0x47),
	rgb(0x7A, 0xA6, 0xDA),
	rgb(0xC3, 0x97, 0xD8),
	rgb(0x70, 0xC0, 0xB1),
	rgb(0xEA, 0xEA, 0xEA),
}

func defaultPaletteColor(idx int) color.RGBA {
	if idx < 0 || idx > 255 {
		return rgb(0, 0, 0)
	}
	if idx < len(defaultANSI) {
		return defaultANSI[idx]
	}
	if idx < 232 {
		i := idx - 16
		r := i / 36
		g := (i % 36) / 6
		b := i % 6
		return rgb(paletteComponent(r), paletteComponent(g), paletteComponent(b))
	}
	value := uint8((idx-232)*10 + 8)
	return rgb(value, value, value)
}

func paletteComponent(v int) uint8 {
	if v == 0 {
		return 0
	}
	return uint8(v*40 + 55)
}

func newTerminal(t *testing.T, cols, rows int) *Terminal {
	t.Helper()
	term, err := New(Options{Cols: uint32(cols), Rows: uint32(rows), MaxScrollback: 10})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	t.Cleanup(func() {
		_ = term.Close()
	})
	return term
}

func feed(t *testing.T, term *Terminal, input string) {
	t.Helper()
	if _, err := term.Feed([]byte(input)); err != nil {
		t.Fatalf("Feed: %v", err)
	}
}

func snapshot(t *testing.T, term *Terminal) *Snapshot {
	t.Helper()
	snap, err := term.Snapshot()
	if err != nil {
		t.Fatalf("Snapshot: %v", err)
	}
	return snap
}

func cellAt(t *testing.T, snap *Snapshot, x, y int) Cell {
	t.Helper()
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

func TestSnapshotColorsBasicSGR(t *testing.T) {
	type colorCase struct {
		name  string
		sgr   int
		index int
		bg    bool
	}
	fgCases := []colorCase{
		{name: "fg_black", sgr: 30, index: 0},
		{name: "fg_red", sgr: 31, index: 1},
		{name: "fg_green", sgr: 32, index: 2},
		{name: "fg_yellow", sgr: 33, index: 3},
		{name: "fg_blue", sgr: 34, index: 4},
		{name: "fg_magenta", sgr: 35, index: 5},
		{name: "fg_cyan", sgr: 36, index: 6},
		{name: "fg_white", sgr: 37, index: 7},
	}
	bgCases := []colorCase{
		{name: "bg_black", sgr: 40, index: 0, bg: true},
		{name: "bg_red", sgr: 41, index: 1, bg: true},
		{name: "bg_green", sgr: 42, index: 2, bg: true},
		{name: "bg_yellow", sgr: 43, index: 3, bg: true},
		{name: "bg_blue", sgr: 44, index: 4, bg: true},
		{name: "bg_magenta", sgr: 45, index: 5, bg: true},
		{name: "bg_cyan", sgr: 46, index: 6, bg: true},
		{name: "bg_white", sgr: 47, index: 7, bg: true},
	}
	cases := append(fgCases, bgCases...)
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			term := newTerminal(t, 2, 1)
			feed(t, term, fmt.Sprintf("\x1b[%dmX", tc.sgr))
			snap := snapshot(t, term)
			cell := cellAt(t, snap, 0, 0)
			if cell.Rune != 'X' {
				t.Fatalf("cell(0,0)=%q", cell.Rune)
			}
			want := defaultPaletteColor(tc.index)
			if tc.bg {
				if cell.Bg != want {
					t.Fatalf("bg=%v want=%v", cell.Bg, want)
				}
				return
			}
			if cell.Fg != want {
				t.Fatalf("fg=%v want=%v", cell.Fg, want)
			}
		})
	}
}

func TestSnapshotColorsExtendedSGR(t *testing.T) {
	cases := []struct {
		name   string
		seq    string
		wantFg color.RGBA
		wantBg color.RGBA
	}{
		{
			name:   "palette_cube",
			seq:    "\x1b[38;5;196;48;5;21mX",
			wantFg: defaultPaletteColor(196),
			wantBg: defaultPaletteColor(21),
		},
		{
			name:   "palette_gray",
			seq:    "\x1b[38;5;244;48;5;232mX",
			wantFg: defaultPaletteColor(244),
			wantBg: defaultPaletteColor(232),
		},
		{
			name:   "truecolor",
			seq:    "\x1b[38;2;12;34;56;48;2;210;180;140mX",
			wantFg: rgb(12, 34, 56),
			wantBg: rgb(210, 180, 140),
		},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			term := newTerminal(t, 2, 1)
			feed(t, term, tc.seq)
			snap := snapshot(t, term)
			cell := cellAt(t, snap, 0, 0)
			if cell.Rune != 'X' {
				t.Fatalf("cell(0,0)=%q", cell.Rune)
			}
			if cell.Fg != tc.wantFg {
				t.Fatalf("fg=%v want=%v", cell.Fg, tc.wantFg)
			}
			if cell.Bg != tc.wantBg {
				t.Fatalf("bg=%v want=%v", cell.Bg, tc.wantBg)
			}
		})
	}
}

func TestSnapshotAttrsAll(t *testing.T) {
	cases := []struct {
		name string
		seq  string
		attr Attrs
	}{
		{name: "bold", seq: "\x1b[1mX", attr: AttrBold},
		{name: "faint", seq: "\x1b[2mX", attr: AttrFaint},
		{name: "italic", seq: "\x1b[3mX", attr: AttrItalic},
		{name: "underline", seq: "\x1b[4mX", attr: AttrUnderline},
		{name: "blink", seq: "\x1b[5mX", attr: AttrBlink},
		{name: "inverse", seq: "\x1b[7mX", attr: AttrInverse},
		{name: "invisible", seq: "\x1b[8mX", attr: AttrInvisible},
		{name: "strikethrough", seq: "\x1b[9mX", attr: AttrStrikethrough},
		{name: "overline", seq: "\x1b[53mX", attr: AttrOverline},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			term := newTerminal(t, 2, 1)
			feed(t, term, tc.seq)
			snap := snapshot(t, term)
			cell := cellAt(t, snap, 0, 0)
			if cell.Rune != 'X' {
				t.Fatalf("cell(0,0)=%q", cell.Rune)
			}
			if cell.Attrs&tc.attr == 0 {
				t.Fatalf("attrs=%v missing=%v", cell.Attrs, tc.attr)
			}
		})
	}
}

func TestSnapshotAttrsReset(t *testing.T) {
	cases := []struct {
		name     string
		seq      string
		wantAttr Attrs
	}{
		{
			name:     "bold_reset",
			seq:      "\x1b[1mA\x1b[0mB",
			wantAttr: AttrBold,
		},
		{
			name:     "underline_reset",
			seq:      "\x1b[4mA\x1b[0mB",
			wantAttr: AttrUnderline,
		},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			term := newTerminal(t, 3, 1)
			feed(t, term, tc.seq)
			snap := snapshot(t, term)
			cellA := cellAt(t, snap, 0, 0)
			cellB := cellAt(t, snap, 1, 0)
			if cellA.Attrs&tc.wantAttr == 0 {
				t.Fatalf("cellA attrs=%v missing=%v", cellA.Attrs, tc.wantAttr)
			}
			if cellB.Attrs != 0 {
				t.Fatalf("cellB attrs=%v want=0", cellB.Attrs)
			}
		})
	}
}

