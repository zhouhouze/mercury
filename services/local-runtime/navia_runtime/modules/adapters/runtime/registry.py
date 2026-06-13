from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from navia_runtime.contracts import ErrorCode, new_id, utc_now
from navia_runtime.modules.mindmap.runtime import generate_mindmap_payload


AdapterHandler = Callable[[dict[str, Any]], dict[str, Any]]


def budget_cost(*, tool_calls: int = 1, output_tokens: int = 0, context_bytes: int = 0, runtime_ms: int = 1) -> dict[str, int]:
    return {
        "model_calls": 0,
        "tool_calls": tool_calls,
        "input_tokens": 0,
        "output_tokens": output_tokens,
        "context_bytes": context_bytes,
        "runtime_ms": runtime_ms,
    }


def page_id(page: dict[str, Any]) -> str:
    return str(page.get("pageId") or page.get("page_id") or "")


def page_title(page: dict[str, Any]) -> str:
    return str(page.get("title") or "当前页面")


def page_chunks(page: dict[str, Any]) -> list[dict[str, Any]]:
    chunks = page.get("chunks")
    if isinstance(chunks, list):
        return [chunk for chunk in chunks if isinstance(chunk, dict)]
    return []


def page_paragraphs(page: dict[str, Any]) -> list[dict[str, Any]]:
    paragraphs = page.get("paragraphs")
    if isinstance(paragraphs, list):
        return [paragraph for paragraph in paragraphs if isinstance(paragraph, dict)]
    return []


def paragraph_texts(page: dict[str, Any], limit: int = 4) -> list[str]:
    values: list[str] = []
    for paragraph in page_paragraphs(page)[:limit]:
        text = str(paragraph.get("text") or "").strip()
        if text:
            values.append(text)
    return values


def structured_draft_points(page: dict[str, Any]) -> list[str]:
    draft = page.get("summaryDraft") if isinstance(page.get("summaryDraft"), dict) else {}
    points = draft.get("keyPoints") if isinstance(draft, dict) else None
    if isinstance(points, list):
        return [str(item) for item in points if str(item).strip()]
    return []


def artifact(
    invocation: dict[str, Any],
    *,
    artifact_type: str,
    source: str,
    content: str,
    metadata: dict[str, Any],
    source_chunk_ids: list[str] | None = None,
) -> dict[str, Any]:
    page = invocation["input"]["activePage"]
    return {
        "artifactId": new_id("art_"),
        "sessionId": invocation["sessionId"],
        "turnId": invocation["turnId"],
        "toolCallId": invocation["toolCallId"],
        "type": artifact_type,
        "sourcePageId": page_id(page),
        "sourceChunkIds": source_chunk_ids or [],
        "source": source,
        "content": content,
        "metadata": metadata,
        "createdAt": utc_now(),
    }


def adapter_result(
    invocation: dict[str, Any],
    *,
    status: str,
    content: dict[str, Any],
    artifacts: list[dict[str, Any]] | None = None,
    warnings: list[str] | None = None,
    error: dict[str, Any] | None = None,
    cost: dict[str, int] | None = None,
) -> dict[str, Any]:
    return {
        "adapterId": invocation["adapterId"],
        "toolCallId": invocation["toolCallId"],
        "status": status,
        "content": content,
        "artifacts": artifacts or [],
        "budgetCost": cost or budget_cost(),
        "warnings": warnings or [],
        "error": error,
    }


def require_page(invocation: dict[str, Any]) -> dict[str, Any] | None:
    page = invocation.get("input", {}).get("activePage")
    return page if isinstance(page, dict) and page_id(page) else None


def summarize_adapter(invocation: dict[str, Any]) -> dict[str, Any]:
    page = require_page(invocation)
    if page is None:
        return adapter_result(
            invocation,
            status="failed",
            content={},
            error={"code": ErrorCode.PAGE_CONTEXT_REQUIRED.value, "message": "Active page is required.", "recoverable": True},
        )
    points = structured_draft_points(page) or paragraph_texts(page, 4)
    summary = f"## {page_title(page)}\n\n### 关键要点\n" + "\n".join(f"- {point[:220]}" for point in points[:4])
    record = artifact(
        invocation,
        artifact_type="summary",
        source="page",
        content=summary,
        metadata={"format": "markdown", "model": "mock-core-provider", "sourceUrl": page.get("url")},
        source_chunk_ids=[str(chunk.get("chunkId") or chunk.get("chunk_id")) for chunk in page_chunks(page)[:3] if chunk.get("chunkId") or chunk.get("chunk_id")],
    )
    return adapter_result(invocation, status="succeeded", content={"summary": summary}, artifacts=[record], cost=budget_cost(output_tokens=max(1, len(summary) // 4)))


def answer_adapter(invocation: dict[str, Any]) -> dict[str, Any]:
    page = require_page(invocation)
    if page is None:
        return adapter_result(
            invocation,
            status="failed",
            content={},
            error={"code": ErrorCode.PAGE_CONTEXT_REQUIRED.value, "message": "Active page is required.", "recoverable": True},
        )
    user_message = str(invocation.get("input", {}).get("userMessage") or "")
    excerpts = paragraph_texts(page, 3)
    answer = f"基于当前页面《{page_title(page)}》回答：\n" + "\n".join(f"- {excerpt[:220]}" for excerpt in excerpts)
    if user_message:
        answer += f"\n\n问题：{user_message}"
    record = artifact(
        invocation,
        artifact_type="answer",
        source="page",
        content=answer,
        metadata={"format": "markdown", "model": "mock-core-provider", "question": user_message, "sourceUrl": page.get("url")},
    )
    return adapter_result(invocation, status="succeeded", content={"answer": answer}, artifacts=[record], cost=budget_cost(output_tokens=max(1, len(answer) // 4)))


def mindmap_adapter(invocation: dict[str, Any]) -> dict[str, Any]:
    page = require_page(invocation)
    if page is None:
        return adapter_result(
            invocation,
            status="failed",
            content={},
            error={"code": ErrorCode.PAGE_CONTEXT_REQUIRED.value, "message": "Active page is required.", "recoverable": True},
        )
    perception = page.get("perception") if isinstance(page.get("perception"), dict) else {}
    result = generate_mindmap_payload(
        {
            "sessionId": invocation["sessionId"],
            "turnId": invocation["turnId"],
            "toolCallId": invocation["toolCallId"],
            "structuredPage": page,
            "perceptionDigest": perception.get("perceptionDigest") or page.get("perceptionDigest"),
            "sourceMap": perception.get("sourceMap") or page.get("sourceMap"),
            "qualityReport": perception.get("qualityReport") or page.get("qualityReport"),
        }
    )
    if not result["ok"]:
        return adapter_result(invocation, status="failed", content={}, error=result["error"], warnings=result.get("warnings", []))
    record = artifact(
        invocation,
        artifact_type="mindmap",
        source="page",
        content=result["mermaidSource"],
        metadata={**result["metadata"], "model": "mock-core-provider"},
        source_chunk_ids=result["sourceChunkIds"],
    )
    return adapter_result(invocation, status="succeeded", content={"answer": "已生成页面思维导图。", "mermaid": result["mermaidSource"]}, artifacts=[record], cost=budget_cost(output_tokens=max(1, len(str(result["mermaidSource"])) // 4)), warnings=result.get("warnings", []))


def failing_adapter(invocation: dict[str, Any]) -> dict[str, Any]:
    return adapter_result(
        invocation,
        status="failed",
        content={},
        error={"code": ErrorCode.RUNTIME_INTERNAL_ERROR.value, "message": "Intentional fixture failure.", "recoverable": True},
    )


@dataclass
class AdapterRegistry:
    specs: dict[str, dict[str, Any]] = field(default_factory=dict)
    handlers: dict[str, AdapterHandler] = field(default_factory=dict)

    def register(self, spec: dict[str, Any], handler: AdapterHandler) -> None:
        adapter_id = str(spec["adapterId"])
        self.specs[adapter_id] = spec
        self.handlers[adapter_id] = handler

    def list_adapters(self) -> list[dict[str, Any]]:
        return list(self.specs.values())

    def get_spec(self, adapter_id: str) -> dict[str, Any]:
        return self.specs[adapter_id]

    def invoke(self, invocation: dict[str, Any]) -> dict[str, Any]:
        return self.handlers[str(invocation["adapterId"])](invocation)


def default_adapter_registry() -> AdapterRegistry:
    registry = AdapterRegistry()
    registry.register(
        {
            "adapterId": "page.summarize",
            "name": "Summarize Page",
            "kind": "internal_tool",
            "capability": "summarization",
            "requiredContext": ["activePage"],
            "riskLevel": "safe",
            "budgetHint": budget_cost(),
        },
        summarize_adapter,
    )
    registry.register(
        {
            "adapterId": "page.answer",
            "name": "Answer From Page",
            "kind": "internal_tool",
            "capability": "question_answering",
            "requiredContext": ["activePage", "recentMessages"],
            "riskLevel": "safe",
            "budgetHint": budget_cost(),
        },
        answer_adapter,
    )
    registry.register(
        {
            "adapterId": "mindmap.generate",
            "name": "Generate Mindmap",
            "kind": "internal_tool",
            "capability": "mindmap_generation",
            "requiredContext": ["activePage"],
            "riskLevel": "safe",
            "budgetHint": budget_cost(),
        },
        mindmap_adapter,
    )
    registry.register(
        {
            "adapterId": "fixture.denied",
            "name": "Denied Fixture",
            "kind": "external_api",
            "capability": "utility",
            "requiredContext": [],
            "riskLevel": "deny_by_default",
            "budgetHint": budget_cost(),
        },
        failing_adapter,
    )
    registry.register(
        {
            "adapterId": "fixture.failure",
            "name": "Failure Fixture",
            "kind": "internal_tool",
            "capability": "utility",
            "requiredContext": [],
            "riskLevel": "safe",
            "budgetHint": budget_cost(),
        },
        failing_adapter,
    )
    return registry
