# V2-4 Knowledge Workspace Shell Development And Acceptance Plan

## Gate

V2-1 through V2-3 passed their local contract tests and false-green audits.

## Scope

- Add Runtime source library list/detail endpoints backed by the mock adapter.
- Add frontend Knowledge tab inside the existing sidepanel.
- Add `KnowledgeWorkspaceShell` with workspace switcher, source library, source detail, evidence refs and service status banner.
- Keep full Ask with Sources, Knowledge Graph Canvas, PermissionRoot Manager and ForgetSource Dialog out of V2-4.

## Acceptance

- Chat remains the default first view.
- Knowledge view is reachable from the existing rail and does not replace V1 Chat.
- Source Library shows saved sources after explicit user save.
- Source detail shows build status and evidence refs.
- UI copy and empty state do not claim full V2 completion.
- Runtime, typecheck and frontend regression tests pass.

## No-Go

- No B direct data_service call.
- No real data_service default write.
- No full RAG / Memory ready claim.
- No default local file read.

