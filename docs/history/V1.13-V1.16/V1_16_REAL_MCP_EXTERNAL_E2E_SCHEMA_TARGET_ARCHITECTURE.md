# V1.16 Real MCP / External E2E / Executable Schema Target Architecture

Version: V1.16 planning

Legacy alias: V2.16

## 1. Target System

```text
HTTP Client       CLI Client       MCP Client
    |                |                |
    v                v                v
Shared Evidence Service
    -> Artifact Schema Validator
    -> Evidence Artifact Store
    -> Controlled Runtime Evidence
    -> Incremental Intelligence
    -> Review Workbench
    -> External Repo E2E Evidence
```

## 2. Current vs Target

| Area | Current V1.13-V1.15 | V1.16 target |
|---|---|---|
| MCP | Python facade only | real local MCP server |
| E2E data | local Navia repository | multiple real repository classes or approved structured blockers |
| Schema validation | code shape and tests | executable schema validation before persistence |
| Workbench | artifact-backed static HTML | includes MCP-origin and external-repo evidence |
| Acceptance | local focused pytest | real repo matrix and parity evidence |

## 3. Component Responsibilities

| Component | Responsibility |
|---|---|
| MCP Server | expose runtime evidence, snapshot diff, and workbench tools over MCP |
| Schema Validator | validate public evidence artifact envelope and payloads |
| External Repo Harness | run approved E2E against local snapshots / approved repos |
| Parity Auditor | compare HTTP / CLI / MCP artifact envelopes |
| Final Acceptance Auditor | produce V1.16 exit report and false-green review |

## 4. Boundary Rules

- MCP server must call the same evidence service functions as HTTP and CLI.
- Schema validation must happen before artifact persistence.
- External repo E2E must not silently skip failures.
- External network access requires user approval and must be recorded.

## 5. Call Path

```text
HTTP / CLI / MCP request
  -> request envelope normalization
  -> shared evidence service
  -> allowlist and policy check when runtime is requested
  -> executable schema validation
  -> immutable artifact persistence
  -> workbench / export / retrieval
```

Parity is checked at the artifact envelope and structured error level. Artifact IDs may differ by channel, but every returned artifact must be persisted and retrievable.
