# V1.12-V1.16 Coding Agent Roadmap PRD

Version: V1.16 numbering refresh

## 1. Product Goal

V1.12-V1.15 turns Navia from a browser reading assistant into a coding-agent review and evidence system that can inspect real repositories, produce durable artifacts, run controlled validation, track incremental changes, and expose an interactive review workbench.

The completed V1.13-V1.15 goal is:

- V1.13 Controlled Runtime Evidence (legacy V2.13).
- V1.14 Incremental Intelligence (legacy V2.14).
- V1.15 Interactive Review Workbench (legacy V2.15).

The next V1.16 goal is:

- Real MCP server.
- External repository E2E matrix.
- Executable artifact schema validation.

## 2. User Experience Outcome

After V1.15, a developer should be able to:

1. Submit a repository or project snapshot for review.
2. See persisted artifacts with clear facts, risks, blockers, and validation evidence.
3. See which facts changed across snapshots instead of rereading the whole report.
4. Open a review workbench with HTML, Mermaid, risk lanes, blocker board, and context export.
5. Trust that visible facts come from durable artifacts, not transient runtime logs or fabricated validation.

## 3. Scope

In scope:

- Controlled allowlist runtime execution.
- Focused pytest / command evidence with sanitization.
- Runtime evidence artifact schema and HTTP / MCP / CLI parity.
- Snapshot diff, changed facts, task memory, drift timeline.
- Interactive workbench payload and generated HTML.
- Review lanes, blockers, Mermaid visualization, context export.

Out of scope:

- Autonomous repository mutation.
- Unbounded shell execution.
- Secret exposure.
- Replacing PR review tools.
- Multi-agent orchestration.
- Long-term user memory beyond task-scoped artifacts.

## 4. Stage Requirements

| Stage | Requirement | Product value |
|---|---|---|
| V1.13 | Controlled Runtime Evidence | Prove findings with approved commands and sanitized logs. |
| V1.14 | Incremental Intelligence | Explain what changed between snapshots and preserve artifact history. |
| V1.15 | Interactive Review Workbench | Let developers inspect risks, blockers, traces, Mermaid, and exports in one review surface. |
| V1.16 | Real MCP / External E2E / Executable Schema | Make evidence workflows externally operable, reproducible, and schema-validated. |

## 5. Acceptance Principles

- Every visible workbench fact must resolve to a persisted artifact.
- Runtime commands must be allowlisted and default deny.
- Historical artifacts must not be silently rewritten.
- E2E can end with a structured blocker only when the blocker is real, reproducible, and documented.
- HTTP, MCP, and CLI surfaces must expose equivalent stage behavior.
