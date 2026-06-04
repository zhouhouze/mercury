# D Adapter Architecture

## Goal

Adapters normalize internal tools, MCP, Skill, and external API capabilities so D can call them through one governed interface. They also shield Navia contracts from CoreProvider-specific output, including piAgent output.

## Adapter Flow

```text
CoreProvider output / D selection
-> AdapterSpec lookup
-> AdapterInvocation
-> governance pre-check
-> adapter execution if allowed
-> AdapterResult
-> D maps to ToolResult / ArtifactRecord / AgentEvent
```

## Adapter Kinds

- `internal_tool`: existing safe runtime capabilities.
- `mcp`: future MCP capability wrapper.
- `skill`: future local skill wrapper.
- `external_api`: future HTTP/API wrapper.

## Risk Levels

- `safe`: may execute after budget and permission checks.
- `approval_required`: must return waiting/approval behavior until an approval workflow exists.
- `deny_by_default`: must not execute and must not emit `tool.started`.

## Ownership

Adapters own normalization only. D owns orchestration and trace. Adapter code must not talk directly to B.

piAgentProvider and any future CoreProvider may request adapter usage, but the request must be converted to `AdapterInvocation` and governed by D before execution.
