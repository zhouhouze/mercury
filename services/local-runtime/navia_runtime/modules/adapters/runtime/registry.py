from __future__ import annotations

import re
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


LOW_VALUE_SIGNAL_PATTERNS = [
    r"^首页$",
    r"^首页\s+",
    r"^keywords[:：]",
    r"未经作者授权",
    r"禁止转载",
    r"下载客户端",
    r"打开客户端",
    r"扫码登录",
    r"登录后推荐",
    r"输入手机号",
    r"输入验证码",
    r"更多精彩",
    r"关于我们",
    r"隐私政策",
    r"用户协议",
    r"专栏\s+直播\s+活动\s+课堂\s+社区中心",
    r"番剧\s+电影\s+国创",
    r"会员购\s+漫画\s+赛事",
]


def normalize_adapter_text(value: str) -> str:
    normalized = re.sub(r"[\u200b-\u200f\u202a-\u202e]", "", value)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def is_low_value_signal_text(value: str) -> bool:
    normalized = normalize_adapter_text(value)
    if not normalized:
        return True
    if len(normalized) <= 2:
        return True
    lowered = normalized.lower()
    if re.fullmatch(r"[\d\s,，.。:：;；+\-/|]+", normalized):
        return True
    if any(re.search(pattern, normalized, flags=re.IGNORECASE) for pattern in LOW_VALUE_SIGNAL_PATTERNS):
        return True
    if lowered.count(",") >= 8 and len(normalized) < 220:
        return True
    nav_tokens = ["首页", "动态", "热门", "频道", "专栏", "直播", "课堂", "社区", "登录", "注册", "下载"]
    if sum(1 for token in nav_tokens if token in normalized) >= 4 and len(normalized) < 160:
        return True
    alpha_num_or_cjk = sum(1 for char in normalized if char.isalnum() or "\u4e00" <= char <= "\u9fff")
    return alpha_num_or_cjk < max(4, len(normalized) // 3)


def page_perception(page: dict[str, Any]) -> dict[str, Any]:
    perception = page.get("perception")
    return perception if isinstance(perception, dict) else {}


def perception_digest_items(page: dict[str, Any]) -> list[dict[str, Any]]:
    perception = page_perception(page)
    digest = perception.get("perceptionDigest") if isinstance(perception.get("perceptionDigest"), dict) else page.get("perceptionDigest")
    items = digest.get("items") if isinstance(digest, dict) else None
    return [item for item in items if isinstance(item, dict)] if isinstance(items, list) else []


def text_candidates_from_digest_item(item: dict[str, Any]) -> list[str]:
    candidates = [str(item.get("text") or "")]
    refs = item.get("sourceRefs")
    if isinstance(refs, list):
        for ref in refs:
            if isinstance(ref, dict):
                candidates.extend([str(ref.get("fallbackText") or ""), str(ref.get("textQuote") or "")])
    return [normalize_adapter_text(value) for value in candidates if normalize_adapter_text(value)]


def high_signal_points(page: dict[str, Any], *, limit: int = 5) -> list[str]:
    points: list[str] = []
    seen: set[str] = set()

    def add(value: str) -> None:
        normalized = normalize_adapter_text(value)
        if is_low_value_signal_text(normalized):
            return
        key = re.sub(r"\W+", "", normalized.lower())[:80]
        if key and key not in seen:
            seen.add(key)
            points.append(normalized[:260])

    digest_items = sorted(
        perception_digest_items(page),
        key=lambda item: numeric_signal_score(item.get("importance") or item.get("confidence")),
        reverse=True,
    )
    for item in digest_items:
        for candidate in text_candidates_from_digest_item(item):
            add(candidate)
            if len(points) >= limit:
                return points

    for point in structured_draft_points(page):
        add(point)
        if len(points) >= limit:
            return points

    for paragraph in paragraph_texts(page, 12):
        add(paragraph)
        if len(points) >= limit:
            return points
    return points


def numeric_signal_score(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def page_has_media_dom_limit(page: dict[str, Any]) -> bool:
    perception = page_perception(page)
    quality = perception.get("qualityReport") if isinstance(perception.get("qualityReport"), dict) else page.get("qualityReport")
    warnings = quality.get("warnings") if isinstance(quality, dict) else []
    if isinstance(warnings, list) and any("media_dom_limited" in str(item) for item in warnings):
        return True
    metadata = page.get("metadata") if isinstance(page.get("metadata"), dict) else {}
    hints = metadata.get("pageStateHints")
    return isinstance(hints, list) and "media_dom_limited" in hints


def summary_boundary_note(page: dict[str, Any]) -> str:
    if page_has_media_dom_limit(page):
        return "\n\n### 读取边界\n- 当前为媒体/动态页面，Navia 只总结 DOM 可见文字和页面元数据，不声称理解视频、音频或登录后内容。"
    return ""


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


def structured_page_for_mindmap(page: dict[str, Any]) -> dict[str, Any]:
    perception = page.get("perception") if isinstance(page.get("perception"), dict) else {}
    structured_page = perception.get("structuredPage") if isinstance(perception.get("structuredPage"), dict) else None
    if structured_page is not None and page_paragraphs(structured_page):
        return structured_page
    return page


def summarize_adapter(invocation: dict[str, Any]) -> dict[str, Any]:
    page = require_page(invocation)
    if page is None:
        return adapter_result(
            invocation,
            status="failed",
            content={},
            error={"code": ErrorCode.PAGE_CONTEXT_REQUIRED.value, "message": "Active page is required.", "recoverable": True},
        )
    points = high_signal_points(page, limit=5)
    if points:
        summary = f"## {page_title(page)}\n\n### 关键要点\n" + "\n".join(f"- {point}" for point in points[:5])
    else:
        summary = f"## {page_title(page)}\n\n### 关键要点\n- 当前页面未提取到足够高信号正文，只能展示已捕获的页面标题和可见上下文。"
    summary += summary_boundary_note(page)
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
    excerpts = high_signal_points(page, limit=4)
    if excerpts:
        answer = f"基于当前页面《{page_title(page)}》的可见高信号内容：\n" + "\n".join(f"- {excerpt}" for excerpt in excerpts)
    else:
        answer = f"基于当前页面《{page_title(page)}》回答：\n- 当前页面未提取到足够高信号正文，请先读取正文更完整的页面或展开登录后内容。"
    if user_message:
        answer += f"\n\n问题：{user_message}"
    answer += summary_boundary_note(page)
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
    structured_page = structured_page_for_mindmap(page)
    result = generate_mindmap_payload(
        {
            "sessionId": invocation["sessionId"],
            "turnId": invocation["turnId"],
            "toolCallId": invocation["toolCallId"],
            "structuredPage": structured_page,
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
