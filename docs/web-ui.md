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
Coordinator (hub over TCP)
```

`/api/ws/sessions` is a thin proxy over the hub's `SubscribeSessions` stream; it
does not aggregate per-coordinator state itself.

## Endpoints

HTTP:
- `GET /api/sessions` - list sessions by coordinator (debugging/tooling, sourced from session snapshots)
- `POST /api/sessions` - spawn session
- `POST /api/sessions/action` - send_key / signal / close / remove / rename

WebSocket:
- `GET /api/ws` - terminal stream + input
- `GET /api/ws/sessions` - live session list updates

## WebSocket protocol (summary)

Frames are protobuf `google.protobuf.Any` messages.

`/api/ws`:
1. Client sends `SubscribeRequest` (Any) with `session.id` (stable UUID) and optional `session.coordinator`.
2. Client may send `ResizeRequest`, `SendTextRequest`, `SendKeyRequest`, or `SendBytesRequest` (Any).
3. Server streams `SubscribeEvent` (Any) until session exit or error.

`/api/ws/sessions`:
1. Client sends `SubscribeSessionsRequest` (Any).
2. Server streams `SessionsSnapshot` (Any) whenever the list changes.

Errors are returned as `google.rpc.Status` (Any) and then the WebSocket closes.
The server closes stream sockets with a policy-violation close code and a short reason string after sending the status frame.

### Session identity

- `Session.id` is the stable UUID; `Session.name` is a mutable label.
- For hubs with multiple coordinators, set `SubscribeRequest.session.coordinator` to route to the right coordinator.

## Rendering model

- The server sends structured screen updates (no ANSI parsing in the browser).
- The client applies keyframes and deltas to a grid model with frame-chain checks.
- If a delta base frame does not match, the client resubscribes to recover from a fresh keyframe.
- Wide character width uses `wcwidth` to size cells.

## Stream status labels

- `connecting` and `reconnecting` are shown while subscribe is being (re)established.
- `connected` means the socket is open but no recent screen frame has arrived.
- `connected+receiving` means a screen frame arrived within the recent receive window.
- `error` and `closed` are terminal/non-streaming states until reconnect.

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
   vtr hub --addr 127.0.0.1:4620
   ```
2. Open `http://127.0.0.1:4620`.
3. Spawn a session:
   ```bash
   vtr agent spawn web-smoke --hub 127.0.0.1:4620 --cmd "bash"
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
