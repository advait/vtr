# Architecture

## Components

| Component | Role |
| --- | --- |
| Coordinator | Owns PTY sessions, VT engine, and gRPC service |
| Session | One PTY + metadata + scrollback |
| VT Engine | Ghostty VT for screen state and scrollback snapshots |
| CLI / TUI | gRPC clients for automation and interactive use |
| Web UI | Browser client via WebSocket bridge |

## Single-coordinator topology

```
+------------------------------------------------------------+
| Coordinator (vtr hub/spoke)                               |
|  +-----------+  +-----------+  +-----------+              |
|  | Session   |  | Session   |  | Session   |              |
|  | "codex"   |  | "shell"   |  | "build"   |              |
|  | PTY       |  | PTY       |  | PTY       |              |
|  +-----+-----+  +-----+-----+  +-----+-----+              |
|        \\            |            /                        |
|         \\-----------+-----------/                         |
|                     |                                      |
|              +------v------+                               |
|              |  VT Engine  |                               |
|              +------^------+                               |
|                     |                                      |
|              +------v------+                               |
|              |  gRPC API   |                               |
|              +------^------+                               |
+---------------------|--------------------------------------+
                      |
          TCP (+ WebSocket for Web UI)
                      |
      +---------------+---------------+
      |               |               |
      v               v               v
  vtr agent        vtr tui          Web UI
```

## Session lifecycle

```
spawn(name)
  |
  v
+---------+ <-------------------+
| Running |                     |
+----+----+                     |
     |                          |
     | PTY exits                |
     v                          |
+---------+                     |
| Exited  | (still readable, has exit_code)
+----+----+                     |
     |                          |
  rm(name)                      |
     |                          |
     v                          |
+---------+                     |
| Removed |                     |
+---------+                     |
                                |
rm(name) on Running -------------+
(auto-kills PTY first)
```

Key behaviors:
- Sessions persist until explicitly removed.
- `close` sends SIGHUP and schedules SIGKILL after `--kill-timeout` if still running.
- `remove` on a running session kills it first, then deletes it.

## VT engine responsibilities

- Parse PTY output and maintain a structured grid (cells + attributes).
- Maintain scrollback for grep and screen dumps.
- Provide snapshots for `GetScreen` and `Subscribe` keyframes.

Not responsible for:
- Rendering (clients render the grid).
- Recording (planned; `DumpAsciinema` is defined but not implemented).

## Backpressure model (high-level)

- gRPC request/response calls provide natural backpressure.
- Streaming (`Subscribe`) uses a latest-only policy: slow clients drop older frames and receive the newest.
- Keyframes are cached and resent for resync.

## Security model (high-level)

- TCP gRPC requires TLS for non-loopback addresses.
- Token auth can be enabled via config.
