# Changelog

All notable changes to this project will be documented in this file.

## v0.0.6 - 2026-02-02
- Tracing: add hub JSONL sink with spoke spooling and tunnel propagation; JSONL-only sink with named spool files.
- CLI/agent: `idle` supports multiple sessions and optional `--screen` snapshots; accept `coordinator:session` refs; document `send --submit`.
- TUI: session rename workflow plus configurable spinner and status icons (including idle state).
- Web UI: fix canvas text baseline alignment and clear rename modal input after use.
- Docs/diagrams: add hub/spoke data flow diagram and tracing strategy/consumer docs.
- Networking: prevent tunnel backpressure stalls.

## v0.0.5 - 2026-01-28
- API: require `SessionRef.id` for session operations; `name` lookup is removed.
- Routing: support coordinator-aware session refs for hubs.
- Web + docs: update protobuf shapes and protocol docs to use `SessionRef`.
- Tests: refresh gRPC coverage for the new session ref requirements.

## v0.0.4 - 2026-01-27
- Federation: make tunnel the canonical federation path and add hub-only mode.
- Sessions: stream SessionsSnapshot for SubscribeSessions and update the TUI for snapshot/empty list handling.
- Web UI: add hub info in settings, improve empty-create handling, and refresh session tabs.
- CLI: improve client output formatting.
- Tests: fix web e2e hub flags.

## v0.0.3 - 2026-01-26
- Add hub-spoke federation aggregation, tunnel-based routing, and coordinator-scoped session targeting across clients.
- Improve session routing robustness with rename-safe session IDs and coordinator-aware session grouping in the TUI.
- TUI: ignore SGR mouse reports in key input.
- Web UI: hide coordinator prefixes in session labels and tighten terminal cursor positioning/measurement.
- Fix hub Ctrl+C shutdown for gRPC.
- Docs: restructure documentation, consolidate release workflow, and document Ghostty OSC 133 integration.

## v0.0.2 - 2026-01-24
- Normalize text input newlines for SendText and warn when CLI text is missing a trailing newline.
- Update tests and vtr agent guidance to reflect newline submission behavior.
- Fix Web UI cursor overlay alignment (remove padding double-count).

## v0.0.1 - 2026-01-24
- Initial public release of vtr/vtrpc hub, agent CLI, and web UI.
