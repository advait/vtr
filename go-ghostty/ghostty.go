package ghostty

/*
#cgo CFLAGS: -I${SRCDIR}/shim/zig-out/include
#cgo LDFLAGS: -L${SRCDIR}/shim/zig-out/lib -lvtr-ghostty-vt
#include "vtr_ghostty_vt.h"
*/
import "C"

import (
	"errors"
	"fmt"
	"image/color"
	"unsafe"
)

// Options configure a terminal instance.
type Options struct {
	Cols          uint32
	Rows          uint32
	MaxScrollback uint32
}

// DumpScope controls which buffer to dump.
type DumpScope int

const (
	DumpViewport DumpScope = DumpScope(C.VTR_GHOSTTY_DUMP_VIEWPORT)
	DumpScreen   DumpScope = DumpScope(C.VTR_GHOSTTY_DUMP_SCREEN)
	DumpHistory  DumpScope = DumpScope(C.VTR_GHOSTTY_DUMP_HISTORY)
)

// Attrs is a bitmask describing cell attributes.
type Attrs uint32

const (
	AttrBold         Attrs = Attrs(C.VTR_GHOSTTY_ATTR_BOLD)
	AttrItalic       Attrs = Attrs(C.VTR_GHOSTTY_ATTR_ITALIC)
	AttrUnderline    Attrs = Attrs(C.VTR_GHOSTTY_ATTR_UNDERLINE)
	AttrFaint        Attrs = Attrs(C.VTR_GHOSTTY_ATTR_FAINT)
	AttrBlink        Attrs = Attrs(C.VTR_GHOSTTY_ATTR_BLINK)
	AttrInverse      Attrs = Attrs(C.VTR_GHOSTTY_ATTR_INVERSE)
	AttrInvisible    Attrs = Attrs(C.VTR_GHOSTTY_ATTR_INVISIBLE)
	AttrStrikethrough Attrs = Attrs(C.VTR_GHOSTTY_ATTR_STRIKETHROUGH)
	AttrOverline     Attrs = Attrs(C.VTR_GHOSTTY_ATTR_OVERLINE)
)

// Wide describes the cell width category.
type Wide uint8

const (
	WideNarrow     Wide = 0
	WideWide       Wide = 1
	WideSpacerTail Wide = 2
	WideSpacerHead Wide = 3
)

// Cell represents a single grid cell.
type Cell struct {
	Rune  rune
	Fg    color.RGBA
	Bg    color.RGBA
	Ul    color.RGBA
	Attrs Attrs
	Wide  Wide
}

// Snapshot captures the viewport state.
type Snapshot struct {
	Cols          int
	Rows          int
	CursorX       int
	CursorY       int
	CursorVisible bool
	Cells         []Cell
}

// Terminal wraps a Ghostty VT instance.
type Terminal struct {
	ptr *C.vtr_ghostty_terminal_t
}

// New creates a new terminal instance.
func New(opts Options) (*Terminal, error) {
	if opts.Cols == 0 || opts.Rows == 0 {
		return nil, errors.New("ghostty: cols/rows must be > 0")
	}
	cOpts := C.vtr_ghostty_terminal_options_t{
		cols:          C.uint32_t(opts.Cols),
		rows:          C.uint32_t(opts.Rows),
		max_scrollback: C.uint32_t(opts.MaxScrollback),
	}
	var out *C.vtr_ghostty_terminal_t
	res := C.vtr_ghostty_terminal_new(&cOpts, nil, &out)
	if err := resultToErr(res); err != nil {
		return nil, err
	}
	return &Terminal{ptr: out}, nil
}

// Close releases the terminal.
func (t *Terminal) Close() error {
	if t == nil || t.ptr == nil {
		return nil
	}
	C.vtr_ghostty_terminal_free(t.ptr)
	t.ptr = nil
	return nil
}

// Feed sends bytes into the VT stream.
func (t *Terminal) Feed(data []byte) ([]byte, error) {
	if t == nil || t.ptr == nil {
		return nil, errors.New("ghostty: terminal is closed")
	}
	var reply C.vtr_ghostty_bytes_t
	var dataPtr *C.uint8_t
	if len(data) > 0 {
		dataPtr = (*C.uint8_t)(unsafe.Pointer(&data[0]))
	}
	res := C.vtr_ghostty_terminal_feed(t.ptr, dataPtr, C.size_t(len(data)), &reply)
	if err := resultToErr(res); err != nil {
		return nil, err
	}
	return copyBytesAndFree(&reply)
}

// Resize changes the viewport dimensions.
func (t *Terminal) Resize(cols, rows uint32) error {
	if t == nil || t.ptr == nil {
		return errors.New("ghostty: terminal is closed")
	}
	res := C.vtr_ghostty_terminal_resize(t.ptr, C.uint32_t(cols), C.uint32_t(rows))
	return resultToErr(res)
}

// Snapshot returns a copy of the current viewport state.
func (t *Terminal) Snapshot() (*Snapshot, error) {
	if t == nil || t.ptr == nil {
		return nil, errors.New("ghostty: terminal is closed")
	}
	var snap C.vtr_ghostty_snapshot_t
	res := C.vtr_ghostty_terminal_snapshot(t.ptr, nil, &snap)
	if err := resultToErr(res); err != nil {
		return nil, err
	}
	defer C.vtr_ghostty_snapshot_free(nil, &snap)

	rows := int(snap.rows)
	cols := int(snap.cols)
	cells := make([]Cell, rows*cols)
	if rows > 0 && cols > 0 && snap.cells != nil {
		cCells := unsafe.Slice((*C.vtr_ghostty_cell_t)(unsafe.Pointer(snap.cells)), rows*cols)
		for i, c := range cCells {
			cells[i] = Cell{
				Rune:  rune(c.codepoint),
				Fg:    unpackRGB(c.fg_rgb),
				Bg:    unpackRGB(c.bg_rgb),
				Ul:    unpackRGB(c.ul_rgb),
				Attrs: Attrs(c.attrs),
				Wide:  Wide(c.wide),
			}
		}
	}

	return &Snapshot{
		Cols:          cols,
		Rows:          rows,
		CursorX:       int(snap.cursor_x),
		CursorY:       int(snap.cursor_y),
		CursorVisible: snap.cursor_visible != 0,
		Cells:         cells,
	}, nil
}

// Dump returns a text dump of the requested scope.
func (t *Terminal) Dump(scope DumpScope, unwrap bool) (string, error) {
	if t == nil || t.ptr == nil {
		return "", errors.New("ghostty: terminal is closed")
	}
	var out C.vtr_ghostty_bytes_t
	res := C.vtr_ghostty_terminal_dump(t.ptr, C.vtr_ghostty_dump_scope_t(scope), C.bool(unwrap), nil, &out)
	if err := resultToErr(res); err != nil {
		return "", err
	}
	bytes, err := copyBytesAndFree(&out)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func copyBytesAndFree(bytes *C.vtr_ghostty_bytes_t) ([]byte, error) {
	if bytes == nil || bytes.ptr == nil || bytes.len == 0 {
		return nil, nil
	}
	if bytes.len > C.size_t(^uint(0)>>1) {
		C.vtr_ghostty_bytes_free(nil, bytes)
		return nil, errors.New("ghostty: reply too large")
	}
	goBytes := unsafe.Slice((*byte)(unsafe.Pointer(bytes.ptr)), int(bytes.len))
	out := append([]byte(nil), goBytes...)
	C.vtr_ghostty_bytes_free(nil, bytes)
	return out, nil
}

func unpackRGB(v C.uint32_t) color.RGBA {
	u := uint32(v)
	return color.RGBA{
		R: uint8(u >> 16),
		G: uint8(u >> 8),
		B: uint8(u),
		A: 255,
	}
}

func resultToErr(res C.GhosttyResult) error {
	switch res {
	case C.GHOSTTY_SUCCESS:
		return nil
	case C.GHOSTTY_OUT_OF_MEMORY:
		return errors.New("ghostty: out of memory")
	case C.GHOSTTY_INVALID_VALUE:
		return errors.New("ghostty: invalid value")
	default:
		return fmt.Errorf("ghostty: error %d", int(res))
	}
}
