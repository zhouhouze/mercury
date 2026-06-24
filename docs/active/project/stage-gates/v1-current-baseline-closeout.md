# V1 Current Interaction Baseline Closeout Gate

Date: 2026-06-24
Status: Active closeout gate

---

## Scope

This gate closes the current active V1 interaction baseline from `docs/active/project/interaction-prd/窗口交互_PRD.md` section 0:

```text
No floating ball.
No hover strip.
No in-page collapse entry.
Default right-side in-page chatbot sidebar.
```

The legacy floating ball / hover strip / collapse states remain product design references and must be reviewed manually after this closeout. They are not claimed as automated V1 completion in this gate.

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

