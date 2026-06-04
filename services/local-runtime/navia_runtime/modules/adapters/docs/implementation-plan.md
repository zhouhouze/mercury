# D Adapter Implementation Plan

## Build Order

1. Define adapter registry.
2. Define safe placeholder adapters.
3. Add internal tool adapter wrappers.
4. Add risk-level enforcement metadata.
5. Add fake MCP / Skill / external API adapters for tests.
6. Add AdapterResult to ToolResult mapping tests through D.

## Adapter Contract

Every adapter must declare:

- `adapterId`.
- `kind`.
- `capability`.
- `requiredContext`.
- `riskLevel`.
- input and output schema references when available.
- budget hint.

## Execution Rules

- Adapter receives `AdapterInvocation`.
- Adapter returns `AdapterResult`.
- Adapter does not create SSE events directly.
- Adapter does not create ArtifactRecord directly unless D explicitly treats the artifact as adapter output and persists it.

