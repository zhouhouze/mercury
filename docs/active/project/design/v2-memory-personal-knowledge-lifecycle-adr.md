# ADR: V2 Memory Lifecycle, Idempotency, Permission Revoke and Forget Cascade

## Status

Proposed for V2-0. Not approved for V2-1 implementation until reviewed.

## Context

V2 adds persistent knowledge sources. Premature implementation without lifecycle rules would cause duplicate sources, stale graph nodes, unverifiable deletion and unclear retry behavior.

## Decision

V2-0 must freeze the following lifecycle decisions before V2-1 starts:

| Topic | Required V2-0 decision |
|---|---|
| Source identity | Define how `sourceId`, `workspaceId`, `revision`, `operationId`, `traceId` and `idempotencyKey` are generated and persisted. |
| Duplicate save | Decide whether the same URL / document is deduplicated, versioned or saved as a new source. |
| Source revision | Define how changed webpage snapshots or local file revisions update `KnowledgeSource.revision`. |
| Operation lifecycle | Freeze Save / Build transitions: `queued -> ingesting -> building -> trace_ready` or `degraded / failed / cancelled`. |
| Retry / resume / cancel | Define retry budget, backoff, cancellation and Runtime restart recovery. |
| Permission revoke | Decide whether already imported sources remain usable after root revoke, and what cannot be scanned afterward. |
| Forget cascade | Forget must remove or invalidate Library entry, query results, graph nodes / edges, trace entries, caches and derived items unless shared evidence still supports them. |
| Shared KnowledgeItem | Define how a `KnowledgeItem` supported by multiple sources is recomputed after one source is forgotten. |
| Evidence locator | Define DOM text, PDF page, Markdown line and note block locator semantics. |
| Credential storage | Define data_service auth storage, redaction and audit logging. |
| Circuit breaker | Define timeout, retry and service-unreachable handling for data_service. |

## Consequences

- V2-1 implementation cannot invent lifecycle behavior ad hoc.
- Forget can be tested through before / after query, graph and trace.
- Permission revoke and source retention are explicit user-facing decisions.

## No-Go

- Saving the same source twice with ambiguous IDs.
- Treating `/sources/remove` as sufficient forget proof.
- Keeping query / graph / trace hits after forget without explicit shared-source explanation.
- Showing raw local paths or credentials in UI, reports or logs.
