# V1.14 Incremental Intelligence PRD

Legacy alias: V2.14

## 1. Goal

V1.14 makes Navia understand changes between project snapshots, so reviewers can see stable, new, changed, and resolved facts.

## 2. User Story

As a reviewer, I want Navia to tell me what changed since the last scan, which findings are new, which are resolved, and which risks are drifting.

## 3. Requirements

- snapshot diff artifact.
- changed fact records with source artifact IDs.
- task memory artifact summarizing prior accepted context.
- drift timeline artifact.
- historical artifacts remain immutable.

## 4. Non-Goals

- rewriting old artifacts.
- long-term personal memory.
- model-only diff without artifact references.
