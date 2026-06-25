# V1 Current Interaction Baseline Closeout Gate

Date: 2026-06-24
Status: Superseded baseline gate; current closeout gate is `v1-mainline-closeout.md`

---

## Scope

This gate records the older V1 interaction baseline from `docs/active/project/interaction-prd/窗口交互_PRD.md` section 0:

```text
No floating ball.
No hover strip.
No in-page collapse entry.
Default right-side in-page chatbot sidebar.
```

The user later accepted launcher / collapse / resize as the current V1 mainline target. New work and completion claims must use:

```text
docs/active/project/stage-gates/v1-mainline-closeout.md
docs/active/project/stage-gates/v1-launcher-resize-interaction.md
```

This older gate must not be used to block or contradict the accepted launcher stage.

## Required Evidence

- Chrome extension builds as unpacked MV3.
- Content script injects a right-side in-page Navia sidebar iframe into a normal webpage.
- The iframe renders the existing Navia Side Panel UI.
- V1.4 evidence proves current-page reading, Debug, summary/Q&A, Mindmap, Reading Map, source evidence, DOM highlight, and fallback paths.
- PRD review and false-green audit are written under `docs/active/project/evidence/v1_closeout/`.

## No-Go

- Claiming legacy floating ball / hover strip complete from this gate.
- Claiming Canvas, Memory, RAG, Web Research, PPT, Deep Research, multi-agent, voice, desktop pet, browser automation product feature, or default local file access.
- Using only Chrome native Side Panel evidence without proving in-page sidebar injection.
