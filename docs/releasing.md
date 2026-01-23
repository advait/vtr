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

## Release workflow

1. Update `VERSION`.
2. Commit the change.
3. Create an annotated tag for the release.
4. Build the release artifacts.

Example:

```bash
echo "0.0.1" > VERSION
git add VERSION
git commit -m "release: v0.0.1"
git tag -a v0.0.1 -m "v0.0.1"

mise run build-multi
```

`mise run build-multi` writes versioned binaries to `dist/` and emits
`.sha256` checksums. Run it on both Linux and macOS (or via a CI matrix) to
get full platform coverage. The binaries include embedded web assets from
`web/dist`.

## Notes

- `mise run build` still produces a host-only `bin/vtr` for quick local
  development builds.
- `mise run build-multi` relies on `mise run proto` and `mise run web-build`
  to prepare generated assets before building.
- If you build from an untagged commit, `vtr version` will report the value in
  `VERSION`.
