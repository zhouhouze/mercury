# Active Documentation

`docs/active` is the only active documentation workspace for the current Navia development stage.

```text
docs/active/
├── project/   Current PRD, architecture, contracts, stage gates, evidence, fixtures
└── modules/   Current module-local design and acceptance packages
```

Historical, completed, superseded, or inactive documents must live under:

```text
docs/history/
```

Do not create additional top-level documentation buckets under `docs/`. If a document becomes active, place it under `docs/active`; if it is no longer active, move it under `docs/history`.

## Current Entry Points

Start here:

```text
docs/active/project/README.md
docs/active/project/AGENT_ONBOARDING.md
docs/active/project/V1_2_AGENT_WORKPACKS.md
docs/active/project/interaction-prd/窗口交互_PRD.md
```

Module development documents live here:

```text
docs/active/modules/runtime/
docs/active/modules/frontend/
```

Implementation directories should keep only code, fixtures, tests, and short README pointers to `docs/active`.
