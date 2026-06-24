# Navia V1 Frontend Review Brief

## Product

Navia is a Chrome companion-reading MVP. The user reads a webpage while Navia provides a right-side AI assistant for page reading, summarization, question answering, evidence-backed mindmaps, source fallback, Debug JSON, and settings.

The closest product reference is Monica-like browser assistance, but the current implemented V1 baseline is simpler and more conservative.

## Current Baseline

```text
No floating ball.
No hover strip.
No in-page collapse entry.
Default right-side in-page chatbot sidebar.
```

Implemented flow:

```text
Chrome content script
-> injects right-side iframe host into a normal webpage
-> iframe loads sidepanel.html
-> React sidepanel app renders Chat / Agent or Mindmap / Debug / Settings tabs
-> Runtime reads current page and returns summary, Q&A, mindmap, and source evidence artifacts
```

## Core UX Goal

Improve the V1 frontend experience so a user can:

1. Understand that Navia is reading the current page.
2. Trigger page reading, summary, Q&A, and mindmap from the side panel.
3. Inspect Evidence Card Mindmap and Reading Map outputs.
4. Select a node and see source evidence.
5. Distinguish successful DOM highlight from fallback or blocked source evidence.
6. Use Debug JSON without confusing it with the primary user workflow.

## Architecture Boundaries

Frontend B renderer may:

- Render chat, artifacts, debug, settings, Evidence Card Mindmap, Reading Map, and source panels.
- Derive frontend view models from existing Runtime artifact records.
- Display source fallback and jumpback state.

Frontend B renderer must not:

- Call A/C/D services directly.
- Generate factual content itself.
- Change Runtime public APIs for purely visual work.
- Introduce RAG, memory, web research, PPT, deep research, multi-agent behavior, voice, desktop pet, browser automation product features, or default local file reading.

## Prototype Evaluation Questions

- Is the sidebar too visually heavy for long reading sessions?
- Can the user tell which page has been read?
- Are page actions discoverable without feeling like a marketing landing page?
- Are Evidence Card Mindmap and Reading Map clearly different but related?
- Does Debug JSON feel secondary and developer-oriented?
- Should the future UX return to floating ball / collapse / resize, or should the default sidebar remain primary?
- What desktop and narrow viewport behavior should become the next stage gate?

## Acceptance Ideas For The Next UX Stage

- Desktop screenshot: sidebar open on a content-heavy webpage.
- Desktop screenshot: chat with summary and source-backed answer.
- Desktop screenshot: Evidence Card Mindmap with selected node and source panel.
- Desktop screenshot: Reading Map with selected section detail.
- Debug screenshot: Runtime online and Debug JSON visible.
- Narrow viewport screenshot: defined behavior, either overlay or dedicated panel mode.
- False-green check: do not accept a generic dashboard mockup that cannot map to Navia page-reading flows.
- False-green check: do not accept floating-ball-only designs unless current baseline and migration path are documented.

