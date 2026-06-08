# A-V1.2-0 Contract Freeze Acceptance

日期：2026-06-05
状态：P0 closure implemented, awaiting external re-audit

## 1. Scope

This acceptance covers only `A-V1.2-0` contract freeze.

It does not start:

```text
A-V1.2-1 corpus implementation
A-V1.2-2 main content implementation
A-V1.2-3 noise / density implementation
A-V1.2-4 digest implementation
A-V1.2-5 source map implementation
A-V1.2-6 quality evaluator implementation
A-V1.2-7 debug evidence implementation
A-V1.2-8 corpus exit
```

## 2. ChatGPT P0 Closure

| P0 | Closure |
|---|---|
| Public vs module-local schema decision | Closed. `HighSignalPageContext`, `PerceptionDigest`, `SourceMap / SourceRef`, and `PagePerceptionQualityReport` are public D/C/B-consumable contracts when quality readiness is `pass`. |
| Full schema freeze | Closed. `contracts/a_v1_2_page_perception.schema.json` validates A-V1.2 public and evidence contracts. |
| Quality formula closure | Closed. Overall score formula, weights, denominator-zero behavior, compressionScore mapping, degraded/fail semantics, and low-signal handling are frozen. |
| Reproducible corpus gate | Closed. Final counted pages must have `snapshotPath`; URL-only records are planning-only. |
| Gold review gate | Closed. Final counted pages must have `goldStatus = reviewed` or `semi_auto_accepted`; planned/annotated cannot count. |
| Extractor selection rule | Closed. Candidate score formula, winner selection, fallback, tie-breaker, rejection rules, and `dom_baseline` fallback are frozen. |
| Dependency audit enforcement | Closed. `a-v1.2-extractor-dependency-audit.md` exists; all third-party extractors are currently `deferred`, so implementation cannot install them. |

## 3. PRD Spec Review

A-V1.2 still matches the PRD target:

```text
high-quality page perception
+ structured page summary
+ jumpback evidence
+ debug-verifiable JSON
```

No scope drift was introduced:

- no final answer generation.
- no Mindmap generation.
- no Artifact creation.
- no SSE / EventStore / Trace writes.
- no RAG, Notebook, Flashcards, Quiz, Podcast, or AgenticLoop behavior.
- no OCR / VLM / ASR / video / live engine execution.
- no MCP / Skill / external API call.

## 4. Validation Commands

Required validation:

```bash
python3 -m json.tool docs/navia_v1_project_docs/contracts/a_v1_2_page_perception.schema.json
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/page_reading/tests/test_a_v1_2_contract_freeze.py
PYTHONPATH=services/local-runtime python3 -m pytest -q services/local-runtime/navia_runtime/modules/page_reading/tests
xmllint --noout docs/navia_v1_project_docs/design/v1.2-a-page-perception-gap.drawio
git diff --check
```

## 5. External Audit Package

Primary audit entry:

```text
docs/navia_v1_project_docs/design/a-v1.2-contract-freeze-readiness-audit.md
```

This file lists the full ChatGPT audit package and keeps the document count under 20.

## 6. Stage Decision

Current decision:

```text
Go for A-V1.2-0 external re-audit.
No-Go for A-V1.2-1+ implementation until the re-audit confirms no new fatal or major risk.
```

If re-audit passes, proceed to staged implementation in this order:

```text
A-V1.2-1 corpus
A-V1.2-2 main content
A-V1.2-3 noise/density
A-V1.2-4 digest
A-V1.2-5 source map
A-V1.2-6 quality evaluator
A-V1.2-7 debug evidence
A-V1.2-8 corpus exit
```
