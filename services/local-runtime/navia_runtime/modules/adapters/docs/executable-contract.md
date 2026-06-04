# D Adapters Executable Contract

## Required Assertions

- every adapter has stable `adapterId`.
- every adapter declares `kind`, `capability`, `requiredContext`, `riskLevel`.
- every invocation includes `sessionId`, `turnId`, `traceId`, `requestId`, `toolCallId`.
- every result returns `status` and structured `content`.
- no adapter returns free text outside `AdapterResult`.

## Risk Assertions

- `safe` can execute after D governance allows it.
- `approval_required` does not execute side effect without approval.
- `deny_by_default` never executes and never causes `tool.started`.

## Test Command Placeholder

```bash
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/adapters/tests
```

