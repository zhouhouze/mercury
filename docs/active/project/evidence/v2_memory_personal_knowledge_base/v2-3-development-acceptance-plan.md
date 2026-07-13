# V2-3 data_service Boundary Client Development And Acceptance Plan

## Gate

V2-1 and V2-2 passed local contract, typecheck and frontend regression tests.

V2-3 is allowed only as a controlled boundary implementation. It must not switch the product default from `MockKnowledgeServiceAdapter` to real data_service.

## Scope

- Add a Runtime-local data_service HTTP boundary client.
- Support status probe and basic source lifecycle request mapping.
- Map service unreachable, auth required and version / policy failures into Navia V2 status semantics.
- Keep B frontend calling only Navia Runtime `/v1/knowledge/*`.
- Keep real data_service writes disabled by default unless explicit future configuration selects it.

## Acceptance

- The client never reads or writes data_service internal workspace folders.
- The client uses HTTP only and supports an optional API key header.
- Status probe distinguishes `connected`, `auth_required`, `unreachable` and `version_mismatch` / incompatible response.
- Source import maps Navia text/web source input to data_service target HTTP `/api/workspaces/{workspace_id}/sources`.
- Source trace and remove use target HTTP routes.
- Unit tests use a local test HTTP server or deterministic transport, not a live production service.

## No-Go

- Do not claim real data_service integration is enabled in product UI.
- Do not replace the V2-1 mock default.
- Do not enable default local file reading.
- Do not call data_service from B frontend.
- Do not claim V2 ready or RAG ready.

