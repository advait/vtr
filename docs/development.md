# Development

## Quick start (fresh environment)

```
git submodule update --init --recursive
mise trust
mise install
mise run build
mise run test
```

If Ghostty is checked out elsewhere:
`GHOSTTY_ROOT=/path/to/ghostty mise run shim`

## Task graph (mise)

Common tasks:

- `mise run build` - build `bin/vtr`
- `mise run test` - run Go tests
- `mise run web-build` - build `web/dist`
- `mise run build-multi` - build release artifacts into `dist/`
- `mise run dev` - run hub + Vite dev server
- `mise run test-web-e2e` - Playwright tests for web UI
- `mise run test-race-cgo` - CGO race tests
- `mise run test-sanitize-cgo` - CGO sanitizer tests

## Dev server and logs

`mise run dev` starts:
- `vtr hub` (coordinator + web UI + WS bridge)
- Vite dev server

Logs:
- `.logs/vtr-hub.log`

Useful commands:
```
tail -f .logs/vtr-hub.log
rg -n "resize" .logs/vtr-hub.log
```

The dev hub binds to `127.0.0.1:8080` by default.

## Resize diagnostics

Set `VTR_LOG_RESIZE=1` to log resize events (enabled in `mise run dev`).

Symptoms:
- Double resizes on load usually mean the client measured twice.
- No-op resizes indicate the client resent an identical size.

## Ghostty logging

Ghostty VT may emit CSI warnings for sequences it ignores. You can silence
Ghostty logs during dev with:

```
GHOSTTY_LOG=false mise run dev
```

## TUI render profiling

Use `vtr tui --profile` to show render FPS/latency in the footer. For automated
baselines, run:

```
vtr tui --profile --profile-duration 10s --profile-dump
```

The command prints a JSON summary on exit (FPS and render timing in ms).

## Memory safety and CGO boundaries

Key invariants for the Ghostty shim:

- The Go wrapper owns the terminal handle and must free it exactly once.
- Snapshot/dump calls allocate memory in the shim; Go must copy and then free it.
- The terminal is not thread-safe; callers must serialize access.

Testing tools:

- `mise run test-race-cgo` for Go race checks near CGO boundaries.
- `mise run test-sanitize-cgo` for ASan/LSan via the shim.

## Release workflow

1. Ensure working tree is clean (`git status`).
2. Update `VERSION` and `CHANGELOG.md`.
3. Run tests: `mise run test`.
4. Commit: `git add VERSION CHANGELOG.md && git commit -m "release: vX.Y.Z"`.
5. Tag: `git tag -a vX.Y.Z -m "vX.Y.Z"`.
6. Build artifacts: `mise run build-multi`.
7. Push: `git push && git push --tags`.

## Agent workflow notes

- Prefer small, testable changes.
- Update docs alongside code changes.
- Use beads for tracking (`br ready`, `br update`, `br close`).
- Run a final check (`git status`, `br sync --flush-only`) before ending a session.
