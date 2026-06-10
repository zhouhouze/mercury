# B Mindmap Renderer Integration Boundary

## Consumes

- Mindmap artifact from Artifact Renderer.
- Optional source highlight callback from integration.

## Produces

- Mindmap visual state.
- Source fallback state.
- Node source selection events.

## Stop Conditions

Stop if Mindmap Renderer needs:

- direct C invocation.
- new artifact schema.
- browser automation beyond source highlight request.
- backend trace mutation.

