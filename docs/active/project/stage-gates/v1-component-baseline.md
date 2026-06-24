# V1 Component Baseline Stage Gate

Date: 2026-06-24
Status: Superseded baseline; current implementation gate is `v1-gemini-style-pass.md`

---

## 1. Purpose

This gate freezes the V1 component baseline that existed before the Gemini experience optimization stage.

It is intentionally not a high-fidelity UX gate. Gemini review has now landed back into active docs. Current style and button-system implementation is governed by:

```text
docs/active/project/stage-gates/v1-gemini-style-pass.md
```

---

## 2. Current Baseline

The current active V1 interaction baseline is defined by `docs/active/project/interaction-prd/窗口交互_PRD.md` section 0:

```text
No floating ball.
No hover strip.
No in-page collapse entry.
Default right-side in-page chatbot sidebar.
```

Current implementation:

```text
Chrome content script
-> injects right-side iframe host into normal web page
-> iframe loads sidepanel.html
-> sidepanel React app provides Chat / Agent / Debug / Settings tabs
-> Chat supports page reading, submit context, summary, Q&A, Mindmap, Reading Map, source evidence
```

The current evidence is:

```text
docs/active/project/evidence/v1_closeout/report.json
docs/active/project/evidence/v1_closeout/screenshots/v1-inpage-sidebar.png
docs/active/project/evidence/v1_4_reading_map/report.json
```

---

## 3. Component Inventory

| Component | Current owner | Current status | Development boundary |
|---|---|---|---|
| `InPageSidebarHost` | Content script | Implemented baseline | Creates right-side iframe host, applies page layout compensation |
| `SidepanelShell` | B frontend / sidepanel entrypoint | Implemented baseline | Owns topbar, tabs, main pane, tool rail |
| `ChatWorkspace` | B chat renderer + sidepanel entrypoint | Implemented baseline | Messages, turn navigator, composer, quick actions |
| `PageActionStrip` | Sidepanel entrypoint | Implemented baseline | Read page, submit context, summary, Mindmap, selection explanation |
| `DebugWorkspace` | B debug renderer + sidepanel entrypoint | Implemented baseline | Runtime, page, stream, provider and event diagnostics |
| `SettingsWorkspace` | Sidepanel entrypoint | Implemented baseline | Local provider configuration and diagnostics |
| `EvidenceCardMindmap` | B mindmap renderer | Implemented V1.3 | Artifact-local Evidence Card Mindmap |
| `ReadingMap` | B mindmap renderer | Implemented V1.4 | Two-column map navigation from EvidenceCardViewModel |
| `SourceEvidencePanel` | B mindmap renderer | Implemented baseline | textQuote / fallbackText, located / fallback / blocked status |
| `FloatingBall` | Future UX optimization | Not current baseline | Requires Gemini / product review before implementation |
| `HoverStrip` | Future UX optimization | Not current baseline | Requires Gemini / product review before implementation |
| `CollapseResizeController` | Future UX optimization | Not current baseline | Requires explicit V1.x interaction stage gate |

---

## 4. No-Go

Do not start implementation that depends on any of the following unless a later active stage gate explicitly accepts it:

- Floating ball default / drag / snap behavior.
- Hover strip.
- In-page collapse entry.
- Resize handle and push / overlay breakpoint behavior.
- Real product interaction redesign beyond the current Gemini style pass.
- Any claim of final Monica-like UX completion.

Also prohibited:

- RAG, Memory, Web Research, PPT, Deep Research, multi-agent orchestration, voice, desktop pet, browser automation product feature, or default local file access.
- Public Runtime contract changes without a new contract gate.
- B directly calling A/C/D services or generating factual content outside existing Runtime/Artifact flow.

---

## 5. Entry Criteria For Next V1.x Interaction Stage

Before a V1.x interaction expansion such as floating ball, collapse, resize, or overlay starts, active docs must include:

- Product-approved interaction review summary.
- Accepted component target spec.
- Updated interaction state machine.
- Updated acceptance plan and false-green checks.
- Screenshot requirements for desktop and narrow viewport.
- Explicit claim boundary.

Recommended target paths:

```text
docs/active/project/design/v1.x-gemini-ux-review.md
docs/active/project/design/v1.x-interaction-component-target.md
docs/active/project/stage-gates/v1.x-interaction-optimization.md
docs/active/project/evidence/v1_x_interaction_optimization/
```
