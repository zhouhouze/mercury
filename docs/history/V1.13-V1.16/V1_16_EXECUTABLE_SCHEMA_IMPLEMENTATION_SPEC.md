# V1.16 Executable Schema Implementation Spec

Version: V1.16-1 implementation spec

Legacy alias: V2.16

## 1. Goal

V1.16-1 turns the public evidence artifact contract into executable validation.

Validation must run before persistence. Invalid artifacts must fail without writing partial rows.

## 2. Expected Implementation Area

Primary code area:

```text
services/local-runtime/navia_runtime/v2/
```

Recommended files:

```text
schemas.py
schema_validator.py
artifacts.py
```

Recommended tests:

```text
services/local-runtime/tests/test_v2_16_schema_validation.py
```

File names may remain `v2` as technical package names. They are not canonical project-stage numbers.

## 3. EvidenceArtifactEnvelope

Required fields:

| Field | Type | Required | Rule |
|---|---|---|---|
| `artifactId` | string | yes | starts with `v2art_` or future accepted prefix |
| `artifactType` | string | yes | one of public artifact types |
| `schemaVersion` | string | yes | semantic schema version, not empty |
| `projectId` | string | yes | not empty |
| `snapshotId` | string | no | optional snapshot link |
| `parentArtifactIds` | string[] | yes | defaults to empty list |
| `createdAt` | string | yes | ISO datetime |
| `source` | enum | yes | `http`, `cli`, `mcp`, or `system` |
| `payload` | object | yes | validated by artifact type |
| `evidenceRefs` | object[] | yes | defaults to empty list |
| `warnings` | string[] | yes | defaults to empty list |

Invalid examples:

- missing `payload`;
- unknown `source`;
- `parentArtifactIds` is not a list;
- `schemaVersion` is empty.

## 4. Payload Schemas

### RuntimeEvidencePayload

Required:

```text
commandId
allowlistRuleId
command
cwdPolicy
exitCode
startedAt
completedAt
stdoutPreview
stderrPreview
sanitized
redactionSummary
```

Rules:

- `command` is a non-empty string list.
- `cwdPolicy` is `repo_root` or `fixture_root`.
- `stdoutPreview` and `stderrPreview` are bounded strings.
- `sanitized=true` is required for persisted runtime evidence.

### SnapshotDiffPayload

Required:

```text
previousSnapshotId
currentSnapshotId
stableFactIds
newFactIds
changedFactIds
resolvedFactIds
driftTimelineId
```

Rules:

- fact ID fields are string arrays.
- previous and current snapshot IDs must differ.

### ChangedFactsPayload

Required:

```text
changedFacts
```

Each changed fact requires:

```text
factId
changeType
sourceArtifactIds
summary
```

Rules:

- `sourceArtifactIds` must be non-empty.
- `changeType` is `stable`, `new`, `changed`, or `resolved`.

### TaskMemoryPayload

Required:

```text
memoryId
sourceArtifactIds
summary
openRisks
nextActions
```

Rules:

- every memory item must be artifact-backed.

### DriftTimelinePayload

Required:

```text
timelineId
events
```

Each event requires:

```text
eventId
snapshotId
artifactIds
eventType
summary
```

Rules:

- `artifactIds` must be non-empty unless the event is an accepted structured blocker.

### WorkbenchPayload

Required:

```text
workbenchId
sourceArtifactIds
riskLanes
blockerBoard
mermaidDiagrams
contextExport
```

Rules:

- visible risk and blocker facts must reference `sourceArtifactIds` or `evidenceRefs`.
- Mermaid failures must show source fallback, not disappear.

## 5. Validator API

Recommended Python API:

```python
validate_artifact_envelope(artifact: dict) -> None
validate_payload(artifact_type: str, payload: dict) -> None
```

Failure returns / raises a structured validation error:

```json
{
  "code": "SCHEMA_VALIDATION_FAILED",
  "message": "payload.command is required",
  "recoverable": true,
  "requestId": "req_xxx"
}
```

## 6. Acceptance Tests

V1.16-1 passes only when:

- every public payload type has a valid artifact test;
- every public payload type has at least one invalid rejection test;
- invalid artifact persistence does not create a row;
- V1.13-V1.15 tests still pass.
