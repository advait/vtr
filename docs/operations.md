# Operations

This doc covers configuration, runtime flags, and deployment-level behavior.

## Configuration

Config file: `$VTRPC_CONFIG_DIR/vtrpc.toml` (default: `~/.config/vtrpc/vtrpc.toml`).

```toml
[hub]
grpc_socket = "/var/run/vtrpc.sock"
addr = "127.0.0.1:4620"   # unified gRPC + web listener
web_enabled = true
coordinator_enabled = true

[auth]
mode = "both"            # token, mtls, or both
token_file = "~/.config/vtrpc/token"
ca_file = "~/.config/vtrpc/ca.crt"
cert_file = "~/.config/vtrpc/client.crt"
key_file = "~/.config/vtrpc/client.key"

[server]
cert_file = "~/.config/vtrpc/server.crt"
key_file = "~/.config/vtrpc/server.key"
```

`vtr setup` writes a local hub config and generates auth material (0600 for keys/tokens).

## Hub runtime

```
vtr hub [--socket /path/to.sock] [--addr 127.0.0.1:4620] [--no-web] [--no-coordinator]
        [--shell /bin/bash] [--cols 80] [--rows 24] [--scrollback 10000]
        [--kill-timeout 5s] [--idle-threshold 5s]
```

Notes:
- `--addr` is a single listener for gRPC + web.
- `--no-web` disables the Web UI while keeping the coordinator active.
- `--no-coordinator` (or `hub.coordinator_enabled = false`) runs the hub as an
  aggregator only; local sessions are disabled and requests must target a spoke.

## Spoke runtime

```
vtr spoke --hub host:4621 [--name spoke-a]
         [--serve-socket --socket /path/to.sock]
         [--grpc-addr 127.0.0.1:4621]
```

Behavior:
- By default, a spoke registers to the hub and opens a tunnel for hub-initiated RPCs (no local listener required).
- Use `--serve-socket` to expose a local Unix socket for direct access.
- Use `--grpc-addr` to expose TCP gRPC (disabled by default).

## Auth

- Unix sockets: access is controlled by filesystem permissions.
- TCP gRPC: TLS is required for non-loopback addresses.
- Token auth is enabled via `auth.mode` and is required when configured.

## Idle behavior

- The coordinator marks sessions idle after `IdleThreshold` (default 5s).
- `--idle-threshold` is available on both `vtr hub` and `vtr spoke`.
- `SessionIdle` events are emitted on `Subscribe` when the idle threshold is crossed.
- `WaitForIdle` is a separate blocking RPC that waits for output silence.
