# A Executable Contract

## Contract Source

Public shape must conform to:

- `docs/navia_v1_project_docs/contracts/v1_2_adapter_contracts.md`
- `docs/navia_v1_project_docs/07-data-models.md`

## Required Assertions

`StructuredPageContext`:

- `pageId`, `sessionId`, `url`, `title`, `domain`, `capturedAt`, `contentHash` are present.
- `metadata.wordCount`, `paragraphCount`, `headingCount` are numeric.
- `paragraphs` preserve page order.
- `chunks` preserve page order.
- `annotations` reference existing paragraph IDs.
- `densityScore` and `confidence` are within `0..1`.

## Ownership Assertions

- A creates `paragraphId`, `chunkId`, `headingId`, `contentHash`.
- D may store `StructuredPageContext` as active page.
- C may consume it.
- B must not mutate it.

## Test Command Placeholder

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/page_reading/tests
```

