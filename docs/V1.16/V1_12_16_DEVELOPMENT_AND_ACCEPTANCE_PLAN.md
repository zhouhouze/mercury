# V1.12-V1.16 Development And Acceptance Plan

Version: V1.16 numbering refresh

## 1. Stage Flow

1. V1.13 Controlled Runtime Evidence (legacy V2.13).
2. V1.14 Incremental Intelligence (legacy V2.14).
3. V1.15 Interactive Review Workbench (legacy V2.15).
4. V1.16 Real MCP / External E2E / Executable Schema (legacy V2.16).

Each stage must complete:

- pre-audit.
- focused tests.
- data_service E2E.
- real project E2E or structured blocker.
- HTTP / MCP / CLI parity.
- false-green audit.
- acceptance audit.

## 2. V1.13 Exit

- allowlist is enforced.
- non-authorized commands are denied by default.
- focused pytest can run on a real fixture repository.
- runtime logs are sanitized.
- runtime evidence artifact is persisted.

## 3. V1.14 Exit

- snapshot diff is persisted.
- changed facts are traceable to artifact IDs.
- task memory summarizes prior findings without rewriting history.
- drift timeline records stable, new, changed, and resolved items.

## 4. V1.15 Exit

- workbench payload is generated from persisted artifacts.
- HTML workbench renders risk lanes, blockers, Mermaid, evidence, and context export.
- visible facts all reference artifacts.
- reviewer can identify blockers and next actions without opening raw logs first.

## 5. Required Validation

```text
drawio XML parse
git diff --check
focused stage tests
data_service E2E
large repository E2E or structured blocker
HTTP / MCP / CLI parity check
acceptance audit report
```

## 6. V1.16 Exit

- real MCP server exposes runtime evidence, snapshot diff, and workbench tools.
- executable schemas validate all public evidence artifacts before persistence.
- external repository E2E matrix covers small Python, TypeScript frontend, mixed repo, and large repo / structured blocker.
- HTTP / CLI / MCP parity is demonstrated on equivalent payloads.
- final acceptance report includes PRD review and false-green audit.
