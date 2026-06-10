# V1.16 Milestone And Acceptance Gate

Version: V1.16 planning

Legacy alias: V2.16

## 1. Milestones

| Milestone | Deliverable | Exit condition |
|---|---|---|
| V1.16-0 | contract and audit freeze | no fatal / major spec gap |
| V1.16-1 | executable schemas | invalid artifacts rejected before persistence |
| V1.16-2 | real MCP server | MCP / HTTP / CLI parity demonstrated |
| V1.16-3 | external repo E2E | four repo classes or accepted blockers |
| V1.16-4 | final acceptance | all gates pass and report is written |

## 2. Acceptance Thresholds

- HTTP / CLI / MCP parity: equivalent artifact envelope, artifact type, schema version, project ID, source, payload status.
- HTTP / CLI / MCP artifact IDs may differ by channel, but every returned artifact must be persisted, schema-valid, and retrievable.
- Schema validation: 100% of persisted public evidence artifacts validate.
- External repo matrix: all rows have artifact IDs and pass / blocker result.
- Workbench: external and MCP-origin artifacts appear in artifact-backed visible facts.
- Structured blocker: blocker rows include repo identity, attempted command/tool, exact cause, artifact IDs, and next action.

## 3. Exit Conditions

V1.16 exits only when:

- executable schema tests pass.
- MCP parity tests pass.
- external repo E2E matrix passes or has accepted structured blockers.
- V1.13-V1.15 regression tests still pass.
- final acceptance report has PRD review and false-green audit.
