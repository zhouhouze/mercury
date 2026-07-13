# V2 Knowledge Error Codes

This file is a documentation-stage error taxonomy for `V2 Memory / Personal Knowledge Base`.
It must be frozen in `V2-0` before V2-1 implementation starts.

| Code | Retryable | User visible action | Meaning |
|---|---:|---|---|
| `RUNTIME_OFFLINE` | yes | Start Runtime / retry / open Debug | Frontend inferred Runtime transport failure. Runtime cannot return this code while offline. |
| `ADAPTER_NOT_CONFIGURED` | yes | Open Settings | V2 Adapter / Governance is not configured. |
| `ADAPTER_BLOCKED` | no | Review policy reason | Governance policy blocked a knowledge operation. |
| `DATA_SERVICE_UNREACHABLE` | yes | Reconnect / check service | Candidate data_service did not respond through the configured boundary. |
| `DATA_SERVICE_AUTH_REQUIRED` | yes | Configure credential | Candidate data_service requires auth or token refresh. |
| `DATA_SERVICE_VERSION_MISMATCH` | no | Upgrade or pin supported version | Candidate data_service API is incompatible with the locked V2 adapter contract. |
| `PERMISSION_REQUIRED` | yes | Grant explicit root | Local source operation requires user permission. |
| `SOURCE_ALREADY_EXISTS` | yes | Open existing source / save revision | Idempotency or deduplication found an existing source. |
| `SOURCE_NOT_FOUND` | no | Refresh source library | Source id does not exist or was forgotten. |
| `SOURCE_BUILD_FAILED` | yes | Retry build / view degraded reason | Ingest or build job failed. |
| `TRACE_UNAVAILABLE` | yes | Show fallback evidence | Source trace cannot be produced yet. |
| `EVIDENCE_REQUIRED` | no | Mark answer degraded | Ask / graph output has no supporting evidence refs. |
| `FORGET_VERIFICATION_FAILED` | yes | Retry verification / inspect cache | Source removal could not be verified across Library, Ask, Graph and Trace. |
| `UNSUPPORTED_CAPABILITY` | no | Use fallback route | data_service or mock adapter does not support the requested capability. |
| `VALIDATION_ERROR` | no | Fix request | Request failed schema validation. |
| `TIMEOUT` | yes | Retry / show pending | Operation exceeded timeout budget. |

Rules:

- `RUNTIME_OFFLINE` is frontend-inferred, not returned by `/v1/knowledge/status`.
- Errors from data_service must be mapped to this taxonomy by V2 Adapter / Governance.
- Physical local paths and raw tokens must not appear in user-visible messages.
- `EVIDENCE_REQUIRED` means the UI must show degraded, not success.
