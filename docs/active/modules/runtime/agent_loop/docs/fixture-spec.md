# D AgenticLoop Fixture Spec

## Required Fixture Files

```text
fixtures/active_page.json
fixtures/recent_messages.json
fixtures/adapter_registry.safe.json
fixtures/adapter_registry.denied.json
fixtures/budget.max_tool_calls_1.json
```

## Expected Evidence Files

```text
tests/evidence/summary_turn.events.json
tests/evidence/qa_turn.events.json
tests/evidence/mindmap_turn.events.json
tests/evidence/denied_adapter.events.json
tests/evidence/missing_active_page.events.json
```

## Required Assertions

- event order matches contract.
- denied path does not start tool.
- missing active page does not create fake artifact.
- successful path includes traceable artifact when applicable.

