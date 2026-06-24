# V1 Launcher / Collapse / Resize Interaction Gap

Date: 2026-06-24
Status: Active design companion

## Current Architecture

```text
Content Script
-> right-side iframe sidebar host
-> sidepanel.html React app
-> Chat / Agent / Debug / Settings
```

## Target Architecture

```text
Content Script Interaction Shell
  Floating Launcher
    - click toggles expanded / collapsed
    - drag changes top position and edge
  Sidebar Host
    - expanded / collapsed state
    - resize handle
    - push / overlay layout mode
  iframe sidepanel.html
    - unchanged current React app
    - Chat / Agent / Debug / Settings
    - Evidence Card Mindmap / Reading Map / Source Evidence
```

## Gap

| Area | Before | Target |
|---|---|---|
| Launcher | Review-only in Gemini sandbox | Real content-script floating launcher |
| Collapse | Not implemented | Launcher collapses / expands sidebar |
| Resize | Fixed sidebar width | Drag handle changes width within safe bounds |
| Layout mode | Always pushes page margin | Push on normal width, overlay on wide/narrow width |
| State | No interaction state | Local state machine persisted in browser localStorage |
| Sidepanel app | Existing React app | Unchanged behavior and routes |

## Exit Condition

User can control Navia from the webpage surface while keeping all current sidepanel reading features available.
