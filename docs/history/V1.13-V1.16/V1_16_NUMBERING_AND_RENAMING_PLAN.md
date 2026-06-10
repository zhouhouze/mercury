# V1.13+ Numbering And Renumbering Plan

Version: V1.13 numbering baseline
Date: 2026-06-07

## 1. Verdict

The current plan continues from `V1.13`.

The existing `V2.13` / `V2.14` / `V2.15` / `V2.16` labels are not canonical project numbers. They are retained as legacy aliases only because existing documents, audit paths, tests, and handoff notes already reference them.

Canonical numbering for this plan must follow:

```text
V1.0 / V1.1 / V1.2 / ... / V1.12 / V1.13 / V1.14 / V1.15 / V1.16
```

Module or subsystem work may use an internal code:

```text
<模块>-V<模块版本>-<序号>
```

For the coding-evidence subsystem, use `EVD` as the module code.

## 2. Canonical Stages

| Canonical stage | Legacy alias | Stage name | Status |
|---|---|---|---|
| `V1.12` | `V2.11-V2.12` baseline docs | Coding Evidence Platform baseline | historical planning / baseline |
| `V1.13` | `V2.13` | Controlled Runtime Evidence | implemented / acceptance passed |
| `V1.14` | `V2.14` | Incremental Intelligence | implemented / acceptance passed |
| `V1.15` | `V2.15` | Interactive Review Workbench | implemented / acceptance passed |
| `V1.16` | `V2.16` | Real MCP / External Repo E2E / Executable Schema | planned next stage |

## 3. Module Work Codes

The coding-evidence subsystem uses `EVD` because it is no longer part of the V1 A/B/C/D reading-module split.

| Work code | Canonical stage | Scope |
|---|---|---|
| `EVD-V1.0-1` | `V1.12` | artifact store and public artifact envelope |
| `EVD-V1.0-2` | `V1.13` | controlled runtime evidence, allowlist, redaction |
| `EVD-V1.0-3` | `V1.14` | snapshot diff, changed facts, task memory, drift timeline |
| `EVD-V1.0-4` | `V1.15` | interactive workbench payload, HTML, Mermaid fallback, export |
| `EVD-V1.1-1` | `V1.16` | executable schema validation |
| `EVD-V1.1-2` | `V1.16` | real MCP server sharing HTTP / CLI service path |
| `EVD-V1.1-3` | `V1.16` | external repository E2E harness and structured blockers |

## 4. Naming Rules

Use canonical stage numbers in new PRD, architecture, stage-gate, acceptance, and final reports.

Use legacy aliases only in parentheses:

```text
V1.16 Real MCP / External Repo E2E / Executable Schema (legacy V2.16)
```

Do not create new `V2.*` documents for this plan. The next product stage after `V1.16` must be decided explicitly:

```text
V1.17 if it extends coding evidence
a new major version if it starts knowledge base / RAG / memory productization as a separate product stage
```

## 5. File Naming Baseline

The canonical documentation directory is:

```text
docs/V1.16/
```

Current files use `V1_*` prefixes. Legacy `V2_*` file names are no longer valid canonical paths.

Naming exit criteria:

- Markdown links use `docs/V1.16/`.
- stage-gate links use `docs/V1.16/stage-gates/`.
- drawio references use `V1_16_GAP.drawio` or `V1_13_15_TARGET_STATE.drawio`.
- legacy `V2.13` / `V2.14` / `V2.15` / `V2.16` appear only as explicit legacy aliases.
- `git diff --check` passes.

## 6. Current Document Interpretation

When reading existing documents:

```text
V2.13 means canonical V1.13
V2.14 means canonical V1.14
V2.15 means canonical V1.15
V2.16 means canonical V1.16
```

The implementation package under `services/local-runtime/navia_runtime/v2/` remains a technical package name for now. It is not a canonical project-stage number.
