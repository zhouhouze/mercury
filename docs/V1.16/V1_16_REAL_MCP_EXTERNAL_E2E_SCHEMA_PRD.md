# V1.16 Real MCP / External E2E / Executable Schema PRD

Version: V1.16 planning

Legacy alias: V2.16

## 1. Product Goal

V1.16 upgrades the V1.13-V1.15 local evidence prototype into a stronger delivery candidate by closing the three remaining product gaps:

- real MCP server instead of Python-only MCP facade.
- external repository E2E beyond the local Navia repository.
- executable artifact schema validation for public evidence artifacts.

## 2. User Experience Outcome

After V1.16, a developer should be able to:

1. Use HTTP, CLI, and a real MCP server to request the same evidence workflow.
2. Review evidence generated from multiple real repository classes.
3. Trust that runtime evidence, snapshot diff, and workbench artifacts validate against executable schemas.
4. Distinguish accepted E2E results from structured blockers.

## 3. Scope

In scope:

- real local MCP server for evidence tools.
- executable JSON Schema or Pydantic validation for evidence artifact payloads.
- external repo E2E matrix with at least small Python, TypeScript frontend, mixed repo, and large repo / structured blocker classes.
- updated workbench evidence that can display MCP-origin artifacts.

Out of scope:

- broad command allowlist expansion without separate audit.
- network clone or external repo execution without user approval.
- arbitrary repository mutation.
- cloud deployment.
- replacing existing V1.13-V1.15 artifacts.
- implementing repository mutation.

## 4. Acceptance Principles

- MCP, HTTP, and CLI must return equivalent artifact envelopes for equivalent operations.
- External repo E2E must use reproducible local snapshots or explicitly approved network access.
- Structured blockers may count only when they include command, repo identity, artifact IDs, failure cause, and next action.
- All public artifact payloads must validate before persistence.

## 5. User-Visible Exit

After V1.16, a developer can:

1. call the same evidence workflow through HTTP, CLI, or MCP;
2. inspect persisted artifacts in a workbench;
3. verify that every visible claim is backed by schema-valid artifact evidence;
4. see whether each external repo row passed or ended with an accepted structured blocker.
