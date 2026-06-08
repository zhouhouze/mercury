# V1.13 Controlled Runtime Evidence Development And Acceptance Plan

Legacy alias: V2.13

## 1. Development Steps

1. Define allowlist policy and command record schema.
2. Implement default-deny decision path.
3. Implement approved command execution for focused pytest fixture.
4. Persist sanitized runtime evidence artifact.
5. Add HTTP / MCP / CLI parity.
6. Write false-green and acceptance audit.

## 2. Acceptance

- unauthorized command is denied and produces no runtime execution.
- authorized focused pytest runs and persists exit code.
- stdout/stderr are redacted and bounded.
- same validation can be triggered through HTTP / MCP / CLI.
- acceptance audit references artifact IDs.

## 3. No-Go

- command runs without allowlist rule.
- raw secret-like values appear in persisted logs.
- runtime evidence exists only in console output.
