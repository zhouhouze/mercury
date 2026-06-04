# B Chat Renderer Mock Validation Plan

## Fixtures

Use recorded SSE text fixtures:

- successful summary turn.
- successful QA turn.
- missing PageContext turn.
- tool failure turn.
- unknown event turn.

## Pass Criteria

- Streaming text appears incrementally in order.
- `response.done` finalizes the assistant message.
- Tool running state appears and clears.
- Tool failure remains visible.
- Unknown event does not break rendering.
- No Runtime-owned state is mutated.

## Fail Criteria

- UI crashes on unknown event.
- Delta text is duplicated or reordered.
- Missing PageContext shows fake answer.
- Chat Renderer directly invokes Runtime tools.

