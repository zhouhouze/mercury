# B Chat Renderer Executable Contract

## Required Assertions

- `response.delta` appends in order.
- `response.done` closes active assistant message.
- `tool.started` creates visible running state.
- `tool.done` clears running state.
- `tool.failed` remains visible.
- unknown events are routed to debug handoff and do not crash.
- missing PageContext does not create fake answer.

## Test Command Placeholder

```bash
pnpm --dir apps/chrome-extension test -- chat_renderer
```

