const std = @import("std");

const Artifact = enum {
    ghostty,
    lib,
};

const UnicodeTables = struct {
    props_output: std.Build.LazyPath,
    symbols_output: std.Build.LazyPath,
};

fn joinPath(alloc: std.mem.Allocator, parts: []const []const u8) []const u8 {
    return std.fs.path.join(alloc, parts) catch @panic("path join failed");
}

fn addUnicodeTables(
    b: *std.Build,
    ghostty_root: []const u8,
    uucode_tables: std.Build.LazyPath,
    uucode_config_path: []const u8,
) UnicodeTables {
    const props_src = joinPath(b.allocator, &.{ ghostty_root, "src/unicode/props_uucode.zig" });
    const symbols_src = joinPath(b.allocator, &.{ ghostty_root, "src/unicode/symbols_uucode.zig" });

    const props_exe = b.addExecutable(.{
        .name = "props-unigen",
        .root_module = b.createModule(.{
            .root_source_file = b.path(props_src),
            .target = b.graph.host,
            .strip = false,
            .omit_frame_pointer = false,
            .unwind_tables = .sync,
        }),
        .use_llvm = true,
    });

    const symbols_exe = b.addExecutable(.{
        .name = "symbols-unigen",
        .root_module = b.createModule(.{
            .root_source_file = b.path(symbols_src),
            .target = b.graph.host,
            .strip = false,
            .omit_frame_pointer = false,
            .unwind_tables = .sync,
        }),
        .use_llvm = true,
    });

    if (b.lazyDependency("uucode", .{
        .target = b.graph.host,
        .tables_path = uucode_tables,
        .build_config_path = b.path(uucode_config_path),
    })) |dep| {
        props_exe.root_module.addImport("uucode", dep.module("uucode"));
        symbols_exe.root_module.addImport("uucode", dep.module("uucode"));
    }

    const props_run = b.addRunArtifact(props_exe);
    const symbols_run = b.addRunArtifact(symbols_exe);

    const wf = b.addWriteFiles();
    const props_output = wf.addCopyFile(props_run.captureStdOut(), "props.zig");
    const symbols_output = wf.addCopyFile(symbols_run.captureStdOut(), "symbols.zig");

    return .{
        .props_output = props_output,
        .symbols_output = symbols_output,
    };
}

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    const frame_pointers = b.option(bool, "frame_pointers", "Force frame pointers for sanitizer runs") orelse false;

    const ghostty_root = b.option(
        []const u8,
        "ghostty",
        "Path to Ghostty checkout",
    ) orelse "../../ghostty";

    const uucode_config_path = joinPath(b.allocator, &.{
        ghostty_root,
        "src/build/uucode_config.zig",
    });

    const uucode_dep = b.dependency("uucode", .{
        .build_config_path = b.path(uucode_config_path),
    });
    const uucode_tables = uucode_dep.namedLazyPath("tables.zig");

    const unicode_tables = addUnicodeTables(
        b,
        ghostty_root,
        uucode_tables,
        uucode_config_path,
    );

    const vt_path = joinPath(b.allocator, &.{ ghostty_root, "src/lib_vt.zig" });
    const vt_module = b.addModule("ghostty-vt", .{
        .root_source_file = b.path(vt_path),
        .target = target,
        .optimize = optimize,
        .link_libc = true,
    });

    const build_opts = b.addOptions();
    build_opts.addOption(bool, "simd", false);
    vt_module.addOptions("build_options", build_opts);

    const term_opts = b.addOptions();
    term_opts.addOption(Artifact, "artifact", .lib);
    term_opts.addOption(bool, "c_abi", false);
    term_opts.addOption(bool, "oniguruma", false);
    term_opts.addOption(bool, "simd", false);
    term_opts.addOption(bool, "slow_runtime_safety", false);
    term_opts.addOption(bool, "kitty_graphics", false);
    term_opts.addOption(bool, "tmux_control_mode", false);
    vt_module.addOptions("terminal_options", term_opts);

    vt_module.addAnonymousImport("unicode_tables", .{
        .root_source_file = unicode_tables.props_output,
    });
    vt_module.addAnonymousImport("symbols_tables", .{
        .root_source_file = unicode_tables.symbols_output,
    });
    vt_module.addAnonymousImport("oniguruma", .{
        .root_source_file = b.path("oniguruma_stub.zig"),
    });
    vt_module.addImport("uucode", uucode_dep.module("uucode"));

    const shim_module = b.createModule(.{
        .root_source_file = b.path("vtr_ghostty_vt_shim.zig"),
        .target = target,
        .optimize = optimize,
        .link_libc = true,
    });
    shim_module.addImport("ghostty-vt", vt_module);

    if (frame_pointers) {
        vt_module.omit_frame_pointer = false;
        shim_module.omit_frame_pointer = false;
    }

    const lib = b.addLibrary(.{
        .name = "vtr-ghostty-vt",
        .root_module = shim_module,
        .linkage = .static,
    });

    unicode_tables.props_output.addStepDependencies(&lib.step);
    unicode_tables.symbols_output.addStepDependencies(&lib.step);

    lib.installHeader(b.path("vtr_ghostty_vt.h"), "vtr_ghostty_vt.h");
    b.installArtifact(lib);
}
