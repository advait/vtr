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

- `vtr agent` targets a coordinator via `--hub` or config defaults and accepts
  `coordinator:session` to route commands through a hub with multiple
  coordinators.
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
vtr agent send <name> <text> [--submit]
vtr agent key <name> <key>
vtr agent raw <name> <hex>
vtr agent resize <name> <cols> <rows>
vtr agent wait <name> <pattern> [--timeout 30s]
vtr agent idle <name> [name...] [--idle 5s] [--timeout 30s]
```

`vtr agent` defaults to JSON output for most commands, with plain-text output
for `screen` unless `--json` is provided.

Screen output options:
- `vtr agent screen` returns plain text by default.
- `--json` returns structured cells.
- `--ansi` returns ANSI-styled text.

Input helpers:
- `vtr agent send --submit` sends Enter after the text (use when the text has no newline).

`vtr agent idle` accepts multiple session names and returns as soon as any session
goes idle. JSON output includes `idle_sessions` for the sessions that became idle.

## TUI

- `vtr tui [session]` attaches to a session with a live viewport.
- Uses `Subscribe` for streaming screen updates.
- Input is forwarded with `SendBytes` and `SendKey`.
- Leader key: `Ctrl+b` (shows hints in the footer).

Common leader actions:
- Create session
- Rename session
- Detach
- Kill session
- Next/previous session
- Session picker

## Web UI

- Served by `vtr hub` (when web is enabled) or `vtr web`.
- Uses WebSocket bridge endpoints for streaming and input.
- Uses HTTP JSON endpoints for session list and lifecycle actions.

See `docs/web-ui.md` for details.
