# D Core Provider Config

## Goal

Core switching must be configurable so Navia can move between mock, piAgent, and future providers without changing A/B/C/B renderer contracts.

## Environment Contract

Planned environment variables:

```text
NAVIA_AGENT_CORE_PROVIDER=mock | piagent | custom
NAVIA_AGENT_CORE_CONFIG=path/to/config.json
```

Default modes:

| Environment | Provider |
|---|---|
| local unit tests | `mock` |
| V1.2 implementation target | `piagent` |
| fallback | `mock` |
| future extension | `custom` |

## Config File Shape

Planned config shape:

```json
{
  "provider": "piagent",
  "providerOptions": {},
  "toolPolicy": {
    "allowInternalTools": true,
    "allowMcp": false,
    "allowSkill": false,
    "allowExternalApi": false
  }
}
```

## Governance

Config cannot bypass Navia governance:

- `deny_by_default` remains denied.
- approval-required adapters cannot run side effects without approval.
- local file access remains disabled by default.
- browser automation remains out of V1.2 scope.

