# V1.13 Controlled Runtime Evidence PRD

Legacy alias: V2.13

## 1. Goal

V1.13 adds controlled runtime validation so Navia can prove selected findings with real command output while keeping execution bounded, auditable, and safe.

## 2. User Story

As a developer reviewing Navia output, I want to see which focused tests or checks were actually run, why they were allowed, what they returned, and whether logs were sanitized.

## 3. Requirements

- Commands are default denied.
- Allowed commands are matched by explicit allowlist rules.
- Runtime output is persisted as `RuntimeEvidencePayload`.
- stdout/stderr previews are sanitized.
- failed commands are evidence, not silent failures.
- HTTP, MCP, and CLI expose equivalent behavior.

## 4. Non-Goals

- arbitrary shell access.
- automatic dependency installation.
- mutation of source files.
- hidden background command execution.
