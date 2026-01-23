#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

VERSION=$(git describe --tags --exact-match --match "v*" 2>/dev/null | sed 's/^v//' || cat VERSION)
if [[ -z "$VERSION" ]]; then
  echo "VERSION is empty; set VERSION or tag the repo." >&2
  exit 1
fi

if [[ ! -f web/dist/index.html ]]; then
  echo "web/dist is missing; run 'mise run web-build' first." >&2
  exit 1
fi

if [[ ! -f proto/vtr.pb.go ]]; then
  echo "proto stubs are missing; run 'mise run proto' first." >&2
  exit 1
fi

HOST_OS=$(go env GOOS)

if [[ -n "${VTR_BUILD_TARGETS:-}" ]]; then
  # Space-separated list like "linux/amd64 linux/arm64".
  TARGETS=(${VTR_BUILD_TARGETS})
else
  case "$HOST_OS" in
    linux)
      TARGETS=("linux/amd64" "linux/arm64")
      ;;
    darwin)
      TARGETS=("darwin/amd64" "darwin/arm64")
      ;;
    *)
      echo "Unsupported host OS: $HOST_OS" >&2
      exit 1
      ;;
  esac
fi

hash_file() {
  local file=$1
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" > "${file}.sha256"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" > "${file}.sha256"
  elif command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 "$file" | awk -v f="$file" '{print $2 "  " f}' > "${file}.sha256"
  else
    echo "No SHA256 tool available (sha256sum, shasum, or openssl)." >&2
    exit 1
  fi
}

resolve_zig_target() {
  local target=$1
  case "$target" in
    linux/amd64)
      echo "x86_64-linux-gnu"
      ;;
    linux/arm64)
      echo "aarch64-linux-gnu"
      ;;
    darwin/amd64)
      echo "x86_64-macos"
      ;;
    darwin/arm64)
      echo "aarch64-macos"
      ;;
    *)
      return 1
      ;;
  esac
}

DIST_DIR="$ROOT_DIR/dist"
mkdir -p "$DIST_DIR"

for target in "${TARGETS[@]}"; do
  zig_target=$(resolve_zig_target "$target") || {
    echo "Unsupported target: $target" >&2
    exit 1
  }

  goos=${target%/*}
  goarch=${target#*/}

  echo "==> Building shim for $goos/$goarch ($zig_target)" >&2
  (cd go-ghostty/shim && zig build -Dghostty="${GHOSTTY_ROOT:-../ghostty}" -Dtarget="$zig_target" -Doptimize=ReleaseFast)

  output="$DIST_DIR/vtr-$VERSION-$goos-$goarch"
  echo "==> Building vtr $VERSION for $goos/$goarch" >&2
  env CGO_ENABLED=1 \
    GOOS="$goos" \
    GOARCH="$goarch" \
    CC="zig cc -target $zig_target" \
    CXX="zig c++ -target $zig_target" \
    AR="zig ar" \
    RANLIB="zig ranlib" \
    go build -trimpath -o "$output" -ldflags "-X main.Version=$VERSION" ./cmd/vtr

  hash_file "$output"
  echo "==> Wrote $output" >&2
  echo "==> Wrote ${output}.sha256" >&2
  echo >&2
done

echo "==> Restoring host shim build" >&2
(cd go-ghostty/shim && zig build -Dghostty="${GHOSTTY_ROOT:-../ghostty}")

mkdir -p "$DIST_DIR"
touch "$DIST_DIR/.mise-build-multi.stamp"
