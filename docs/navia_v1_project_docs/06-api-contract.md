# Navia / 伴航 V1 API 与事件合同草案

版本：V1.0 API Contract Baseline

---

## 1. Base URL

```text
http://127.0.0.1:17861
ws://127.0.0.1:17861
```

V1 默认只监听 `127.0.0.1`，不得监听 `0.0.0.0`。

本地 Runtime 安全约束：

- CORS / Origin allowlist 只允许 Chrome extension origin 和明确配置的 localhost dev origin。
- 高风险 API 不允许任意网页调用。
- 可选 dev pairing token。
- 普通日志不得打印完整网页正文、选区全文或音频 transcript 全文。

---

## 1.1 API Response Envelope

除 streaming API 外，所有 API 必须返回统一 envelope。

Success:

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "request_id": "req_123"
}
```

Failure:

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "TOOL_PERMISSION_DENIED",
    "message": "Tool is denied by policy.",
    "recoverable": true,
    "details": {}
  },
  "request_id": "req_123"
}
```

约束：

- `request_id` 每个 HTTP 请求唯一。
- `ok=false` 时 `data` 必须为 null。
- `ok=true` 时 `error` 必须为 null。
- `code` 必须来自 ErrorCode enum。

---

## 2. Health

### GET /v1/health

Response:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "runtime": "local"
}
```

---

## 3. Model Status

### GET /v1/models/status

Response:

```json
{
  "intent": {
    "status": "ready",
    "mode": "rule_based",
    "provider": "rule-based"
  },
  "mindmap": {
    "status": "disabled",
    "mode": "mock",
    "provider": "deterministic-fallback-or-local-model"
  },
  "llm": {
    "status": "ready",
    "mode": "mock",
    "provider": "mock-or-local-or-remote-optional"
  },
  "asr": {
    "status": "unavailable",
    "mode": "funasr",
    "endpoint": "local"
  }
}
```

Status values:

```text
ready
not_ready
disabled
unavailable
error
```

Mode values:

```text
mock
rule_based
deterministic
local
remote
funasr
disabled
```

---

## 4. Sessions

### POST /v1/sessions

Request:

```json
{
  "client": "chrome-extension",
  "metadata": {}
}
```

Response:

```json
{
  "session_id": "sess_123",
  "created_at": "2026-05-31T10:00:00Z"
}
```

### GET /v1/sessions/{session_id}

Response:

```json
{
  "session_id": "sess_123",
  "created_at": "2026-05-31T10:00:00Z",
  "updated_at": "2026-05-31T10:05:00Z",
  "activePage": {
    "page_id": "page_123",
    "url": "https://example.com/article",
    "title": "Example Article",
    "domain": "example.com",
    "content_hash": "sha256_...",
    "captured_at": "2026-05-31T10:01:00Z"
  },
  "messages": [],
  "artifacts": [],
  "toolCalls": [],
  "budgetLedger": [],
  "checkpoints": []
}
```

Notes:

- V1.0-G `GET /v1/sessions/{session_id}` is the frontend refresh / reopen recovery API.
- `activePage` is a summary object; full page text remains in Runtime storage and is not returned by default.
- The injected web panel or debug Side Panel may cache `session_id`, but AgentCore state remains owned by Runtime.

---

## 5. Page Context

### POST /v1/page/context

Request:

```json
{
  "session_id": "sess_123",
  "tab_id": 1,
  "url": "https://example.com/article",
  "title": "Example Article",
  "domain": "example.com",
  "captured_at": "2026-05-31T10:00:00Z",
  "headings": [
    {"level": 1, "text": "Main Title"},
    {"level": 2, "text": "Section"}
  ],
  "selected_text": "optional selected text",
  "visible_text": "optional visible text",
  "cleaned_text": "cleaned page text"
}
```

Response:

```json
{
  "page_id": "page_123",
  "content_hash": "sha256_abc",
  "status": "accepted"
}
```

Events:

```json
{"type":"page.context.received","data":{"page_id":"page_123"}}
```

---

## 6. Chat Stream

### POST /v1/chat/stream

V1 决策：`/v1/chat/stream` 使用 SSE，Response Content-Type 必须是 `text/event-stream`。

`/v1/chat/stream` 是 V1 AI 伴读的唯一 AgenticLoop 入口。摘要、基于网页问答、选区解释和 Mindmap 生成在默认用户链路中都应通过 chat turn 触发工具执行；direct artifact API 只能作为后续补充能力，不得绕过 turn / state / governance / trace。

Request:

```json
{
  "session_id": "sess_123",
  "message": "总结这篇文章",
  "source": "typed",
  "page_id": "page_123",
  "request_id": "req_123"
}
```

每个 user message 必须创建一个 `turn_id`。streaming event 复用 AgentEvent envelope，并以 SSE 输出：

```text
event: state.transition
data: {"event_id":"evt_1","session_id":"sess_123","turn_id":"turn_123","request_id":"req_123","type":"state.transition","timestamp":"2026-05-31T10:00:00Z","data":{"from":"waiting_user","to":"detecting_intent"}}
```

Response streaming events 示例：

```json
{"event_id":"evt_1","session_id":"sess_123","turn_id":"turn_123","request_id":"req_123","type":"state.transition","timestamp":"2026-05-31T10:00:00Z","data":{"from":"waiting_user","to":"detecting_intent"}}
{"event_id":"evt_2","session_id":"sess_123","turn_id":"turn_123","request_id":"req_123","type":"intent.detected","timestamp":"2026-05-31T10:00:01Z","data":{"intent":"summarize_page","confidence":0.92}}
{"event_id":"evt_3","session_id":"sess_123","turn_id":"turn_123","request_id":"req_123","type":"budget.checked","timestamp":"2026-05-31T10:00:01Z","data":{"status":"ok"}}
{"event_id":"evt_4","session_id":"sess_123","turn_id":"turn_123","request_id":"req_123","type":"tool.started","timestamp":"2026-05-31T10:00:02Z","data":{"tool_name":"summarize_page","tool_call_id":"tool_123"}}
{"event_id":"evt_5","session_id":"sess_123","turn_id":"turn_123","request_id":"req_123","type":"response.delta","timestamp":"2026-05-31T10:00:03Z","data":{"text":"这篇文章主要..."}}
{"event_id":"evt_6","session_id":"sess_123","turn_id":"turn_123","request_id":"req_123","type":"response.done","timestamp":"2026-05-31T10:00:04Z","data":{"message_id":"msg_123"}}
```

V1.0-0/A/B/C 不同时维护 SSE 和 WebSocket 两套 chat streaming 协议。

V1.0-E 前端消费约束：

- 网页内 AI 面板必须消费 `/v1/chat/stream` SSE；调试 Side Panel 可复用同一协议。
- 未识别 SSE event 必须安全忽略或记录为 debug，不得导致 UI 崩溃。
- Runtime offline、`PAGE_CONTEXT_REQUIRED`、tool failure、Mermaid render failure 必须在 UI 可见。
- Frontend 不得拥有 AgentCore 核心状态；session / turn / tool / artifact 状态以 Runtime 为准。

V1.2 AI 伴读模块约束：

- 网页数据抓取模块只通过 `/v1/page/context` 写入或更新 `session.activePage`。
- 流式渲染模块只消费 SSE AgentEvent，不直接执行工具。
- Mindmap 模块的 Runtime 产物是 Mermaid source artifact，前端负责视觉渲染和 source fallback。
- AgenticLoop ChatBox 模块必须为每个 user message 创建 turn，并确保工具调用经过 StateMachine、Budget、Permission 和 ToolResult envelope。
- MCP / Skill / External API 在 V1.2 只能作为内部 Adapter 注册到 AgenticLoop，不新增前端直连 API。
- Adapter 调用必须映射为既有 ToolResult、ToolCallRecord、ArtifactRecord 和 AgentEvent，不新增自由格式响应。
- 缺少 `session.activePage` 时必须使用 `PAGE_CONTEXT_REQUIRED`，不得返回假 summary、answer 或 mindmap。

---

## 7. Page Summarize

说明：`/v1/page/summarize` 是 direct artifact API，可延后到 V1.0-E。V1.0-0/A/B/C 优先统一走 `/v1/chat/stream` -> tool dispatch。

### POST /v1/page/summarize

Request:

```json
{
  "session_id": "sess_123",
  "page_id": "page_123",
  "style": "structured"
}
```

Allowed styles:

```text
tldr
structured
bullets
project_insight
```

Response:

```json
{
  "artifact_id": "art_123",
  "type": "summary",
  "content": "...",
  "source_page_id": "page_123"
}
```

---

## 8. Page Mindmap

说明：`/v1/page/mindmap` 是 direct artifact API，可延后到 V1.0-E。V1.0-E 应先提供 `headings -> deterministic mindmap` fallback，再接 MindmapModelAdapter。

### POST /v1/page/mindmap

Request:

```json
{
  "session_id": "sess_123",
  "page_id": "page_123",
  "max_depth": 4,
  "max_nodes": 40
}
```

Response:

```json
{
  "artifact_id": "art_456",
  "type": "mindmap",
  "title": "Example Article",
  "root_topic": "文章主题",
  "mermaid": "mindmap\n  root((文章主题))\n    核心观点",
  "nodes_count": 18,
  "warnings": [],
  "source_page_id": "page_123"
}
```

Failure response:

```json
{
  "error": {
    "code": "MERMAID_VALIDATION_FAILED",
    "message": "Mindmap generation failed after one repair attempt."
  }
}
```

---

## 9. ASR Stream

### WS /v1/asr/stream

Client sends audio chunks.

Server events:

```json
{"type":"asr.started","data":{"session_id":"sess_123"}}
{"type":"asr.partial","data":{"text":"总结"}}
{"type":"asr.done","data":{"text":"总结这篇文章","message_id":"msg_456"}}
```

---

## 10. Agent State

### GET /v1/agent/state

Response:

```json
{
  "session_id": "sess_123",
  "state": "waiting_user",
  "current_turn_id": "turn_123",
  "current_tool": null,
  "budget": {
    "model_calls": 1,
    "tool_calls": 1,
    "input_tokens": 3200,
    "output_tokens": 500
  }
}
```

---

## 11. State Machine Mermaid

### GET /v1/agent/state-machine/mermaid

Response:

```json
{
  "mermaid": "stateDiagram-v2\n    [*] --> idle\n    idle --> observing_page: page_context_received"
}
```

---

## 12. Session Trace

### GET /v1/sessions/{session_id}/trace

Response:

```json
{
  "session_id": "sess_123",
  "events": [],
  "tool_calls": [],
  "artifacts": [],
  "budget_ledger": []
}
```

---

## 13. AgentEvent Schema

```ts
type AgentEvent = {
  eventId: string
  sessionId: string
  turnId?: string
  traceId?: string
  requestId?: string
  type: string
  timestamp: string
  data: Record<string, unknown>
}
```

Allowed event types:

```text
state.transition
page.context.received
intent.detected
budget.checked
budget.exhausted
approval.required
approval.approved
approval.rejected
tool.requested
tool.denied
tool.started
tool.done
tool.failed
model.started
model.done
response.delta
response.done
artifact.created
error
```

约束：

- 所有事件必须进入 EventStore。
- `/v1/chat/stream` 和 `/v1/agent/events` 只负责实时推送，不替代 EventStore。
- 执行中事件必须包含 `turnId`。
- `state.transition` 必须包含 `from`、`to`、`event` 或等价 transition cause。
- V1.0-E 不新增 `mermaid.validated`、`mermaid.repaired`、`page.context.missing` 或 `response.error` 事件类型。
- Mermaid validation / repair 详情必须放入 `tool.done.data`、`artifact.created.data.metadata` 或 ArtifactRecord metadata。
- Missing activePage 必须使用既有 `error` event 和 `PAGE_CONTEXT_REQUIRED` 错误码。

---

## 13.1 ToolResult Envelope

所有工具必须返回统一 ToolResult，不允许直接返回自由文本。

```json
{
  "tool_call_id": "tc_123",
  "tool_name": "summarize_page",
  "status": "succeeded",
  "content": {},
  "artifact_ids": ["art_123"],
  "budget_cost": {
    "tool_calls": 1,
    "input_tokens": 1200,
    "output_tokens": 300
  },
  "warnings": []
}
```

Status values:

```text
succeeded
failed
denied
waiting_approval
budget_exceeded
```

---

## 14. Error Contract

Standard error:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Core error codes:

```text
RUNTIME_NOT_READY
SESSION_NOT_FOUND
PAGE_CONTEXT_REQUIRED
REQUEST_INVALID
TURN_NOT_FOUND
INTENT_UNKNOWN
TOOL_NOT_FOUND
TOOL_PERMISSION_DENIED
BUDGET_EXCEEDED
BUDGET_EXHAUSTED
CONTEXT_TOO_LARGE
APPROVAL_REQUIRED
APPROVAL_INACTIVE
APPROVAL_REJECTED
MODEL_NOT_READY
MODEL_UNAVAILABLE
FUNASR_NOT_READY
MERMAID_VALIDATION_FAILED
INVALID_TRANSITION
RUNTIME_INTERNAL_ERROR
INTERNAL_ERROR
```

V1.0-E 错误码约束：

- Missing activePage 使用 `PAGE_CONTEXT_REQUIRED`。
- 不引入 `PAGE_CONTEXT_MISSING`，除非同步更新本文件、`07-data-models.md`、AgentEvent schema 和测试。
- Missing activePage 不得生成假 summary、answer 或 artifact。
