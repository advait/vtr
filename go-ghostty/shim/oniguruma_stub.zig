const std = @import("std");

pub const Encoding = enum {
    utf8,
};

pub const Syntax = enum {
    default,
};

pub const Error = error{
    Mismatch,
    Unsupported,
};

pub const Region = struct {
    pub fn deinit(self: *Region) void {
        _ = self;
    }

    pub fn starts(self: Region) []const i32 {
        _ = self;
        return &[_]i32{0};
    }

    pub fn ends(self: Region) []const i32 {
        _ = self;
        return &[_]i32{0};
    }
};

pub const Regex = struct {
    pub fn init(
        pattern: []const u8,
        opts: anytype,
        encoding: Encoding,
        syntax: Syntax,
        alloc: ?*anyopaque,
    ) Error!Regex {
        _ = pattern;
        _ = opts;
        _ = encoding;
        _ = syntax;
        _ = alloc;
        return .{};
    }

    pub fn deinit(self: *Regex) void {
        _ = self;
    }

    pub fn search(self: Regex, input: []const u8, opts: anytype) Error!Region {
        _ = self;
        _ = input;
        _ = opts;
        return Error.Mismatch;
    }
};

pub const testing = struct {
    pub fn ensureInit() Error!void {
        return;
    }
};
