# Navia V1 Frontend Component Spec For Gemini

Date: 2026-06-24
Purpose: Component-level instructions for Gemini realtime prototype generation

## 1. Corrections From First Gemini Output

The first generated visual missed several required product components. The next prototype must correct these issues:

- Add a visible history chat selector or history session panel.
- Move the primary navigation/tool rail to the right side of the Navia panel.
- Keep core page actions visible: read page, summarize, deep Q&A, mindmap.
- Add placeholders for secondary workspaces, not only `Chat` and `Map`.
- Improve the floating ball visual if explored. It must look like a polished browser extension control, not a generic black widget.
- Preserve source evidence states: `located`, `fallback`, `blocked`.
- Keep Debug JSON and Settings present but secondary.

## 2. Required Component Tree

```text
NaviaPanel
  PanelHeader
    Brand
    RuntimeStatus
    SessionHistorySelector
    PageLockState

  MainWorkspace
    ChatWorkspace
      CurrentPageContextCard
      PageActionStrip
      ConversationHistoryInline
      MessageTimeline
      ArtifactPreviewStack
      Composer

    MindmapWorkspace
      EvidenceCardMindmap
      NodeInspector
      SourceEvidencePanel
      ReadingMap

    SourceWorkspace
      SourceList
      LocatedEvidenceCard
      FallbackEvidenceCard
      BlockedEvidenceCard

    DebugWorkspace
      RuntimeHealth
      PageContextJson
      ArtifactTraceJson

    SettingsWorkspace
      RuntimeEndpoint
      ProviderMode
      Diagnostics

  RightToolRail
    Chat
    Map
    Sources
    Debug
    Settings

  OptionalFutureLauncher
    FloatingBall
    HoverStrip
    CollapseControl
```

## 3. Required Navigation Layout

The primary navigation rail must sit on the right edge of the Navia panel:

```text
┌──────────────────────────────┬──────┐
│                              │ Chat │
│       Main workspace          │ Map  │
│                              │ Src  │
│                              │ Deb  │
│                              │ Set  │
└──────────────────────────────┴──────┘
```

Do not place the main navigation as a sparse left rail unless proposing it as a clearly labeled alternative.

## 4. Required History Chat Area

Gemini must include one of these patterns:

Preferred:

```text
PanelHeader
  SessionHistorySelector
    "今天：当前上下文深度问答"
    "昨天：React 文档阅读"
    "上周：论文摘要"
```

Acceptable alternative:

```text
ChatWorkspace
  ConversationHistoryInline
    compact chips or dropdown
```

The history control must not dominate the workspace.

## 5. Required Workspace Placeholders

The prototype must include at least these tabs or rail items:

- Chat
- Map
- Sources
- Debug
- Settings

Optional future candidates:

- Collapse
- Resize
- Floating launcher

Do not add unsupported product features such as RAG, Memory, Web Research, PPT, Deep Research, voice, desktop pet, or browser automation.

## 6. Floating Ball Quality Bar

If Gemini explores a floating ball, it must satisfy:

- Small, refined, and browser-extension-like.
- Has clear open / collapsed state.
- Does not obscure the composer or article text.
- Uses Navia visual tokens, not a generic black pill.
- Shows one clear affordance: open, collapse, or drag.
- Does not replace the current right sidebar unless migration is explicitly specified.

Suggested shape:

```text
48px circular or rounded-square launcher
Subtle shadow
Navia mark or "N"
Optional slim grip marks
Optional tiny runtime dot
```

## 7. Required Evidence States

Source evidence must show:

| State | Meaning | UI requirement |
|---|---|---|
| `located` | DOM highlight available | Green/positive state, source action enabled |
| `fallback` | Text evidence available but DOM highlight failed | Amber/degraded state, fallback copy visible |
| `blocked` | Source action unavailable | Red/blocked state, reason visible |

False-green risk:

```text
fallback must not be shown as successful DOM highlight
```

## 8. Minimum Prototype Screens

The realtime prototype must show:

1. Chat workspace with current page context and session history.
2. Mindmap workspace with selected evidence node.
3. Sources workspace with located / fallback / blocked samples.
4. Debug workspace with compact JSON diagnostics.
5. Settings workspace with runtime endpoint and provider mode.
6. Optional floating ball candidate, clearly labeled as future candidate.

