# V1.13 Controlled Runtime Evidence Target Architecture

Legacy alias: V2.13

## 1. Flow

```text
validation request
  -> allowlist policy
  -> runtime executor
  -> redactor
  -> RuntimeEvidence artifact
  -> acceptance audit
```

## 2. Components

| Component | Responsibility |
|---|---|
| AllowlistPolicy | decide whether command may run |
| RuntimeExecutor | run approved command in constrained cwd |
| EvidenceRedactor | remove secrets and large logs |
| RuntimeEvidenceWriter | persist evidence artifact |
| Parity Layer | expose same behavior over HTTP / MCP / CLI |

## 3. Safety Rules

- deny by default.
- no shell string expansion for untrusted commands.
- evidence must include allowlist rule ID.
- logs must be bounded and redacted before artifact persistence.
