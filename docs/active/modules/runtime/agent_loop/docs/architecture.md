# D AgenticLoop Architecture

## Goal

D is the stable boundary around ChatBox turns. It connects user intent, active page context, adapters, governance, artifacts, SSE, trace, and a replaceable Agent Core Provider.

The preferred V1.2 Core Provider is piAgent. D must not hardcode a single AgenticLoop implementation.

## Runtime Flow

```text
user message
-> create turn context
-> build CoreTurnInput
-> call CoreProvider.run_turn()
-> receive CoreTurnResult / AdapterIntent
-> run governance pre-check
-> execute adapter if allowed
-> map AdapterResult to ToolResult
-> create ArtifactRecord when successful
-> stream AgentEvent
-> persist trace
```

## Inputs

- User message.
- `sessionId`, `turnId`, `traceId`, `requestId`.
- `session.activePage` as `StructuredPageContext` when page context is required.
- Recent single-session messages.
- Registered `AdapterSpec[]`.
- Turn budget.
- Core provider config.

## Outputs

- `AgentEvent` SSE stream.
- `ToolCallRecord`.
- `ToolResult`.
- `ArtifactRecord`.
- Traceable EventStore records.

## Ownership

D owns the orchestration boundary, adapter layer, governance bridge, mapping, and trace. CoreProvider owns core reasoning / turn planning. A owns page structure. C owns mindmap generation. B owns rendering. Adapters are registered and called only through D.

## Core Rules

- No direct tool execution outside governance hooks.
- No fake summary, answer, or mindmap when activePage is missing.
- `deny_by_default` must not produce `tool.started`.
- Failed tools must not create successful artifacts.
- D supports single-session continuous context only, not long-term memory.
- piAgent or any other CoreProvider cannot directly write ArtifactRecord, SSE, EventStore, or UI.
