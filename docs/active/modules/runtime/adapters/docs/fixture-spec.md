# D Adapters Fixture Spec

## Required Fixture Files

```text
fixtures/spec.safe_summary.json
fixtures/spec.approval_required.json
fixtures/spec.deny_by_default.json
fixtures/result.succeeded.json
fixtures/result.failed.json
fixtures/result.denied.json
```

## Required Assertions

- registry loads valid specs.
- invalid specs fail contract validation.
- risk-level fixtures map to expected D behavior.
- no fixture performs real network, local file, browser, MCP, or Skill side effects.

