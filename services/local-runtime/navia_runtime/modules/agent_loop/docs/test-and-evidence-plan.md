# D AgenticLoop Test And Evidence Plan

## Unit Tests

- context builder.
- intent routing.
- adapter selection.
- governance pre-check.
- ToolResult mapping.
- event mapping.

## Contract Tests

- successful summary turn event sequence.
- successful mindmap turn event sequence.
- denied adapter event sequence.
- missing active page event sequence.
- budget exceeded event sequence.

## Evidence

Each evidence file must contain:

- input turn.
- emitted events.
- tool result.
- artifact reference when created.
- trace reconstruction summary.

## Module Exit Criteria

- all critical event sequences pass.
- D does not call B directly.
- D does not bypass adapters or governance.

