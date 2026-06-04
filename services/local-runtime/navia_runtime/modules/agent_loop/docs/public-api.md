# D AgenticLoop / Core Provider Public API

## Module Entry

Recommended export:

```text
run_agentic_turn(input: AgenticTurnInput) -> AgenticTurnStream
create_core_provider(config: CoreProviderConfig) -> CoreProvider
```

Integration Codex adapts this to `/v1/chat/stream`.

## Input

`AgenticTurnInput`:

- `sessionId`
- `turnId`
- `traceId`
- `requestId`
- `userMessage`
- `activePage?: StructuredPageContext`
- `recentMessages[]`
- `budget`
- `adapterRegistry`
- `coreProvider`
- `coreConfig`

`CoreProvider`:

```text
run_turn(input: CoreTurnInput) -> CoreTurnResult
```

## Output

`AgenticTurnStream` yields existing `AgentEvent` types only:

- `state.transition`
- `intent.detected`
- `budget.checked`
- `tool.requested`
- `tool.denied`
- `tool.started`
- `tool.done`
- `tool.failed`
- `artifact.created`
- `response.delta`
- `response.done`
- `error`

## Integration Rules

- D Adapter Layer owns the boundary between Runtime and CoreProvider.
- `piAgentProvider` is the preferred V1.2 CoreProvider, but it is replaceable.
- `MockCoreProvider` is the default provider for module tests.
- D maps adapter results to `ToolResult`.
- D creates or requests persistence of `ArtifactRecord` through integration/store layer.
- D does not import frontend modules.
- D does not perform high-risk side effects by default.
- CoreProvider output must not be written directly to SSE, EventStore, ArtifactStore, or B.
