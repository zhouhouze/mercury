# V1.12-V1.16 Full Coverage Matrix

Version: V1.16 numbering refresh

| Requirement | V1.13 | V1.14 | V1.15 | V1.16 | Evidence |
|---|---|---|---|---|---|
| Controlled command execution | Required | Consumed | Displayed | External E2E input | runtime evidence artifact |
| Default deny command policy | Required | N/A | Displayed in audit | Must remain enforced | allowlist tests |
| Sanitized logs | Required | Consumed | Displayed | Must validate | redaction summary |
| Snapshot diff | N/A | Required | Displayed | External repo matrix input | diff artifact |
| Changed facts | N/A | Required | Displayed | External repo matrix input | changed fact refs |
| Task memory | N/A | Required | Exported | External repo matrix input | task memory artifact |
| Drift timeline | N/A | Required | Displayed | External repo matrix input | timeline artifact |
| Workbench payload | N/A | N/A | Required | MCP/external evidence displayed | payload artifact |
| HTML workbench | N/A | N/A | Required | MCP/external evidence displayed | HTML output |
| Mermaid | N/A | Optional input | Required display | Required fallback | Mermaid diagram payload |
| Risk lanes | N/A | Derived | Required display | External repo evidence grouped | lane artifacts |
| Blocker board | N/A | Derived | Required display | Structured blockers required | blocker cards |
| Context export | N/A | Derived | Required | Must include schema/MCP refs | export file |
| HTTP parity | Required | Required | Required | Must match MCP and CLI | API tests |
| MCP parity | Facade | Facade | Facade | Real MCP server | MCP parity test |
| CLI parity | Required | Required | Required | Must match MCP and HTTP | CLI command evidence |
| Executable schema validation | N/A | N/A | N/A | Required | schema validation tests |
| External repo E2E | Local repo only | Local repo only | Local repo only | Required matrix | E2E matrix |
