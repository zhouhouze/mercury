# D Adapters Service Module

Owner: D module Agent.

## Responsibility

Normalize all internal tools and future MCP / Skill / External API placeholders behind D governance:

- define adapter specs.
- normalize adapter invocation input.
- return ToolResult-compatible outputs.
- support safe placeholder adapters.
- deny high-risk side effects by default.

## Inputs

- `AdapterSpec`
- `AdapterInvocation`
- context refs from D.

## Outputs

- `AdapterResult`
- ToolResult-compatible content.
- artifact candidates only through D mapping.

## Allowed Files

```text
services/local-runtime/navia_runtime/modules/adapters/
services/local-runtime/navia_runtime/modules/agent_loop/
docs/active/project/stage-gates/v1.2-d-agentic-loop.md
```

## Forbidden Files

- frontend renderer modules.
- A/C implementation modules.
- public contracts unless V1.2-0 is reopened.
- external side-effect adapters enabled by default.

## Required Docs Before Coding

```text
docs/active/project/V1_2_AGENT_WORKPACKS.md
docs/active/project/contracts/v1_2_adapter_contracts.md
docs/active/project/design/v1.2-integration-contract-matrix.md
docs/active/project/stage-gates/v1.2-d-agentic-loop.md
docs/public-api.md
docs/executable-contract.md
docs/fixture-spec.md
docs/test-and-evidence-plan.md
```

## Hard Rules

- All adapters must be registered through D Adapter Layer.
- All adapter calls must pass governance hooks.
- All adapter results must map to ToolResult.
- `deny_by_default` adapters must not produce `tool.started`.

## Validation Evidence

- safe internal adapter success evidence.
- denied adapter evidence.
- failed adapter evidence.
- ToolResult mapping evidence.

Use `docs/active/project/MODULE_HANDOFF_TEMPLATE.md` for handoff.
