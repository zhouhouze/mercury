# V2 data_service Unsupported And Risky Capabilities

## Unsupported For Direct V2 Use

| Area | Reason | Required Navia action |
|---|---|---|
| Direct workspace file access | data_service owns its internal workspace layout | Only use HTTP / MCP / CLI through V2 Adapter |
| Console reuse | `/knowledge` is data_service console, not Navia product UI | Build Navia Knowledge Workspace UI separately |
| Default local directory scan | Violates Navia explicit authorization rule | Gate behind PermissionRoot and user action |
| Full forget cascade proof | `/sources/remove` alone does not prove query / graph / trace invalidation | Add before / after verification in Navia evidence |
| Runtime offline reporting by Runtime | Runtime offline means `/v1/knowledge/status` is unreachable | Frontend must infer Runtime offline from transport failure |
| Evidence grounding by non-empty refs | Non-empty refs do not prove answer support | Add semantic validator and gold evidence checks |
| Media / OCR / ASR understanding | Out of V2 Memory scope | Keep for future V3 or separate approval |
| RAG-ready claim | V2 only proves planning-aligned local knowledge acceptance | Do not claim full RAG or V2 ready before explicit gate |

## Risk Carry Forward

The following items remain execution risks for V2-1+ and must be tested with fixtures and real data:

- Same URL duplicate save and source revision behavior.
- Build retry / resume after Runtime restart.
- Permission revoke semantics for already imported sources.
- Shared KnowledgeItem recomputation after one source is forgotten.
- Path and credential redaction in logs, reports and UI.
- data_service auth / version mismatch user recovery path.
