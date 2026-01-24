# Releasing vtr

This repo uses git tags and a tracked `VERSION` file to set the binary version.

## Release Checklist (vX.Y.Z)

1. Commit all outstanding changes.
2. Update `VERSION` with the new version (no leading `v`).
3. Run tests: `go test ./...`.
4. Fix any test failures.
5. Build the release binary: `go build -o bin/vtr ./cmd/vtr`.
6. Update `CHANGELOG.md` with the new version and date.
7. Commit the version bump + changelog.
8. Tag the release: `git tag -a vX.Y.Z -m "vX.Y.Z"`.
9. Push commits and tag: `git push && git push --tags`.
10. Install the binary locally (optional): `install -d ~/.local/bin && cp bin/vtr ~/.local/bin/vtr`.
11. Verify: `~/.local/bin/vtr version`.

## Notes

- Release tags must be of the form `vX.Y.Z`.
- The binary version is resolved from the tag if the current commit is tagged; otherwise it uses the `VERSION` file.
