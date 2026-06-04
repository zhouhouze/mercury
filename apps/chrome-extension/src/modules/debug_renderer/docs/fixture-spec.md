# B Debug Renderer Fixture Spec

## Required Fixture Files

```text
fixtures/runtime-offline.json
fixtures/runtime-online.json
fixtures/page-context-missing.json
fixtures/unknown-event.json
fixtures/tool-failure.json
```

## Expected Evidence Files

```text
tests/evidence/runtime-offline.debug.json
tests/evidence/page-context-missing.debug.json
tests/evidence/unknown-event.debug.json
tests/evidence/tool-failure.debug.json
```

## Required Assertions

- diagnostic IDs are preserved.
- full page body is not printed by default.
- unknown event is inspectable.

