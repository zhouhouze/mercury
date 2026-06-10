# B Chat Renderer PRD Coverage

## Covered PRD Goals

- User can chat in the embedded AI panel.
- Assistant response can stream in the Chat tab.
- Runtime offline and page context problems are visible.
- Tool status is understandable without opening Debug.

## Not Covered By Chat Renderer

- Artifact card layout internals.
- Mermaid visual rendering.
- Debug data details.
- Backend answer generation.

## False-Green Risks

- Using static sample text instead of replayed SSE.
- Hiding failed tool states.
- Letting frontend become source of truth for turn state.

