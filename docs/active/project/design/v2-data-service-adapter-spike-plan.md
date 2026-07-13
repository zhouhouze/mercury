# V2 data_service Adapter Spike Plan

## Status

Required V2-0 output. V2-1+ implementation is No-Go until this spike is complete or a MockKnowledgeServiceAdapter fallback is selected.

## Inputs

The spike must record:

```text
data_service repository path
commit or version
license / compatibility note
runtime start command
auth model
HTTP API snapshot
MCP entrypoints, if used
CLI entrypoints, if used
```

## Required Matrix

| Capability | data_service candidate endpoint | Navia V2 contract | Required result |
|---|---|---|---|
| Workspace list / create | Compatibility HTTP: `/api/v1/knowledge/workspaces/create`, `/api/v1/knowledge/workspaces/list`, `/api/v1/knowledge/workspaces/describe`; target HTTP: `/api/workspaces`, `/api/workspaces/{workspace_id}` | `Workspace` | Confirm fields, auth and pagination / list behavior. |
| Source import | Compatibility HTTP: `/api/v1/knowledge/sources/import`; target HTTP: `/api/workspaces/{workspace_id}/sources` | `MemoryCandidate -> KnowledgeSource` | Confirm idempotency, source id and revision behavior. |
| Source list / remove | Compatibility HTTP: `/api/v1/knowledge/sources/list`, `/api/v1/knowledge/sources/remove`; target HTTP: `/api/workspaces/{workspace_id}/sources`, `/api/workspaces/{workspace_id}/sources/{source_id}/remove` | `KnowledgeSource`, `ForgetRequest` | Confirm remove semantics and unsupported cascade gaps. |
| Build status | Compatibility HTTP: `/api/v1/knowledge/build/start`, `/api/v1/knowledge/build/status`, `/api/v1/knowledge/build/cancel`; target HTTP: `/api/workspaces/{workspace_id}/build/*` | `KnowledgeOperation`, `SourceBuildStatus` | Confirm queued / ingesting / building / failed / trace_ready mapping. |
| Query | Compatibility HTTP: `/api/v1/knowledge/query`; target HTTP: `/api/workspaces/{workspace_id}/query` | Ask with Sources | Confirm evidence refs and degraded behavior. |
| Graph | Compatibility HTTP: `/api/v1/knowledge/graph`; target HTTP: `/api/workspaces/{workspace_id}/graph/query`, `/graph/neighbors`, `/graph/community` | Knowledge Graph | Confirm source / unit / relation provenance. |
| Source trace | Compatibility HTTP: `/api/v1/knowledge/source/trace`; target HTTP: `/api/workspaces/{workspace_id}/sources/{source_id}/trace` | `EvidenceRef` | Confirm located / fallback / blocked mapping. |

## Required Outputs

```text
docs/active/project/design/v2-data-service-api-snapshot.md
docs/active/project/design/v2-data-service-capability-matrix.md
docs/active/project/design/v2-data-service-adapter-spike-report.md
docs/active/project/design/v2-data-service-unsupported-capabilities.md
```

## Fallback Decision

If any required capability is missing or unstable, V2-0 must select one:

| Route | Pros | Cons |
|---|---|---|
| Route A: MockKnowledgeServiceAdapter first | Enables deterministic V2-1/V2-2 frontend and contract work. | Delays real data_service integration. |
| Route B: data_service adapter first | Proves real backend early. | Blocks frontend work on external service instability. |
| Route C: Hybrid mock + spike | Parallelizes UI and backend proof. | Requires strict contract discipline to avoid divergence. |

Recommended default: Route C. If spike fails, fall back to Route A for V2-1/V2-2 acceptance.
