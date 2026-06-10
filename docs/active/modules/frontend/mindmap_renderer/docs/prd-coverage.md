# B Mindmap Renderer PRD Coverage

## Covered PRD Goals

- User can preview mindmap in the AI panel.
- User can see Mermaid source fallback.
- User can trace mindmap nodes back to page content or excerpts.

## Not Covered By Mindmap Renderer

- Mindmap generation.
- Tool execution.
- Artifact persistence.
- Chat turn state.

## False-Green Risks

- Showing static SVG unrelated to artifact source.
- Treating source fallback as visual Mermaid acceptance.
- Losing node source traceability.

