# C Test And Evidence Plan

## Unit Tests

- source selection.
- tree building.
- Mermaid generation.
- validation and repair.
- source map creation.

## Contract Tests

- `metadata.format = "mermaid"`.
- `nodeSourceMap` references source paragraphs/chunks.
- `repairCount <= 1`.

## Evidence

Evidence JSON must include:

- Mermaid source.
- validation status.
- repair count.
- node source map.
- source paragraph/chunk references.

## Module Exit Criteria

- all structured page fixtures produce traceable mindmap payloads.
- C has no direct dependency on frontend or Runtime entrypoints.

