# D Adapter PRD Coverage

## Covered PRD Goals

- ChatBox Core can later connect MCP, Skill, and API capabilities.
- Tool execution remains auditable and permissioned.
- V1.2 can extend capability without changing frontend contracts.

## Not Covered By Adapters

- Approval UI.
- Real high-risk side effects.
- RAG.
- Multi-agent.
- Browser automation.

## False-Green Risks

- Treating placeholder adapter registration as real capability completion.
- Allowing MCP / Skill calls outside D.
- Hiding adapter failure from trace.

