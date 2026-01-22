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
4. Build the binary.

Example:

```bash
echo "0.0.1" > VERSION
git add VERSION
git commit -m "release: v0.0.1"
git tag -a v0.0.1 -m "v0.0.1"

mise run build
```

The release binary is written to `bin/vtr` and includes embedded web assets
from `web/dist`.

## Notes

- `mise run build` already runs the web build before `go build`, so the
  resulting binary is a single executable with packaged web UI assets.
- If you build from an untagged commit, `vtr version` will report the value in
  `VERSION`.
