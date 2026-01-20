# Web UI Smoke Tests (Manual)

Minimal manual checks for the end-to-end pipeline: ANSI bytes -> coordinator
screen -> web render. These steps are intentionally lightweight and can be run
without dedicated test tooling.

## Preconditions

- `vtr` binary available (use `go run ./cmd/vtr` from repo root).
- `web/dist` exists (run `cd web && bun install && bun run build` if needed).

## Build and Run

```bash
cd web
bun install
bun run build

cd ..
go run ./cmd/vtr serve --socket /tmp/vtr.sock
go run ./cmd/vtr web --socket /tmp/vtr.sock --listen 127.0.0.1:8080
```

## Setup

1. Start a coordinator:

```bash
go run ./cmd/vtr serve --socket /tmp/vtr.sock
```

2. Start the web UI:

```bash
go run ./cmd/vtr web --socket /tmp/vtr.sock --listen 127.0.0.1:8080
```

3. Open `http://127.0.0.1:8080`.
4. Create a session:

```bash
go run ./cmd/vtr spawn web-smoke --socket /tmp/vtr.sock --cmd "bash"
```

5. Attach to `web-smoke` in the UI (tree or attach input).

## Smoke Cases

### 1) Streamed text and cursor

- In the web input bar, run:

```bash
echo "hello from vtr"
printf "line1\nline2\n"
```

Expected: text renders in the web terminal within ~250ms, with correct line
breaks and cursor placement.

### 2) ANSI color + attribute checks

Run the following in the session (web input bar or via `vtr send`):

```bash
printf '\x1b[31mRED\x1b[0m normal\n'
printf '\x1b[42mGREEN_BG\x1b[0m normal\n'
printf '\x1b[1mBOLD\x1b[0m \x1b[4mUNDER\x1b[0m \x1b[3mITALIC\x1b[0m \x1b[2mFAINT\x1b[0m\n'
printf '\x1b[7mINVERSE\x1b[0m \x1b[9mSTRIKE\x1b[0m \x1b[53mOVERLINE\x1b[0m\n'
printf '\x1b[38;2;255;105;180mRGB_PINK\x1b[0m \x1b[48;2;10;20;30mRGB_BG\x1b[0m\n'
```

Expected: colors and attributes are visually correct (foreground/background,
bold, italic, underline, faint opacity, inverse swap, strike, overline).

### 3) Reconnect and resync

1. With the session attached, open browser devtools and toggle "Offline" for
   5-10 seconds, then toggle back online.
2. Confirm the UI transitions through reconnecting and returns to live.
3. Run `echo "after reconnect"` in the session.

Expected: UI reconnects automatically, the terminal remains consistent, and new
output appears without missing or duplicated lines.

### 4) Resize handling

- Resize the browser window (narrow and wide).

Expected: the terminal resizes without layout jumps, and new output continues
to render correctly.

### 5) Session exit

- Run `exit` in the session.

Expected: UI shows the session as exited and disables input.

## Screenshots

- Capture with Playwright:

```bash
cd web
CAPTURE_SCREENSHOTS=1 bunx playwright test web-ui-screenshots.spec.ts
```

Artifacts are stored in `docs/screenshots/`:
- `docs/screenshots/web-ui-mobile-390.png`
- `docs/screenshots/web-ui-desktop-1280.png`

## Known Limitations (M7)

- Web UI does not spawn/kill/remove sessions; it only attaches to existing ones.
- Scrollback streaming is not implemented (keyframes only).
- Mouse input is not supported.
