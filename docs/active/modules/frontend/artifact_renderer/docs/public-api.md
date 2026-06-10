# B Artifact Renderer Public API

## Module Entries

Recommended exports:

```text
toArtifactViewModel(artifact: ArtifactRecord) -> ArtifactViewModel
renderArtifactCard(viewModel: ArtifactViewModel)
```

Integration Codex wires rendering into the Chat tab.

## Input

- `ArtifactRecord(type="summary")`
- `ArtifactRecord(type="answer")`
- `ArtifactRecord(type="mindmap")`

## Output

- summary card view model.
- answer card view model.
- mindmap renderer handoff.
- source fallback view model.
- malformed artifact fallback.

## Integration Rules

- Artifact Renderer does not create or mutate artifacts.
- Mindmap visual rendering is delegated to Mindmap Renderer.
- Unknown artifact shape must not crash the UI.

