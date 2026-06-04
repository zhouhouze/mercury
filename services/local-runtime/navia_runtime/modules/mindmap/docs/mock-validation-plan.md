# C Mindmap Mock Validation Plan

## Fixtures

Use structured JSON fixtures derived from A:

- article structured page.
- docs structured page.
- github README structured page.

## Required Scenarios

- Normal heading tree.
- Sparse heading tree.
- Many paragraphs under one heading.
- Validation failure requiring one repair.
- No reliable DOM selector, requiring excerpt fallback.

## Pass Criteria

- Mermaid source is non-empty.
- Source starts with a supported Mermaid mindmap or flow structure.
- `nodeSourceMap` covers the root and all major child nodes.
- Main nodes have paragraph or chunk references.
- Failed validation does not fabricate visual success.

## Fail Criteria

- Mindmap nodes cannot be traced to source content.
- C emits SSE directly.
- C creates UI state.
- C relies on live network or live browser state for module tests.

