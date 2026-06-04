# C Integration Boundary

## Consumed By

- D AgenticLoop as an internal adapter/tool.
- B Mindmap Renderer through D-created artifact.

## Public Module Output

```text
mermaidSource
nodeSourceMap
validationStatus
repairCount
sourceChunkIds
paragraphIds
```

## Required For Integration

- Callable service or function that accepts `StructuredPageContext`.
- No direct FastAPI dependency.
- No direct EventStore mutation.
- No direct ArtifactRecord persistence.

## Stop Conditions

Stop and return to V1.2-0 if C needs:

- A new ArtifactRecord type.
- Top-level `format` field.
- New SSE event types.
- Direct frontend rendering control.

