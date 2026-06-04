# D AgenticLoop Implementation Plan

## Build Order

1. Define `CoreProvider` interface and `CoreTurnInput` / `CoreTurnResult`.
2. Add `MockCoreProvider` for deterministic module tests.
3. Define `piAgentProvider` adapter contract; real dependency is locked during implementation.
4. Define D Adapter Layer around CoreProvider output.
5. Add adapter selection and AdapterInvocation mapping rules.
6. Add governance pre-check and post-check integration points.
7. Map adapter execution to existing `ToolResult` envelope.
8. Map successful results to `ArtifactRecord`.
9. Emit existing AgentEvent types only.
10. Add trace reconstruction tests.

## Core Provider Selection

Provider is selected by config:

```text
NAVIA_AGENT_CORE_PROVIDER=mock | piagent | custom
```

V1.2 target is `piagent`; module tests use `mock`.

## Intent Routing / Core Output

Initial deterministic routing is acceptable for `MockCoreProvider`:

- summarize page -> A/D summary flow.
- answer page question -> page-grounded answer adapter.
- generate mindmap -> C mindmap adapter.
- explain selection -> selection-aware answer adapter.
- otherwise -> page-grounded answer if active page exists.

## Event Sequence

Expected successful turn:

```text
state.transition
intent.detected
budget.checked
tool.requested
tool.started
tool.done
artifact.created optional
response.delta
response.done
```

Expected denied turn:

```text
state.transition
intent.detected
budget.checked
tool.requested
tool.denied
error or response.done
```

## Integration Boundary

D implementation lives in this module. Integration Codex wires the module into existing `agent.py`, `tools.py`, and `/v1/chat/stream`.
