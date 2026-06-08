# V1.16 Development And Acceptance Plan

Version: V1.16 planning

Legacy alias: V2.16

## 1. Substages

### V1.16-0 Contract And Audit Freeze

- freeze MCP tool names and payloads.
- freeze executable schema strategy.
- freeze external repo E2E matrix.
- produce pre-implementation audit.
- update PRD, target architecture, milestone gate, and drawio gap map.

Exit:

- no fatal or major specification gap.
- high-risk flows identified before implementation.
- `V1_16_CONTRACT_FREEZE_SPEC.md` reviewed.
- `V1_16_PRE_IMPLEMENTATION_AUDIT.md` produced.
- HTTP / CLI / MCP parity artifact ID policy is closed: IDs may differ by channel, but envelopes, payload status, evidence refs, structured errors, persistence, and retrieval must be equivalent.

### V1.16-1 Executable Schema Validation

- define executable schemas for evidence artifact envelope and runtime evidence / snapshot diff / changed facts / task memory / drift timeline / workbench.
- implement from `V1_16_EXECUTABLE_SCHEMA_IMPLEMENTATION_SPEC.md`.
- validate before persistence.
- add tests for invalid payload rejection.
- ensure invalid payloads do not write partial artifacts.

Exit:

- valid evidence artifacts persist.
- invalid evidence artifacts fail before persistence.

### V1.16-2 Real MCP Server

- implement local MCP server or documented MCP command entry.
- implement from `V1_16_MCP_SERVER_IMPLEMENTATION_SPEC.md`.
- expose runtime evidence, snapshot diff, workbench tools.
- route all tools through shared evidence service functions.
- return structured MCP errors with code, message, recoverable, and requestId.

Exit:

- MCP produces equivalent artifact envelopes and structured errors to HTTP / CLI for the same payload.
- MCP artifact IDs may differ from HTTP / CLI artifact IDs, but every returned artifact is persisted, schema-valid, and retrievable.
- MCP errors are structured.

### V1.16-3 External Repo E2E Matrix

- validate at least four repository classes:
  - small Python service.
  - TypeScript frontend.
  - mixed repo / monorepo.
  - large repo or structured blocker.
- use local snapshots unless network access is explicitly approved.
- record artifact IDs for every pass or blocker row.
- produce evidence from `V1_16_EXTERNAL_REPO_E2E_RUNBOOK.md`.

Exit:

- each row has artifact IDs and acceptance result.
- blockers meet structured blocker standard.

### V1.16-4 Final Acceptance

- run full parity tests.
- run executable schema tests.
- run local runtime regression.
- update workbench evidence.
- produce V1.16 final acceptance report.

## 2. Required Validation

```text
V1.16 executable schema tests
V1.16 MCP parity tests
V1.16 external repo E2E matrix
V1.13-V1.15 regression tests
drawio XML parse
git diff --check
```

## 3. No-Go Conditions

- MCP server has different semantics from HTTP / CLI.
- artifact persists without schema validation.
- external repo E2E uses URL-only or non-reproducible evidence.
- structured blocker lacks artifact ID or next action.
- command allowlist expands without audit.
