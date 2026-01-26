# Releasing vtr

vtr uses git tags for release versions and a tracked `VERSION` file as the
fallback when HEAD is not tagged.

## Version resolution

`vtr version` reports the build-time `main.Version` value.

Builds resolve the version in this order:

1. If the current commit has an exact git tag matching `v*`, use that tag.
2. Otherwise, use the contents of the `VERSION` file.

Tags are expected to be of the form `vX.Y.Z` (e.g. `v0.0.1`). The `v` prefix is
stripped when embedding into the binary, so `vtr version` prints `0.0.1`.

## Release workflow (vX.Y.Z)

1. Ensure the working tree is clean: `git status` should show no changes.
2. Update `VERSION` with the new version (no leading `v`) and update
   `CHANGELOG.md` with the new version and date.
3. Run tests: `go test ./...` (fix any failures before continuing).
4. Commit the version bump + changelog:
   `git add VERSION CHANGELOG.md && git commit -m "release: vX.Y.Z"`.
5. Tag the release: `git tag -a vX.Y.Z -m "vX.Y.Z"`.
6. Build multi-architecture artifacts: `mise run build-multi`.
7. Push commits and tag: `git push && git push --tags`.

## Local install and verification (optional)

For a quick local install, produce a host-only binary and verify it:

```bash
mise run build
install -d ~/.local/bin && cp bin/vtr ~/.local/bin/vtr
~/.local/bin/vtr version
```

## Notes

- `mise run build-multi` writes versioned binaries to `dist/` and emits
  `.sha256` checksums. Run it on both Linux and macOS (or via a CI matrix) to
  get full platform coverage. The binaries include embedded web assets from
  `web/dist`.
- `mise run build-multi` relies on `mise run proto` and `mise run web-build`
  to prepare generated assets before building.
- `mise run build` still produces a host-only `bin/vtr` for quick local
  development builds.
- If you build from an untagged commit, `vtr version` will report the value in
  `VERSION`.
