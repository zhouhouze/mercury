# D Integration Boundary

## Consumes

- A `StructuredPageContext`.
- C mindmap adapter output.
- AdapterRegistry entries.
- Session recent messages and budget.

## Produces

- `AgentEvent` SSE-compatible events.
- `ToolResult`.
- `ArtifactRecord`.
- trace records.

## Integration Rules

- Existing Runtime entrypoints call D, not the other way around.
- D must not import frontend modules.
- D must not call MCP / Skill / API clients directly except through registered adapters.
- D must not mutate A or C contracts.

## Stop Conditions

Stop and return to V1.2-0 if D needs:

- new SSE event type.
- new external API endpoint.
- long-term memory.
- browser automation.
- default network search.

