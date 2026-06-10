# C Mindmap Implementation Plan

## Build Order

1. Define module-local input and output helpers.
2. Implement source selector from heading tree and high-importance annotations.
3. Implement mindmap tree builder.
4. Implement Mermaid source generator.
5. Implement Mermaid validation hook.
6. Implement at-most-once repair.
7. Implement `nodeSourceMap`.
8. Add fixture tests using A-style structured page JSON.

## Node Selection

Priority order:

1. Heading tree sections with paragraph coverage.
2. High-importance paragraphs.
3. High-density chunks.
4. Fallback to first meaningful paragraphs.

## Node Source Map

Each node should include:

- `nodeId`.
- `label`.
- `paragraphIds`.
- `chunkIds`.
- optional excerpt.

## Validation

V1.2 implementation may use a deterministic syntax validator or the existing Mermaid validation path. If validation fails, repair once. If repair still fails, return source plus validation metadata for B fallback.

