# B Mindmap Renderer Implementation Plan

## Build Order

1. Define mindmap view model from ArtifactRecord.
2. Implement Mermaid source extraction.
3. Implement visual render wrapper.
4. Implement render error capture.
5. Implement source fallback panel.
6. Implement node click to source lookup.
7. Add fixture tests for success, render failure, and missing source map.

## Rendering Rules

- Use frontend Mermaid dependency when available.
- If Mermaid render fails, show source text and error summary.
- If node source map is missing, show source unavailable state.
- If DOM jump-back fails, show paragraph/chunk excerpt fallback.

