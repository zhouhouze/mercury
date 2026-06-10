# Navia V1.13+ Documentation Package

This folder contains the V1.13-V1.16 coding-evidence roadmap documentation.

`docs/V1.16` is the canonical documentation directory for the current V1.16 development stage.

## Numbering

Canonical numbering is defined in:

```text
docs/V1.16/V1_16_NUMBERING_AND_RENAMING_PLAN.md
```

The existing `V2.13` / `V2.14` / `V2.15` / `V2.16` labels are legacy aliases:

| Canonical | Legacy alias | Stage |
|---|---|---|
| `V1.13` | `V2.13` | Controlled Runtime Evidence |
| `V1.14` | `V2.14` | Incremental Intelligence |
| `V1.15` | `V2.15` | Interactive Review Workbench |
| `V1.16` | `V2.16` | Real MCP / External Repo E2E / Executable Schema |

## Current Focus

The current remaining stages are:

- V1.16 Real MCP / External Repo E2E / Executable Schema (legacy V2.16).

## Audit Entry

Start with:

```text
docs/V1.16/V1_13_15_DOCUMENT_AUDIT_REPORT.md
```

Then read the 18 audit paths listed in that report.

For the next stage, start with:

```text
docs/V1.16/V1_16_DOCUMENT_AUDIT_REPORT.md
```

Then read:

```text
docs/V1.16/V1_16_CONTRACT_FREEZE_SPEC.md
docs/V1.16/V1_16_EXECUTABLE_SCHEMA_IMPLEMENTATION_SPEC.md
docs/V1.16/V1_16_MCP_SERVER_IMPLEMENTATION_SPEC.md
docs/V1.16/V1_16_EXTERNAL_REPO_E2E_RUNBOOK.md
docs/V1.16/stage-gates/V1_16_PRE_IMPLEMENTATION_AUDIT.md
```

## Stage Gates

Implementation and acceptance evidence lives under:

```text
docs/V1.16/stage-gates/
```

Read each `*_PRE_IMPLEMENTATION_AUDIT.md` before implementation and update / verify the matching `*_ACCEPTANCE_AUDIT_REPORT.md` after tests pass.
