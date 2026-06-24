# Recommended Gemini Prompt

Use this prompt with the files in this folder.

```text
You are reviewing and improving the frontend interaction design for Navia, a Chrome companion-reading MVP.

Read these local files as the complete review pack:

1. README.md
2. page-tree.md
3. review-brief.md
4. navia-v1-prototype.html
5. prototype.css
6. prototype.js
7. component-spec.md
8. navia-v1-component-complete-prototype.html

Task:
Generate an improved high-fidelity frontend webpage prototype for Navia V1.

Important product context:
- Navia is a Chrome extension companion-reading assistant, similar in spirit to Monica, but the current implemented baseline is a right-side in-page sidebar.
- The current V1 baseline is: no floating ball, no hover strip, no in-page collapse entry, default right-side chatbot sidebar.
- The older floating ball / hover strip / collapse / resize interaction may be explored only as a future candidate. Do not silently treat it as already accepted.
- The product must focus on page reading, summary, Q&A, Evidence Card Mindmap, Reading Map, source evidence, Debug JSON, and settings.

Hard constraints:
- Do not add RAG, Memory, Web Research, PPT, Deep Research, multi-agent orchestration, voice, desktop pet, browser automation product features, or default local file access.
- Do not turn this into a marketing landing page.
- Do not create a generic SaaS dashboard. It must remain a Chrome companion-reading sidebar experience.
- Keep Debug JSON secondary to the main user flow.
- Make source evidence states explicit: located, fallback, blocked.
- Include a visible history chat selector or compact history session panel.
- Put the primary workspace navigation/tool rail on the right side of the Navia panel.
- Include Chat, Map, Sources, Debug, and Settings workspaces.
- If a floating ball / launcher is explored, make it refined and browser-extension-like. Do not use a generic black pill widget.

What to produce:
1. A revised page/component tree.
2. A high-fidelity HTML/CSS/JS prototype or equivalent frontend prototype code.
3. Desktop and narrow viewport behavior.
4. Interaction state machine for sidebar, chat, mindmap selection, source evidence, and debug view.
5. Acceptance checklist and false-green risks.
6. A short migration plan from the current implemented baseline.

Design direction:
- Quiet, dense, reading-friendly, and professional.
- Prioritize scanability, repeated use, and low distraction.
- Use clear hierarchy, stable dimensions, and readable source evidence.
- Avoid oversized hero sections, marketing copy, decorative gradient backgrounds, and fake metrics.

Review questions:
- Should V1 continue with the right-side default sidebar as the primary interaction?
- Should floating ball / collapse / resize return in the next V1.x stage, and if yes, what is the migration path and acceptance gate?
- What exact screenshots should be required for product acceptance?
```
