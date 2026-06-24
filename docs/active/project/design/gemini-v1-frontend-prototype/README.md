# Navia V1 Frontend Prototype Review Pack

Date: 2026-06-24
Status: Review input for Gemini UX optimization

This folder is a self-contained frontend review pack for Navia V1. It is meant to help Gemini generate and improve a frontend web prototype without reading the whole repository.

## Files

| File | Purpose |
|---|---|
| `navia-v1-prototype.html` | Standalone browser prototype for the current V1 companion-reading sidebar |
| `navia-v1-component-complete-prototype.html` | More complete component prototype with right rail, history selector, source states, and launcher candidate |
| `navia-v1-ux-review.html` | Review page that links approved concept docs, current evidence, and the Gemini prototype |
| `prototype.css` | Visual system and responsive layout tokens |
| `prototype.js` | Prototype-only interactions and state switching |
| `page-tree.md` | Frontend page, state, and component tree for independent review |
| `review-brief.md` | Product, architecture, constraints, acceptance, and no-go summary |
| `component-spec.md` | Required component coverage and corrections for Gemini |
| `gemini-prompt.md` | Recommended prompt for Gemini |

## How To Review

Open `navia-v1-prototype.html` in a browser. No build step is required.

The prototype intentionally models the current V1 baseline:

```text
Normal web page
-> Chrome extension content script
-> right-side in-page iframe sidebar
-> Navia sidepanel app
-> Chat / Mindmap / Debug / Settings
```

The older floating ball, hover strip, collapse, and resize model is not treated as the current implementation target. Gemini may propose whether those interactions should return, remain deferred, or be replaced.

## Current Claim Boundary

This pack may support:

```text
V1 frontend interaction optimization planning
```

It must not be used to claim:

```text
Full V1 complete
Final Monica-like floating ball UX complete
RAG / Memory / Web Research / PPT / Deep Research readiness
```
