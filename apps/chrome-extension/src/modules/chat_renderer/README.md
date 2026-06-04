# B Chat Renderer Module

Owner: B module Codex.

Responsibility:

- Consume AgentEvent SSE.
- Render streaming text.
- Render structured summary views.
- Render tool state.
- Ignore unknown events safely.

Do not own AgentCore state. Runtime remains the source of truth.
