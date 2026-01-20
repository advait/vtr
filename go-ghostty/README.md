# go-ghostty

Design notes for a Go cgo wrapper around Ghostty's `ghostty-vt` Zig module,
via a local C shim.

## Goals

- Use Ghostty's terminal core for correctness (Terminal + VT stream).
- Expose viewport cells, cursor state, and scrollback text to Go callers.
- Keep memory ownership explicit and C ABI stable.

## Upstream status (libghostty-vt)

`ghostty-vt` is a Zig module rooted at `src/lib_vt.zig` and built as two
modules: `ghostty-vt` (pure Zig) and `ghostty-vt-c` (C ABI enabled). The
shared library `libghostty-vt` is built from `ghostty-vt-c` and installs
headers under `include/ghostty/vt*.h`.

The public C API is explicitly marked as work-in-progress and currently
covers key encoding, OSC/SGR parsing, paste safety, and allocator helpers.
It does not expose terminal state, screen snapshots, or scrollback access,
which are the core needs for vtr. The blog post confirms the public C API
is not ready yet and may change.

## Local C shim (around the Zig module)

We will build a thin C shim in this repo that directly imports the
`ghostty-vt` Zig module and exposes only the terminal operations we need.
All shim symbols use a `vtr_ghostty_` prefix to avoid collisions with the
eventual official libghostty C API.

### Types (shim)

```c
typedef struct vtr_ghostty_terminal vtr_ghostty_terminal_t;

typedef struct {
  uint32_t cols;
  uint32_t rows;
  uint32_t max_scrollback;
} vtr_ghostty_terminal_options_t;

typedef struct {
  uint32_t codepoint; /* 0 for empty */
  uint32_t fg_rgb;    /* 0xRRGGBB, resolved via palette/defaults */
  uint32_t bg_rgb;
  uint32_t ul_rgb;
  uint32_t attrs;     /* bitmask: bold=1<<0, italic=1<<1, underline=1<<2, ... */
  uint8_t  wide;      /* 0=narrow,1=wide,2=spacer_tail,3=spacer_head */
} vtr_ghostty_cell_t;

typedef struct {
  uint32_t rows;
  uint32_t cols;
  uint32_t cursor_x;
  uint32_t cursor_y;
  uint8_t  cursor_visible;
  vtr_ghostty_cell_t *cells; /* rows*cols */
} vtr_ghostty_snapshot_t;

typedef enum {
  VTR_GHOSTTY_DUMP_VIEWPORT = 0,
  VTR_GHOSTTY_DUMP_SCREEN = 1,
  VTR_GHOSTTY_DUMP_HISTORY = 2,
} vtr_ghostty_dump_scope_t;

typedef struct {
  const uint8_t *ptr;
  size_t len;
} vtr_ghostty_bytes_t;
```

The shim header should either include or vendor the `GhosttyResult` and
`GhosttyAllocator` definitions from `include/ghostty/vt/result.h` and
`include/ghostty/vt/allocator.h`, but avoid pulling in the rest of the
upstream C headers.

### Functions (shim)

```c
GhosttyResult vtr_ghostty_terminal_new(
  const vtr_ghostty_terminal_options_t *opts,
  GhosttyAllocator *alloc,
  vtr_ghostty_terminal_t **out
);
void vtr_ghostty_terminal_free(vtr_ghostty_terminal_t *t);

GhosttyResult vtr_ghostty_terminal_feed(
  vtr_ghostty_terminal_t *t,
  const uint8_t *data,
  size_t len,
  vtr_ghostty_bytes_t *out_reply
);
GhosttyResult vtr_ghostty_terminal_resize(
  vtr_ghostty_terminal_t *t,
  uint32_t cols,
  uint32_t rows
);

GhosttyResult vtr_ghostty_terminal_snapshot(
  vtr_ghostty_terminal_t *t,
  GhosttyAllocator *alloc,
  vtr_ghostty_snapshot_t *out
);
void vtr_ghostty_snapshot_free(
  GhosttyAllocator *alloc,
  vtr_ghostty_snapshot_t *snap
);

GhosttyResult vtr_ghostty_terminal_dump(
  vtr_ghostty_terminal_t *t,
  vtr_ghostty_dump_scope_t scope,
  bool unwrap,
  GhosttyAllocator *alloc,
  vtr_ghostty_bytes_t *out
);
void vtr_ghostty_bytes_free(
  GhosttyAllocator *alloc,
  vtr_ghostty_bytes_t *bytes
);
```

### Implementation notes

- `vtr_ghostty_terminal_new` wraps `terminal.Terminal.init` and uses the
  default allocator from `src/lib/allocator.zig` when `alloc == NULL`.
- `vtr_ghostty_terminal_feed` uses `Terminal.vtStream()` (read-only stream)
  to parse output; reply bytes are empty until we wire a responder.
- `vtr_ghostty_terminal_snapshot` uses `terminal.RenderState.update()` for the
  viewport and flattens rows into `vtr_ghostty_cell_t`.
- `vtr_ghostty_terminal_dump` uses `Screen.dumpString` for viewport/screen/history.
- `out_reply` is reserved for DSR/DA/OSC responses; a minimal responder can be
  borrowed from `termio/stream_handler.zig` if we decide to support replies.

## Go API (cgo)

Suggested API shape:

```go
type Options struct {
    Cols, Rows uint32
    MaxScrollback uint32
}

type Terminal struct{ /* owns *C.vtr_ghostty_terminal_t */ }

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
- `Feed` returns reply bytes (often empty until we add a responder) that
  must be written back to the PTY.
- `Snapshot` copies C memory into Go-owned slices.
- Caller serializes access (Terminal is not thread-safe).

## Build and linking (shim)

- Keep a Ghostty checkout available (submodule at `go-ghostty/ghostty` or a path like `/tmp/ghostty`).
- Build a small Zig shim library that imports `ghostty-vt` and exports the
  `vtr_ghostty_*` C API. The shim build script should mirror Ghostty's
  `terminal_options` (`artifact = .lib`, `oniguruma = false`, `simd = true/false`).
- Example build (uses `build.zig` in this repo; default Ghostty path is `../ghostty`):
  - `cd go-ghostty/shim && zig build -Dghostty=/tmp/ghostty -Doptimize=ReleaseSafe`
  - Output: `zig-out/lib/libvtr-ghostty-vt.a` and `zig-out/include/vtr_ghostty_vt.h`
- cgo flags (local dev):
  - `CGO_CFLAGS=-I$(pwd)/go-ghostty/shim/zig-out/include`
  - `CGO_LDFLAGS=-L$(pwd)/go-ghostty/shim/zig-out/lib -lvtr-ghostty-vt`

For convenience, this repo includes `go-ghostty/shim/zig-out` build artifacts for
local tests. Rebuild them after changing the shim or Ghostty sources, or when
targeting a different platform.

## Sanitizer builds (M9)

Zig 0.15.2 does not expose ASan/LSan flags, so the shim uses a LLVM IR pipeline
for address sanitizer coverage:

```sh
mise run shim-llvm-asan
mise run test-sanitize-cgo
```

Requires `clang` and `ar` on PATH.
