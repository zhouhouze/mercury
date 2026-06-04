# D Adapter Mock Validation Plan

## Required Mock Adapters

- Safe summary adapter.
- Safe mindmap adapter.
- Approval-required adapter.
- Deny-by-default adapter.
- Failing adapter.

## Pass Criteria

- Registry lists all adapter specs.
- Safe adapter can return `AdapterResult(status="succeeded")`.
- Approval-required adapter does not execute side effect.
- Deny-by-default adapter does not execute and does not produce `tool.started`.
- Failing adapter maps to recoverable error metadata.

## Fail Criteria

- Adapter returns free text outside `AdapterResult`.
- Adapter bypasses D governance.
- Adapter directly updates UI or EventStore.
- Adapter performs network search by default.

