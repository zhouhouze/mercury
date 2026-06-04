# C PRD Coverage

## Covered PRD Goals

- User can generate a mindmap from the current web page.
- Mindmap is grounded in the page structure.
- Mindmap nodes can return to source content or show source excerpt fallback.
- Mermaid source remains available when visual rendering fails.

## Not Covered By C

- Mermaid visual rendering.
- Chat UI.
- Runtime health UI.
- Final ArtifactRecord persistence.
- SSE streaming.

## False-Green Risks

- Producing generic mindmap text without source links.
- Claiming visual acceptance from backend-only Mermaid source.
- Using fake headings that do not come from `StructuredPageContext`.

