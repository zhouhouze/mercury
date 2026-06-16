# B Mindmap Renderer Implementation Plan

## Build Order

1. Define V1.3 Evidence Card view model from ArtifactRecord and `metadata.nodeSourceMap`.
2. Implement Mermaid source extraction as fallback / debug.
3. Implement Evidence Card layout with stable dimensions for Side Panel width.
4. Implement render error capture and missing metadata degradation.
5. Implement source evidence panel.
6. Implement node hover / focus / selected / neighbor highlight.
7. Implement node click to source lookup and jumpback request.
8. Add fixture tests for success, render failure, missing source map, duplicate labels, long text, and low-signal degraded output.

## Rendering Rules

- Use frontend Mermaid dependency when available.
- If Mermaid render fails, show source text and error summary.
- If node source map is missing, show source unavailable state.
- If DOM jump-back fails, show paragraph/chunk excerpt fallback.

## V1.3 Evidence Card Rules

- Evidence Card Mindmap is the primary view.
- Mermaid visual/source is retained as fallback and debug evidence.
- Card text must not overflow at Side Panel widths.
- The selected node must remain visually distinct after click.
- Related edge / neighboring cards should be highlighted; unrelated nodes may be dimmed.
- Source evidence panel must show `textQuote` or `fallbackText` for each selected node.
- DOM success and fallback shown must be different UI states.
- Do not call A/C/D services directly.
