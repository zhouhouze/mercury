# V1.12-V1.16 Artifact Schema And Public Contract

Version: V1.16 numbering refresh

## 1. Public Artifact Envelope

```ts
type EvidenceArtifactEnvelope = {
  artifactId: string
  artifactType: string
  schemaVersion: string
  projectId: string
  snapshotId?: string
  parentArtifactIds: string[]
  createdAt: string
  source: "http" | "mcp" | "cli" | "system"
  payload: Record<string, unknown>
  evidenceRefs: EvidenceRef[]
  warnings: string[]
}
```

## 2. EvidenceRef

```ts
type EvidenceRef = {
  artifactId: string
  path?: string
  line?: number
  commandId?: string
  redacted: boolean
  quote?: string
}
```

## 3. V1.13 Runtime Evidence

```ts
type RuntimeEvidencePayload = {
  commandId: string
  allowlistRuleId: string
  command: string[]
  cwdPolicy: "repo_root" | "fixture_root"
  exitCode: number
  startedAt: string
  completedAt: string
  stdoutPreview: string
  stderrPreview: string
  sanitized: boolean
  redactionSummary: string[]
}
```

## 4. V1.14 Incremental Intelligence

```ts
type SnapshotDiffPayload = {
  previousSnapshotId: string
  currentSnapshotId: string
  stableFactIds: string[]
  newFactIds: string[]
  changedFactIds: string[]
  resolvedFactIds: string[]
  driftTimelineId: string
}
```

## 5. V1.15 Workbench

```ts
type WorkbenchPayload = {
  workbenchId: string
  sourceArtifactIds: string[]
  riskLanes: RiskLane[]
  blockerBoard: BlockerCard[]
  mermaidDiagrams: MermaidDiagram[]
  contextExport: ContextExport
}
```

## 6. Contract Rules

- Public artifact IDs are stable and immutable.
- Payload schemas are versioned.
- All workbench visible facts must reference `sourceArtifactIds` or `evidenceRefs`.
- HTTP, MCP, and CLI must return equivalent artifact envelopes and structured errors for equivalent operations.
- HTTP, MCP, and CLI artifact IDs may differ by channel, but every returned artifact must be persisted, schema-valid, and retrievable.
- HTTP, MCP, and CLI parity requires equivalent `artifactType`, `schemaVersion`, `projectId`, payload status, parent artifact references, evidence refs, and structured error code.
