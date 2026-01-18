# go-ghostty

Design notes for a general Go cgo wrapper around Ghostty's libghostty-vt.

## Goals

- Use Ghostty's terminal core for correctness (Terminal + VT stream).
- Expose viewport cells, cursor state, and scrollback text to Go callers.
- Keep memory ownership explicit and C ABI stable.

## Zig C API additions (libghostty-vt)

Add a new C header `include/ghostty/vt/terminal.h` and export functions from
`src/terminal/c/terminal.zig` + `src/lib_vt.zig`.

### Types

```c
typedef struct ghostty_vt_terminal ghostty_vt_terminal_t;

typedef struct {
  uint32_t cols;
  uint32_t rows;
  uint32_t max_scrollback;
} ghostty_vt_terminal_options_t;

typedef struct {
  uint32_t codepoint; /* 0 for empty */
  uint32_t fg_rgb;    /* 0xRRGGBB, resolved via palette/defaults */
  uint32_t bg_rgb;
  uint32_t ul_rgb;
  uint32_t attrs;     /* bitmask: bold=1<<0, italic=1<<1, underline=1<<2, ... */
  uint8_t  wide;      /* 0=narrow,1=wide,2=spacer_tail,3=spacer_head */
} ghostty_vt_cell_t;

typedef struct {
  uint32_t rows;
  uint32_t cols;
  uint32_t cursor_x;
  uint32_t cursor_y;
  uint8_t  cursor_visible;
  ghostty_vt_cell_t *cells; /* rows*cols */
} ghostty_vt_snapshot_t;

typedef enum {
  GHOSTTY_VT_DUMP_VIEWPORT = 0,
  GHOSTTY_VT_DUMP_SCREEN = 1,
  GHOSTTY_VT_DUMP_HISTORY = 2,
} ghostty_vt_dump_scope_t;

typedef struct {
  const uint8_t *ptr;
  size_t len;
} ghostty_vt_bytes_t;
```

### Functions

```c
GhosttyResult ghostty_vt_terminal_new(
  const ghostty_vt_terminal_options_t *opts,
  GhosttyAllocator *alloc,
  ghostty_vt_terminal_t **out
);
void ghostty_vt_terminal_free(ghostty_vt_terminal_t *t);

GhosttyResult ghostty_vt_terminal_feed(
  ghostty_vt_terminal_t *t,
  const uint8_t *data,
  size_t len,
  ghostty_vt_bytes_t *out_reply
);
GhosttyResult ghostty_vt_terminal_resize(
  ghostty_vt_terminal_t *t,
  uint32_t cols,
  uint32_t rows
);

GhosttyResult ghostty_vt_terminal_snapshot(
  ghostty_vt_terminal_t *t,
  GhosttyAllocator *alloc,
  ghostty_vt_snapshot_t *out
);
void ghostty_vt_snapshot_free(
  GhosttyAllocator *alloc,
  ghostty_vt_snapshot_t *snap
);

GhosttyResult ghostty_vt_terminal_dump(
  ghostty_vt_terminal_t *t,
  ghostty_vt_dump_scope_t scope,
  bool unwrap,
  GhosttyAllocator *alloc,
  ghostty_vt_bytes_t *out
);
void ghostty_vt_bytes_free(
  GhosttyAllocator *alloc,
  ghostty_vt_bytes_t *bytes
);
```

### Implementation notes

- `ghostty_vt_terminal_new` wraps `terminal.Terminal.init`.
- `ghostty_vt_terminal_feed` uses `Terminal.vtStream()` to parse output.
- `ghostty_vt_terminal_snapshot` uses `terminal.RenderState.update()` for the
  viewport and flattens rows into `ghostty_vt_cell_t`.
- `ghostty_vt_terminal_dump` uses `Screen.dumpString` for viewport/screen/history.
- `out_reply` can hold responses for DSR/DA/OSC queries; implement a minimal
  responder based on `termio/stream_handler.zig` (no renderer dependencies).

## Go API (cgo)

Suggested API shape:

```go
type Options struct {
    Cols, Rows uint32
    MaxScrollback uint32
}

type Terminal struct{ /* owns *C.ghostty_vt_terminal_t */ }

type Snapshot struct {
    Cols, Rows int
    CursorX, CursorY int
    CursorVisible bool
    Cells []Cell // len = Cols*Rows
}

type Cell struct {
    Rune rune
    Fg, Bg, Ul color.RGBA
    Attrs Attrs
    Wide Wide
}

func New(opts Options) (*Terminal, error)
func (t *Terminal) Close() error
func (t *Terminal) Resize(cols, rows uint32) error
func (t *Terminal) Feed(data []byte) (reply []byte, err error)
func (t *Terminal) Snapshot() (*Snapshot, error)
func (t *Terminal) Dump(scope DumpScope, unwrap bool) (string, error)
```

Notes:
- `Feed` returns reply bytes that must be written back to the PTY.
- `Snapshot` copies C memory into Go-owned slices.
- Caller serializes access (Terminal is not thread-safe).

## Build and linking

- Build libghostty-vt with Zig:
  - `cd /tmp/ghostty && zig build lib-vt`
  - Output: `zig-out/lib/libghostty-vt.so` and headers in `zig-out/include/ghostty`.
- cgo flags (local dev):
  - `CGO_CFLAGS=-I/tmp/ghostty/zig-out/include`
  - `CGO_LDFLAGS=-L/tmp/ghostty/zig-out/lib -lghostty-vt`
- Prefer static linking for distribution. Add a static lib-vt build step in
  Ghostty (`linkage = .static`) and link `libghostty-vt.a` from cgo.
