from __future__ import annotations

import re
from typing import Any

from navia_runtime.contracts import ErrorCode


MAX_NODES = 32
MAX_LABEL_CHARS = 64


def generate_mindmap_payload(input_data: dict[str, Any]) -> dict[str, Any]:
    page = input_data.get("structuredPage")
    if not isinstance(page, dict):
        return error_result(ErrorCode.PAGE_CONTEXT_REQUIRED, "StructuredPageContext is required.")
    perception = page.get("perception") if isinstance(page.get("perception"), dict) else {}
    digest = input_data.get("perceptionDigest") if isinstance(input_data.get("perceptionDigest"), dict) else perception.get("perceptionDigest") if isinstance(perception.get("perceptionDigest"), dict) else None
    source_map_input = input_data.get("sourceMap") if isinstance(input_data.get("sourceMap"), dict) else perception.get("sourceMap") if isinstance(perception.get("sourceMap"), dict) else None
    quality_report = input_data.get("qualityReport") if isinstance(input_data.get("qualityReport"), dict) else perception.get("qualityReport") if isinstance(perception.get("qualityReport"), dict) else None
    readiness = quality_readiness(quality_report)
    if readiness == "fail":
        return error_result(ErrorCode.PAGE_CONTEXT_REQUIRED, "Page perception quality failed; high-signal mindmap is not available.")
    page_id = str(page.get("pageId") or page.get("page_id") or "")
    paragraphs = page.get("paragraphs") if isinstance(page.get("paragraphs"), list) else []
    chunks = page.get("chunks") if isinstance(page.get("chunks"), list) else []
    if not page_id or not paragraphs:
        return error_result(ErrorCode.PAGE_CONTEXT_REQUIRED, "StructuredPageContext has no traceable paragraphs.")

    nodes = select_nodes(page, digest=digest, source_map=source_map_input, readiness=readiness)
    mermaid = render_mermaid(page, nodes)
    if input_data.get("debugForceInvalidOnce") is True:
        mermaid = "mindmap\n"
    validation = validate_mermaid_source(mermaid)
    repair_count = 0
    if not validation["valid"]:
        repair_count = 1
        mermaid = render_mermaid(page, nodes, force_safe=True)
        validation = validate_mermaid_source(mermaid)
    if not validation["valid"]:
        return error_result(ErrorCode.MERMAID_VALIDATION_FAILED, str(validation["error"] or "Mermaid validation failed."))

    source_map = build_source_map(page, nodes, source_map_input)
    paragraph_ids = sorted({pid for node in source_map.values() for pid in node["paragraphIds"]})
    chunk_ids = sorted({cid for node in source_map.values() for cid in node["chunkIds"]})
    return {
        "ok": True,
        "mermaidSource": mermaid,
        "metadata": {
            "format": "mermaid",
            "sourcePageId": page_id,
            "nodeSourceMap": source_map,
            "validation": validation,
            "repairCount": repair_count,
            "nodesCount": len(source_map),
        },
        "sourcePageId": page_id,
        "sourceChunkIds": chunk_ids,
        "paragraphIds": paragraph_ids,
        "error": None,
        "warnings": [],
    }


def select_nodes(page: dict[str, Any], *, digest: dict[str, Any] | None = None, source_map: dict[str, Any] | None = None, readiness: str | None = None) -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    heading_tree = page.get("headingTree") if isinstance(page.get("headingTree"), list) else []
    paragraphs = page.get("paragraphs") if isinstance(page.get("paragraphs"), list) else []
    chunks = page.get("chunks") if isinstance(page.get("chunks"), list) else []
    source_refs = index_source_refs(source_map)
    source_ref_list = list(source_refs.values())

    if readiness == "pass" and isinstance(digest, dict):
        for item in digest.get("items", [])[:MAX_NODES - 1]:
            if not isinstance(item, dict) or not item.get("text"):
                continue
            item_source_refs = [ref for ref in item.get("sourceRefs", []) if isinstance(ref, dict)]
            source_ref_ids = [str(ref.get("sourceRefId")) for ref in item_source_refs if ref.get("sourceRefId")]
            refs_by_id = [source_refs[source_ref_id] for source_ref_id in source_ref_ids if source_ref_id in source_refs]
            effective_refs = refs_by_id or item_source_refs
            paragraph_ids = [str(pid) for pid in item.get("relatedParagraphIds", []) if str(pid).strip()]
            chunk_ids = [str(cid) for cid in item.get("relatedChunkIds", []) if str(cid).strip()]
            for ref in effective_refs:
                if ref.get("paragraphId"):
                    paragraph_ids.append(str(ref["paragraphId"]))
                if ref.get("chunkId"):
                    chunk_ids.append(str(ref["chunkId"]))
            first_ref = effective_refs[0] if effective_refs else {}
            nodes.append(
                {
                    "nodeId": f"node_digest_{len(nodes) + 1}",
                    "label": str(item.get("text") or "")[:MAX_LABEL_CHARS],
                    "level": 2,
                    "digestItemIds": [str(item.get("itemId"))] if item.get("itemId") else [],
                    "sourceRefIds": source_ref_ids,
                    "paragraphIds": unique_values(paragraph_ids),
                    "chunkIds": unique_values(chunk_ids),
                    "excerpt": str(item.get("text") or "")[:180],
                    "textQuote": str(first_ref.get("textQuote") or "")[:180],
                    "fallbackText": str(first_ref.get("fallbackText") or item.get("text") or "")[:240],
                    "jumpback": jumpback_from_ref(first_ref, fallback_reason="selector_missing" if first_ref else "source_ref_missing"),
                }
            )
        if nodes:
            return nodes[:MAX_NODES]

    for heading in heading_tree[:MAX_NODES]:
        if not isinstance(heading, dict) or not heading.get("text"):
            continue
        paragraph_ids = [str(item) for item in heading.get("paragraphIds", []) if str(item).strip()]
        related_paragraphs = [p for p in paragraphs if isinstance(p, dict) and p.get("paragraphId") in paragraph_ids]
        chunk_ids = sorted({str(p.get("chunkId")) for p in related_paragraphs if p.get("chunkId")})
        related_refs = source_refs_for(paragraph_ids=paragraph_ids, chunk_ids=chunk_ids, source_refs=source_ref_list)
        first_ref = related_refs[0] if related_refs else {}
        fallback_text = first_non_empty(
            str(first_ref.get("fallbackText") or first_ref.get("textQuote") or ""),
            first_excerpt(related_paragraphs),
        )
        nodes.append(
            {
                "nodeId": f"node_heading_{len(nodes) + 1}",
                "label": str(heading["text"]),
                "level": max(1, min(int(heading.get("level") or 2), 6)),
                "sourceRefIds": [str(ref.get("sourceRefId")) for ref in related_refs if ref.get("sourceRefId")],
                "paragraphIds": paragraph_ids,
                "chunkIds": chunk_ids,
                "excerpt": fallback_text[:180],
                "textQuote": str(first_ref.get("textQuote") or "")[:180],
                "fallbackText": fallback_text[:240],
                "jumpback": jumpback_from_ref(first_ref, fallback_reason="selector_missing" if first_ref else "source_ref_missing"),
            }
        )

    if len(nodes) < 2:
        for paragraph in paragraphs[:MAX_NODES]:
            if not isinstance(paragraph, dict):
                continue
            paragraph_ids = [str(paragraph["paragraphId"])] if paragraph.get("paragraphId") else []
            chunk_ids = [str(paragraph["chunkId"])] if paragraph.get("chunkId") else []
            related_refs = source_refs_for(paragraph_ids=paragraph_ids, chunk_ids=chunk_ids, source_refs=source_ref_list)
            first_ref = related_refs[0] if related_refs else {}
            fallback_text = first_non_empty(
                str(first_ref.get("fallbackText") or first_ref.get("textQuote") or ""),
                str(paragraph.get("text") or ""),
            )
            nodes.append(
                {
                    "nodeId": f"node_paragraph_{len(nodes) + 1}",
                    "label": str(paragraph.get("text") or "")[:MAX_LABEL_CHARS],
                    "level": 2,
                    "sourceRefIds": [str(ref.get("sourceRefId")) for ref in related_refs if ref.get("sourceRefId")],
                    "paragraphIds": paragraph_ids,
                    "chunkIds": chunk_ids,
                    "excerpt": fallback_text[:180],
                    "textQuote": str(first_ref.get("textQuote") or "")[:180],
                    "fallbackText": fallback_text[:240],
                    "jumpback": jumpback_from_ref(first_ref, fallback_reason="selector_missing" if first_ref else "source_ref_missing"),
                }
            )

    if not any(node["chunkIds"] for node in nodes) and chunks:
        first_chunk_id = str(chunks[0].get("chunkId") or chunks[0].get("chunk_id") or "")
        if first_chunk_id:
            for node in nodes:
                node["chunkIds"] = [first_chunk_id]
    return nodes[:MAX_NODES]


def render_mermaid(page: dict[str, Any], nodes: list[dict[str, Any]], *, force_safe: bool = False) -> str:
    root_label = sanitize_label(str(page.get("title") or "当前页面"))
    if force_safe:
        root_label = root_label or "当前页面"
    lines = ["mindmap", f"  root(({root_label}))"]
    for node in nodes[:MAX_NODES - 1]:
        label = sanitize_label(str(node.get("label") or ""))
        if not label:
            continue
        indent = "    " if int(node.get("level") or 2) <= 2 else "      "
        lines.append(f"{indent}{label}")
    return "\n".join(lines)


def validate_mermaid_source(source: str) -> dict[str, Any]:
    lines = [line.rstrip() for line in source.splitlines() if line.strip()]
    if not lines:
        return {"valid": False, "error": "Mermaid source is empty."}
    if lines[0] != "mindmap":
        return {"valid": False, "error": "Mermaid source must start with mindmap."}
    if len(lines) < 2 or "root((" not in lines[1]:
        return {"valid": False, "error": "Mermaid source must contain root node."}
    if len(lines) > MAX_NODES:
        return {"valid": False, "error": "Mermaid node count exceeds V1.2 limit."}
    if any(len(line.strip()) > MAX_LABEL_CHARS + 12 for line in lines[1:]):
        return {"valid": False, "error": "Mermaid label exceeds V1.2 limit."}
    return {"valid": True, "status": "passed", "error": None}


def build_source_map(page: dict[str, Any], nodes: list[dict[str, Any]], source_map_input: dict[str, Any] | None = None) -> dict[str, dict[str, Any]]:
    paragraphs = page.get("paragraphs") if isinstance(page.get("paragraphs"), list) else []
    chunks = page.get("chunks") if isinstance(page.get("chunks"), list) else []
    source_refs = [ref for ref in (source_map_input or {}).get("sourceRefs", []) if isinstance(ref, dict)]
    root_paragraph_ids = [str(p.get("paragraphId")) for p in paragraphs[:4] if isinstance(p, dict) and p.get("paragraphId")]
    root_chunk_ids = [str(c.get("chunkId") or c.get("chunk_id")) for c in chunks[:2] if isinstance(c, dict) and (c.get("chunkId") or c.get("chunk_id"))]
    root_source_ref_ids = [str(ref.get("sourceRefId")) for ref in source_refs[:4] if ref.get("sourceRefId")]
    root_fallback = first_non_empty(first_excerpt(paragraphs[:2]), *(str(ref.get("fallbackText") or ref.get("textQuote") or "") for ref in source_refs[:1]))
    source_map: dict[str, dict[str, Any]] = {
        "root": {
            "nodeLabel": str(page.get("title") or "当前页面")[:MAX_LABEL_CHARS],
            "digestItemIds": [],
            "sourceRefIds": root_source_ref_ids,
            "paragraphIds": root_paragraph_ids,
            "chunkIds": root_chunk_ids,
            "excerpt": root_fallback[:180],
            "textQuote": str(source_refs[0].get("textQuote") or "")[:180] if source_refs else "",
            "fallbackText": root_fallback[:240],
            "jumpback": jumpback_from_ref(source_refs[0] if source_refs else {}, fallback_reason="selector_missing" if source_refs else "source_ref_missing"),
        }
    }
    for index, node in enumerate(nodes[: MAX_NODES - 1], start=1):
        fallback_text = str(node.get("fallbackText") or node.get("excerpt") or source_map["root"]["fallbackText"])[:240]
        paragraph_ids = node.get("paragraphIds") or root_paragraph_ids[:1]
        chunk_ids = node.get("chunkIds") or root_chunk_ids[:1]
        node_source_ref_ids = node.get("sourceRefIds") or []
        if not node_source_ref_ids:
            matched_refs = source_refs_for(
                paragraph_ids=[str(value) for value in paragraph_ids],
                chunk_ids=[str(value) for value in chunk_ids],
                source_refs=source_refs,
            )
            node_source_ref_ids = [str(ref.get("sourceRefId")) for ref in matched_refs if ref.get("sourceRefId")]
        source_map[f"node_{index}"] = {
            "nodeLabel": sanitize_label(str(node.get("label") or "")),
            "digestItemIds": node.get("digestItemIds") or [],
            "sourceRefIds": node_source_ref_ids,
            "paragraphIds": paragraph_ids,
            "chunkIds": chunk_ids,
            "excerpt": str(node.get("excerpt") or source_map["root"]["excerpt"])[:180],
            "textQuote": str(node.get("textQuote") or "")[:180],
            "fallbackText": fallback_text,
            "jumpback": node.get("jumpback") if isinstance(node.get("jumpback"), dict) else {"mode": "fallback", "reason": "source_ref_missing"},
        }
    return source_map


def first_excerpt(paragraphs: list[Any]) -> str:
    for paragraph in paragraphs:
        if isinstance(paragraph, dict) and paragraph.get("text"):
            return str(paragraph["text"])[:180]
    return ""


def first_non_empty(*values: str) -> str:
    for value in values:
        if value.strip():
            return value.strip()
    return ""


def unique_values(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def quality_readiness(quality_report: dict[str, Any] | None) -> str | None:
    if not isinstance(quality_report, dict):
        return None
    readiness = str(quality_report.get("downstreamReadiness") or "").lower()
    return readiness if readiness in {"pass", "degraded", "fail"} else None


def index_source_refs(source_map: dict[str, Any] | None) -> dict[str, dict[str, Any]]:
    if not isinstance(source_map, dict):
        return {}
    refs = source_map.get("sourceRefs")
    if not isinstance(refs, list):
        return {}
    return {str(ref.get("sourceRefId")): ref for ref in refs if isinstance(ref, dict) and ref.get("sourceRefId")}


def source_refs_for(*, paragraph_ids: list[str], chunk_ids: list[str], source_refs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    paragraph_set = {value for value in paragraph_ids if value}
    chunk_set = {value for value in chunk_ids if value}
    matched: list[dict[str, Any]] = []
    for ref in source_refs:
        paragraph_id = str(ref.get("paragraphId") or "")
        chunk_id = str(ref.get("chunkId") or "")
        if (paragraph_id and paragraph_id in paragraph_set) or (chunk_id and chunk_id in chunk_set):
            matched.append(ref)
    return matched


def jumpback_from_ref(ref: dict[str, Any], *, fallback_reason: str) -> dict[str, Any]:
    selector = str(ref.get("selector") or "").strip()
    dom_path = str(ref.get("domPath") or "").strip()
    if selector or dom_path:
        payload: dict[str, Any] = {"mode": "dom"}
        if selector:
            payload["selector"] = selector
        if dom_path:
            payload["domPath"] = dom_path
        if ref.get("startOffset") is not None:
            payload["startOffset"] = ref.get("startOffset")
        if ref.get("endOffset") is not None:
            payload["endOffset"] = ref.get("endOffset")
        return payload
    return {"mode": "fallback", "reason": fallback_reason}


def sanitize_label(value: str) -> str:
    normalized = re.sub(r"\s+", " ", value).strip()
    normalized = re.sub(r"[()\[\]{}<>:\"'`|]", "", normalized)
    return normalized[:MAX_LABEL_CHARS] or "未命名节点"


def error_result(code: ErrorCode, message: str) -> dict[str, Any]:
    return {
        "ok": False,
        "mermaidSource": None,
        "metadata": None,
        "sourcePageId": None,
        "sourceChunkIds": [],
        "paragraphIds": [],
        "error": {"code": code.value, "message": message, "recoverable": True},
        "warnings": [],
    }
