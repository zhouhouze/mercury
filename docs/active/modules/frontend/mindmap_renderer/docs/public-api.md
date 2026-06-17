# B Mindmap Renderer Public API

## Module Entries

Recommended exports:

```text
toMindmapViewModel(artifact: ArtifactRecord) -> MindmapViewModel
toEvidenceCardViewModel(artifact: ArtifactRecord) -> EvidenceCardViewModel
renderMindmap(viewModel: MindmapViewModel) -> MindmapRenderResult
renderEvidenceCardMindmap(viewModel: EvidenceCardViewModel) -> EvidenceCardRenderResult
resolveMindmapNodeSource(nodeId: string, viewModel: MindmapViewModel) -> SourceResolution
buildEvidenceCardJumpbackRequest(nodeId: string, viewModel: EvidenceCardViewModel) -> JumpbackRequest | SourceFallback
```

## Input

- mindmap `ArtifactRecord`.
- Mermaid source from artifact content.
- `metadata.nodeSourceMap`.

## Output

- Mermaid visual render result.
- source fallback render result.
- source node resolution.
- Evidence Card view model and render state for B-local UI.
- source evidence panel state.

## Integration Rules

- Mindmap Renderer does not call C.
- Mindmap Renderer does not mutate ArtifactRecord.
- DOM jump-back request is optional; excerpt fallback is mandatory.
- Evidence Card output must be derived from ArtifactRecord + metadata only.
- Missing source evidence must produce a degraded UI state, not a normal card.
- This module does not expose a new Runtime public contract.
