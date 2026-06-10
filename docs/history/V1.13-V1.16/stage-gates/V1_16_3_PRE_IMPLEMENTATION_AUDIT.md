# V1.16-3 External Repo E2E Matrix Pre-Implementation Audit

Version: V1.16-3 implementation gate

Status: ready for implementation

## 1. PRD Scope

V1.16-3 proves evidence workflow behavior across multiple repository classes or accepted structured blockers.

## 2. Development Plan

- use local reproducible snapshots only.
- validate four repository classes: small Python, TypeScript frontend, mixed monorepo, large repo.
- run approved focused pytest for the small Python row.
- create accepted structured blockers for non-allowlisted command classes instead of expanding allowlist.
- write matrix and blocker evidence files.

## 3. Acceptance Criteria

- four counted rows exist.
- every row has `snapshotPath`, artifact IDs, result, and next action.
- URL-only rows do not count.
- structured blockers include failure cause, artifact IDs, stage-limited reason, next action, and reviewer decision.

## 4. Audit Opinion

Go for implementation.

No command allowlist expansion is approved in this stage.
