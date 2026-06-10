# D Adapters Public API

## Module Entries

Recommended exports:

```text
register_adapter(spec: AdapterSpec, handler: AdapterHandler) -> None
invoke_adapter(invocation: AdapterInvocation) -> AdapterResult
list_adapters() -> AdapterSpec[]
```

These entries are consumed only by D AgenticLoop.

## Input

- `AdapterSpec`
- `AdapterInvocation`

## Output

- `AdapterResult`

## Integration Rules

- Adapter handlers do not emit SSE.
- Adapter handlers do not mutate frontend state.
- Adapter handlers do not write EventStore directly.
- Adapter handlers do not bypass D governance.

