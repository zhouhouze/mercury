# V1 Component Baseline Stage Gate

Date: 2026-06-24
Status: Superseded baseline; current closeout gate is `v1-mainline-closeout.md`

---

## 1. Purpose

This gate freezes the V1 component baseline that existed before the Gemini experience optimization stage.

It is intentionally not a high-fidelity UX gate. Gemini review and the later user-approved launcher / collapse / resize stage have landed back into active docs. Current V1 mainline closeout is governed by:

```text
docs/active/project/stage-gates/v1-mainline-closeout.md
docs/active/project/stage-gates/v1-launcher-resize-interaction.md
docs/active/project/stage-gates/v1-gemini-style-pass.md
```

---

## 2. Older Baseline

This superseded V1 interaction baseline was defined by `docs/active/project/interaction-prd/窗口交互_PRD.md` section 0:

```text
No floating ball.
No hover strip.
No in-page collapse entry.
Default right-side in-page chatbot sidebar.
```

The implementation from that baseline:

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
| `FloatingBall` | Content script interaction shell | Accepted for V1 launcher stage | Governed by `v1-launcher-resize-interaction.md` |
| `HoverStrip` | Legacy interaction reference | Not current V1-MC requirement | Do not require unless a later gate reactivates it |
| `CollapseResizeController` | Content script interaction shell | Accepted for V1 launcher stage | Governed by `v1-launcher-resize-interaction.md` |

---

## 4. No-Go

This older baseline no longer blocks the later accepted `V1 Launcher / Collapse / Resize` stage. Any further expansion beyond that stage still requires a new active gate:

- Hover strip as a required product path.
- New standalone Map / Sources pages.
- Real product interaction redesign beyond the current V1 mainline closeout.
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
