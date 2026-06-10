# B Debug Renderer Executable Contract

## Required Assertions

- runtime offline is visible.
- page context missing is visible.
- unknown event is captured.
- large payloads are truncated.
- debug state does not pollute primary Chat answer.

## Test Command Placeholder

```bash
pnpm --dir apps/chrome-extension test -- debug_renderer
```

