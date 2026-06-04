# B Chat Renderer Fixture Spec

## Required Fixture Files

```text
fixtures/summary-turn.sse
fixtures/qa-turn.sse
fixtures/missing-page-context.sse
fixtures/tool-failure.sse
fixtures/unknown-event.sse
```

## Expected Evidence Files

```text
tests/evidence/summary-turn.view.json
tests/evidence/qa-turn.view.json
tests/evidence/missing-page-context.view.json
tests/evidence/tool-failure.view.json
tests/evidence/unknown-event.view.json
```

## Required Assertions

- streaming text order is preserved.
- final response is stable after `response.done`.
- unknown event appears only in debug handoff.
- no fixture requires live Runtime.

