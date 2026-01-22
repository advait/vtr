# vtr

![vtr logo](docs/assets/logo-vtr.png)

vtr (short for vtrpc) is a terminal multiplexer for the agent era. It supports:

- Headless [ghosty](https://mitchellh.com/writing/libghostty-is-coming) vt that exposes screen state
  via gRPC
- Multi-client terminal control including Web UI, TUI, and agent-first CLI
- Ability to run multiple coordinators (terminal engines) on different machines, VMs, and docker
  containers and control them all centrally from any client

## Quickstart

```bash
# Figure out how to get a vtr binary
# TODO

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

The `vtr agent` CLI outputs JSON, making it easy to script terminal automation:

```bash
# Spawn a session and wait for the shell prompt
vtr agent spawn build
vtr agent wait build '\$ '

# Run a command and wait for it to complete (idle = no output for 5s)
vtr agent send build 'make test\n'
vtr agent idle build --timeout 120s

# Search scrollback for results
vtr agent grep build 'FAIL|PASS' -A 3

# Get the current screen state as structured JSON
vtr agent screen build | jq '.rows[].cells[].char' -j
```

Blocking operations like `wait` and `idle` are what make vtr agent-friendly - no polling loops
or sleep hacks required.

## Hub/Spoke Federation

Run coordinators on multiple machines and control them all from a single client:

```bash
# On the hub machine (central control + web UI)
vtr hub --grpc-addr 0.0.0.0:4621 --web-addr 0.0.0.0:4620

# On container/VM A
vtr spoke --hub hub.internal:4621 --name container-a

# On container/VM B
vtr spoke --hub hub.internal:4621 --name container-b

# From any client: list all sessions across all coordinators
vtr agent ls --hub hub.internal:4621

# Address sessions explicitly when names collide
vtr agent screen container-a:shell
vtr agent screen container-b:shell
```

The web UI at `http://hub.internal:4620` shows a tree view of all coordinators and their sessions.

## Roadmap

| Status     | Milestone | Features                                                                |
| ---------- | --------- | ----------------------------------------------------------------------- |
| ✅ Done    | M3-M5     | Core server, gRPC API, PTY management, `WaitFor`, `WaitForIdle`, `Grep` |
| ✅ Done    | M6        | TUI with Bubbletea, Subscribe streaming, leader key bindings            |
| ✅ Done    | M7        | Web UI (React + shadcn/ui), WebSocket bridge, multi-coordinator tree    |
| 🚧 Next    | M8        | Mouse support (track mode, `SendMouse` RPC)                             |
| 📋 Planned | P2        | Session recording (`DumpAsciinema` RPC), playback in web UI             |

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
