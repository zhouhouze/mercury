# B Chat Renderer Module

Owner: B module Agent.

## Responsibility

Render the primary Chat tab from Runtime events:

- consume `AgentEvent` SSE.
- append `response.delta`.
- render `response.done`.
- render visible tool running/failure state.
- ignore unknown events safely.

## Inputs

- recorded SSE fixtures.
- Runtime `AgentEvent`.
- current presentation-only UI state.

## Outputs

- chat view model or renderer components.
- visible stream state.
- visible missing context and tool failure state.

## Allowed Files

```text
apps/chrome-extension/src/modules/chat_renderer/
docs/active/project/stage-gates/v1.2-b-chat-renderer.md
```

## Forbidden Files

- Runtime service modules.
- A/C/D implementations.
- `injectedPanel.ts`, `sse.ts`, and `runtimeClient.ts` except by Integration.
- direct MCP / Skill / External API calls.

## Required Docs Before Coding

```text
docs/active/project/V1_2_AGENT_WORKPACKS.md
docs/active/project/contracts/v1_2_adapter_contracts.md
docs/active/project/design/v1.2-integration-contract-matrix.md
docs/active/project/stage-gates/v1.2-b-chat-renderer.md
docs/public-api.md
docs/executable-contract.md
docs/fixture-spec.md
docs/test-and-evidence-plan.md
```

## Hard Rules

- Runtime remains the source of truth.
- Do not own AgentCore state.
- Do not generate summary, answer, or mindmap.
- Unknown SSE events must not crash the UI.

## Validation Evidence

- recorded SSE replay for streaming text.
- unknown event fixture.
- missing context fixture.
- tool failure fixture.

Use `docs/active/project/MODULE_HANDOFF_TEMPLATE.md` for handoff.
