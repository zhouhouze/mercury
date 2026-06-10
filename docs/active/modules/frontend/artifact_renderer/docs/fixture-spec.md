# B Artifact Renderer Fixture Spec

## Required Fixture Files

```text
fixtures/summary-artifact.json
fixtures/answer-artifact.json
fixtures/mindmap-artifact.json
fixtures/malformed-artifact.json
```

## Expected Evidence Files

```text
tests/evidence/summary-artifact.view.json
tests/evidence/answer-artifact.view.json
tests/evidence/mindmap-artifact.view.json
tests/evidence/malformed-artifact.view.json
```

## Required Assertions

- artifact truth fields are read, not overwritten.
- missing optional source excerpt uses fallback.
- malformed fixture does not throw.

