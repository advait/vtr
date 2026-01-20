# Mise Build System

This repo uses mise as the single build entry point. Build/test tasks run
through `mise run <task>` and are wired with `sources`, `outputs`, and `depends`
so only the dirty subtree is rebuilt.

## Quick start (fresh env)

1. `git submodule update --init --recursive`
2. `mise trust`
3. `mise install`
4. `mise run build`
5. `mise run test`

If you keep Ghostty elsewhere, set `GHOSTTY_ROOT` to point at the checkout:
`GHOSTTY_ROOT=/path/to/ghostty mise run shim`.

## Task graph

- `proto` generates Go stubs from `proto/vtr.proto`.
- `shim` builds the Zig shim against Ghostty.
- `build` depends on `proto` + `shim` and produces `bin/vtr`.
- `test` depends on `proto` + `shim` and runs all Go tests.
- `shim-llvm-ir` and `shim-llvm-asan` produce ASan-ready shim artifacts.
- `test-race-cgo` and `test-sanitize-cgo` run CGO-focused checks.
- `all` depends on `build` + `test`.

## Incremental rebuilds

Build/test tasks declare `sources` and `outputs`. mise skips a task when all outputs
are newer than the sources. This keeps rebuilds scoped to the dirty subtree:
changing a file only rebuilds tasks that depend on it.

Conventions used here:
- Compile/build tasks use real outputs (`bin/vtr`, shim libs, generated stubs).
- Tasks without natural outputs write a stamp file in `bin/` when they should be cached.
- Aggregate/cleanup tasks may omit outputs to always run (e.g. `all`, `clean`).
- Downstream tasks list upstream outputs in their `sources` so a rebuilt shim or
  regenerated proto triggers a rebuild/test.

## Toolchain expectations

`mise install` pulls tool versions from `mise.toml`:
- `go` (per `go.mod`)
- `zig` (per `go-ghostty/shim/build.zig.zon`)
- `clang` (via vfox)

Build/test tasks set `CGO_ENABLED=1`, `CC=clang`, `CXX=clang++` for consistent
CGO builds.

## Adding or updating tasks

When adding a task in `mise.toml`:
- Declare `depends` so the DAG is complete.
- Declare `sources` and `outputs` so tasks can be skipped when up-to-date.
- If a task has no output but should be cached, create a stamp file (e.g. `bin/.mise-<task>.stamp`).
- If a task consumes generated outputs (proto stubs, shim libs), include those
  outputs in its `sources`.

## Common commands

- `mise run all`
- `mise run build`
- `mise run test`
- `mise run proto`
- `mise run shim`
- `mise run test-race-cgo`
- `mise run test-sanitize-cgo`
