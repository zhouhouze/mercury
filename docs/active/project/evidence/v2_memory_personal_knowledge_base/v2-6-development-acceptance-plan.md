# V2-6 PermissionRoot / ForgetSource Development And Acceptance Plan

## Gate

V2-5 Ask with Sources / lightweight Knowledge Graph preview passed local verification.

## Scope

- Add typed frontend calls for PermissionRoot grant / revoke.
- Add typed frontend call for ForgetSource.
- Add PermissionRoot panel and Forget Source panel inside Knowledge Workspace.
- Display forget verification across Library, Ask, Graph and Trace.
- Keep local file scan disabled; permission UI records explicit authorization only.

## Acceptance

- Permission grant requires explicit user click.
- Permission revoke updates visible state.
- Forget Source requires selected source and updates verification results.
- Forget Source refreshes Source Library / Graph state.
- UI does not claim default local file access or production forget cascade beyond mock governance.

## No-Go

- No default local file read.
- No background scanning.
- No real data_service delete claim.
- No V2 ready / RAG ready claim.

