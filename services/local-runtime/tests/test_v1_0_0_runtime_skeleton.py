from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator, FormatChecker

from navia_runtime.agent import TurnRunner
from navia_runtime.app import app, event_store, event_stream, runtime_projection, session_store
from navia_runtime.governance import BudgetExceeded, GovernanceHooks, TurnBudget
from navia_runtime.intent import RuleBasedIntentRouter
from navia_runtime.state_machine import AgentState, InvalidTransition, StateMachine, mermaid_graph
from navia_runtime.stores import SQLiteEventStore, SQLiteSessionStore
from navia_runtime.tools import ToolExecutor, default_tool_registry


ROOT = Path(__file__).resolve().parents[3]
CONTRACTS = ROOT / "docs/active/project/contracts"


def validate(schema_name: str, value: dict) -> None:
    schema = json.loads((CONTRACTS / schema_name).read_text())
    Draft202012Validator(schema, format_checker=FormatChecker()).validate(value)


def parse_sse(raw: str) -> list[tuple[str, dict]]:
    blocks = [block for block in raw.strip().split("\n\n") if block.strip()]
    parsed: list[tuple[str, dict]] = []
    for block in blocks:
        event_line, data_line = block.splitlines()[:2]
        event_name = event_line.split(":", 1)[1].strip()
        data = json.loads(data_line.split(":", 1)[1].strip())
        parsed.append((event_name, data))
    return parsed


def create_session_with_page(client: TestClient, fixture_name: str = "page-context-article.json") -> str:
    session = client.post("/v1/sessions", json={"client": "chrome-extension", "metadata": {}}).json()
    session_id = session["data"]["session_id"]
    sample = json.loads((CONTRACTS / f"samples/{fixture_name}").read_text())
    sample["session_id"] = session_id
    client.post("/v1/page/context", json=sample)
    event_store.events.clear()
    event_stream.published.clear()
    return session_id


def test_contract_samples_validate() -> None:
    validate("api-response.schema.json", json.loads((CONTRACTS / "samples/api-success.json").read_text()))
    validate("api-response.schema.json", json.loads((CONTRACTS / "samples/api-error.json").read_text()))
    validate("page-context.schema.json", json.loads((CONTRACTS / "samples/page-context-article.json").read_text()))
    validate("agent-event.schema.json", json.loads((CONTRACTS / "samples/agent-event-state-transition.json").read_text()))
    validate("agent-event.schema.json", json.loads((CONTRACTS / "samples/eventstore-event.json").read_text()))
    validate("tool-result.schema.json", json.loads((CONTRACTS / "samples/tool-result-summary.json").read_text()))


def test_health_and_models_status_use_api_envelope() -> None:
    client = TestClient(app)
    health = client.get("/v1/health", headers={"x-request-id": "req_test_health"}).json()
    models = client.get("/v1/models/status", headers={"x-request-id": "req_test_models"}).json()

    validate("api-response.schema.json", health)
    validate("api-response.schema.json", models)
    assert health["data"]["status"] == "ok"
    assert models["data"]["intent"]["mode"] == "rule_based"


def test_origin_allowlist_blocks_untrusted_origin() -> None:
    client = TestClient(app)
    response = client.get("/v1/health", headers={"origin": "https://untrusted.example"})
    assert response.status_code == 403
    body = response.json()
    validate("api-response.schema.json", body)
    assert body["ok"] is False


def test_origin_allowlist_allows_chrome_extension_origin_and_preflight() -> None:
    client = TestClient(app)
    origin = "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
    response = client.get("/v1/health", headers={"origin": origin})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin

    preflight = client.options(
        "/v1/page/context",
        headers={
            "origin": origin,
            "access-control-request-method": "POST",
            "access-control-request-headers": "content-type",
        },
    )
    assert preflight.status_code == 204
    assert preflight.headers["access-control-allow-origin"] == origin


def test_state_machine_and_mermaid_contract() -> None:
    sm = StateMachine()
    sm.transition(AgentState.DETECTING_INTENT)
    try:
        sm.transition(AgentState.RUNNING_TOOL)
    except InvalidTransition:
        pass
    else:
        raise AssertionError("invalid transition should fail")

    graph = mermaid_graph()
    assert graph.startswith("stateDiagram-v2")
    assert "waiting_user --> detecting_intent" in graph
    assert "persisting_turn --> waiting_user" in graph


def test_chat_stream_uses_sse_agent_event_and_eventstore_trace() -> None:
    event_store.events.clear()
    event_stream.published.clear()
    client = TestClient(app)

    session_id = create_session_with_page(client)
    response = client.post(
        "/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "总结这篇文章",
            "source": "typed",
            "page_id": "page_000000000000000000000001",
            "request_id": "req_000000000000000000000001",
        },
    )

    assert response.headers["content-type"].startswith("text/event-stream")
    events = parse_sse(response.text)
    assert events
    for event_name, data in events:
        assert event_name == data["type"]
        validate("agent-event.schema.json", data)

    trace = client.get(f"/v1/sessions/{session_id}/trace").json()
    validate("api-response.schema.json", trace)
    event_types = [data["type"] for _, data in events]
    assert "intent.detected" in event_types
    assert "budget.checked" in event_types
    assert "tool.started" in event_types
    assert "tool.done" in event_types
    assert "artifact.created" in event_types
    assert len(trace["data"]["events"]) == len(events)
    assert len(event_stream.published) == len(events)
    assert event_store is not event_stream
    state = client.get("/v1/agent/state").json()
    validate("api-response.schema.json", state)
    assert state["data"]["state"] == "waiting_user"


def test_v1_0_a_intent_router_and_tool_result_contract() -> None:
    router = RuleBasedIntentRouter()
    assert router.detect("总结这篇文章").tool_name == "summarize_page"
    assert router.detect("这个页面为什么提到权限？").tool_name == "answer_from_page"

    hooks = GovernanceHooks()
    executor = ToolExecutor(default_tool_registry(), hooks)
    sample = json.loads((CONTRACTS / "samples/page-context-article.json").read_text())
    result = executor.execute(
        "summarize_page",
        {
            "message": "总结这篇文章",
            "page_id": sample["page_id"],
            "session_id": "sess_01HZYT000000000000000001",
            "turn_id": "turn_01HZYT000000000000000001",
            "active_page": sample,
        },
        "tc_01HZYT000000000000000099",
    )
    validate("tool-result.schema.json", result)
    assert hooks.pre_tool_calls == 1
    assert hooks.post_tool_calls == 1
    assert result["tool_call_id"] == "tc_01HZYT000000000000000099"


def test_v1_0_c_permission_and_budget_block_before_tool_started() -> None:
    hooks = GovernanceHooks()
    executor = ToolExecutor(default_tool_registry(), hooks)

    try:
        executor.authorize("read_local_file")
    except PermissionError:
        pass
    else:
        raise AssertionError("read_local_file must be denied")
    assert hooks.started_tool_calls == 0

    try:
        executor.authorize("summarize_page", TurnBudget(max_tool_calls=0))
    except BudgetExceeded:
        pass
    else:
        raise AssertionError("max_tool_calls=0 must block before tool start")
    assert hooks.started_tool_calls == 0


def test_v1_0_a_trace_contains_tool_result_with_turn_and_session() -> None:
    event_store.events.clear()
    event_stream.published.clear()
    client = TestClient(app)
    session_id = create_session_with_page(client)
    response = client.post(
        "/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "这个页面为什么提到权限？",
            "source": "typed",
            "page_id": "page_01HZYT000000000000000001",
            "request_id": "req_000000000000000000000123",
        },
    )

    events = [data for _, data in parse_sse(response.text)]
    tool_started = next(event for event in events if event["type"] == "tool.started")
    tool_done = next(event for event in events if event["type"] == "tool.done")
    assert tool_started["session_id"] == session_id
    assert tool_started["turn_id"] == tool_done["turn_id"]
    assert tool_started["data"]["tool_call_id"] == tool_done["data"]["tool_call_id"]
    validate("tool-result.schema.json", tool_done["data"]["tool_result"])


def test_v1_0_b_trace_filter_and_agent_state_projection() -> None:
    event_store.events.clear()
    event_stream.published.clear()
    runtime_projection["state"] = "waiting_user"
    client = TestClient(app)
    session_id = create_session_with_page(client)
    response = client.post(
        "/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "总结这篇文章",
            "source": "typed",
            "page_id": "page_01HZYT000000000000000001",
            "request_id": "req_000000000000000000000456",
        },
    )
    events = [data for _, data in parse_sse(response.text)]
    turn_id = events[0]["turn_id"]
    for event in events:
        validate("agent-event.schema.json", event)

    filtered = client.get(f"/v1/sessions/{session_id}/trace", params={"turn_id": turn_id}).json()
    validate("api-response.schema.json", filtered)
    assert filtered["data"]["turn_id"] == turn_id
    assert len(filtered["data"]["events"]) == len(events)
    assert all(event.get("turn_id") == turn_id for event in filtered["data"]["events"])

    state = client.get("/v1/agent/state").json()
    assert state["data"]["state"] == "waiting_user"


def test_v1_0_c_denied_tool_does_not_emit_tool_started() -> None:
    event_store.events.clear()
    event_stream.published.clear()
    client = TestClient(app)
    session = client.post("/v1/sessions", json={"client": "chrome-extension", "metadata": {}}).json()
    session_id = session["data"]["session_id"]
    response = client.post(
        "/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "读取本地文件 /etc/passwd",
            "source": "typed",
            "page_id": "page_01HZYT000000000000000001",
            "request_id": "req_000000000000000000000789",
        },
    )
    events = [data for _, data in parse_sse(response.text)]
    event_types = [event["type"] for event in events]
    assert "tool.denied" in event_types
    assert "tool.started" not in event_types
    assert any(event["data"].get("reason") == "permission_denied" for event in events if event["type"] == "tool.denied")


def test_v1_0_c_budget_exceeded_does_not_emit_tool_started() -> None:
    event_store.events.clear()
    event_stream.published.clear()
    client = TestClient(app)
    session = client.post("/v1/sessions", json={"client": "chrome-extension", "metadata": {}}).json()
    session_id = session["data"]["session_id"]
    response = client.post(
        "/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "总结这篇文章",
            "source": "typed",
            "page_id": "page_01HZYT000000000000000001",
            "request_id": "req_000000000000000000000790",
            "budget": {"max_tool_calls": 0},
        },
    )
    events = [data for _, data in parse_sse(response.text)]
    event_types = [event["type"] for event in events]
    assert "tool.denied" in event_types
    assert "tool.started" not in event_types
    assert any(event["data"].get("reason") == "budget_exceeded" for event in events if event["type"] == "tool.denied")


def test_v1_0_e_missing_page_context_uses_required_error_without_fake_artifact() -> None:
    event_store.events.clear()
    event_stream.published.clear()
    client = TestClient(app)
    session = client.post("/v1/sessions", json={"client": "chrome-extension", "metadata": {}}).json()
    session_id = session["data"]["session_id"]
    response = client.post(
        "/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "总结这篇文章",
            "source": "typed",
            "request_id": "req_000000000000000000000791",
        },
    )
    events = [data for _, data in parse_sse(response.text)]
    event_types = [event["type"] for event in events]
    assert "error" in event_types
    assert "tool.started" not in event_types
    assert "artifact.created" not in event_types
    assert any(event["data"].get("code") == "PAGE_CONTEXT_REQUIRED" for event in events if event["type"] == "error")


def test_v1_0_e_mindmap_creates_mermaid_artifact_and_trace() -> None:
    event_store.events.clear()
    event_stream.published.clear()
    client = TestClient(app)
    session_id = create_session_with_page(client)
    response = client.post(
        "/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "生成 Mermaid 思维导图",
            "source": "typed",
            "request_id": "req_000000000000000000000792",
        },
    )
    events = [data for _, data in parse_sse(response.text)]
    event_types = [event["type"] for event in events]
    assert "tool.done" in event_types
    assert "artifact.created" in event_types
    artifact_event = next(event for event in events if event["type"] == "artifact.created")
    artifact = artifact_event["data"]["artifact"]
    assert artifact["type"] == "mindmap"
    assert artifact["metadata"]["format"] == "mermaid"
    assert artifact["content"].startswith("mindmap\n")
    assert artifact["sourcePageId"].startswith("page_")
    assert artifact["turnId"] == artifact_event["turn_id"]
    assert artifact["toolCallId"].startswith("tc_")


def test_v1_0_d_page_context_endpoint_records_active_page_and_event() -> None:
    event_store.events.clear()
    event_stream.published.clear()
    client = TestClient(app)
    session = client.post("/v1/sessions", json={"client": "chrome-extension", "metadata": {}}).json()
    session_id = session["data"]["session_id"]
    sample = json.loads((CONTRACTS / "samples/page-context-article.json").read_text())
    sample["session_id"] = session_id
    response = client.post("/v1/page/context", json=sample)
    body = response.json()
    validate("api-response.schema.json", body)
    assert body["data"]["status"] == "accepted"
    assert session_store.sessions[session_id]["active_page"]["page_id"] == sample["page_id"]
    events = event_store.list_by_session(session_id)
    assert any(event["type"] == "page.context.received" for event in events)


def test_v1_0_e_page_context_invalid_request_uses_api_envelope() -> None:
    event_store.events.clear()
    event_stream.published.clear()
    client = TestClient(app)
    session = client.post("/v1/sessions", json={"client": "chrome-extension", "metadata": {}}).json()
    session_id = session["data"]["session_id"]
    response = client.post("/v1/page/context", json={"session_id": session_id, "title": "Missing URL"})
    body = response.json()
    validate("api-response.schema.json", body)
    assert response.status_code == 400
    assert body["ok"] is False
    assert body["error"]["code"] == "REQUEST_INVALID"
    assert "url" in body["error"]["details"]["missing_fields"]


def test_v1_0_g_session_restore_api_returns_persisted_turn_records() -> None:
    event_store.events.clear()
    event_stream.published.clear()
    client = TestClient(app)
    session_id = create_session_with_page(client)
    response = client.post(
        "/v1/chat/stream",
        json={
            "session_id": session_id,
            "message": "总结这篇文章",
            "source": "typed",
            "request_id": "req_000000000000000000000793",
        },
    )
    events = [data for _, data in parse_sse(response.text)]
    turn_id = events[0]["turn_id"]

    restored = client.get(f"/v1/sessions/{session_id}").json()
    validate("api-response.schema.json", restored)
    data = restored["data"]
    assert data["session_id"] == session_id
    assert data["activePage"]["page_id"].startswith("page_")
    assert any(message["role"] == "user" and message["turn_id"] == turn_id for message in data["messages"])
    assert any(message["role"] == "assistant" and message["turn_id"] == turn_id for message in data["messages"])
    assert any(tool_call["turn_id"] == turn_id and tool_call["status"] == "succeeded" for tool_call in data["toolCalls"])
    assert any(artifact["turnId"] == turn_id for artifact in data["artifacts"])
    assert any(entry["turn_id"] == turn_id for entry in data["budgetLedger"])
    assert any(checkpoint["turn_id"] == turn_id for checkpoint in data["checkpoints"])


def test_v1_0_g_sqlite_store_restores_session_trace_after_reopen(tmp_path: Path) -> None:
    db_path = tmp_path / "navia.sqlite3"
    sessions = SQLiteSessionStore(db_path)
    events = SQLiteEventStore(db_path)
    session_id = "sess_test_sqlite_restore"
    sessions.create(session_id, "2026-06-02T00:00:00Z", metadata={"source": "test"})
    sample = json.loads((CONTRACTS / "samples/page-context-article.json").read_text())
    sample["session_id"] = session_id
    sessions.set_active_page(session_id, sample)

    runner = TurnRunner.create(lambda event: (events.append(event), event)[1], sessions)
    emitted = runner.run(
        {
            "session_id": session_id,
            "message": "总结这篇文章",
            "source": "typed",
            "request_id": "req_sqlite_restore",
        }
    )
    turn_id = emitted[0]["turn_id"]

    reopened_sessions = SQLiteSessionStore(db_path)
    reopened_events = SQLiteEventStore(db_path)
    record = reopened_sessions.get_session_record(session_id)
    trace = reopened_events.list_by_session(session_id)

    assert record is not None
    assert record["active_page"]["page_id"] == sample["page_id"]
    assert any(message["turn_id"] == turn_id and message["role"] == "assistant" for message in record["messages"])
    assert any(tool_call["turn_id"] == turn_id for tool_call in record["tool_calls"])
    assert any(artifact["turnId"] == turn_id for artifact in record["artifacts"])
    assert any(entry["turn_id"] == turn_id for entry in record["budget_ledger"])
    assert any(checkpoint["turn_id"] == turn_id for checkpoint in record["checkpoints"])
    assert any(event["type"] == "artifact.created" for event in trace)
