# Web UI Menu System Proposal

## Summary
Introduce an "Actions" menu system for advanced session operations that are awkward or impossible to trigger via the browser keyboard. The menu should be accessible from the header, context-aware to the selected session, and usable on mobile via a bottom sheet. It will host session lifecycle actions, control-sequence sends, and signal sends with confirmations.

## Current UI Notes
- Header hosts status, session name, and the settings menu.
- Left panel lists coordinators and sessions; selecting a session attaches.
- Mobile has an action tray for navigation keys and a text input bar.
- Web UI currently only exposes send key/text via the active session stream.

## Goals
- Provide reliable access to control sequences blocked by browser shortcuts.
- Offer session lifecycle actions (create, kill, detach) and signals.
- Keep the menu discoverable without cluttering the primary terminal view.
- Allow the menu to grow with more actions in later milestones.

## Proposed Menu System

### Placement
- Add an "Actions" button in the header, next to the Settings button.
- For mobile, the same button opens a bottom sheet instead of a popover.
- Optional per-session kebab menu in the session list for contextual actions.

### Structure (Sections)
1) Session
   - New session
   - Detach (close web attach, keep session alive)
   - Kill session (confirm)
2) Send
   - Common control sequences: Ctrl + C, Ctrl + D, Ctrl + Z, Ctrl + L, Ctrl + B
   - Custom sequence input (e.g., "Ctrl + W")
3) Signals
   - SIGINT, SIGTERM, SIGKILL, SIGHUP (confirm each)

### Interaction Model
- Menu is disabled if no session is selected.
- Each destructive action (Kill, SIGKILL) requires confirmation.
- Menu items show tooltips or helper text when blocked (e.g., no session).
- Menu closes on outside click or Escape.

### Browser Limitations (Why Menu Matters)
- Some shortcuts are reserved or intercepted (e.g., Ctrl + W/T/N/R, Cmd + W on macOS).
- The menu allows sending these sequences by invoking the backend explicitly.
- For Ctrl combos, prefer a key picker that maps to `sendKey("ctrl+<key>")`.

## Backend/Frontend Notes
- Current web API only exposes session list and WS send/resize.
- New server endpoints or WS frames are needed for:
  - Session create/kill
  - Signal send
- UI should guard actions based on session status (exited vs running).

## Recommended Next Step
1) Implement the Actions menu UI with placeholder handlers.
2) Wire menu items to new RPC/HTTP endpoints once available.
3) Add confirm modals for destructive actions.

