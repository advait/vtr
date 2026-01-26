# Clients

## CLI overview

`vtr` is a single binary with multiple commands:

- `vtr hub` - Start a coordinator with optional web UI.
- `vtr spoke` - Start a coordinator that registers with a hub.
- `vtr web` - Serve the web UI against one or more coordinators.
- `vtr tui` - Interactive terminal UI.
- `vtr agent` - JSON-first CLI for automation.
- `vtr setup` - Initialize config + auth material.

## Session addressing

- `vtr agent` targets a single coordinator via `--hub` or config defaults.
- `vtr tui` and `vtr web` can be configured with multiple coordinators and
  accept `coordinator:session` syntax when ambiguous.

## Agent CLI

Common commands:

```
vtr agent ls
vtr agent spawn <name> [--cmd "..."] [--cwd /path]
vtr agent info <name>
vtr agent screen <name> [--json] [--ansi]
vtr agent grep <name> <pattern> [-A/-B/-C lines]
vtr agent send <name> <text>
vtr agent key <name> <key>
vtr agent raw <name> <hex>
vtr agent resize <name> <cols> <rows>
vtr agent wait <name> <pattern> [--timeout 30s]
vtr agent idle <name> [--idle 5s] [--timeout 30s]
```

`vtr agent` defaults to JSON output for most commands, with plain-text output
for `screen` unless `--json` is provided.

Screen output options:
- `vtr agent screen` returns plain text by default.
- `--json` returns structured cells.
- `--ansi` returns ANSI-styled text.

## TUI

- `vtr tui [session]` attaches to a session with a live viewport.
- Uses `Subscribe` for streaming screen updates.
- Input is forwarded with `SendBytes` and `SendKey`.
- Leader key: `Ctrl+b` (shows hints in the footer).

Common leader actions:
- Create session
- Detach
- Kill session
- Next/previous session
- Session picker

## Web UI

- Served by `vtr hub` (when web is enabled) or `vtr web`.
- Uses WebSocket bridge endpoints for streaming and input.
- Uses HTTP JSON endpoints for session list and lifecycle actions.

See `docs/web-ui.md` for details.
