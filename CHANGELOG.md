# Changelog

All notable changes to this project will be documented in this file.

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
