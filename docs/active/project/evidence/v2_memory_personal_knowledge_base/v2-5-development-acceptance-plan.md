# V2-5 Ask With Sources / Knowledge Graph Development And Acceptance Plan

## Gate

V2-4 Knowledge Workspace shell passed Runtime, typecheck and frontend regression checks.

## Scope

- Add typed frontend calls for `/v1/knowledge/query` and `/v1/knowledge/graph`.
- Add Ask with Sources panel inside Knowledge Workspace.
- Add lightweight Knowledge Graph preview inside Knowledge Workspace.
- Bind Ask to selected source when one is selected; otherwise query the workspace.
- Display evidence count or degraded reason.

## Acceptance

- Ask with Sources uses only Navia Runtime API.
- Answers display source-supported or degraded status.
- Graph preview displays workspace/source nodes without claiming full RAG graph completion.
- Empty states guide the user to save sources first.
- Existing V1 Chat / Mindmap paths remain passing.

## No-Go

- No direct data_service frontend call.
- No production RAG claim.
- No full graph analytics or cross-document reasoning claim.

