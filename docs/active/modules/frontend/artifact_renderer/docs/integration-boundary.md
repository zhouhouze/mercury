# B Artifact Renderer Integration Boundary

## Consumes

- `ArtifactRecord` from D events or session restore.

## Produces

- Artifact card presentation.
- Mindmap Renderer handoff.
- Debug handoff for malformed artifacts.

## Stop Conditions

Stop if Artifact Renderer needs:

- new artifact type.
- top-level artifact `format`.
- direct tool execution.
- public data model changes.

