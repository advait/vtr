#ifndef VTR_GHOSTTY_VT_H
#define VTR_GHOSTTY_VT_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

// GhosttyResult from ghostty/vt/result.h
typedef enum {
    GHOSTTY_SUCCESS = 0,
    GHOSTTY_OUT_OF_MEMORY = -1,
    GHOSTTY_INVALID_VALUE = -2,
} GhosttyResult;

// GhosttyAllocator from ghostty/vt/allocator.h
typedef struct {
    void* (*alloc)(void *ctx, size_t len, uint8_t alignment, uintptr_t ret_addr);
    bool (*resize)(void *ctx, void *memory, size_t memory_len, uint8_t alignment, size_t new_len, uintptr_t ret_addr);
    void* (*remap)(void *ctx, void *memory, size_t memory_len, uint8_t alignment, size_t new_len, uintptr_t ret_addr);
    void (*free)(void *ctx, void *memory, size_t memory_len, uint8_t alignment, uintptr_t ret_addr);
} GhosttyAllocatorVtable;

typedef struct GhosttyAllocator {
    void *ctx;
    const GhosttyAllocatorVtable *vtable;
} GhosttyAllocator;

typedef struct vtr_ghostty_terminal vtr_ghostty_terminal_t;

typedef struct {
    uint32_t cols;
    uint32_t rows;
    uint32_t max_scrollback;
} vtr_ghostty_terminal_options_t;

typedef enum {
    VTR_GHOSTTY_DUMP_VIEWPORT = 0,
    VTR_GHOSTTY_DUMP_SCREEN = 1,
    VTR_GHOSTTY_DUMP_HISTORY = 2,
} vtr_ghostty_dump_scope_t;

typedef struct {
    const uint8_t *ptr;
    size_t len;
} vtr_ghostty_bytes_t;

typedef struct {
    uint32_t codepoint; /* 0 for empty */
    uint32_t fg_rgb;    /* 0xRRGGBB */
    uint32_t bg_rgb;
    uint32_t ul_rgb;
    uint32_t attrs;     /* bitmask */
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

// Cell attribute bits
enum {
    VTR_GHOSTTY_ATTR_BOLD = 1u << 0,
    VTR_GHOSTTY_ATTR_ITALIC = 1u << 1,
    VTR_GHOSTTY_ATTR_UNDERLINE = 1u << 2,
    VTR_GHOSTTY_ATTR_FAINT = 1u << 3,
    VTR_GHOSTTY_ATTR_BLINK = 1u << 4,
    VTR_GHOSTTY_ATTR_INVERSE = 1u << 5,
    VTR_GHOSTTY_ATTR_INVISIBLE = 1u << 6,
    VTR_GHOSTTY_ATTR_STRIKETHROUGH = 1u << 7,
    VTR_GHOSTTY_ATTR_OVERLINE = 1u << 8,
};

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

#ifdef __cplusplus
}
#endif

#endif // VTR_GHOSTTY_VT_H
