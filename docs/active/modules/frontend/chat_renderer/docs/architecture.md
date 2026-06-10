# B Chat Renderer Architecture

## Goal

Chat Renderer turns Runtime SSE events into the visible Chat tab conversation without owning AgentCore state.

## Render Flow

```text
SSE AgentEvent fixture or live stream
-> event parser
-> presentation reducer
-> message list
-> streaming assistant text
-> tool state row
-> artifact handoff
```

## Inputs

- `AgentEvent` SSE.
- `response.delta`.
- `response.done`.
- `tool.*` events.
- `artifact.created` events.
- Runtime online/offline state from integration.

## Outputs

- User message presentation.
- Assistant streaming presentation.
- Tool running / failed / denied indicators.
- Artifact placeholders routed to Artifact Renderer.
- Unknown-event diagnostics routed to Debug Renderer.

## Ownership

Chat Renderer owns visible chat presentation only. Runtime owns actual session, turn, tool, artifact, and trace state.

## Core Rules

- Unknown SSE events must not crash UI.
- `response.delta` appends only to the active assistant message.
- Tool failure must remain visible.
- Missing PageContext must be visible and must not create fake answer text.
- Chat Renderer must not call A, C, MCP, Skill, or external API directly.

