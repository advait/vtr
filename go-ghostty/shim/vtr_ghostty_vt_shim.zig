const std = @import("std");
const builtin = @import("builtin");
const vt = @import("ghostty-vt");

const Allocator = std.mem.Allocator;
const ReadonlyStream = @TypeOf(@as(*vt.Terminal, undefined).vtStream());

const GhosttyAllocatorVtable = extern struct {
    alloc: *const fn (*anyopaque, len: usize, alignment: u8, ret_addr: usize) callconv(.c) ?[*]u8,
    resize: *const fn (*anyopaque, memory: [*]u8, memory_len: usize, alignment: u8, new_len: usize, ret_addr: usize) callconv(.c) bool,
    remap: *const fn (*anyopaque, memory: [*]u8, memory_len: usize, alignment: u8, new_len: usize, ret_addr: usize) callconv(.c) ?[*]u8,
    free: *const fn (*anyopaque, memory: [*]u8, memory_len: usize, alignment: u8, ret_addr: usize) callconv(.c) void,
};

const GhosttyAllocator = extern struct {
    ctx: *anyopaque,
    vtable: *const GhosttyAllocatorVtable,

    const zig_vtable: Allocator.VTable = .{
        .alloc = alloc,
        .resize = resize,
        .remap = remap,
        .free = free,
    };

    pub fn zig(self: *const GhosttyAllocator) Allocator {
        return .{
            .ptr = @ptrCast(@constCast(self)),
            .vtable = &zig_vtable,
        };
    }

    fn alloc(
        ctx: *anyopaque,
        len: usize,
        alignment: std.mem.Alignment,
        ra: usize,
    ) ?[*]u8 {
        const self: *GhosttyAllocator = @ptrCast(@alignCast(ctx));
        return self.vtable.alloc(self.ctx, len, @intFromEnum(alignment), ra);
    }

    fn resize(
        ctx: *anyopaque,
        old_mem: []u8,
        alignment: std.mem.Alignment,
        new_len: usize,
        ra: usize,
    ) bool {
        const self: *GhosttyAllocator = @ptrCast(@alignCast(ctx));
        return self.vtable.resize(
            self.ctx,
            old_mem.ptr,
            old_mem.len,
            @intFromEnum(alignment),
            new_len,
            ra,
        );
    }

    fn remap(
        ctx: *anyopaque,
        old_mem: []u8,
        alignment: std.mem.Alignment,
        new_len: usize,
        ra: usize,
    ) ?[*]u8 {
        const self: *GhosttyAllocator = @ptrCast(@alignCast(ctx));
        return self.vtable.remap(
            self.ctx,
            old_mem.ptr,
            old_mem.len,
            @intFromEnum(alignment),
            new_len,
            ra,
        );
    }

    fn free(
        ctx: *anyopaque,
        old_mem: []u8,
        alignment: std.mem.Alignment,
        ra: usize,
    ) void {
        const self: *GhosttyAllocator = @ptrCast(@alignCast(ctx));
        self.vtable.free(
            self.ctx,
            old_mem.ptr,
            old_mem.len,
            @intFromEnum(alignment),
            ra,
        );
    }
};

const GhosttyResult = enum(c_int) {
    success = 0,
    out_of_memory = -1,
    invalid_value = -2,
};

pub const vtr_ghostty_terminal_t = opaque {};

pub const vtr_ghostty_terminal_options_t = extern struct {
    cols: u32,
    rows: u32,
    max_scrollback: u32,
};

pub const vtr_ghostty_dump_scope_t = enum(c_int) {
    VTR_GHOSTTY_DUMP_VIEWPORT = 0,
    VTR_GHOSTTY_DUMP_SCREEN = 1,
    VTR_GHOSTTY_DUMP_HISTORY = 2,
};

pub const vtr_ghostty_bytes_t = extern struct {
    ptr: ?[*]const u8,
    len: usize,
};

pub const vtr_ghostty_cell_t = extern struct {
    codepoint: u32,
    fg_rgb: u32,
    bg_rgb: u32,
    ul_rgb: u32,
    attrs: u32,
    wide: u8,
};

pub const vtr_ghostty_snapshot_t = extern struct {
    rows: u32,
    cols: u32,
    cursor_x: u32,
    cursor_y: u32,
    cursor_visible: u8,
    cells: ?[*]vtr_ghostty_cell_t,
};

const AttrBold: u32 = 1 << 0;
const AttrItalic: u32 = 1 << 1;
const AttrUnderline: u32 = 1 << 2;
const AttrFaint: u32 = 1 << 3;
const AttrBlink: u32 = 1 << 4;
const AttrInverse: u32 = 1 << 5;
const AttrInvisible: u32 = 1 << 6;
const AttrStrikethrough: u32 = 1 << 7;
const AttrOverline: u32 = 1 << 8;

const TerminalHandle = struct {
    alloc: Allocator,
    terminal: vt.Terminal,
    stream: ReadonlyStream,
    render_state: vt.RenderState,
};

fn handleFromOpaque(ptr: *vtr_ghostty_terminal_t) *TerminalHandle {
    return @ptrCast(@alignCast(ptr));
}

fn defaultAllocator(c_alloc: ?*const GhosttyAllocator) Allocator {
    if (c_alloc) |alloc| return alloc.zig();
    if (comptime builtin.is_test) return std.testing.allocator;
    if (comptime builtin.link_libc) return std.heap.c_allocator;
    if (comptime builtin.target.cpu.arch.isWasm()) return std.heap.wasm_allocator;
    return std.heap.smp_allocator;
}

fn mapError(err: anyerror) GhosttyResult {
    return switch (err) {
        error.OutOfMemory => .out_of_memory,
        else => .invalid_value,
    };
}

fn packRgb(rgb: vt.color.RGB) u32 {
    return (@as(u32, rgb.r) << 16) | (@as(u32, rgb.g) << 8) | @as(u32, rgb.b);
}

fn attrsFromStyle(style: vt.Style) u32 {
    var attrs: u32 = 0;
    if (style.flags.bold) attrs |= AttrBold;
    if (style.flags.italic) attrs |= AttrItalic;
    if (style.flags.underline != .none) attrs |= AttrUnderline;
    if (style.flags.faint) attrs |= AttrFaint;
    if (style.flags.blink) attrs |= AttrBlink;
    if (style.flags.inverse) attrs |= AttrInverse;
    if (style.flags.invisible) attrs |= AttrInvisible;
    if (style.flags.strikethrough) attrs |= AttrStrikethrough;
    if (style.flags.overline) attrs |= AttrOverline;
    return attrs;
}

fn cellWideValue(wide: vt.page.Cell.Wide) u8 {
    return switch (wide) {
        .narrow => 0,
        .wide => 1,
        .spacer_tail => 2,
        .spacer_head => 3,
    };
}

pub export fn vtr_ghostty_terminal_new(
    opts: ?*const vtr_ghostty_terminal_options_t,
    c_alloc: ?*const GhosttyAllocator,
    out: ?*?*vtr_ghostty_terminal_t,
) GhosttyResult {
    if (opts == null or out == null) return .invalid_value;

    const cols = std.math.cast(vt.size.CellCountInt, opts.?.cols) orelse return .invalid_value;
    const rows = std.math.cast(vt.size.CellCountInt, opts.?.rows) orelse return .invalid_value;
    if (cols == 0 or rows == 0) return .invalid_value;

    const alloc = defaultAllocator(c_alloc);
    const handle = alloc.create(TerminalHandle) catch return .out_of_memory;

    var term_opts = vt.Terminal.Options{
        .cols = cols,
        .rows = rows,
    };
    if (opts.?.max_scrollback != 0) {
        term_opts.max_scrollback = @intCast(opts.?.max_scrollback);
    }

    handle.alloc = alloc;
    handle.render_state = vt.RenderState.empty;
    handle.terminal = vt.Terminal.init(alloc, term_opts) catch |err| {
        alloc.destroy(handle);
        return mapError(err);
    };
    handle.stream = handle.terminal.vtStream();

    out.?.* = @ptrCast(handle);
    return .success;
}

pub export fn vtr_ghostty_terminal_free(t: ?*vtr_ghostty_terminal_t) void {
    if (t == null) return;
    const handle = handleFromOpaque(t.?);
    handle.stream.deinit();
    handle.render_state.deinit(handle.alloc);
    handle.terminal.deinit(handle.alloc);
    handle.alloc.destroy(handle);
}

pub export fn vtr_ghostty_terminal_feed(
    t: ?*vtr_ghostty_terminal_t,
    data: ?[*]const u8,
    len: usize,
    out_reply: ?*vtr_ghostty_bytes_t,
) GhosttyResult {
    if (out_reply) |reply| {
        reply.* = .{ .ptr = null, .len = 0 };
    }
    if (t == null) return .invalid_value;
    if (len > 0 and data == null) return .invalid_value;

    const handle = handleFromOpaque(t.?);
    if (len == 0) return .success;

    const slice = data.?[0..len];
    handle.stream.nextSlice(slice) catch |err| return mapError(err);

    return .success;
}

pub export fn vtr_ghostty_terminal_resize(
    t: ?*vtr_ghostty_terminal_t,
    cols: u32,
    rows: u32,
) GhosttyResult {
    if (t == null) return .invalid_value;

    const c = std.math.cast(vt.size.CellCountInt, cols) orelse return .invalid_value;
    const r = std.math.cast(vt.size.CellCountInt, rows) orelse return .invalid_value;
    if (c == 0 or r == 0) return .invalid_value;

    const handle = handleFromOpaque(t.?);
    handle.terminal.resize(handle.alloc, c, r) catch |err| return mapError(err);
    return .success;
}

pub export fn vtr_ghostty_terminal_snapshot(
    t: ?*vtr_ghostty_terminal_t,
    c_alloc: ?*const GhosttyAllocator,
    out: ?*vtr_ghostty_snapshot_t,
) GhosttyResult {
    if (t == null or out == null) return .invalid_value;

    const handle = handleFromOpaque(t.?);
    handle.render_state.update(handle.alloc, &handle.terminal) catch |err| return mapError(err);

    const rows: usize = @intCast(handle.render_state.rows);
    const cols: usize = @intCast(handle.render_state.cols);
    const total = std.math.mul(usize, rows, cols) catch return .invalid_value;

    const alloc = defaultAllocator(c_alloc);
    const cells = alloc.alloc(vtr_ghostty_cell_t, total) catch return .out_of_memory;
    errdefer alloc.free(cells);

    const row_data = handle.render_state.row_data.slice();
    const row_cells = row_data.items(.cells);
    const row_rows = row_data.items(.raw);

    for (0..rows) |y| {
        const row_raw = row_rows[y];
        const has_managed = row_raw.managedMemory();
        const row_slice = row_cells[y].slice();
        const cell_raw = row_slice.items(.raw);
        const cell_style = if (has_managed) row_slice.items(.style) else undefined;

        for (0..cols) |x| {
            const raw = cell_raw[x];
            var style: vt.Style = .{};
            if (has_managed and raw.style_id > 0) {
                style = cell_style[x];
            }

            const fg_style = style.fg(.{
                .default = handle.render_state.colors.foreground,
                .palette = &handle.render_state.colors.palette,
                .bold = null,
            });
            var bg = style.bg(&raw, &handle.render_state.colors.palette) orelse
                handle.render_state.colors.background;
            var fg = fg_style;
            if (style.flags.inverse) {
                const tmp = fg;
                fg = bg;
                bg = tmp;
            }

            const ul = style.underlineColor(&handle.render_state.colors.palette) orelse
                vt.color.RGB{ .r = 0, .g = 0, .b = 0 };

            const idx = y * cols + x;
            cells[idx] = .{
                .codepoint = @intCast(raw.codepoint()),
                .fg_rgb = packRgb(fg),
                .bg_rgb = packRgb(bg),
                .ul_rgb = packRgb(ul),
                .attrs = attrsFromStyle(style),
                .wide = cellWideValue(raw.wide),
            };
        }
    }

    var cursor_x: u32 = 0;
    var cursor_y: u32 = 0;
    var cursor_visible: u8 = 0;
    if (handle.render_state.cursor.viewport) |vp| {
        cursor_x = @intCast(vp.x);
        cursor_y = @intCast(vp.y);
        cursor_visible = if (handle.render_state.cursor.visible) 1 else 0;
    }

    out.?.* = .{
        .rows = @intCast(rows),
        .cols = @intCast(cols),
        .cursor_x = cursor_x,
        .cursor_y = cursor_y,
        .cursor_visible = cursor_visible,
        .cells = cells.ptr,
    };

    return .success;
}

pub export fn vtr_ghostty_snapshot_free(
    c_alloc: ?*const GhosttyAllocator,
    snap: ?*vtr_ghostty_snapshot_t,
) void {
    if (snap == null) return;
    if (snap.?.cells == null or snap.?.rows == 0 or snap.?.cols == 0) {
        snap.?.* = .{
            .rows = 0,
            .cols = 0,
            .cursor_x = 0,
            .cursor_y = 0,
            .cursor_visible = 0,
            .cells = null,
        };
        return;
    }

    const rows: usize = @intCast(snap.?.rows);
    const cols: usize = @intCast(snap.?.cols);
    const total = std.math.mul(usize, rows, cols) catch {
        snap.?.cells = null;
        return;
    };

    const alloc = defaultAllocator(c_alloc);
    const cells = @as([*]vtr_ghostty_cell_t, @ptrCast(snap.?.cells.?))[0..total];
    alloc.free(cells);
    snap.?.* = .{
        .rows = 0,
        .cols = 0,
        .cursor_x = 0,
        .cursor_y = 0,
        .cursor_visible = 0,
        .cells = null,
    };
}

pub export fn vtr_ghostty_terminal_dump(
    t: ?*vtr_ghostty_terminal_t,
    scope: vtr_ghostty_dump_scope_t,
    unwrap: bool,
    c_alloc: ?*const GhosttyAllocator,
    out: ?*vtr_ghostty_bytes_t,
) GhosttyResult {
    if (t == null or out == null) return .invalid_value;

    const handle = handleFromOpaque(t.?);
    const alloc = defaultAllocator(c_alloc);
    const point = switch (scope) {
        .VTR_GHOSTTY_DUMP_VIEWPORT => vt.point.Point{ .viewport = .{} },
        .VTR_GHOSTTY_DUMP_SCREEN => vt.point.Point{ .screen = .{} },
        .VTR_GHOSTTY_DUMP_HISTORY => vt.point.Point{ .history = .{} },
    };

    const bytes = if (unwrap)
        handle.terminal.screens.active.dumpStringAllocUnwrapped(alloc, point)
    else
        handle.terminal.screens.active.dumpStringAlloc(alloc, point);

    const slice = bytes catch |err| return mapError(err);
    out.?.* = .{ .ptr = slice.ptr, .len = slice.len };
    return .success;
}

pub export fn vtr_ghostty_bytes_free(
    c_alloc: ?*const GhosttyAllocator,
    bytes: ?*vtr_ghostty_bytes_t,
) void {
    if (bytes == null) return;
    if (bytes.?.ptr == null or bytes.?.len == 0) {
        bytes.?.* = .{ .ptr = null, .len = 0 };
        return;
    }

    const alloc = defaultAllocator(c_alloc);
    const slice = @as([*]u8, @ptrCast(@constCast(bytes.?.ptr.?)))[0..bytes.?.len];
    alloc.free(slice);
    bytes.?.* = .{ .ptr = null, .len = 0 };
}
