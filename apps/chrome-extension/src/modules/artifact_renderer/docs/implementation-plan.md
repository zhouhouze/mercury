# B Artifact Renderer Implementation Plan

## Build Order

1. Define artifact card view model.
2. Implement summary card.
3. Implement answer card.
4. Implement mindmap card handoff.
5. Implement source excerpt fallback.
6. Implement invalid artifact fallback.
7. Add artifact fixture tests.

## Rendering Rules

- `metadata.format="markdown"`: render as readable markdown-like content.
- `metadata.format="mermaid"`: hand off to Mindmap Renderer.
- Missing source refs: show source unavailable state.
- Unknown artifact type: show safe fallback card and Debug handoff.

