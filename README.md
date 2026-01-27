# vtr

![vtr logo](docs/assets/logo-vtr.png)

vtr (short for vtrpc) is a terminal multiplexer for the agent era. It supports:

- Headless [ghostty](https://mitchellh.com/writing/libghostty-is-coming) VT that exposes screen state
  via gRPC
- Multi-client terminal control including Web UI, TUI, and agent-first CLI
- Ability to run multiple coordinators (terminal engines) on different machines, VMs, and docker
  containers; spokes register to a hub and the hub proxies requests via tunnel

> ⚠️ **Alpha software** - vtr is under active development and not yet ready for production
> workloads. APIs may change, and there will be bugs. Use at your own risk.

## Quickstart

```bash
# Build a vtr binary
gh repo clone advait/vtr
cd vtr
mise trust
mise install
mise run build
cp ./bin/vtr $HOME/.local/bin/vtr

# Setup configuration and keys
vtr setup

# Run hub (coordinator + web ui)
vtr hub

# Access the web UI at http://127.0.0.1:4620
open http://127.0.0.1:4620

# Attach a TUI
vtr tui

# Send commands to a session via CLI
vtr agent spawn my-session-name
vtr agent send my-session-name $'codex\n'
vtr agent send my-session-name $'Controlling codex through CLI!\n'

# See the results in both Web UI and TUI!
```

## Screenshots

![vtr hero](docs/assets/hero-vtr.png)

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                    Coordinator (vtr hub/spoke)                     │
│                                                                    │
│       ┌───────────┐    ┌───────────┐    ┌───────────┐              │
│       │  Session  │    │  Session  │    │  Session  │              │
│       │  "codex"  │    │  "shell"  │    │  "build"  │              │
│       │    PTY    │    │    PTY    │    │    PTY    │              │
│       └─────┬─────┘    └─────┬─────┘    └─────┬─────┘              │
│             │                │                │                    │
│             └────────────────┼────────────────┘                    │
│                              │                                     │
│                              ▼                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                         VT Engine                             │ │
│  │            (libghostty-vt via go-ghostty shim)                │ │
│  │         Screen State - Scrollback - Cursor - Attrs            │ │
│  └───────────────────────────┬───────────────────────────────────┘ │
│                              │                                     │
│  ┌───────────────────────────┴───────────────────────────────────┐ │
│  │                         gRPC Server                           │ │
│  │   Spawn - List - GetScreen - SendText - WaitFor - Subscribe   │ │
│  └───────────────────────────┬───────────────────────────────────┘ │
│                              │                                     │
└──────────────────────────────┼─────────────────────────────────────┘
                               │
            Unix Socket or TCP │ (+ WebSocket for Web UI)
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
  ┌───────────┐          ┌───────────┐          ┌───────────┐
  │ vtr agent │          │  vtr tui  │          │  Web UI   │
  │   (CLI)   │          │           │          │ (browser) │
  └───────────┘          └───────────┘          └───────────┘
```

## Agent Examples

The `vtr agent` CLI defaults to plain-text screen output, with JSON available for scripting:

```bash
# Spawn a session and wait for the shell prompt
vtr agent spawn build
vtr agent wait build '\$ '

# Run a command and wait for it to complete (idle = no output for 5s)
vtr agent send build 'make test\n'
vtr agent idle build --timeout 120s

# Search scrollback for results
vtr agent grep build 'FAIL|PASS' -A 3

# Get the current screen as structured JSON
vtr agent screen --json build | jq '.rows[].cells[].char' -j

# Get the current screen as plain text (default)
vtr agent screen build
```

Blocking operations like `wait` and `idle` are what make vtr agent-friendly - no polling loops
or sleep hacks required.

## Hub/Spoke Federation

Spokes connect to the hub via a tunnel; the hub proxies requests and aggregates
session lists so clients can use the hub as a single entry point.

```bash
# On the hub machine (central control + web UI)
vtr hub --addr 127.0.0.1:4620

# On container/VM A
vtr spoke --hub hub.internal:4620 --name container-a

# On container/VM B
vtr spoke --hub hub.internal:4620 --name container-b
```

For a multi-coordinator web UI, point `vtr web` at the hub (recommended) or pass
multiple coordinators directly:

```bash
vtr web --coordinator /path/to/a.sock --coordinator /path/to/b.sock
```

Note: non-loopback gRPC addresses require TLS and token auth; see `docs/operations.md`.

## Docs

See `docs/README.md` for the structured documentation set.

## Comparison vs other terminal multiplexers

### vtr vs tmux

| Aspect                  | tmux                                        | vtr                                          |
| ----------------------- | ------------------------------------------- | -------------------------------------------- |
| **Primary audience**    | Humans                                      | AI agents (with human UIs too)               |
| **API**                 | Text commands (`send-keys`, `capture-pane`) | Structured gRPC with typed messages          |
| **Screen state**        | Text dump, must parse ANSI yourself         | Structured grid with colors/attrs pre-parsed |
| **Blocking operations** | None - poll and parse yourself              | `WaitFor` (regex), `WaitForIdle` (silence)   |
| **Output format**       | Human-readable text                         | JSON (CLI), protobuf (gRPC)                  |
| **Multi-machine**       | SSH + tmux per host                         | Hub/spoke federation built-in                |
| **Web UI**              | Third-party tools needed                    | Built-in, first-class                        |
| **VT engine**           | Custom                                      | libghostty (Ghostty's Zig core)              |

### vtr vs VibeTunnel

Huge shoutout to [VibeTunnel](https://github.com/vibetunnel/vibetunnel) for inspiring the
architecture and design of vtr. vtr diverges in several key ways:

| Aspect                  | VibeTunnel                                 | vtr                                        |
| ----------------------- | ------------------------------------------ | ------------------------------------------ |
| **Multi-machine**       | Single machine + tunnels (ngrok/Tailscale) | Hub/spoke federation built-in              |
| **Screen state**        | Client parses ANSI (ghostty-web)           | Server-parsed, structured grid via gRPC    |
| **Blocking operations** | None - poll yourself                       | `WaitFor` (regex), `WaitForIdle` (silence) |
| **Scrollback search**   | Not available                              | `Grep` RPC with regex                      |
| **API**                 | REST + WebSocket                           | gRPC with typed protobuf                   |

## Acknowledgments

vtr is inspired by and built with the help of some incredible projects:

- [ghostty-org/ghostty](https://github.com/ghostty-org/ghostty) - The VT engine powering vtr's terminal emulation
- [Dicklesworthstone/ntm](https://github.com/Dicklesworthstone/ntm) - Pushing the boundaries of agent-controlled tmux sessions
- [clawdbot/clawdbot](https://github.com/clawdbot/clawdbot) - Friendly agent driver that motivated advait to build vtr
- [charmbracelet/bubbletea](https://github.com/charmbracelet/bubbletea) - Fantastic TUI library powering `vtr tui`
