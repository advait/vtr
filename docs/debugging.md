# Debugging Running vtr

This guide explains where runtime logs go, what they mean, and how to
triage UI/server issues quickly. Keep it up to date as new diagnostics
are added.

## Dev setup + logs

`mise run dev` starts:
- `vtr serve` (coordinator, gRPC)
- `vtr web` (websocket bridge + dev proxy)
- `vite` dev server

The dev tasks tee logs into `.logs/`:
- `.logs/vtr-serve.log`
- `.logs/vtr-web.log`

Useful commands:
```bash
tail -f .logs/vtr-serve.log
tail -f .logs/vtr-web.log
rg -n "resize" .logs/vtr-*.log
```

## Resize logs (VTR_LOG_RESIZE)

When `VTR_LOG_RESIZE=1` is set (enabled in `mise run dev`):
- Web bridge logs:
  - `resize web session=<name> cols=<c> rows=<r>`
- gRPC server logs:
  - `resize grpc name=<name> cols=<c> rows=<r> prev=<oldC>x<oldR> peer=<addr>`

These are essential for diagnosing "jitter" or repeated resizes:
- **Double resizes** on page load usually mean the client measured twice.
- **No-op resizes** (same `prev` size) indicate the client resent a size it
  already applied.

If you need to disable resize spam temporarily, turn off the web UI
setting "Auto-resize terminal".

## CSI warnings from Ghostty

You may see warnings like:
- `warning(stream): ignoring CSI 22/23 t with extra parameters`
- `warning(stream): unknown CSI m with intermediate`

These come from the Ghostty VT parser when apps emit sequences it doesn't
implement. They are not necessarily errors.

If they are too noisy, you can silence Ghostty logging via:
```bash
GHOSTTY_LOG=false mise run dev
```

## Web UI debug overlay

Append `?terminalDebug=1` to the web URL to show live sizing metrics:
- container vs inner size
- grid size
- cell size
- cols/rows and "fit" cols/rows

This is useful for identifying pixel rounding or font metrics issues.

## Quick health checks

From the browser console:
```js
fetch("/api/sessions").then(r => r.json())
```

From the shell:
```bash
curl http://localhost:8080/api/sessions
```

Confirm the session is running and the size matches your expectations.

## Guidance for future agents

When debugging a running system:
1. Start with `.logs/` to see if the server is already telling you the story.
2. Correlate **web resize logs** with **gRPC resize logs**.
3. Use `?terminalDebug=1` to verify the UI's measurements.
4. Verify session state with `/api/sessions`.
5. If behavior differs across machines, compare DPI/font metrics.

### Proactive improvements to suggest

Agents should proactively propose:
- Structured logging (JSON) with per-request IDs.
- Per-session rate limiting or debounced resize handling server-side.
- Suppression of no-op resizes.
- Metrics/telemetry endpoint (resize counts per session, last resize time).
- A UI toggle or debug panel for logging and size diagnostics.
- A dedicated "debug bundle" command that snapshots logs + config.
