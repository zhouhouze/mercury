from __future__ import annotations

import json
import os
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse

from navia_runtime import __version__
from navia_runtime.contracts import AgentEventType, ErrorCode, agent_event, failure, new_id, success, utc_now
from navia_runtime.modules.adapters.runtime import AdapterRegistry, default_adapter_registry
from navia_runtime.modules.agent_loop.runtime import run_agentic_turn
from navia_runtime.modules.mindmap.runtime import generate_mindmap_payload
from navia_runtime.modules.page_reading.runtime import build_structured_page_context
from navia_runtime.state_machine import mermaid_graph
from navia_runtime.stores import InMemoryEventStream, SQLiteEventStore, SQLiteSessionStore
from navia_runtime.v2.artifacts import V2ArtifactStore
from navia_runtime.v2.incremental import compute_snapshot_diff
from navia_runtime.v2.runtime_evidence import run_controlled_runtime_evidence
from navia_runtime.v2.schemas import SchemaValidationError
from navia_runtime.v2.workbench import build_workbench


ALLOWED_ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}

app = FastAPI(title="Navia Local Runtime", version=__version__)


def default_db_path() -> Path:
    configured = os.environ.get("NAVIA_DB_PATH")
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[3] / ".navia/navia.sqlite3"


event_store = SQLiteEventStore(default_db_path())
event_stream = InMemoryEventStream()
session_store = SQLiteSessionStore(default_db_path())
v2_artifact_store = V2ArtifactStore(default_db_path())
runtime_projection = {"state": "waiting_user"}


@app.middleware("http")
async def origin_allowlist(request: Request, call_next):
    origin = request.headers.get("origin")
    allowed_origin = is_allowed_origin(origin)
    if origin and not allowed_origin:
        return JSONResponse(
            status_code=403,
            content=failure(
                ErrorCode.RUNTIME_NOT_READY,
                "Origin is not allowed by Navia Runtime.",
                request_id=request.headers.get("x-request-id"),
                recoverable=True,
                details={"origin": origin},
            ),
        )
    if request.method == "OPTIONS":
        response = Response(status_code=204)
    else:
        response = await call_next(request)
    if allowed_origin and origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,X-Request-Id"
        response.headers["Access-Control-Max-Age"] = "600"
        response.headers["Vary"] = "Origin"
    return response


def is_allowed_origin(origin: str | None) -> bool:
    if not origin:
        return True
    if origin in ALLOWED_ORIGINS:
        return True
    return origin.startswith("chrome-extension://")


def persist_and_publish(event: dict[str, Any]) -> dict[str, Any]:
    event_store.append(event)
    event_stream.publish(event)
    if event["type"] == AgentEventType.STATE_TRANSITION.value:
        runtime_projection["state"] = event["data"]["to"]
    return event


def sse(events: Iterable[dict[str, Any]]) -> Iterable[str]:
    for event in events:
        yield f"event: {event['type']}\n"
        yield f"data: {json.dumps(event, separators=(',', ':'))}\n\n"


@app.get("/v1/health")
def health(request: Request):
    return success(
        {
            "status": "ok",
            "version": __version__,
            "runtime": "local",
        },
        request_id=request.headers.get("x-request-id"),
    )


@app.get("/v1/models/status")
def models_status(request: Request):
    return success(
        {
            "intent": {"status": "ready", "mode": "rule_based", "provider": "rule-based"},
            "mindmap": {"status": "ready", "mode": "deterministic", "provider": "deterministic-fallback"},
            "llm": {"status": "ready", "mode": "deterministic", "provider": "deterministic-reading-tools"},
            "asr": {"status": "unavailable", "mode": "funasr", "endpoint": "local"},
        },
        request_id=request.headers.get("x-request-id"),
    )


@app.post("/v1/sessions")
async def create_session(request: Request):
    body = await request.json()
    session = session_store.create(new_id("sess_"), utc_now(), metadata=body.get("metadata", {}))
    return success(
        {
            "session_id": session["session_id"],
            "created_at": session["created_at"],
        },
        request_id=request.headers.get("x-request-id"),
    )


@app.get("/v1/sessions/{session_id}")
def get_session(session_id: str, request: Request):
    record = session_store.get_session_record(session_id)
    if not record:
        return JSONResponse(
            status_code=404,
            content=failure(ErrorCode.SESSION_NOT_FOUND, "Session not found.", request_id=request.headers.get("x-request-id")),
        )
    active_page = record.get("active_page") if isinstance(record.get("active_page"), dict) else None
    return success(
        {
            "session_id": record["session_id"],
            "created_at": record["created_at"],
            "updated_at": record["updated_at"],
            "metadata": record.get("metadata", {}),
            "activePage": {
                "page_id": active_page.get("page_id"),
                "url": active_page.get("url"),
                "title": active_page.get("title"),
                "domain": active_page.get("domain"),
                "content_hash": active_page.get("content_hash"),
                "captured_at": active_page.get("captured_at"),
            }
            if active_page
            else None,
            "messages": record.get("messages", []),
            "artifacts": record.get("artifacts", []),
            "toolCalls": record.get("tool_calls", []),
            "budgetLedger": record.get("budget_ledger", []),
            "checkpoints": record.get("checkpoints", []),
        },
        request_id=request.headers.get("x-request-id"),
    )


@app.post("/v1/page/context")
async def page_context(request: Request):
    body = await request.json()
    request_id = request.headers.get("x-request-id") or new_id("req_")
    session_id = body.get("session_id")
    if not isinstance(session_id, str) or not session_store.exists(session_id):
        return JSONResponse(
            status_code=404,
            content=failure(ErrorCode.SESSION_NOT_FOUND, "Session not found.", request_id=request_id),
        )

    missing_fields = [
        field
        for field in ["url", "title", "domain"]
        if not isinstance(body.get(field), str) or not body.get(field)
    ]
    if missing_fields:
        return JSONResponse(
            status_code=400,
            content=failure(
                ErrorCode.REQUEST_INVALID,
                "Page context is missing required fields.",
                request_id=request_id,
                recoverable=True,
                details={"missing_fields": missing_fields},
            ),
        )

    structured_result = build_structured_page_context(
        {
            "sessionId": session_id,
            "pageId": body.get("page_id"),
            "url": body["url"],
            "title": body["title"],
            "domain": body["domain"],
            "capturedAt": body.get("captured_at") or utc_now(),
            "headings": body.get("headings", []),
            "selectedText": body.get("selected_text"),
            "visibleText": body.get("visible_text"),
            "cleanedText": body.get("cleaned_text") or body.get("visible_text") or "",
            "metadata": body.get("metadata", {}),
        }
    )
    if not structured_result["ok"]:
        return JSONResponse(
            status_code=400,
            content=failure(
                ErrorCode.PAGE_CONTEXT_REQUIRED,
                structured_result["error"]["message"],
                request_id=request_id,
                recoverable=True,
                details={"source": "page_reading"},
            ),
        )
    page = with_legacy_page_aliases(structured_result["structuredPage"], body)
    page_id = page["page_id"]
    content_hash = page["content_hash"]
    session_store.set_active_page(session_id, page)
    persist_and_publish(
        agent_event(
            AgentEventType.PAGE_CONTEXT_RECEIVED,
            session_id=session_id,
            request_id=request_id,
            data={"page_id": page_id, "content_hash": content_hash, "url": page["url"]},
        )
    )
    return success(
        {
            "page_id": page_id,
            "content_hash": content_hash,
            "status": "accepted",
            "structuredPage": page,
        },
        request_id=request_id,
    )


@app.post("/v1/chat/stream")
async def chat_stream(request: Request):
    body = await request.json()
    request_id = body.get("request_id") or request.headers.get("x-request-id") or new_id("req_")
    session_id = body.get("session_id")
    if not isinstance(session_id, str) or not session_id.startswith("sess_"):
        err = agent_event(
            AgentEventType.ERROR,
            session_id=session_id or "sess_invalid",
            request_id=request_id,
            data={"code": ErrorCode.SESSION_NOT_FOUND.value, "message": "session_id is required"},
        )
        persist_and_publish(err)
        return StreamingResponse(sse([err]), media_type="text/event-stream")

    if not session_store.exists(session_id):
        err = agent_event(
            AgentEventType.ERROR,
            session_id=session_id,
            request_id=request_id,
            data={"code": ErrorCode.SESSION_NOT_FOUND.value, "message": "Session not found."},
        )
        persist_and_publish(err)
        return StreamingResponse(sse([err]), media_type="text/event-stream")

    active_page = session_store.get_active_page(session_id)
    result = run_agentic_turn(
        {
            "sessionId": session_id,
            "requestId": request_id,
            "userMessage": body.get("message", ""),
            "activePage": active_page,
            "recentMessages": normalize_recent_messages(session_store.get_session_record(session_id)),
            "budget": body.get("budget") if isinstance(body.get("budget"), dict) else {},
            "adapterRegistry": integration_adapter_registry(),
            "forceAdapterId": "fixture.denied" if is_high_risk_message(str(body.get("message") or "")) else body.get("forceAdapterId"),
        }
    )
    persist_turn_result(session_id, str(body.get("message") or ""), result)
    for event in result["events"]:
        persist_and_publish(event)
    return StreamingResponse(sse(result["events"]), media_type="text/event-stream")


@app.get("/v1/sessions/{session_id}/trace")
def session_trace(session_id: str, request: Request, turn_id: str | None = None):
    events = event_store.list_by_session(session_id)
    if turn_id is not None:
        events = [event for event in events if event.get("turn_id") == turn_id]
    return success(
        {
            "session_id": session_id,
            "turn_id": turn_id,
            "events": events,
        },
        request_id=request.headers.get("x-request-id"),
    )


@app.get("/v1/agent/state")
def agent_state(request: Request):
    return success({"state": runtime_projection["state"]}, request_id=request.headers.get("x-request-id"))


@app.get("/v1/agent/state-machine/mermaid")
def state_machine_mermaid(request: Request):
    return success({"mermaid": mermaid_graph()}, request_id=request.headers.get("x-request-id"))


@app.post("/v2/runtime/evidence")
async def v2_runtime_evidence(request: Request):
    body = await request.json()
    try:
        result = run_controlled_runtime_evidence(v2_artifact_store, body, source="http")
    except SchemaValidationError as exc:
        return JSONResponse(
            status_code=400,
            content=failure(
                ErrorCode.SCHEMA_VALIDATION_FAILED,
                str(exc),
                request_id=request.headers.get("x-request-id"),
                details={"path": exc.path},
            ),
        )
    return success(
        {
            "status": "accepted" if result["ok"] else "denied_or_failed",
            "artifact": result["artifact"],
        },
        request_id=request.headers.get("x-request-id"),
    )


@app.get("/v2/artifacts/{artifact_id}")
def v2_get_artifact(artifact_id: str, request: Request):
    artifact = v2_artifact_store.get(artifact_id)
    if not artifact:
        return JSONResponse(
            status_code=404,
            content=failure(ErrorCode.ARTIFACT_NOT_FOUND, "V2 artifact not found.", request_id=request.headers.get("x-request-id")),
        )
    return success({"artifact": artifact}, request_id=request.headers.get("x-request-id"))


@app.post("/v2/snapshots/diff")
async def v2_snapshot_diff(request: Request):
    body = await request.json()
    try:
        result = compute_snapshot_diff(v2_artifact_store, body, source="http")
    except SchemaValidationError as exc:
        return JSONResponse(
            status_code=400,
            content=failure(
                ErrorCode.SCHEMA_VALIDATION_FAILED,
                str(exc),
                request_id=request.headers.get("x-request-id"),
                details={"path": exc.path},
            ),
        )
    return success(result, request_id=request.headers.get("x-request-id"))


@app.post("/v2/workbench")
async def v2_workbench(request: Request):
    body = await request.json()
    try:
        result = build_workbench(v2_artifact_store, body, source="http")
    except SchemaValidationError as exc:
        return JSONResponse(
            status_code=400,
            content=failure(
                ErrorCode.SCHEMA_VALIDATION_FAILED,
                str(exc),
                request_id=request.headers.get("x-request-id"),
                details={"path": exc.path},
            ),
        )
    return success(result, request_id=request.headers.get("x-request-id"))


def with_legacy_page_aliases(page: dict[str, Any], body: dict[str, Any]) -> dict[str, Any]:
    page_id = str(page["pageId"])
    content_hash = str(page["contentHash"])
    captured_at = str(page["capturedAt"])
    chunks = []
    for chunk in page.get("chunks", []):
        if isinstance(chunk, dict):
            chunks.append(
                {
                    **chunk,
                    "chunk_id": chunk.get("chunkId"),
                    "page_id": chunk.get("pageId"),
                    "heading_path": chunk.get("headingPath", []),
                    "token_estimate": chunk.get("tokenEstimate"),
                }
            )
    return {
        **page,
        "page_id": page_id,
        "session_id": page.get("sessionId"),
        "tab_id": body.get("tab_id"),
        "content_hash": content_hash,
        "captured_at": captured_at,
        "selected_text": body.get("selected_text"),
        "visible_text": body.get("visible_text"),
        "cleaned_text": body.get("cleaned_text") or body.get("visible_text") or "",
        "headings": body.get("headings", []),
        "chunks": chunks,
    }


def normalize_recent_messages(record: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not record:
        return []
    messages = record.get("messages") if isinstance(record.get("messages"), list) else []
    return [
        {
            "messageId": message.get("message_id"),
            "role": message.get("role"),
            "content": message.get("content"),
            "turnId": message.get("turn_id"),
        }
        for message in messages[-12:]
        if isinstance(message, dict)
    ]


def is_high_risk_message(message: str) -> bool:
    lowered = message.lower()
    return any(token in lowered for token in ["read_local_file", "/etc/passwd", "本地文件", "shell", "browser automation"])


def persist_turn_result(session_id: str, user_message: str, result: dict[str, Any]) -> None:
    turn_id = str(result["turnId"])
    trace_id = str(result["traceId"])
    request_id = str(result["requestId"])
    session_store.add_message(
        session_id,
        {
            "message_id": new_id("msg_"),
            "session_id": session_id,
            "turn_id": turn_id,
            "role": "user",
            "content": user_message,
            "created_at": utc_now(),
            "metadata": {"request_id": request_id, "trace_id": trace_id},
        },
    )
    assistant_text = "".join(
        str(event.get("data", {}).get("text") or "")
        for event in result.get("events", [])
        if isinstance(event, dict) and event.get("type") == AgentEventType.RESPONSE_DELTA.value
    )
    session_store.add_message(
        session_id,
        {
            "message_id": new_id("msg_"),
            "session_id": session_id,
            "turn_id": turn_id,
            "role": "assistant",
            "content": assistant_text,
            "created_at": utc_now(),
            "metadata": {"request_id": request_id, "trace_id": trace_id},
        },
    )
    for tool_result in result.get("toolResults", []):
        if not isinstance(tool_result, dict):
            continue
        session_store.add_tool_call(
            session_id,
            {
                "tool_call_id": tool_result["tool_call_id"],
                "session_id": session_id,
                "turn_id": turn_id,
                "tool_name": tool_result["tool_name"],
                "status": tool_result["status"],
                "created_at": utc_now(),
                "tool_result": tool_result,
            },
        )
        session_store.add_budget_entry(
            session_id,
            {
                "session_id": session_id,
                "turn_id": turn_id,
                "tool_call_id": tool_result["tool_call_id"],
                "created_at": utc_now(),
                "status": tool_result["status"],
                "budget_cost": tool_result.get("budget_cost", {}),
            },
        )
    for artifact in result.get("artifacts", []):
        if isinstance(artifact, dict):
            session_store.add_artifact(session_id, artifact)
    if assistant_text:
        session_store.upsert_checkpoint(
            session_id,
            {
                "checkpoint_id": new_id("ckpt_"),
                "session_id": session_id,
                "turn_id": turn_id,
                "created_at": utc_now(),
                "summary": assistant_text[:240],
                "metadata": {"request_id": request_id, "trace_id": trace_id, "strategy": "latest_turn_summary"},
            },
        )


def integration_adapter_registry() -> AdapterRegistry:
    registry = default_adapter_registry()
    registry.register(
        {
            "adapterId": "mindmap.generate",
            "name": "Generate Mindmap",
            "kind": "internal_tool",
            "capability": "mindmap_generation",
            "requiredContext": ["activePage"],
            "riskLevel": "safe",
            "budgetHint": {
                "model_calls": 0,
                "tool_calls": 1,
                "input_tokens": 0,
                "output_tokens": 0,
                "context_bytes": 0,
                "runtime_ms": 1,
            },
        },
        c_mindmap_adapter,
    )
    return registry


def c_mindmap_adapter(invocation: dict[str, Any]) -> dict[str, Any]:
    page = invocation.get("input", {}).get("activePage")
    result = generate_mindmap_payload(
        {
            "sessionId": invocation["sessionId"],
            "turnId": invocation["turnId"],
            "toolCallId": invocation["toolCallId"],
            "structuredPage": page,
        }
    )
    if not result["ok"]:
        return {
            "adapterId": invocation["adapterId"],
            "toolCallId": invocation["toolCallId"],
            "status": "failed",
            "content": {},
            "artifacts": [],
            "budgetCost": {
                "model_calls": 0,
                "tool_calls": 1,
                "input_tokens": 0,
                "output_tokens": 0,
                "context_bytes": 0,
                "runtime_ms": 1,
            },
            "warnings": [],
            "error": result["error"],
        }
    artifact = {
        "artifactId": new_id("art_"),
        "sessionId": invocation["sessionId"],
        "turnId": invocation["turnId"],
        "toolCallId": invocation["toolCallId"],
        "type": "mindmap",
        "sourcePageId": result["sourcePageId"],
        "sourceChunkIds": result["sourceChunkIds"],
        "source": "page",
        "content": result["mermaidSource"],
        "metadata": result["metadata"],
        "createdAt": utc_now(),
    }
    return {
        "adapterId": invocation["adapterId"],
        "toolCallId": invocation["toolCallId"],
        "status": "succeeded",
        "content": {"answer": "已基于当前页面生成 Mermaid 思维导图。", "mermaid": result["mermaidSource"]},
        "artifacts": [artifact],
        "budgetCost": {
            "model_calls": 0,
            "tool_calls": 1,
            "input_tokens": 0,
            "output_tokens": max(1, len(str(result["mermaidSource"])) // 4),
            "context_bytes": 0,
            "runtime_ms": 1,
        },
        "warnings": result.get("warnings", []),
        "error": None,
    }
