# V1.0.x Post-V1 Hardening Human Acceptance Baseline Freeze

Status: frozen baseline

Frozen at: 2026-07-07 Asia/Shanghai

Human acceptance statement:

```text
人工验收确认OK。当前阶段可以作为基线可以冻结。
```

## Baseline Scope

This freezes the current `V1.0.x Post-V1 Hardening` evidence package as the accepted baseline for MVP current-page companion reading quality hardening.

The accepted evidence package is:

```text
docs/active/project/evidence/v1_post_v1_hardening/
  acceptance-report.html
  report.json
  sample-manifest.json
  evidence-manifest.json
  prd-review.md
  false-green-audit.md
  ux-review-checklist.md
  screenshots/
```

## Allowed Claim

```text
V1.0.x post-V1 hardening passed source jumpback, Mindmap quality, and real-site regression acceptance.
```

## Frozen Evidence Summary

- Candidate matrix: 101 real candidate samples.
- Acceptance subset: 36 samples.
- Fresh fallback / blocked evidence samples: 3.
- Screenshot evidence files: 78.
- Fatal issues: 0.
- Major issues: 0.
- Human spot-check: accepted.

## No-Go Boundaries

This baseline does not claim:

- Final Monica-like UX complete.
- All complex sites high-quality complete.
- Video / audio / image pixel content understood.
- V2 Memory / RAG ready.
- Web Research / PPT / Deep Research ready.

## Runtime / Build Baseline

The human acceptance was performed after rebuilding the Chrome extension production output and starting Local Runtime on:

```text
http://127.0.0.1:17861
```

Runtime health returned `status=ok` during the manual acceptance session.
