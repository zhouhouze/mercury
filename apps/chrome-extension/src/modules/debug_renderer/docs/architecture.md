# B Debug Renderer Architecture

## Goal

Debug Renderer shows diagnostic information without polluting the primary Chat tab.

## Render Flow

```text
runtime status / page context status / trace summary / unknown events
-> debug view model
-> Debug tab
```

## Inputs

- Runtime online/offline status.
- PageContext submission status.
- Trace snippets.
- Unknown SSE events.
- Tool errors.

## Outputs

- Debug tab diagnostics.
- Compact status labels for integration to surface elsewhere when needed.

## Ownership

Debug Renderer owns diagnostics presentation only. It does not own retry logic, Runtime state, or trace truth.

## Core Rules

- Debug-only content stays out of the primary Chat tab.
- Unknown events are visible here and safe.
- Full page text should not be dumped by default.

