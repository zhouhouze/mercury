# V1.0-0 Contract Freeze

版本：V1.0-0 Contract Freeze  
日期：2026-06-01  
状态：P0 前置闭环合同冻结

---

## 1. 冻结范围

本文件冻结 V1.0-0 进入 Runtime Skeleton 开发前必须稳定的最小合同。

冻结项：

- API response envelope。
- ErrorCode enum。
- Runtime ID 规则。
- AgentEvent envelope。
- `/v1/chat/stream` SSE event protocol。
- ToolResult envelope。
- PageContext sample contract。
- EventStore / EventStream interface boundary。

后续 V1.0-0 Runtime Skeleton 代码不得绕过本文件定义的合同。

---

## 2. API Response Envelope

除 streaming API 外，所有 HTTP API 必须返回统一 envelope。

Success:

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "request_id": "req_01HZYT000000000000000001"
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
  "request_id": "req_01HZYT000000000000000001"
}
```

约束：

- `ok=true` 时 `error=null`。
- `ok=false` 时 `data=null`。
- `error.code` 必须来自 ErrorCode enum。
- `request_id` 必须存在。

---

## 3. ErrorCode Enum

V1.0-0 冻结以下错误码：

```text
SESSION_NOT_FOUND
TURN_NOT_FOUND
PAGE_CONTEXT_REQUIRED
REQUEST_INVALID
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
RUNTIME_NOT_READY
RUNTIME_INTERNAL_ERROR
```

---

## 4. Runtime ID Rules

ID 必须使用稳定前缀：

| Entity | Prefix | Example |
|---|---|---|
| request | `req_` | `req_01HZYT000000000000000001` |
| trace | `trace_` | `trace_01HZYT000000000000000001` |
| session | `sess_` | `sess_01HZYT000000000000000001` |
| turn | `turn_` | `turn_01HZYT000000000000000001` |
| message | `msg_` | `msg_01HZYT000000000000000001` |
| page | `page_` | `page_01HZYT000000000000000001` |
| chunk | `chunk_` | `chunk_01HZYT000000000000000001` |
| tool call | `tc_` | `tc_01HZYT000000000000000001` |
| artifact | `art_` | `art_01HZYT000000000000000001` |
| event | `evt_` | `evt_01HZYT000000000000000001` |

关联规则：

- 一个 user message 必须创建一个 `turn_id`。
- 一个 turn 可以包含多个 tool call。
- ToolCallRecord 必须关联 `session_id` 和 `turn_id`。
- ArtifactRecord 必须关联 `turn_id` 和 `tool_call_id`。
- ArtifactRecord 必须包含 `source_page_id` 或显式 `source=null`。
- 执行中 AgentEvent 必须至少关联 `session_id` 和 `turn_id`。

---

## 5. AgentEvent Envelope

所有实时事件和持久化事件使用同一个 envelope：

```json
{
  "event_id": "evt_01HZYT000000000000000001",
  "session_id": "sess_01HZYT000000000000000001",
  "turn_id": "turn_01HZYT000000000000000001",
  "trace_id": "trace_01HZYT000000000000000001",
  "request_id": "req_01HZYT000000000000000001",
  "type": "state.transition",
  "timestamp": "2026-06-01T00:00:00Z",
  "data": {}
}
```

允许的 V1.0-0/A 基础事件类型：

```text
state.transition
intent.detected
budget.checked
tool.started
tool.done
tool.denied
artifact.created
response.delta
response.done
error
page.context.received
```

---

## 6. `/v1/chat/stream` SSE Protocol

V1 冻结 `/v1/chat/stream` 为 SSE：

```text
Content-Type: text/event-stream
```

每条 SSE message 必须使用 AgentEvent envelope：

```text
event: state.transition
data: {"event_id":"evt_01HZYT000000000000000001","session_id":"sess_01HZYT000000000000000001","turn_id":"turn_01HZYT000000000000000001","trace_id":"trace_01HZYT000000000000000001","request_id":"req_01HZYT000000000000000001","type":"state.transition","timestamp":"2026-06-01T00:00:00Z","data":{"from":"waiting_user","to":"detecting_intent"}}
```

约束：

- SSE `event:` 必须等于 AgentEvent `type`。
- SSE `data:` 必须是完整 AgentEvent JSON。
- `/v1/chat/stream` 不返回 API envelope。
- 事件必须同时写入 EventStore；SSE 不替代 EventStore。

---

## 7. ToolResult Envelope

所有工具必须返回统一 ToolResult：

```json
{
  "tool_call_id": "tc_01HZYT000000000000000001",
  "tool_name": "summarize_page",
  "status": "succeeded",
  "content": {},
  "artifact_ids": [],
  "budget_cost": {
    "model_calls": 0,
    "tool_calls": 1,
    "input_tokens": 0,
    "output_tokens": 0,
    "context_bytes": 0,
    "runtime_ms": 12
  },
  "warnings": []
}
```

约束：

- 工具不得直接返回自由文本。
- `tool.started` 只能在 budget 和 permission 检查通过后产生。
- `read_local_file` deny 时不得产生 `tool.started`。
- high-risk tool 审批前不得进入 `running`。

---

## 8. EventStore / EventStream Boundary

`EventStore` 和 `EventStream` 必须分离。

EventStore：

- 负责持久化或内存保存事件。
- 服务 trace、replay、audit、V2 异步蒸馏。
- V1.0-0 Runtime Skeleton 可以使用 InMemoryEventStore。

EventStream：

- 负责实时推送给 Side Panel 或 Debug UI。
- 可以复用 AgentEvent envelope。
- 不能作为 trace 的唯一数据源。

禁止：

- 只有 SSE / EventStream，没有 EventStore。
- Trace API 从 EventStream 读取。
- UI-only event 状态被当作 AgentCore 状态。

---

## 9. P0 闭环结论

本合同冻结文件与 `schemas/`、`samples/`、`fixtures/real_pages/` 一起闭环 V1.0-0 P0 前置合同风险。

进入 Runtime Skeleton 开发时，代码必须以这些合同为实现依据；如果需要改变本文件中的 wire shape、ID 规则、事件类型或 ToolResult 结构，必须回到 stage-gate 审计阶段重新评估。
