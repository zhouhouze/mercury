# Navia V1 Frontend Page Tree

This tree describes the frontend structure Gemini should use when improving the prototype.

## 1. Host Page

```text
HostWebPage
  PageArticle
    Header
    ArticleBody
    InlineCode
    EvidenceParagraphs
  NaviaInPageSidebarHost
    IframeBoundary
      SidepanelApp
```

The host page exists to show how Navia affects a real webpage. The current baseline pushes page content left by reserving a right-side area for the sidebar.

## 2. Sidepanel App

```text
SidepanelApp
  TopBar
    BrandLockup
    RuntimeStatus
    SessionMenu
  Workspace
    PrimaryRail
      ChatTab
      MindmapTab
      DebugTab
      SettingsTab
    MainPane
      ChatWorkspace | MindmapWorkspace | DebugWorkspace | SettingsWorkspace
```

## 3. Chat Workspace

```text
ChatWorkspace
  PageContextCard
    CurrentPageTitle
    PageSignalStatus
    SourceCoverage
  PageActionStrip
    ReadPage
    Summarize
    AskPage
    GenerateMindmap
  MessageTimeline
    UserMessage
    AssistantMessage
    ArtifactInlineCard
  Composer
    Input
    ContextToggle
    SendAction
```

## 4. Mindmap Workspace

```text
MindmapWorkspace
  EvidenceCardMindmap
    TopicNode
    EvidenceNode
    DegradedNode
    NodeConnections
  SourceEvidencePanel
    TextQuote
    FallbackText
    SourceRefIds
    JumpbackStatus
  ReadingMap
    SectionList
    SelectedSectionDetail
    EvidenceSummary
```

## 5. Debug Workspace

```text
DebugWorkspace
  RuntimeHealth
  CurrentPageContext
  DebugJson
  ArtifactTrace
```

## 6. Settings Workspace

```text
SettingsWorkspace
  RuntimeEndpoint
  ProviderMode
  Diagnostics
  PrivacyBoundary
```

## 7. Current States

```text
LoadedOffline
LoadedOnline
PageUnread
PageRead
SummaryReady
AnswerReady
MindmapReady
EvidenceSelected
JumpbackLocated
JumpbackFallback
JumpbackBlocked
```

## 8. Future Candidate States

These are not current baseline states and require product review before implementation:

```text
FloatingBallCollapsed
HoverStripPreview
PanelCollapsed
PanelResizePush
PanelResizeOverlay
NarrowViewportOverlay
```

