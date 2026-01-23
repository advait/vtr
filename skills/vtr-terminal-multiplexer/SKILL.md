---
name: vtr-terminal-multiplexer
description: Operate the vtr/vtrpc terminal multiplexer (hub/spoke/tui/agent) and manage sessions. Use when asked to spawn sessions, send input, wait/idle, inspect screens, configure hub/spoke, or troubleshoot vtr usage. Prefer using vtr --help and vtr agent --help to discover exact flags and subcommands.
---

# VTR Terminal Multiplexer

## Overview

Use vtr to manage headless terminal sessions with CLI, TUI, and Web UI. Keep this skill lean and defer to built-in help output for current flags and subcommands.

## Quick Start (help-first)

- Run `vtr --help` and `vtr agent --help` to discover available commands.
- For any command, run `vtr <cmd> --help` or `vtr agent <subcmd> --help` before usage.
- If initial setup is required, run `vtr setup` (confirm flags via help).

## Core Workflows

1. Start a coordinator:
   - `vtr hub` for local hub + Web UI.
   - `vtr spoke --hub <addr> --name <name>` to join a hub.
2. Manage sessions with `vtr agent`:
   - Use `ls`, `spawn`, `send`, `screen`, `wait`, `idle`, and `grep`.
   - Prefer `wait`/`idle` instead of polling loops.
3. Address sessions across coordinators using `coordinator:session` when names collide.

## When in Doubt

- Read `README.md` and `docs/*.md` for architectural context.
- Re-run help commands to confirm flags and defaults before executing actions.
