# B Debug Renderer Public API

## Module Entries

Recommended exports:

```text
createDebugState() -> DebugState
applyDebugSignal(state: DebugState, signal: DebugSignal) -> DebugState
selectDebugViewModel(state: DebugState) -> DebugViewModel
```

## Input

- runtime status.
- page context status.
- unknown SSE events.
- trace snippets.
- tool failures.

## Output

- debug tab view model.
- compact diagnostics.
- truncated payload display.

## Integration Rules

- Debug Renderer does not mutate Runtime.
- Debug Renderer does not show full page body by default.
- Debug-only content stays out of primary Chat answer.

