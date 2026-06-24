# V1 Current Component Baseline

Date: 2026-06-24
Status: Pre-development baseline for V1 component work

---

## 1. Baseline Decision

V1 currently uses a pragmatic in-page sidebar baseline:

```text
Normal web page
-> Chrome content script
-> right-side fixed iframe host
-> sidepanel.html React app
-> Chat / Agent / Debug / Settings
```

This baseline is intentionally separate from the older floating-ball / hover-strip target. The older interaction model remains a design reference until Gemini review returns an updated target.

---

## 2. Component Architecture

```text
Content Script Layer
  InPageSidebarHost
    - creates iframe host
    - loads sidepanel.html?naviaInPage=1
    - applies body margin-right compensation
    - keeps PageContext and jumpback bridge active

Sidepanel App Layer
  SidepanelShell
    - topbar
    - session picker
    - tab rail
    - view switcher

  ChatWorkspace
    - message list
    - conversation turns
    - TurnNavigator
    - composer
    - PageActionStrip

  Artifact Surfaces
    - Summary / Answer cards
    - EvidenceCardMindmap
    - ReadingMap
    - SourceEvidencePanel

  DebugWorkspace
    - runtime status
    - page state
    - stream state
    - provider diagnostics

  SettingsWorkspace
    - provider setup
    - model defaults
    - diagnostics
```

---

## 3. Current Implementation Map

| Component | Code path | Evidence |
|---|---|---|
| In-page sidebar host | `apps/chrome-extension/src/contentBridge.ts` | `docs/active/project/evidence/v1_closeout/report.json` |
| Content script entry | `apps/chrome-extension/entrypoints/content/index.ts` | `apps/chrome-extension/src/contentBridge.test.ts` |
| Sidepanel shell | `apps/chrome-extension/entrypoints/sidepanel/main.tsx` | V1 closeout screenshot |
| Sidepanel styles | `apps/chrome-extension/entrypoints/sidepanel/style.css` | V1 / V1.4 screenshots |
| Chat renderer | `apps/chrome-extension/src/modules/chat_renderer/` | frontend tests |
| Mindmap renderer | `apps/chrome-extension/src/modules/mindmap_renderer/` | V1.3 / V1.4 reports |
| Artifact renderer | `apps/chrome-extension/src/modules/artifact_renderer/` | V1.3 / V1.4 reports |
| Runtime client | `apps/chrome-extension/src/runtimeClient.ts` | Runtime health and E2E |

---

## 4. Current UI States

Current baseline states:

- Extension loaded and content script active.
- Right-side in-page iframe visible.
- Page body layout compensated by right margin.
- Navia iframe renders sidepanel app.
- Runtime offline state visible.
- Runtime online state supports page reading and chat actions.
- Mindmap and Reading Map render as artifacts after Runtime response.

Not current baseline:

- Floating ball default state.
- Hover strip.
- Collapse / restore.
- Drag-to-resize.
- Push / overlay breakpoint transitions.
- Mobile or narrow viewport final behavior.

---

## 5. Development Rules

Allowed before Gemini UX update:

- Bug fixes that keep current component boundaries.
- Accessibility and text overflow fixes.
- Runtime status clarity.
- Evidence Card / Reading Map readability fixes.
- Test and report hardening.

Not allowed before Gemini UX update:

- Replacing the current shell with a new visual system.
- Adding floating ball as an assumed final target.
- Adding collapse / resize without updated PRD and acceptance gate.
- Renaming public contracts or changing Runtime APIs for presentation-only work.

---

## 6. Gemini Review Handoff

Gemini should review:

- `docs/active/project/interaction-prd/窗口交互_PRD.md`
- `docs/active/project/evidence/v1_closeout/screenshots/v1-inpage-sidebar.png`
- `docs/active/project/evidence/v1_4_reading_map/screenshots/`
- `docs/active/project/design/v1-current-component-baseline.md`

Expected Gemini outputs:

- Target interaction model.
- Component-level visual hierarchy.
- Desktop and narrow viewport behavior.
- Whether floating ball returns, remains deferred, or is replaced.
- Acceptance screenshots required for product approval.

After Gemini review, update active docs before implementation:

```text
docs/active/project/interaction-prd/窗口交互_PRD.md
docs/active/project/design/v1-current-component-baseline.md
docs/active/project/stage-gates/v1-component-baseline.md
docs/active/project/04-acceptance-plan.md
```

