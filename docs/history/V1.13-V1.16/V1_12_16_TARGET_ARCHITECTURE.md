# V1.12-V1.16 Target Architecture

Version: V1.16 numbering refresh

## 1. Target System

```text
Repository / Snapshot Input
  -> Data Service
  -> Artifact Store
  -> Controlled Runtime Evidence Runner
  -> Incremental Intelligence Engine
  -> Review Workbench Builder
  -> Executable Schema Validator
  -> Real MCP Server
  -> External Repo E2E Harness
  -> HTTP / MCP / CLI surfaces
```

## 2. Components

| Component | Responsibility | Must not do |
|---|---|---|
| Data Service | ingest repo metadata, artifacts, snapshots | run unapproved shell commands |
| Artifact Store | persist immutable artifacts and evidence | silently rewrite history |
| Runtime Evidence Runner | run allowlisted validation and sanitize logs | execute non-allowlisted commands |
| Incremental Intelligence Engine | compute snapshot diff, changed facts, drift timeline | invent facts without artifact references |
| Review Workbench Builder | produce payload, HTML, Mermaid, lanes, export | read transient runtime state as source of truth |
| Executable Schema Validator | validate public evidence artifacts before persistence | allow invalid public artifacts to persist |
| Real MCP Server | expose evidence tools over MCP | diverge from shared evidence service semantics |
| External Repo E2E Harness | validate real repository classes or structured blockers | count URL-only evidence as acceptance |
| API Surfaces | provide HTTP / MCP / CLI parity | expose different semantics per channel |

## 3. Key Data Flow

```text
scan request
  -> artifact batch
  -> optional controlled runtime evidence
  -> snapshot summary
  -> diff and changed facts
  -> risk lane / blocker board payload
  -> workbench HTML and context export
```

## 4. Architecture Rules

- Runtime evidence is an artifact type, not a console side channel.
- Incremental outputs reference previous and current artifact IDs.
- Workbench payload is derived from persisted artifacts only.
- All stage features are callable through HTTP, MCP, and CLI with parity.
- Any new public artifact field must be added to `V1_12_16_ARTIFACT_SCHEMA_AND_PUBLIC_CONTRACT.md`.
- V1.16 schema validation must run before public evidence artifact persistence.
- V1.16 MCP server must call the same shared evidence service path as HTTP and CLI.
