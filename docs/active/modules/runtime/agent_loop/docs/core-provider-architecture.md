# D Core Provider Architecture

## Goal

D provides a replaceable Agent Core boundary. Navia can use piAgent as the default Core while keeping A/B/C and external APIs stable.

## Core Boundary

```text
D Adapter Layer
-> CoreProvider.run_turn(CoreTurnInput)
-> piAgentProvider / MockCoreProvider / FutureCoreProvider
-> CoreTurnResult
-> D Adapter Layer maps to ToolResult / ArtifactRecord / AgentEvent / Trace
```

## CoreProvider Contract

```text
CoreProvider.run_turn(input: CoreTurnInput) -> CoreTurnResult
```

`CoreTurnInput` contains:

- `sessionId`
- `turnId`
- `traceId`
- `requestId`
- `userMessage`
- `activePage`
- `recentMessages`
- `availableAdapters`
- `budget`
- `coreConfig`

`CoreTurnResult` contains:

- response intent or text deltas.
- requested adapter invocations.
- core warnings.
- recoverable errors.

## Provider Types

- `piAgentProvider`: preferred V1.2 implementation target.
- `MockCoreProvider`: deterministic tests and fallback.
- `FutureCoreProvider`: later replacement point.

## Hard Boundaries

- A and C do not call CoreProvider.
- B does not call CoreProvider.
- piAgent does not write ArtifactRecord, SSE, EventStore, or UI directly.
- Core output must return to D Adapter Layer.
- D Adapter Layer applies governance, mapping, persistence, and trace.

## Implementation Prerequisite

Before real piAgent integration, lock:

- repository URL.
- version or commit.
- license.
- runtime language and packaging model.
- tool invocation model.
- state/session model.

