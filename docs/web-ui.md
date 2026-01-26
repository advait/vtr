# Web UI

## Architecture

The web UI is a browser client backed by a WebSocket bridge in `vtr hub` or `vtr web`.
The bridge forwards gRPC streaming and input using protobuf `Any` frames.

```
Browser
  |  HTTP (static assets + JSON) + WS (stream/input)
  v
vtr hub or vtr web
  |  gRPC
  v
Coordinator (local socket or configured coordinator list)
```

## Endpoints

HTTP:
- `GET /api/sessions` - list sessions by coordinator (debugging/tooling)
- `POST /api/sessions` - spawn session
- `POST /api/sessions/action` - send_key / signal / close / remove / rename

WebSocket:
- `GET /api/ws` - terminal stream + input
- `GET /api/ws/sessions` - live session list updates

## WebSocket protocol (summary)

Frames are protobuf `google.protobuf.Any` messages.

`/api/ws`:
1. Client sends `SubscribeRequest` (Any).
2. Client may send `ResizeRequest`, `SendTextRequest`, `SendKeyRequest`, or `SendBytesRequest` (Any).
3. Server streams `SubscribeEvent` (Any) until session exit or error.

`/api/ws/sessions`:
1. Client sends `SubscribeSessionsRequest` (Any).
2. Server streams `SessionsSnapshot` (Any) whenever the list changes.

Errors are returned as `google.rpc.Status` (Any) and then the socket closes.

## Rendering model

- The server sends structured screen updates (no ANSI parsing in the browser).
- The client applies `ScreenUpdate` keyframes to a grid model.
- Delta updates are supported in the client but are not emitted by the server yet.
- Wide character width uses `wcwidth` to size cells.

## UI stack

- React + Tailwind CSS
- Radix UI primitives
- `lucide-react` icons
- Theme system with Tokyo Night as the default

### Icons

- Use `lucide-react` for icons.
- Default size: 16px (`h-4 w-4`), dense controls can use 12px (`h-3 w-3`).
- Buttons should include `aria-label`; icons should be `aria-hidden`.

### Design notes (not implemented)

An "Actions" menu is a useful pattern for control sequences blocked by browser shortcuts
(Ctrl+W, Cmd+W, etc.). This is a proposal only and is not implemented in the current UI.

## Manual smoke checks

Minimal end-to-end checks:

1. Start hub with web enabled:
   ```bash
   vtr hub --socket /tmp/vtrpc.sock --addr 127.0.0.1:4620
   ```
2. Open `http://127.0.0.1:4620`.
3. Spawn a session:
   ```bash
   vtr agent spawn web-smoke --hub /tmp/vtrpc.sock --cmd "bash"
   ```
4. Attach in the UI and verify:
   - Output renders with correct line breaks.
   - ANSI colors render correctly.
   - Reconnect works after brief offline toggles.
   - Resize updates layout without jitter.

## Debugging tips

- Append `?terminalDebug=1` to the URL to show sizing metrics in the UI.

Screenshots (Playwright):

```bash
cd web
CAPTURE_SCREENSHOTS=1 bunx playwright test web-ui-screenshots.spec.ts
```

Artifacts land in `docs/screenshots/`.
