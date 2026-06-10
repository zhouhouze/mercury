# D Adapter Integration Boundary

## Consumed By

- D AgenticLoop only.

## Public Module Output

- `AdapterSpec`.
- `AdapterInvocation`.
- `AdapterResult`.

## Integration Rules

- No direct frontend access.
- No direct `/v1/chat/stream` handling.
- No direct EventStore writes.
- No high-risk side effect by default.

## Stop Conditions

Stop and return to V1.2-0 if adapters need:

- real approval workflow.
- persistent credentials.
- network search as default behavior.
- browser automation.

