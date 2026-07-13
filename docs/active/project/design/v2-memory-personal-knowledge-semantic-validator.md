# V2 Memory Semantic Validator Specification

## Status

Required V2-0 output. This is a documentation-stage validator specification; implementation belongs to the future V2 evidence tooling stage.

## Purpose

JSON Schema verifies shape. The semantic validator verifies cross-field meaning and false-green risks that schemas cannot express.

## Required Checks

| Check | Rule |
|---|---|
| Claim boundary | `report.claim` may only be `V2 Memory / Personal Knowledge Base passed planning-aligned local knowledge acceptance.` after V2-7. |
| Source corpus | `totalSources >= 24`, with `webPageSources >= 12`, `authorizedLocalDocumentSources >= 6`, `noteOrOtherSources >= 6`. |
| Query scenarios | Cross-source query is not counted as a source. Query scenarios are counted separately from source corpus. |
| Source pass | `sourcePasses >= 20`, and every passed source has build or degraded/blocked evidence. |
| Service status | Report contains Runtime offline, Adapter degraded/blocked, data_service auth/unreachable/version mismatch, and source build failed/degraded samples. |
| Runtime offline | Runtime offline must be inferred by frontend transport failure; it must not be represented as a Runtime-returned `/v1/knowledge/status` success response. |
| Evidence grounding | Ask with Sources result must include evidence refs that support the answer, not merely non-empty ids. |
| Graph provenance | Graph nodes and edges must include service-side source/unit/relation provenance. |
| Permission revoke | After revoke, no new source may be ingested from the revoked root. |
| Forget cascade | Forgotten source must be absent from Source Library, Ask with Sources, Knowledge Graph and Source Trace unless shared-source recomputation is explicitly documented. |
| UI consistency | UI screenshot metadata, JSON report and HTML report must agree on located / fallback_shown / blocked and service status. |
| No-Go scan | Report and docs must not claim V2 implemented, V2 ready, full RAG ready, default local file read or data_service console as Navia UI. |

## Future Command Shape

```bash
node apps/chrome-extension/e2e/validate-v2-memory-report.mjs \
  docs/active/project/evidence/v2_memory_personal_knowledge_base/report.json
```

The command above is a future implementation target, not a current available command.
