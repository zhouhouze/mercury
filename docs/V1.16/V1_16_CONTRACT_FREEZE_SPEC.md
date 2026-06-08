# V1.16 Contract Freeze Spec

Version: V1.16-0 contract freeze

Legacy alias: V2.16

## 1. Scope

V1.16 freezes the contracts required to move from the V1.13-V1.15 local evidence prototype to a delivery-ready evidence interface.

The stage covers:

- executable schema validation before artifact persistence;
- real MCP server contracts;
- HTTP / CLI / MCP parity contracts;
- external repository E2E evidence matrix;
- structured blocker standard;
- final acceptance evidence.

It does not cover:

- broad command allowlist expansion;
- arbitrary shell execution;
- repository mutation;
- cloud deployment;
- network clone without explicit user approval;
- replacing V1.13-V1.15 artifact history.

## 2. Public Artifact Schema Contract

All persisted public evidence artifacts must validate before persistence.

Required executable schemas:

| Schema | Required in V1.16 | Acceptance |
|---|---|---|
| `EvidenceArtifactEnvelope` | yes | rejects missing `artifactId`, `artifactType`, `schemaVersion`, `projectId`, `source`, `payload` |
| `RuntimeEvidencePayload` | yes | validates command, allowlist rule, exit code, bounded stdout/stderr, sanitization status |
| `SnapshotDiffPayload` | yes | validates previous/current snapshot IDs and stable/new/changed/resolved fact refs |
| `ChangedFactsPayload` | yes | every changed fact references source artifact IDs |
| `TaskMemoryPayload` | yes | all remembered facts are artifact-backed |
| `DriftTimelinePayload` | yes | timeline events reference snapshot or artifact IDs |
| `WorkbenchPayload` | yes | visible facts reference `sourceArtifactIds` or `evidenceRefs` |

Schema validation rules:

- validation runs before persistence;
- invalid public artifacts fail with structured error;
- failed validation does not write a partial artifact;
- schema version is required;
- tests must cover at least one invalid payload per public artifact type.

## 3. MCP Tool Contract

V1.16 real MCP server exposes the same evidence workflow as HTTP and CLI.

Required MCP tools:

| Tool | Equivalent HTTP route | Equivalent CLI action | Purpose |
|---|---|---|---|
| `navia_runtime_evidence` | `POST /v2/runtime/evidence` | `runtime-evidence` | run or deny controlled runtime evidence |
| `navia_snapshot_diff` | `POST /v2/snapshots/diff` | `snapshot-diff` | produce snapshot diff and changed facts |
| `navia_workbench` | `POST /v2/workbench` | `workbench` | build workbench payload and HTML/export evidence |
| `navia_artifact_get` | `GET /v2/artifacts/{artifact_id}` | planned artifact read action | retrieve persisted evidence artifact |

MCP response rules:

- returns the same artifact envelope shape as HTTP and CLI for equivalent payloads;
- sets `source="mcp"` in the envelope;
- errors use structured `code`, `message`, `recoverable`, and `requestId`;
- MCP server must call shared evidence service functions, not duplicate business logic.

## 4. Parity Contract

Parity means HTTP, CLI, and MCP produce equivalent:

- artifact type;
- schema version;
- project ID;
- source-specific channel marker;
- payload status;
- parent artifact references;
- evidence refs;
- structured error code for failures.

Artifact IDs do not need to be identical across channels, but each artifact must be persisted and retrievable.

## 5. External Repo E2E Contract

Final V1.16 acceptance requires four repository classes.

| Repo class | Required evidence | Acceptance |
|---|---|---|
| small Python service | controlled focused pytest | pass or structured blocker |
| TypeScript frontend | approved build/test command after allowlist audit | pass or structured blocker |
| mixed repo / monorepo | artifact scan plus at least one approved validation | pass or structured blocker |
| large repo | workbench plus structured blocker if validation cannot run | pass or accepted blocker |

Rules:

- counted E2E rows must use local reproducible snapshots or explicitly approved network access;
- URL-only evidence cannot count;
- each row records repo identity, command/route/tool, artifact IDs, result, and next action;
- network clone or external repo execution is a high-risk flow requiring user approval.

## 6. Structured Blocker Contract

A blocker can replace pass only when it includes:

- blocker ID;
- repo or fixture identity;
- attempted command, route, or MCP tool;
- exact failure cause;
- related artifact IDs;
- why the blocker is external or stage-limited;
- next action;
- reviewer decision.

## 7. V1.16-0 Exit Criteria

V1.16-0 exits only when:

- this contract spec is reviewed;
- PRD, target architecture, development plan, milestone gate, and drawio gap map reference V1.16;
- pre-implementation audit has no fatal or major gap;
- high-risk flows are identified before implementation;
- `git diff --check` passes.
