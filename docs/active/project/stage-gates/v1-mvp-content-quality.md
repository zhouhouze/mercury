# V1-MVP-CQ Content Quality Prove-out Stage Gate

Status: active documentation gate.

This gate starts because the current MVP baseline is usable and QH expanded acceptance has passed, but product experience still indicates insufficient content understanding quality.

## 1. Allowed Claim

Before implementation:

```text
V1 MVP content quality prove-out ready for staged implementation.
```

After all sub-gates and strict evidence pass:

```text
V1 MVP content quality prove-out passed strict real-site acceptance.
```

## 2. No-Go

- Full V1 complete.
- Final Monica-like UX complete.
- All complex sites high-quality complete.
- Video / audio / image content understood.
- V2 Memory / RAG ready.
- Web Research / PPT / Deep Research ready.
- Any RAG, Memory, Web Research, OCR/VLM/ASR, multi-agent, voice, desktop pet, browser automation product capability, or default local file access.

## 3. Scope

CQ improves current-page content understanding only:

- A Page Reading content role detection, body-density scoring, noise penalty, SourceRef quality.
- Summary, Q&A, and explain-selection grounding against SourceRef / fallbackText.
- C Mindmap semantic theme merge, compact labels, evidence-bound nodes.
- B Renderer evidence relationship display, source-card explanation, narrow sidebar readability.
- Content Script source jumpback semantic consistency and visible marker explanation.

CQ does not add new runtime public contracts. CQ does not understand media streams or image pixels.

## 4. Sub-Gates

| Sub-gate | Goal | Exit condition |
|---|---|---|
| `V1-MVP-CQ-0` | PRD / architecture / development plan / acceptance plan / stage gate / gap companion synced | No fatal / major doc conflict; QH passed is not upgraded to full V1 complete |
| `V1-MVP-CQ-1` | 36+ strict manifest and gold notes frozen | Each sample has expected claims, themes, prohibited noise, required evidence targets |
| `V1-MVP-CQ-2` | A content role and noise hardening | Main content signals are body-first; nav / recommendation / ad / cookie wall cannot dominate digest |
| `V1-MVP-CQ-3` | Summary / Q&A / explain-selection grounding | Outputs are backed by SourceRef / fallbackText or correctly degraded |
| `V1-MVP-CQ-4` | C Mindmap semantic quality | High-level nodes express topics / claims / facts / steps / conclusions and bind evidence |
| `V1-MVP-CQ-5` | B evidence readability | Mindmap and source evidence are readable in narrow sidebar and explain evidence relationship |
| `V1-MVP-CQ-6` | Content Script jumpback semantics | located marker, fallback reason, and blocked reason match selected evidence |
| `V1-MVP-CQ-7` | Strict real-site acceptance | 36+ samples, at least 34 pass, no fatal / major PRD or false-green issue |

## 5. Strict Acceptance Matrix

- At least 36 real samples.
- At least 24 samples selected from QH core regression.
- At least 12 high-risk real pages.
- Each category has at least 6 samples and at least 5 pass.
- Total strict pass is at least 34/36.

Required high-risk coverage:

- Bilibili video detail page.
- Xiaohongshu image/text detail page.
- Guancha or equivalent Chinese news detail page.
- Domestic or international portal homepage.
- Technical documentation / blog long-form page.
- Low-signal page.

## 6. Required Per-Page Fields

```text
pageId
url
site
countryRegion
contentCategory
pageType
loginStatePolicy
goldNotes.expectedMainClaims
goldNotes.expectedMindmapThemes
goldNotes.prohibitedNoiseThemes
goldNotes.requiredEvidenceTargets
contentUnderstandingScore
summaryGroundingRate
qaGroundingRate
mindmapSemanticCoverageRate
noiseLeakageRate
evidenceExplainabilityScore
jumpbackSemanticMatch
summaryGrounding
qaGrounding
selectionExplainResult
mindmapTopNodes
sourceCardOrder
jumpbackResult
screenshotPaths
reportConclusion
```

## 7. Thresholds

- `contentUnderstandingScore >= 0.82`
- `summaryGroundingRate >= 0.88`
- `qaGroundingRate >= 0.85`
- `mindmapSemanticCoverageRate >= 0.85`
- `noiseLeakageRate <= 0.08`
- `evidenceExplainabilityScore >= 0.8`
- `jumpbackSemanticMatch = true`, unless correctly degraded / blocked

## 8. Evidence Package

```text
docs/active/project/design/v1-mvp-content-quality-gap.md
docs/active/project/design/v1-mvp-content-quality-gap.drawio
docs/active/project/evidence/v1_mvp_content_quality/sample-manifest.json
docs/active/project/evidence/v1_mvp_content_quality/gold-notes/
docs/active/project/evidence/v1_mvp_content_quality/report.json
docs/active/project/evidence/v1_mvp_content_quality/acceptance-report.html
docs/active/project/evidence/v1_mvp_content_quality/prd-review.md
docs/active/project/evidence/v1_mvp_content_quality/false-green-audit.md
docs/active/project/evidence/v1_mvp_content_quality/evidence-manifest.json
docs/active/project/evidence/v1_mvp_content_quality/screenshots/
```

`v1_mainline_closeout` may aggregate CQ only after independent CQ evidence passes. It must not replace CQ evidence.

## 9. Fixed Commands

Target commands for implementation stage:

```bash
npm --prefix apps/chrome-extension run typecheck
npm --prefix apps/chrome-extension test -- contentBridge mindmap_renderer ArtifactInlineCard pageContext
npm --prefix apps/chrome-extension run build
NAVIA_REAL_SITE_HEADLESS=1 NAVIA_CHROME_MUTE_AUDIO=1 npm --prefix apps/chrome-extension run e2e:chrome:v1-mvp-content-quality
node apps/chrome-extension/e2e/generate-v1-mvp-content-quality-report.mjs
node apps/chrome-extension/e2e/generate-v1-mainline-closeout-report.mjs
```

If the CQ e2e or report generator does not exist during implementation, `V1-MVP-CQ-7` must fail until it is implemented.

## 10. False-Green Blockers

- QH passed is reused as CQ strict passed.
- Summary / Q&A / Mindmap only restate title, navigation, homepage cards, or site shell.
- A low-signal page is counted as content understanding pass.
- fallback / blocked is reported as located.
- Source marker exists but points to semantically unrelated evidence.
- Screenshot evidence hides text ghosting, overlap, clipping, or source-card confusion.
- Product claims video, audio, image, or unseen-page understanding.
