# V1.3-2/3/4 Native Side Panel Automation Acceptance

Generated at: 2026-06-23

## Scope

This document records the automated acceptance attempt before entering or claiming completion for:

- V1.3-2 Card tree layout and readability
- V1.3-3 Interaction state and source panel
- V1.3-4 DOM jumpback / fallback / blocked state consistency

The acceptance target remains `V1.3 Evidence Card Mindmap experience complete` only. This report does not claim full V1 complete, final in-page floating ball / dual-track panel complete, Canvas Knowledge Map complete, RAG, Memory, Web Research, PPT, Deep Research, multi-agent, voice, browser automation product features, desktop pet, or default local file reading.

## Acceptance Standard Used

The automated gate was tightened before execution:

- Native Side Panel evidence must come from real Chrome Side Panel automation.
- Screenshot metadata must prove real webpage body, Navia Side Panel, Evidence Card Mindmap, source panel, and visible non-empty source evidence text.
- `containsSourcePanel=true` alone is insufficient.
- DOM highlight success and fallback evidence must remain distinguishable.
- V1.3 report generation must not convert blocked native automation into a completion claim.

## Automation Changes Made Before Run

- `apps/chrome-extension/entrypoints/sidepanel/main.tsx`
  - E2E bridge now exposes `sourceEvidenceVisible` and `sourceEvidenceText`.
- `apps/chrome-extension/e2e/chrome-jumpback-closeout.mjs`
  - Screenshot metadata now records visible source evidence text.
  - Added WSL/Windows fallbacks for Windows Chrome CDP launch, PowerShell screenshots, and Windows system shortcut dispatch.
- `apps/chrome-extension/e2e/generate-v1.3-evidence-card-report.mjs`
  - Native samples now require visible non-empty source evidence text.
  - `visualEvidenceStatus` now uses schema-compatible `sampled_pass`, `sampled_fail`, or `not_sampled`.
- `docs/active/project/contracts/v1_3_evidence_card_mindmap.schema.json`
  - Screenshot evidence requires `sourceEvidenceVisible` and `sourceEvidenceText`.
- `scripts/validate_v1_3_evidence_card_mindmap.py`
  - Semantic validation now counts native samples only when visible source evidence text exists.

## Commands Run

Passed:

```bash
npm --prefix apps/chrome-extension run typecheck
npm --prefix apps/chrome-extension test -- mindmap_renderer chat_renderer/tests/ArtifactInlineCard.test.tsx chat_renderer/tests/chatPresentation.test.ts
node --check apps/chrome-extension/e2e/chrome-jumpback-closeout.mjs
node --check apps/chrome-extension/e2e/generate-v1.3-evidence-card-report.mjs
```

Blocked / failed as expected under the tightened native gate:

```bash
npm --prefix apps/chrome-extension run e2e:chrome:v1.3-evidence-card
NAVIA_NATIVE_BROWSER=chrome npm --prefix apps/chrome-extension run e2e:chrome:v1.3-evidence-card
NAVIA_BROWSER_EXECUTABLE="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" npm --prefix apps/chrome-extension run e2e:chrome:v1.3-evidence-card
```

Environment repair attempts:

```bash
npx playwright install-deps
npx playwright install chrome
```

Both repair attempts require sudo password in this environment and could not complete automatically.

## Results

Current generated report:

```text
docs/active/project/evidence/v1_3_evidence_card_mindmap/report.json
```

Current native run blocker:

```text
docs/active/project/evidence/v1_3_evidence_card_mindmap/native-run/blockers/closeout_blocker_1782216206102.json
```

Observed blocker chain:

- Playwright Linux Chromium could not launch because `libnspr4.so` is missing.
- Playwright `channel: "chrome"` could not find Linux Chrome at `/opt/google/chrome/chrome`.
- Installing Linux browser dependencies and Chrome requires sudo password.
- Windows Chrome exists and can expose CDP from WSL.
- Windows Chrome CDP path still cannot connect the Navia native Side Panel bridge; no native screenshot samples were produced.

Final automated result:

```text
V1.3-2/3/4 native automation acceptance: BLOCKED
nativeSidePanelSamples: 0
evidenceCardSamples: 0
fallbackSamples: 1 from report fallback accounting only
completion claim: No completion claim. V1.3 Evidence Card Mindmap remains blocked.
```

## PRD Review

The PRD requires that V1.3 prove the primary Chrome native Side Panel experience, including Evidence Card Mindmap, selected node source evidence, and DOM highlight or fallback evidence. The tightened gate is aligned with that requirement.

The current automated evidence does not satisfy the PRD because it has no fresh native screenshots with visible source evidence text. Existing older screenshots must not be re-used to claim V1.3-2/3/4 after the stricter gate change.

## Audit Opinion

No fatal or major product-spec deviation was introduced by the code changes in this substage. The false-green risk was reduced by making source evidence visibility machine-checkable.

The stage is blocked by local browser automation environment / native Side Panel bridge availability, not by a confirmed product pass.

Decision:

```text
No-Go for V1.3-2/3/4 completion claim.
Do not enter V1.3-5 final exit acceptance.
Continue only after this machine can produce at least 3 real native Side Panel screenshots with visible source evidence text.
```

## Required Next Action

One of the following must be true before development can proceed to a completion claim:

- Install Playwright Linux browser dependencies with sudo and rerun `npm --prefix apps/chrome-extension run e2e:chrome:v1.3-evidence-card`.
- Provide a supported Linux Chrome/Chromium executable path that Playwright can launch with extensions.
- Fix the Windows Chrome CDP native Side Panel bridge path so it produces screenshots and metadata with visible source evidence text.

Until then, V1.3 remains in staged implementation with V1.3-2/3/4 native acceptance blocked.

## 2026-06-23 Chrome For Testing Retest

Additional repair attempt:

```bash
curl -s https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json
curl -L https://storage.googleapis.com/chrome-for-testing-public/150.0.7871.24/win64/chrome-win64.zip -o .tmp/chrome-for-testing/chrome-win64.zip
NAVIA_BROWSER_EXECUTABLE="/mnt/c/workSpace/navia/.tmp/chrome-for-testing/chrome-win64/chrome.exe" npm --prefix apps/chrome-extension run e2e:chrome:v1.3-evidence-card
```

Result:

```text
Chrome for Testing can load the unpacked Navia extension and connect the E2E bridge.
The generated native-run report still fails.
```

New blocker found during visual audit:

- `docs/active/project/evidence/v1_3_evidence_card_mindmap/native-run/screenshots/article-jumpback-after.png` shows the real webpage body on the left.
- The right side is Chrome's built-in Tab Search / "选择标签页" side panel, not Navia's native Side Panel.
- The metadata still marks `containsNaviaPanel=true`, which is a false-green risk.
- The source evidence text remains a static / stale Navia fixture quote that does not exist in the article fixture DOM.
- All five jumpback samples are `fallback_shown`; `domHighlightedCount=0`.

Additional code changes attempted:

- `apps/chrome-extension/e2e/chrome-jumpback-closeout.mjs`
  - Windows Chrome launch now uses Chrome-compatible `C:/...` paths.
  - The script no longer relies on `--disable-extensions-except` for Windows Chrome.
  - Chrome for Testing profile cleanup now kills only processes matching the per-run `navia-closeout-profile-*`.
  - Native Side Panel E2E opening now attempts to bind `sidepanel.html?naviaE2ETabId=<fixtureTabId>` to the fixture tab.
- `services/local-runtime/navia_runtime/app.py`
  - `coreProvider=mock` with page intents now routes through the local adapter path so page tools can emit artifacts instead of plain mock text.
- `services/local-runtime/tests/test_v1_0_0_runtime_skeleton.py`
  - Added a regression test for `coreProvider=mock` + `mindmap_page` artifact creation.

Verification:

```text
node --check apps/chrome-extension/e2e/chrome-jumpback-closeout.mjs: pass
npm --prefix apps/chrome-extension run typecheck: pass
python3 -m py_compile services/local-runtime/navia_runtime/app.py services/local-runtime/tests/test_v1_0_0_runtime_skeleton.py: pass
pytest focused tests: blocked/hung in TestClient streaming response on this machine; not counted as pass
```

Updated audit decision:

```text
No-Go for V1.3-2/3/4 completion claim.
No-Go for V1.3-5 final exit acceptance.
Stop for human review because native screenshot metadata can falsely identify Chrome Tab Search as Navia Panel.
```

Required next action before continuing automated acceptance:

- Fix native Side Panel opening so the visible right-side panel is Navia, not Chrome Tab Search.
- Tighten screenshot metadata collection so `containsNaviaPanel=true` requires a visible Navia-specific marker in the captured screenshot or matching UI accessibility/DOM evidence, not only bridge availability.
- Re-run V1.3 Chrome acceptance and require at least:
  - 3 native Side Panel screenshots showing Navia UI.
  - 3 Evidence Card Mindmap samples.
  - 1 DOM highlight success sample.
  - 1 fallback evidence sample.
  - `report.json`, HTML report, PRD review, and false-green audit all aligned.
