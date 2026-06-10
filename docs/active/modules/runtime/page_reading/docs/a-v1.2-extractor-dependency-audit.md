# A-V1.2 Extractor Dependency Audit

版本：A-V1.2-0 Dependency Audit Draft
日期：2026-06-05
状态：No dependency approved yet

## 1. Enforcement Rule

Do not install or import `trafilatura`, `readability-lxml`, `readabilipy`, Mozilla Readability ports, or equivalent third-party extractor dependencies until this audit marks the specific package as:

```text
decision=approved
```

`dom_baseline` remains the only approved baseline and fallback for A-V1.2-0.

## 2. Candidate Audit Table

| Package | Version | License | Transitive dependency risk | Install size | Runtime import cost | 20-page latency | Offline availability | Fallback behavior | Security / privacy notes | Decision |
|---|---|---|---|---|---|---|---|---|---|---|
| `trafilatura` | TBD | TBD | TBD | TBD | TBD | TBD | expected offline after install | fallback to `dom_baseline` | must not send content to network | deferred |
| `readability-lxml` | TBD | TBD | TBD | TBD | TBD | TBD | expected offline after install | fallback to `dom_baseline` | must not send content to network | deferred |
| `readabilipy` | TBD | TBD | TBD | TBD | TBD | TBD | expected offline after install | fallback to `dom_baseline` | must not send content to network | deferred |

## 3. Approval Gate

Before any package can be installed:

- license must be recorded.
- transitive dependency list must be reviewed.
- install size must be measured.
- import cost must be measured.
- extraction latency must be measured on a 20-page smoke set.
- offline behavior must be verified.
- failure must fall back to `dom_baseline`.
- no extractor output may be exposed as final Navia contract output.

## 4. Current Decision

```text
trafilatura: decision=deferred
readability-lxml: decision=deferred
readabilipy: decision=deferred
```

A-V1.2-1+ implementation must not add these dependencies until this document is updated and reviewed.
