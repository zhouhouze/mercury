# V1 Mainline Closeout Execution Plan And Audit

Date: 2026-06-29
Status: Active execution record

## 1. Scope And Claim Boundary

This execution loop covers the current V1 Mainline Closeout Candidate state after V1-MC-SJ Source Jumpback Hardening.

Allowed current automated claim:

```text
V1 mainline closeout candidate passed automated acceptance.
```

Still not allowed:

```text
Full V1 complete.
Final Monica-like UX complete.
V2 Memory / RAG ready.
Web Research / PPT / Deep Research ready.
```

The automated candidate can only support human product review preparation. Human review remains required before any full V1 complete candidate audit.

## 2. Current Evidence Baseline

| Report | Current status | Meaning |
|---|---|---|
| `docs/active/project/evidence/v1_real_site_complex_pages/report.json` | `passed=true`, 6 samples / 6 passed / 0 degraded / 0 blocked / 6 highlighted / 0 fallback | B站、小红书、观察者网首页与详情页通过真实站点自动化复验 |
| `docs/active/project/evidence/v1_mainline_closeout/report.json` | `passed=true`, upstream 5/5 passed | 当前可声明 V1-MC 自动化候选通过 |
| `docs/active/project/evidence/v1_mainline_closeout/human-review-checklist.md` | `reviewStatus: pending` | 仍需人工产品体验核查；不能声明完整 V1 complete |

Real-site validation route:

- Chrome default login profile was unavailable / locked.
- The diagnostic used a temporary Chrome profile with injected B站 / 小红书 auth cookies.
- Cookie values are omitted from all evidence.
- This is `cookie-injected` validation, not a user-main-profile logged-in full-site guarantee.

## 3. Development And Acceptance Plan

| Substage | Work | Output |
|---|---|---|
| V1-MC-SJ-C0 | Sync active docs and drawio to the current 6/6 pass evidence baseline | PRD / architecture / plan / acceptance / stage gate / gap audit no longer describe current state as blocked |
| V1-MC-SJ-C1 | Recheck implementation semantics | href jumpback, XHS feed card extraction, SourceRef href propagation, and E2E report semantics remain in place |
| V1-MC-SJ-C2 | Run automated verification | Typecheck, focused frontend tests, A/C Python tests, build:e2e, real-site diagnostics, mainline aggregation |
| V1-MC-SJ-C3 | Close PRD review and false-green audit | Reports keep candidate-only claim, fallback inheritance, cookie-injected route, and old evidence handling |
| V1-MC-SJ-C4 | Prepare human product review | Checklist remains pending and points to current HTML / JSON / screenshots |

## 4. Required Verification Commands

```bash
npm --prefix apps/chrome-extension run typecheck
npm --prefix apps/chrome-extension test -- pageContext contentBridge mindmapPresentation ArtifactInlineCard
PYTHONPATH=services/local-runtime ./.venv/bin/python -m pytest services/local-runtime/navia_runtime/modules/page_reading/tests/test_high_signal_page.py services/local-runtime/navia_runtime/modules/mindmap/tests/test_mindmap.py -q
npm --prefix apps/chrome-extension run build:e2e
NAVIA_REAL_SITE_HEADLESS=1 npm --prefix apps/chrome-extension run e2e:chrome:real-site-diagnostics
node apps/chrome-extension/e2e/generate-v1-mainline-closeout-report.mjs
```

Real-site automation must stay headless-first and mute audio. Any future visible Chrome run must be announced before it can steal focus.

## 5. Audit Closure

| Audit item | Result | Closure |
|---|---|---|
| PRD and architecture allow V1-MC automated candidate only | Pass | Claim boundary remains candidate-only |
| Active stage gate requires human review before full V1 complete | Pass | Human checklist remains pending |
| Latest real-site evidence exists | Pass | 6/6 pass, 0 degraded, 0 blocked, 6 highlighted |
| V1 mainline closeout evidence exists | Pass | upstream 5/5 passed; candidate automated acceptance claim |
| Cookie-injected route is accurately labeled | Pass | Reports state temporary Chrome profile with injected auth cookies |
| Fallback path risk | Pass with note | Current V1-MC samples have `fallbackSamples = 0`; fallback coverage is inherited from V1.3 / V1.4 upstream evidence |
| Forbidden capability risk | Pass | No RAG, Memory, Web Research, PPT, Deep Research, multi-agent, voice, desktop pet, OCR/VLM/ASR, or default local file access is introduced |
| Browser automation as product feature risk | Pass | Chrome automation is test-only evidence collection, not product capability |

## 6. Stop Conditions

Stop and request human confirmation if any of the following appears:

- A report tries to claim full V1 complete.
- A degraded / blocked real-site sample is hidden or rewritten as pass.
- Source fallback is merged into DOM highlight success.
- Cookie-injected evidence is represented as user-main-profile logged-in full-site validation.
- New Runtime public contract fields are introduced for launcher, visual style, or report-only needs.
- Any forbidden V2+ capability is added.

## 7. Remaining Human Review Boundary

Current documentation supports:

```text
V1 mainline closeout candidate passed automated acceptance.
```

Current documentation does not support:

```text
Full V1 complete.
Final Monica-like UX complete.
```

Next human-facing action after automated verification is product experience review using:

- `docs/active/project/evidence/v1_mainline_closeout/acceptance-report.html`
- `docs/active/project/evidence/v1_mainline_closeout/report.json`
- `docs/active/project/evidence/v1_mainline_closeout/human-review-checklist.md`
- `docs/active/project/evidence/v1_real_site_complex_pages/screenshots/`
