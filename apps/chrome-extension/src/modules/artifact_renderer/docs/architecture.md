# B Artifact Renderer Architecture

## Goal

Artifact Renderer displays Runtime-created `ArtifactRecord` values as stable cards in the Chat tab.

## Render Flow

```text
ArtifactRecord
-> type-specific view model
-> card shell
-> content renderer
-> source excerpt / fallback
```

## Inputs

- `ArtifactRecord(type="summary")`.
- `ArtifactRecord(type="answer")`.
- `ArtifactRecord(type="mindmap")`.
- Metadata including `sourcePageId`, `turnId`, `toolCallId`, and `metadata.format`.

## Outputs

- Summary card.
- Answer card.
- Mindmap card shell.
- Source excerpt area.
- Fallback text when specialized renderers fail.

## Core Rules

- Renderer must not fabricate missing artifact metadata.
- Artifact card should show failure/fallback state rather than disappear.
- Mindmap visual rendering is delegated to Mindmap Renderer.

