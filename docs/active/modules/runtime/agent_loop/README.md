# D CoreProvider / Agent Loop Boundary Module

Owner: D module Agent.

## Responsibility

Provide the stable boundary between Navia Runtime and replaceable Agent Core providers:

- define `CoreProvider`.
- build `CoreTurnInput`.
- normalize `CoreTurnResult`.
- provide `MockCoreProvider` for deterministic contract tests.
- define `piAgentProvider` adapter contract.
- map Core output to ToolResult, ArtifactRecord, AgentEvent, and Trace through D Adapter Layer.

## Inputs

- user message.
- active structured page.
- recent session messages.
- adapter specs.
- budget and governance config.

## Outputs

- `CoreTurnInput`
- `CoreTurnResult`
- `ToolCallRecord`
- `ToolResult`
- `ArtifactRecord`
- `AgentEvent`
- traceable turn evidence.

## Allowed Files

```text
services/local-runtime/navia_runtime/modules/agent_loop/
services/local-runtime/navia_runtime/modules/adapters/
docs/active/project/stage-gates/v1.2-d-agentic-loop.md
```

## Forbidden Files

- A/C module implementations.
- B renderer modules.
- existing Runtime entrypoints such as `agent.py` and `tools.py`, except by Integration.
- real piAgent dependency implementation before dependency lock.

## Required Docs Before Coding

```text
docs/active/project/V1_2_AGENT_WORKPACKS.md
docs/active/project/design/adr-v1.2-agent-core-provider-piagent.md
docs/active/project/contracts/v1_2_adapter_contracts.md
docs/active/project/design/v1.2-integration-contract-matrix.md
docs/active/project/stage-gates/v1.2-d-agentic-loop.md
docs/core-provider-architecture.md
docs/core-provider-config.md
docs/public-api.md
docs/executable-contract.md
docs/fixture-spec.md
docs/test-and-evidence-plan.md
```

## Hard Rules

- Implement mock-first behavior before real provider integration.
- `piAgentProvider` real integration requires repository, version or commit, license, runtime, and tool invocation model lock.
- CoreProvider must not write ArtifactRecord, SSE, EventStore, Trace, or UI directly.
- Adapter/tool calls must pass governance before `tool.started`.
- No RAG, long-term memory, multi-agent, browser automation, default local file access, or high-risk side effects.

## Validation Evidence

- fake adapter turn evidence with `turnId` and `toolCallId`.
- denied adapter evidence with no `tool.started`.
- trace evidence containing state, budget, tool, artifact, response, and error paths.

Use `docs/active/project/MODULE_HANDOFF_TEMPLATE.md` for handoff.
