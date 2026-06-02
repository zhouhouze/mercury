from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Callable

from navia_runtime.contracts import ErrorCode, new_id, utc_now
from navia_runtime.governance import GovernanceHooks, TurnBudget


ToolFn = Callable[[dict[str, Any]], dict[str, Any]]


def budget_cost(*, tool_calls: int = 1, output_tokens: int = 0, context_bytes: int = 0, runtime_ms: int = 1) -> dict[str, int]:
    return {
        "model_calls": 0,
        "tool_calls": tool_calls,
        "input_tokens": 0,
        "output_tokens": output_tokens,
        "context_bytes": context_bytes,
        "runtime_ms": runtime_ms,
    }


def _page_text(page: dict[str, Any]) -> str:
    return str(page.get("cleaned_text") or page.get("visible_text") or "").strip()


def _sentences(text: str, limit: int = 5) -> list[str]:
    normalized = re.sub(r"\s+", " ", text).strip()
    if not normalized:
        return []
    parts = re.split(r"(?<=[。！？.!?])\s+", normalized)
    if len(parts) == 1:
        parts = [normalized[index : index + 180] for index in range(0, min(len(normalized), 900), 180)]
    return [part.strip() for part in parts if part.strip()][:limit]


def _headings(page: dict[str, Any], limit: int = 8) -> list[str]:
    headings = page.get("headings") if isinstance(page.get("headings"), list) else []
    values: list[str] = []
    for heading in headings[:limit]:
        if isinstance(heading, dict) and heading.get("text"):
            values.append(str(heading["text"]).strip())
    return [value for value in values if value]


def _chunks(page: dict[str, Any]) -> list[dict[str, Any]]:
    chunks = page.get("chunks")
    if isinstance(chunks, list) and chunks:
        return [chunk for chunk in chunks if isinstance(chunk, dict)]
    text = _page_text(page)
    return [
        {
            "chunk_id": new_id("chunk_"),
            "page_id": page["page_id"],
            "heading_path": [],
            "text": text[:1600],
            "token_estimate": max(1, len(text) // 4),
            "order": 0,
        }
    ]


def _artifact(
    args: dict[str, Any],
    *,
    artifact_type: str,
    source: str,
    content: str,
    metadata: dict[str, Any],
    source_chunk_ids: list[str] | None = None,
) -> dict[str, Any]:
    page = args["active_page"]
    return {
        "artifactId": new_id("art_"),
        "sessionId": args["session_id"],
        "turnId": args["turn_id"],
        "toolCallId": args["tool_call_id"],
        "type": artifact_type,
        "sourcePageId": page["page_id"],
        "sourceChunkIds": source_chunk_ids or [],
        "source": source,
        "content": content,
        "metadata": metadata,
        "createdAt": utc_now(),
    }


def _failed_result(tool_name: str, code: ErrorCode, message: str) -> dict[str, Any]:
    return {
        "tool_name": tool_name,
        "status": "failed",
        "content": {},
        "artifact_ids": [],
        "budget_cost": budget_cost(tool_calls=1),
        "warnings": [],
        "error": {"code": code.value, "message": message, "recoverable": True, "details": {}},
    }


def summarize_page(args: dict[str, Any]) -> dict[str, Any]:
    page = args.get("active_page")
    if not isinstance(page, dict):
        return _failed_result("summarize_page", ErrorCode.PAGE_CONTEXT_REQUIRED, "Active page context is required.")
    text = _page_text(page)
    if not text:
        return _failed_result("summarize_page", ErrorCode.PAGE_CONTEXT_REQUIRED, "Active page has no readable text.")
    title = str(page.get("title") or "当前页面")
    headings = _headings(page)
    points = _sentences(text, 4)
    heading_lines = "\n".join(f"- {heading}" for heading in headings[:6]) or "- 未检测到清晰标题结构"
    point_lines = "\n".join(f"- {point}" for point in points)
    summary = f"## {title}\n\n### 摘要\n{points[0] if points else text[:180]}\n\n### 关键要点\n{point_lines}\n\n### 页面结构\n{heading_lines}"
    artifact = _artifact(
        args,
        artifact_type="summary",
        source="page",
        content=summary,
        metadata={
            "format": "markdown",
            "title": title,
            "sourceUrl": page.get("url"),
            "style": "structured",
            "model": "deterministic",
            "chunkRefs": [chunk.get("chunk_id") for chunk in _chunks(page)[:3] if chunk.get("chunk_id")],
        },
    )
    return {
        "tool_name": "summarize_page",
        "status": "succeeded",
        "content": {
            "summary": summary,
            "source_page_id": page["page_id"],
            "artifact": artifact,
        },
        "artifact_ids": [artifact["artifactId"]],
        "budget_cost": budget_cost(output_tokens=max(1, len(summary) // 4), context_bytes=len(text.encode("utf-8"))),
        "warnings": [],
    }


def answer_from_page(args: dict[str, Any]) -> dict[str, Any]:
    page = args.get("active_page")
    if not isinstance(page, dict):
        return _failed_result("answer_from_page", ErrorCode.PAGE_CONTEXT_REQUIRED, "Active page context is required.")
    message = str(args.get("message") or "")
    chunks = _chunks(page)
    tokens = [token for token in re.findall(r"[\w\u4e00-\u9fff]{2,}", message.lower()) if token not in {"这个", "页面", "为什么", "什么", "如何"}]
    scored: list[tuple[int, dict[str, Any]]] = []
    for chunk in chunks:
        text = str(chunk.get("text") or "")
        score = sum(1 for token in tokens if token in text.lower())
        if score:
            scored.append((score, chunk))
    selected_chunks = [chunk for _, chunk in sorted(scored, key=lambda item: item[0], reverse=True)[:2]] or chunks[:2]
    evidence = "\n".join(f"- {str(chunk.get('text') or '')[:260]}" for chunk in selected_chunks)
    if not evidence.strip():
        return _failed_result("answer_from_page", ErrorCode.PAGE_CONTEXT_REQUIRED, "Active page has no readable text.")
    answer = f"基于当前页面，我能找到这些相关内容：\n{evidence}\n\n结论：请以这些页面片段为依据继续追问；V1.0-E 当前使用确定性页面片段匹配，不做联网搜索或长期记忆。"
    artifact = _artifact(
        args,
        artifact_type="answer",
        source="page",
        content=answer,
        metadata={
            "format": "markdown",
            "title": page.get("title"),
            "sourceUrl": page.get("url"),
            "question": message,
            "model": "deterministic",
        },
        source_chunk_ids=[str(chunk.get("chunk_id")) for chunk in selected_chunks if chunk.get("chunk_id")],
    )
    return {
        "tool_name": "answer_from_page",
        "status": "succeeded",
        "content": {
            "answer": answer,
            "source_page_id": page["page_id"],
            "artifact": artifact,
        },
        "artifact_ids": [artifact["artifactId"]],
        "budget_cost": budget_cost(output_tokens=max(1, len(answer) // 4), context_bytes=sum(len(str(chunk.get("text") or "").encode("utf-8")) for chunk in selected_chunks)),
        "warnings": [],
    }


def explain_selection(args: dict[str, Any]) -> dict[str, Any]:
    page = args.get("active_page")
    if not isinstance(page, dict):
        return _failed_result("explain_selection", ErrorCode.PAGE_CONTEXT_REQUIRED, "Active page context is required.")
    selected = str(page.get("selected_text") or "").strip()
    if not selected:
        return _failed_result("explain_selection", ErrorCode.PAGE_CONTEXT_REQUIRED, "Select text on the page before asking Navia to explain it.")
    explanation = f"选中文本：{selected[:500]}\n\n解释：这段内容出自当前页面《{page.get('title')}》。V1.0-E 会基于页面上下文解释选区，但不会读取本地文件或联网搜索。"
    artifact = _artifact(
        args,
        artifact_type="answer",
        source="selection",
        content=explanation,
        metadata={"format": "markdown", "title": page.get("title"), "sourceUrl": page.get("url"), "model": "deterministic"},
    )
    return {
        "tool_name": "explain_selection",
        "status": "succeeded",
        "content": {"answer": explanation, "source_page_id": page["page_id"], "artifact": artifact},
        "artifact_ids": [artifact["artifactId"]],
        "budget_cost": budget_cost(output_tokens=max(1, len(explanation) // 4), context_bytes=len(selected.encode("utf-8"))),
        "warnings": [],
    }


def _sanitize_mermaid_label(value: str) -> str:
    return re.sub(r"[()\[\]{}<>:\"'`|]", "", value).strip()[:64] or "未命名节点"


def validate_mermaid(source: str) -> tuple[bool, str | None]:
    if not source.startswith("mindmap\n"):
        return False, "Mermaid mindmap must start with mindmap."
    if "root((" not in source:
        return False, "Mermaid mindmap must contain root node."
    if len([line for line in source.splitlines() if line.strip()]) > 42:
        return False, "Mermaid mindmap has too many nodes."
    return True, None


def generate_mindmap(args: dict[str, Any]) -> dict[str, Any]:
    page = args.get("active_page")
    if not isinstance(page, dict):
        return _failed_result("generate_mindmap", ErrorCode.PAGE_CONTEXT_REQUIRED, "Active page context is required.")
    title = _sanitize_mermaid_label(str(page.get("title") or "当前页面"))
    headings = _headings(page, 36)
    if not headings:
        headings = [_sanitize_mermaid_label(sentence) for sentence in _sentences(_page_text(page), 12)]
    lines = ["mindmap", f"  root(({title}))"]
    for heading in headings[:36]:
        lines.append(f"    {_sanitize_mermaid_label(heading)}")
    mermaid = "\n".join(lines)
    valid, error = validate_mermaid(mermaid)
    repair_attempts = 0
    if not valid:
        repair_attempts = 1
        mermaid = "mindmap\n  root((当前页面))\n    内容概要"
        valid, error = validate_mermaid(mermaid)
    if not valid:
        return _failed_result("generate_mindmap", ErrorCode.MERMAID_VALIDATION_FAILED, error or "Mermaid validation failed.")
    artifact = _artifact(
        args,
        artifact_type="mindmap",
        source="page",
        content=mermaid,
        metadata={
            "format": "mermaid",
            "title": page.get("title"),
            "sourceUrl": page.get("url"),
            "rootTopic": title,
            "nodesCount": len(lines),
            "warnings": [],
            "model": "deterministic",
            "repaired": repair_attempts > 0,
            "validation": {"status": "passed", "repairAttempts": repair_attempts},
        },
    )
    return {
        "tool_name": "generate_mindmap",
        "status": "succeeded",
        "content": {
            "answer": "已基于当前页面生成 Mermaid 思维导图。",
            "mermaid": mermaid,
            "source_page_id": page["page_id"],
            "artifact": artifact,
        },
        "artifact_ids": [artifact["artifactId"]],
        "budget_cost": budget_cost(output_tokens=max(1, len(mermaid) // 4), context_bytes=len(_page_text(page).encode("utf-8"))),
        "warnings": [],
    }


@dataclass
class ToolRegistry:
    tools: dict[str, ToolFn] = field(default_factory=dict)

    def register(self, name: str, fn: ToolFn) -> None:
        self.tools[name] = fn

    def get(self, name: str) -> ToolFn:
        return self.tools[name]


def default_tool_registry() -> ToolRegistry:
    registry = ToolRegistry()
    registry.register("summarize_page", summarize_page)
    registry.register("answer_from_page", answer_from_page)
    registry.register("explain_selection", explain_selection)
    registry.register("generate_mindmap", generate_mindmap)
    return registry


@dataclass
class ToolExecutor:
    registry: ToolRegistry
    hooks: GovernanceHooks

    def authorize(self, tool_name: str, budget: TurnBudget | None = None) -> None:
        self.hooks.pre_tool_use(tool_name, budget)

    def execute_authorized(self, tool_name: str, args: dict[str, Any], tool_call_id: str | None = None) -> dict[str, Any]:
        tool_call_id = tool_call_id or new_id("tc_")
        args = {**args, "tool_call_id": tool_call_id}
        result = self.registry.get(tool_name)(args)
        result["tool_call_id"] = tool_call_id
        self.hooks.post_tool_use(tool_name)
        return result

    def execute(self, tool_name: str, args: dict[str, Any], tool_call_id: str | None = None) -> dict[str, Any]:
        self.authorize(tool_name)
        return self.execute_authorized(tool_name, args, tool_call_id)
