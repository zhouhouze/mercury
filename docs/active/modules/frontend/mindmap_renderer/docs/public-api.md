# B Mindmap Renderer Public API

## Module Entries

Recommended exports:

```text
toMindmapViewModel(artifact: ArtifactRecord) -> MindmapViewModel
renderMindmap(viewModel: MindmapViewModel) -> MindmapRenderResult
resolveMindmapNodeSource(nodeId: string, viewModel: MindmapViewModel) -> SourceResolution
```

## Input

- mindmap `ArtifactRecord`.
- Mermaid source from artifact content.
- `metadata.nodeSourceMap`.

## Output

- Mermaid visual render result.
- source fallback render result.
- source node resolution.

## Integration Rules

- Mindmap Renderer does not call C.
- Mindmap Renderer does not mutate ArtifactRecord.
- DOM jump-back request is optional; excerpt fallback is mandatory.

