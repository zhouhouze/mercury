# C Executable Contract

## Required Assertions

For successful output:

- `mermaidSource` is non-empty.
- `metadata.format` equals `mermaid`.
- `metadata.nodeSourceMap` exists.
- every major node has at least one `paragraphId`, `chunkId`, or excerpt fallback.
- `repairCount <= 1`.
- validation result is recorded even when rendering is left to B.

## Failure Assertions

- invalid source after repair returns `ok=false` or warning metadata for source fallback.
- C must not claim frontend visual success.
- C must not mutate `StructuredPageContext`.

## Test Command Placeholder

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/mindmap/tests
```

