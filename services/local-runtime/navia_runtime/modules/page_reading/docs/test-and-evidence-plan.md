# A Test And Evidence Plan

## Unit Tests

- ID stability.
- content hash stability.
- paragraph splitting.
- chunk generation.
- annotation fallback.

## Contract Tests

- validate `StructuredPageContext` required fields.
- validate annotations reference existing paragraphs.
- validate chunks reference existing page and heading path.

## Evidence

Each validation run writes:

- structured JSON output.
- assertion log.
- fixture source path.

## Module Exit Criteria

- all required fixtures pass.
- empty fixture fails with expected error.
- no artifact, SSE, or D/C/B dependency is introduced.

