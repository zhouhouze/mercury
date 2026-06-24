# V1 Gemini Style Pass Gap

Date: 2026-06-24
Status: Active design companion for V1 Gemini style pass

## 1. Purpose

This gap document explains how the accepted Gemini visual direction maps to the current Navia V1 implementation.

The stage target is not to rebuild Navia as the standalone Gemini sandbox. The target is to bring Gemini's visual quality, button design, and state feedback into the existing Chrome extension sidepanel without changing current product scope.

## 2. Current Architecture

```text
Content Script
-> right-side in-page iframe host
-> sidepanel React app
-> Chat / Agent / Debug / Settings
-> Chat artifacts render Evidence Card Mindmap, Reading Map, Source Evidence
```

Current implementation already has:

- Session picker and new session action.
- Right-side tool rail.
- Page read / submit / summary / Mindmap / explain selection actions.
- Chat message timeline and composer.
- Agent capability-boundary placeholder.
- Debug diagnostics.
- Settings provider configuration.
- Evidence Card Mindmap and Reading Map inside Mindmap artifacts.
- Source Evidence with jumpback / fallback behavior.

## 3. Target Architecture

```text
Current sidepanel shell
  + Gemini visual tokens
  + polished right rail buttons
  + current page context card
  + runtime status badge
  + glass panel surfaces
  + explicit source state colors
        |
        v
Same existing user flows
  Chat / Agent / Debug / Settings
  Mindmap artifact
  Reading Map
  Source Evidence
```

No Runtime public contract, Artifact schema, A/C/D boundary, or content-script behavior changes are required.

## 4. Architecture Gap

| Area | Current baseline | Target after this stage | Out of scope |
|---|---|---|---|
| Shell | Functional right sidepanel | Polished reading-assistant visual shell | New product page |
| Header | Compact session picker | Brand + Runtime + history/session + page context clarity | New account/profile system |
| Tool rail | Text buttons | Refined right rail button system | New Map/Sources top-level pages |
| Chat | Existing messages and quick actions | Same flow with clearer context card and button hierarchy | New chat capability |
| Mindmap | Evidence Card / Reading Map already implemented | Same artifact with matching visual language | Canvas Knowledge Map |
| Source Evidence | Existing fallback/highlight semantics | Stronger visual distinction for located / fallback / blocked | New source contract |
| Debug/Settings | Existing secondary views | Same content, visually quieter | Remove diagnostics |
| Launcher/collapse | Not current baseline | Remains review-only | Real launcher/collapse/resize |

## 5. Development And Acceptance Plan

```text
V1-GSP-0 文档门禁
-> V1-GSP-1 Gemini 审查资产落盘
-> V1-GSP-2 样式 token 与按钮系统落地
-> V1-GSP-3 当前网页上下文和 Source Evidence 状态增强
-> V1-GSP-4 类型检查、组件测试、构建
-> V1-GSP-5 真实 Chrome 截图、PRD review、false-green audit
```

Exit condition:

```text
用户在当前右侧 sidepanel 中体验到更完整、更清晰、更专业的 Navia 伴随阅读 UI；
但产品能力、页面结构和运行时合同不扩大。
```

## 6. Review Assets

```text
docs/active/project/design/gemini-v1-frontend-prototype/navia-v1-ux-review.html
docs/active/project/design/gemini-v1-frontend-prototype/navia-v1-component-complete-prototype.html
docs/active/project/evidence/v1_closeout/screenshots/v1-inpage-sidebar.png
```

