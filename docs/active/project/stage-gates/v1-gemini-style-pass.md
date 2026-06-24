# V1 Gemini Style Pass Stage Gate

Date: 2026-06-24
Status: Active gate for current V1 frontend visual and button-system pass

---

## 1. Stage Goal

This stage applies the accepted Gemini prototype direction to the current implemented V1 sidepanel experience.

It is a style and interaction-feedback pass inside the current product scope. It must not introduce new top-level product pages, a real floating launcher, panel collapse, drag resize, overlay mode, RAG, Memory, Web Research, PPT, Deep Research, multi-agent orchestration, voice, desktop pet, browser automation product features, or default local file access.

Allowed claim after this stage passes:

```text
V1 Gemini style pass for current sidebar baseline complete.
```

Disallowed claims:

```text
Full V1 complete.
Final Monica-like floating ball UX complete.
Floating ball / collapse / resize complete.
Canvas Knowledge Map complete.
V2 Memory / RAG ready.
Web Research / PPT / Deep Research ready.
```

---

## 2. Current Baseline

Current V1 implemented product surface:

```text
Chrome content script
-> right-side in-page iframe sidebar
-> sidepanel.html React app
-> Chat / Agent / Debug / Settings
-> Chat contains current page actions, messages, Evidence Card Mindmap, Reading Map, Source Evidence
```

This stage keeps that structure.

The Gemini sandbox may show launcher, collapse handle, viewport controls, or standalone Sources/Map sections. Those remain review-only unless a later V1.x interaction stage gate explicitly accepts them.

---

## 3. Target Experience

The target user experience after this stage:

- User opens the current right-side Navia sidebar and immediately recognizes it as a polished reading assistant.
- Header clearly shows Navia brand, Runtime status, history/session entry, and current page context state.
- Existing action buttons remain available: read page, submit context, summarize, Mindmap, explain selection.
- Buttons have clear hover, focus, active, disabled, and primary states.
- Chat, Agent, Debug, and Settings remain in the existing right rail.
- Evidence Card Mindmap and Reading Map remain inside Chat artifacts and use the same visual language as the rest of the sidebar.
- Source Evidence visibly distinguishes `located`, `fallback_shown`, and `blocked`.
- Debug and Settings remain usable but visually secondary to reading/chat flows.

---

## 4. Development Plan

| Step | Development target | Output |
|---|---|---|
| `V1-GSP-0` | Freeze this stage gate, target design, gap diagram, and no-go boundaries | PRD / architecture / development / acceptance docs synced |
| `V1-GSP-1` | Land Gemini review assets in active docs | Review HTML, Gemini sandbox HTML, README links |
| `V1-GSP-2` | Apply visual tokens and button system to existing sidepanel | Green brand palette, glass panels, compact buttons, right rail states |
| `V1-GSP-3` | Strengthen current page context and source evidence states | Current page card, Runtime status, source status classing |
| `V1-GSP-4` | Verify no scope expansion or UX regression | Typecheck, focused tests, build, Chrome screenshots |
| `V1-GSP-5` | Close acceptance evidence | Acceptance report, PRD review, false-green audit, screenshots |

---

## 5. Acceptance Gate

Must pass:

- [ ] `SideView` remains `chat | agent | debug | settings`; no new real top-level Map or Sources page.
- [ ] Existing Chat flows remain available: session history, new session, page read, submit context, summary, Q&A, Mindmap, explain selection, composer.
- [ ] Existing Agent boundary view remains available and does not imply multi-agent capability.
- [ ] Existing Debug and Settings content remains available.
- [ ] Evidence Card Mindmap, Reading Map, Mermaid fallback/source, and Source Evidence remain visible in Chat artifacts.
- [ ] `located`, `fallback_shown`, and `blocked` source states are visually distinguishable.
- [ ] Runtime public API, Artifact contracts, EvidenceCardViewModel, and ReadingMapViewModel are unchanged.
- [ ] No real floating ball, hover strip, collapse handle, resize, or overlay breakpoint is introduced.
- [ ] Buttons and key text do not overflow at current sidebar width.
- [ ] Real Chrome screenshot evidence covers Chat, Mindmap artifact, Debug, Settings, and Source Evidence fallback or highlight.

Fixed validation commands:

```bash
npm --prefix apps/chrome-extension run typecheck
npm --prefix apps/chrome-extension test -- contentBridge mindmap_renderer ArtifactInlineCard
npm --prefix apps/chrome-extension run build
```

---

## 6. False-Green Risks

No-Go:

- [ ] Only docs or sandbox HTML changed, but real sidepanel UI not changed.
- [ ] New visual style removes session history, page actions, Agent boundary, Debug, Settings, Evidence Card Mindmap, Reading Map, or Source Evidence.
- [ ] Gemini sandbox launcher / collapse / resize appears in the real extension without a new interaction gate.
- [ ] New top-level Map or Sources product page is added under this stage.
- [ ] Source fallback is shown as DOM highlight success.
- [ ] Styling breaks existing `data-testid` selectors or E2E observability.
- [ ] The stage is used to claim full V1 complete.

