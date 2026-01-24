---
name: vtr-terminal-multiplexer
description: Operate the vtr/vtrpc terminal multiplexer to manage headless terminal sessions and drive coding agents (Codex, Claude Code, etc). Use when asked to spawn sessions, send commands, check session screens, interact with coding agents inside containers, or manage vtr hub/spoke infrastructure. Triggers on: vtr, terminal sessions, codex session, agent send, screen check, spawn session, coding agent interaction.
---

# VTR Terminal Multiplexer

## Overview

VTR is a headless terminal multiplexer with hub/spoke architecture, providing CLI (`vtr agent`), TUI (`vtr tui`), and Web UI interfaces. Use it to manage terminal sessions and drive coding agents remotely.

## Hub Discovery

There may be multiple hubs running simultaneously (e.g., one for vtr development, one stable hub for production work). **Determine the correct hub from context** — the user's request, the channel, or prior conversation will indicate which hub/container to target.

**Common hub locations:**
- Host: `localhost:8080` or unix socket `/tmp/vtrpc.sock`
- Container: `docker exec <container> vtr agent --hub localhost:8080 ...`
- Remote spoke: `hub-host:8080`

When the hub is inside a container, **always prefix commands with `docker exec <container>`**.

**Which vtr binary to use:**
- Container hub → use the binary inside that container (`bin/vtr` or the go-built binary)
- Host hub → use the host-installed `vtr` binary
- Different hubs may run different vtr versions; use the binary matching the hub

## Agent CLI Reference

All agent commands follow: `vtr agent <subcommand> --hub <addr> <session> [args]`

### List Sessions
```bash
vtr agent ls --hub localhost:8080
# Returns JSON: sessions with name, status, cols, rows, created_at
```

### Spawn a Session
```bash
vtr agent spawn --hub localhost:8080 my-session
vtr agent spawn --hub localhost:8080 my-session --cmd "bash" --cols 130 --rows 63
```

### Send Text to Session
```bash
# IMPORTANT: Include trailing \n to submit the command!
vtr agent send --hub localhost:8080 my-session "ls -la\n"

# Without \n, text appears at prompt but is NOT submitted
# The CLI will warn: "warning: text does not end with newline; input will not be submitted."
```

**Newline behavior:** The server converts `\n` → `\r` (carriage return / Enter keypress) in the PTY. Always end text with `\n` unless you intentionally want to type without submitting.

### Send Special Keys
```bash
vtr agent key --hub localhost:8080 my-session enter
vtr agent key --hub localhost:8080 my-session tab
vtr agent key --hub localhost:8080 my-session ctrl-c
```

### Read Screen Contents
```bash
# Plain text (default)
vtr agent screen --hub localhost:8080 my-session

# With ANSI colors
vtr agent screen --hub localhost:8080 my-session --ansi

# Structured JSON
vtr agent screen --hub localhost:8080 my-session --json
```

### Wait for Pattern
```bash
# Wait for output matching a pattern (regex)
vtr agent wait --hub localhost:8080 --timeout 60s my-session "Worked for"
vtr agent wait --hub localhost:8080 --timeout 30s my-session "context left"
```

### Wait for Idle
```bash
# Wait until session has no output for N seconds
vtr agent idle --hub localhost:8080 --timeout 60s --idle 5s my-session
```

### Search Scrollback
```bash
vtr agent grep --hub localhost:8080 my-session "error" --context 3
```

## Driving Coding Agents

### Starting a Coding Agent

```bash
# Spawn a session and start codex
vtr agent spawn --hub localhost:8080 codex-1 --cmd "codex" --cols 130 --rows 63

# Or send to existing shell session:
vtr agent send --hub localhost:8080 shell-1 "codex\n"
```

### Sending Prompts to Coding Agents

**Two submission modes:**

| Key | Behavior | When to use |
|-----|----------|-------------|
| Enter (`\n`) | Send immediately, interrupts current work | Urgent queries, idle agents |
| Tab | Queue message for next agent stop | Agent is busy, non-urgent follow-ups |

**Use queueing (Tab) strategically:**
- Agent is mid-task → queue with Tab so it finishes current work first
- Agent is idle at prompt → send immediately with Enter
- Multiple follow-up instructions → queue them, agent processes in order

**Codex (OpenAI):**
- The `›` prompt accepts input
- Long text shows as `[Pasted Content N chars]` — this is normal
- After submission, wait for `"context left"` pattern to know it's done

```bash
# Send immediately (agent is idle)
vtr agent send --hub $HUB $SESSION "Run git status and show me the output\n"

# Queue for next stop (agent is busy working)
vtr agent send --hub $HUB $SESSION "After that, also check for lint errors"
vtr agent key --hub $HUB $SESSION tab

# Wait for completion
vtr agent wait --hub $HUB --timeout 120s $SESSION "context left"

# Read the response
vtr agent screen --hub $HUB $SESSION | tail -40
```

**Claude Code:**
- Similar pattern, uses Enter to submit
- Wait for the prompt indicator to reappear

### Complete Interaction Pattern

```bash
HUB="localhost:8080"
SESSION="codex-1"

# 1. Send the prompt (with trailing newline!)
vtr agent send --hub $HUB $SESSION "Is git clean? Run git status.\n"

# 2. Wait for completion
vtr agent wait --hub $HUB --timeout 90s $SESSION "context left"

# 3. Read the result
vtr agent screen --hub $HUB $SESSION | grep -v "^$" | tail -30
```

### Detecting Session State

Check if a coding agent is busy or idle:
```bash
SCREEN=$(vtr agent screen --hub $HUB $SESSION)

# Codex is idle when you see the › prompt with "context left"
echo "$SCREEN" | tail -5 | grep -q "context left" && echo "IDLE" || echo "BUSY"
```

## Tips & Gotchas

### Always Include Trailing Newline
When sending commands to shells or coding agents, **always append `\n`** to your text. Without it, the text sits at the prompt without being submitted.

```bash
# ✅ Correct - command is submitted
vtr agent send --hub $HUB $SESSION "git status\n"

# ❌ Wrong - text just appears, not submitted
vtr agent send --hub $HUB $SESSION "git status"
```

### Coding Agent Quirks
- **Codex** may show `[Pasted Content N chars]` for long inputs — this is normal
- **Codex** with `--dangerously-bypass-approvals-and-sandbox` runs autonomously
- Check the `--dangerously-bypass-approvals-and-sandbox` flag isn't double-set (env var + CLI arg)
- **Tab queues** a message for the next agent stop — use when the agent is mid-task
- **Enter sends** immediately — use when the agent is idle or you need to interrupt

### Container Context
When hub is in a container, all `vtr agent` commands must be docker-exec'd:
```bash
docker exec <container> bash -c 'cd /path/to/vtrpc && bin/vtr agent ls --hub localhost:8080'
```

### Polling vs Waiting
Prefer `wait` and `idle` over manual sleep+screen polling:
```bash
# ✅ Efficient - blocks until pattern appears
vtr agent wait --hub $HUB --timeout 60s $SESSION "pattern"

# ❌ Wasteful - sleep loops
sleep 10 && vtr agent screen --hub $HUB $SESSION | grep "pattern"
```

### Screen Output Filtering
Screen output includes the full terminal buffer. Filter for useful content:
```bash
# Skip blank lines, get last N lines
vtr agent screen --hub $HUB $SESSION | grep -v "^$" | tail -30

# Get structured JSON for programmatic parsing
vtr agent screen --hub $HUB $SESSION --json | jq '.cells'
```

## Hub/Spoke Architecture

- **Hub**: Central coordinator, runs Web UI, manages sessions
- **Spoke**: Remote coordinator connecting to a hub, runs its own sessions
- Sessions addressed as `coordinator:session-name` when names collide across spokes

```bash
# Start hub
vtr hub --socket /tmp/vtrpc.sock --addr 0.0.0.0:8080

# Start spoke connecting to hub
vtr spoke --hub hub-host:8080 --name my-machine
```

## Evolution

This skill is a living document. As the vtr workflow stabilizes (multi-hub setups, spoke federation, container orchestration patterns), update this file with new learnings. The goal: be able to say "vtr codex2 ask what the open beads are" and have it Just Work™.

## When to Use This Skill

- User asks to interact with a terminal session or coding agent
- User mentions vtr, vtrpc, terminal multiplexer
- User wants to send commands to a running Codex/Claude session
- User asks what's running in sessions
- User wants to spawn new sessions or check session state
