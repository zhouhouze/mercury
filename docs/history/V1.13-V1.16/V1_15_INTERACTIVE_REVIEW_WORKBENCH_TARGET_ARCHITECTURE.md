# V1.15 Interactive Review Workbench Target Architecture

Legacy alias: V2.15

## 1. Flow

```text
artifact store
  -> workbench payload builder
  -> risk lane builder
  -> blocker board builder
  -> Mermaid builder
  -> context export builder
  -> HTML renderer
```

## 2. Components

| Component | Responsibility |
|---|---|
| WorkbenchPayloadBuilder | assemble artifact-backed payload |
| RiskLaneBuilder | group risks by severity/status |
| BlockerBoardBuilder | expose blockers and next actions |
| MermaidBuilder | render architecture / drift diagrams |
| ContextExportBuilder | export reviewer-ready context |
| HtmlRenderer | generate static review workbench |

## 3. Source-of-Truth Rule

The workbench reads persisted artifacts only. Runtime console output, transient memory, or model text cannot be the source for visible facts unless persisted as an artifact first.
