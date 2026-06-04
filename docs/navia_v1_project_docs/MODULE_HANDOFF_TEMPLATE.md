# Module Handoff Template

Copy this template into the relevant stage gate or module evidence note when a module is ready for review or Integration.

## Module

```text
Module:
Owner Agent:
Date:
Stage Gate:
```

## Change Summary

```text
Changed files:
Behavior added:
Behavior intentionally not added:
```

## Contract Status

```text
Public API changed: yes/no
Adapter contract changed: yes/no
Data model changed: yes/no
Event type changed: yes/no
If yes, V1.2-0 review path:
```

## Evidence

```text
Unit/contract tests run:
Fixture evidence path:
Real data evidence path:
Chrome evidence path, if applicable:
Trace evidence path, if applicable:
```

## PRD Coverage

```text
Covered PRD IDs:
Not covered:
Reason:
```

## Integration Handoff

```text
Inputs Integration must provide:
Outputs Integration should consume:
Known assumptions:
Known risks:
Stop conditions:
```

## No-Go Self Check

- [ ] I did not edit another module's implementation directory.
- [ ] I did not bypass D Adapter Layer or governance.
- [ ] I did not create ad-hoc event strings.
- [ ] I did not use mock-only evidence as real E2E evidence.
- [ ] I did not introduce V1 out-of-scope features.

