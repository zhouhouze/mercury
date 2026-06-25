# V1 Launcher / Collapse / Resize Interaction Stage Gate

Date: 2026-06-24
Status: Active implementation gate after user approval

## 1. Stage Goal

This stage promotes the Gemini launcher / collapse / resize interaction from review-only prototype material into the real Chrome content-script surface.

Target user experience:

```text
普通网页
-> Navia 默认只显示贴边 launcher，不展开右侧 in-page sidebar
-> 用户 hover / focus 后 launcher 从边缘弹出为完整悬浮球
-> 用户可点击 floating launcher 展开 / 收起 sidebar
-> 用户可拖拽 launcher 改变其垂直位置并贴近左右边缘
-> 用户可拖拽 sidebar 左边界 resize
-> sidebar 根据宽度和视口进入 push 或 overlay 布局
-> sidepanel iframe 内既有 Chat / Agent / Debug / Settings 体验不丢失
```

## 2. Scope

Allowed:

- Floating launcher visual control.
- Docked low-interruption launcher default state.
- Hover / focus launcher peek state.
- Sidebar expanded / collapsed state.
- Drag-to-position launcher.
- Drag-to-resize sidebar width.
- Push / overlay layout mode derived from width and viewport.
- Local UI state persisted in browser `localStorage`.

Not allowed:

- RAG, Memory, Web Research, PPT, Deep Research, multi-agent orchestration, voice, desktop pet, browser automation product features, or default local file access.
- Changing Runtime public API, Artifact contracts, EvidenceCardViewModel, or ReadingMapViewModel.
- Removing current Chat / Agent / Debug / Settings, Mindmap, Reading Map, Source Evidence, Debug, or Settings flows.

## 3. Acceptance

Must pass:

- [ ] Default state shows only a docked launcher and does not open or push the current right-side sidebar.
- [ ] Floating launcher is visible and styled as Navia, not as a generic black widget.
- [ ] Launcher hover / focus peeks the full launcher from the page edge.
- [ ] Launcher click expands the sidebar; a second click collapses it.
- [ ] No duplicate edge toggle / bar control appears outside the sidebar.
- [ ] Collapsed state restores page body margin.
- [ ] Expanded push state reserves page width.
- [ ] Wide or narrow state switches to overlay and does not continue pushing page content.
- [ ] Resize handle changes sidebar width within min/max constraints.
- [ ] Launcher drag updates vertical position and left/right edge.
- [ ] Existing page extraction and source jumpback still work.
- [ ] Existing frontend tests and build pass.

Fixed validation commands:

```bash
npm --prefix apps/chrome-extension run typecheck
npm --prefix apps/chrome-extension test -- contentBridge mindmap_renderer ArtifactInlineCard
npm --prefix apps/chrome-extension run build
```

Allowed claim:

```text
V1 launcher / collapse / resize interaction baseline complete.
```

Disallowed claim:

```text
Full V1 complete.
Final Monica-like UX complete.
RAG / Memory / Web Research / PPT / Deep Research ready.
```
