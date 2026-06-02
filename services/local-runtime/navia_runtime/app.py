from __future__ import annotations

import json
import hashlib
import os
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse

from navia_runtime import __version__
from navia_runtime.agent import TurnRunner
from navia_runtime.contracts import AgentEventType, ErrorCode, agent_event, failure, new_id, success, utc_now
from navia_runtime.state_machine import mermaid_graph
from navia_runtime.stores import InMemoryEventStream, SQLiteEventStore, SQLiteSessionStore


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
        response = JSONResponse(status_code=204, content=None)
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


def build_chunks(page_id: str, text: str) -> list[dict[str, Any]]:
    paragraphs = [part.strip() for part in text.split("\n") if part.strip()]
    if not paragraphs:
        paragraphs = [text[index : index + 1200].strip() for index in range(0, len(text), 1200)]
    chunks: list[dict[str, Any]] = []
    for index, paragraph in enumerate(paragraphs[:40]):
        if not paragraph:
            continue
        chunks.append(
            {
                "chunk_id": new_id("chunk_"),
                "page_id": page_id,
                "heading_path": [],
                "text": paragraph[:1600],
                "token_estimate": max(1, len(paragraph) // 4),
                "order": index,
            }
        )
    return chunks


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

    cleaned_text = body.get("cleaned_text") or body.get("visible_text") or ""
    content_hash = "sha256_" + hashlib.sha256(cleaned_text.encode("utf-8")).hexdigest()
    page_id = body.get("page_id") if isinstance(body.get("page_id"), str) else new_id("page_")
    page = {
        "page_id": page_id,
        "session_id": session_id,
        "tab_id": body.get("tab_id"),
        "url": body["url"],
        "title": body["title"],
        "domain": body["domain"],
        "captured_at": body.get("captured_at") or utc_now(),
        "content_hash": content_hash,
        "headings": body.get("headings", []),
        "selected_text": body.get("selected_text"),
        "visible_text": body.get("visible_text"),
        "cleaned_text": cleaned_text,
        "chunks": body.get("chunks") if isinstance(body.get("chunks"), list) else build_chunks(page_id, cleaned_text),
        "metadata": body.get("metadata", {}),
    }
    session_store.set_active_page(session_id, page)
    persist_and_publish(
        agent_event(
            AgentEventType.PAGE_CONTEXT_RECEIVED,
            session_id=session_id,
            request_id=request_id,
            data={"page_id": page_id, "content_hash": content_hash, "url": page["url"]},
        )
    )
    return success({"page_id": page_id, "content_hash": content_hash, "status": "accepted"}, request_id=request_id)


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

    emitted = TurnRunner.create(persist_and_publish, session_store).run(body)
    return StreamingResponse(sse(emitted), media_type="text/event-stream")


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
