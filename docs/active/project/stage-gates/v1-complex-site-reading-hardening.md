# V1 Complex Site Reading Hardening Stage Gate

Date: 2026-06-25

## Stage Goal

This stage repairs the V1 current-page reading quality gap found on complex Chinese sites:

```text
B站 / 小红书 / 观察者网 首页与详情页
-> current page read
-> Debug perception
-> Evidence Card / Reading Map Mindmap
-> source evidence and user-triggered DOM highlight or fallback
```

The baseline evidence is:

```text
docs/active/project/evidence/v1_real_site_complex_pages/report.json
```

The baseline result was `1 pass / 5 degraded / 0 blocked`, with source jumpback highlighted on all sampled pages. Therefore the current defect is primarily A page perception quality and complex DOM signal density, not the source jumpback bridge.

## Scope

In scope:

- Add optional current-page DOM signals to the frontend page-context payload while preserving existing `visible_text` and `cleaned_text`.
- Improve A Page Reading handling for visible feed cards, media DOM metadata, repeated homepage links, auth / verification / 404 states, and low-signal public pages.
- Improve C/B acceptance interpretation so degraded/auth/media-limited pages are not reported as high-quality pass.
- Extend automated evidence for the six-page complex-site matrix.

Out of scope:

- RAG, Memory, Web Research, PPT, Deep Research, multi-agent orchestration.
- OCR, VLM, ASR, video/audio understanding, live stream analysis.
- Scripted login or credential handling.
- Default local file reading or external site APIs.
- Full V1 complete claim.

## Required Implementation Gates

1. `V1-CS-1` Browser and evidence baseline
   - Diagnostic must identify the Navia extension service worker, not Chrome built-in extension workers.
   - Report must include browser mode and login state policy.
   - Public profile / no-login runs cannot be treated as logged-in pass evidence.

2. `V1-CS-2` DOM signal payload
   - `ExtractedPageContext` may include optional `dom_signals`.
   - Existing fields remain backward compatible.
   - DOM signals must come only from current visible DOM and document metadata.

3. `V1-CS-3` A perception hardening
   - Auth, verification, 404 and media-limited pages must be explicitly detected.
   - Feed/homepage cards and repeated links must be de-duplicated into source-backed digest items.
   - Media detail pages may use only DOM-visible title, description, tags, stats, comments or captions.
   - Low-signal public pages must not be marked pass.

4. `V1-CS-4` Mindmap quality interpretation
   - Evidence Card / Reading Map must remain visible when meaningful source-backed nodes exist.
   - Degraded quality must be visible and must not be reported as high-quality success.
   - Main nodes must have `sourceRefIds` or a visible degraded / fallback reason.

5. `V1-CS-5` End-to-end evidence
   - Six-page matrix must produce `report.json`, `acceptance-report.md`, `prd-review.md`, `false-green-audit.md`, and screenshots.
   - Public-state matrix should have `0 blocked`.
   - Logged-in matrix is the only basis for high-quality B站 / 小红书 pass claims.

## Acceptance Threshold

Public no-login matrix:

- `blockedSamples == 0`.
- Auth / verification / 404 pages are detected and reported as degraded/fail with clear reason.
- Source highlight or fallback is recorded for every page that has source cards.
- No completion claim if any page is degraded.

Logged-in matrix:

- At least `5 / 6` samples pass.
- No fatal issue.
- At least `5 / 6` samples have DOM highlight success.
- Every pass page has at least `4` source refs, at least `3` digest items, visible Evidence Card / Reading Map, and auditable source evidence.

Allowed claim after passing:

```text
V1 complex-site current-page reading and Evidence Card Mindmap hardening passed for the scoped matrix.
```

Forbidden claims:

- Full V1 complete.
- Full V1.2 / V1.3 complete unless their own gates are rerun.
- OCR / VLM / ASR / video understanding ready.
- RAG / Memory / Web Research / PPT / Deep Research ready.
