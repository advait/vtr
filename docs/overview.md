# Overview

vtr (short for vtrpc) is a headless terminal multiplexer designed for agents and tooling.
Each coordinator owns PTY sessions and a terminal emulator (Ghostty VT). Clients use gRPC
(or a WebSocket bridge) to query screen state, search output, and send input.

**Core idea:** clients do not need full-frame video streaming. They need consistent,
queryable terminal state and reliable input delivery.

## What vtr provides

- Structured screen state (cells with colors/attrs) over gRPC.
- Blocking operations for agents (`WaitFor`, `WaitForIdle`) without polling.
- A TUI (`vtr tui`) and a Web UI for interactive viewing.
- Optional hub/spoke registration (spokes can register to a hub; proxying is future work).

## System sketch

```
PTYs -> Coordinator -> gRPC (Unix/TCP) -> CLI/TUI
                    -> WebSocket bridge -> Web UI
```

## Next reads

- `docs/architecture.md` for components and lifecycle.
- `docs/operations.md` for config and runtime.
- `docs/protocols.md` for the API contract.
