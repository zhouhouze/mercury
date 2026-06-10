# B Debug Renderer Mock Validation Plan

## Fixtures

- runtime offline status.
- runtime online status.
- page context success.
- page context missing.
- unknown SSE event.
- tool failure.

## Pass Criteria

- Runtime offline is visible.
- PageContext missing is visible.
- Unknown event appears in Debug only.
- Large payloads are truncated.
- Debug Renderer does not mutate Runtime state.

## Fail Criteria

- Debug content appears as primary Chat answer.
- Full page body is dumped by default.
- Unknown event crashes UI.

