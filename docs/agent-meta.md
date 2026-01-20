# Agent Meta

How this project is being developed with AI agents.

## Orchestrator: lunabot

**Role:** Project manager and quality gate.

**Responsibilities:**
- Tee up each milestone for the implementation agent (Codex)
- Run "fresh eyes" review after each milestone with a fresh context window
- Commit completed work with descriptive messages
- Track progress and surface blockers
- Maintain documentation quality

**Workflow:**
1. Load current milestone from beads (e.g., `br list --pretty` or `br graph --all`)
2. Send task to Codex with clear scope
3. Monitor progress, approve network/file operations as needed
4. On completion: commit, run fresh eyes review, advance to next milestone
5. Report significant updates to Discord

## Implementation Agent: Codex

**Role:** Hands-on implementation.

**Responsibilities:**
- Read specs and design docs thoroughly before coding
- Implement in small, testable increments
- Write tests alongside implementation
- Update documentation as code evolves
- Flag blockers or ambiguities to orchestrator

**Context Management:**
- Each milestone starts with `/new` (fresh context)
- Reduces hallucination from stale context
- Forces re-reading of current state

## Quality Gates

Each milestone must be:
- **Functional** — Code compiles/runs without errors
- **Testable** — Has at least basic tests or can be manually verified
- **Understandable** — Docs updated to reflect current state

## Files

| File | Purpose |
|------|---------|
| `docs/spec.md` | Protocol and architecture spec |
| `.beads/` | Milestone tracking, tasks, and status (beads) |
| `docs/agent-meta.md` | This file |
| `go-ghostty/README.md` | VT engine integration design |
