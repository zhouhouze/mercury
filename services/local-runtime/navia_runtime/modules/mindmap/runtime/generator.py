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
    page_id = str(page.get("pageId") or page.get("page_id") or "")
    paragraphs = page.get("paragraphs") if isinstance(page.get("paragraphs"), list) else []
    chunks = page.get("chunks") if isinstance(page.get("chunks"), list) else []
    if not page_id or not paragraphs:
        return error_result(ErrorCode.PAGE_CONTEXT_REQUIRED, "StructuredPageContext has no traceable paragraphs.")

    nodes = select_nodes(page)
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

    source_map = build_source_map(page, nodes)
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


def select_nodes(page: dict[str, Any]) -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    heading_tree = page.get("headingTree") if isinstance(page.get("headingTree"), list) else []
    paragraphs = page.get("paragraphs") if isinstance(page.get("paragraphs"), list) else []
    chunks = page.get("chunks") if isinstance(page.get("chunks"), list) else []

    for heading in heading_tree[:MAX_NODES]:
        if not isinstance(heading, dict) or not heading.get("text"):
            continue
        paragraph_ids = [str(item) for item in heading.get("paragraphIds", []) if str(item).strip()]
        related_paragraphs = [p for p in paragraphs if isinstance(p, dict) and p.get("paragraphId") in paragraph_ids]
        chunk_ids = sorted({str(p.get("chunkId")) for p in related_paragraphs if p.get("chunkId")})
        nodes.append(
            {
                "nodeId": f"node_heading_{len(nodes) + 1}",
                "label": str(heading["text"]),
                "level": max(1, min(int(heading.get("level") or 2), 6)),
                "paragraphIds": paragraph_ids,
                "chunkIds": chunk_ids,
                "excerpt": first_excerpt(related_paragraphs),
            }
        )

    if len(nodes) < 2:
        for paragraph in paragraphs[:MAX_NODES]:
            if not isinstance(paragraph, dict):
                continue
            nodes.append(
                {
                    "nodeId": f"node_paragraph_{len(nodes) + 1}",
                    "label": str(paragraph.get("text") or "")[:MAX_LABEL_CHARS],
                    "level": 2,
                    "paragraphIds": [str(paragraph["paragraphId"])] if paragraph.get("paragraphId") else [],
                    "chunkIds": [str(paragraph["chunkId"])] if paragraph.get("chunkId") else [],
                    "excerpt": str(paragraph.get("text") or "")[:180],
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


def build_source_map(page: dict[str, Any], nodes: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    paragraphs = page.get("paragraphs") if isinstance(page.get("paragraphs"), list) else []
    chunks = page.get("chunks") if isinstance(page.get("chunks"), list) else []
    root_paragraph_ids = [str(p.get("paragraphId")) for p in paragraphs[:4] if isinstance(p, dict) and p.get("paragraphId")]
    root_chunk_ids = [str(c.get("chunkId") or c.get("chunk_id")) for c in chunks[:2] if isinstance(c, dict) and (c.get("chunkId") or c.get("chunk_id"))]
    source_map: dict[str, dict[str, Any]] = {
        "root": {
            "nodeLabel": str(page.get("title") or "当前页面")[:MAX_LABEL_CHARS],
            "paragraphIds": root_paragraph_ids,
            "chunkIds": root_chunk_ids,
            "excerpt": first_excerpt(paragraphs[:2]),
        }
    }
    for index, node in enumerate(nodes[: MAX_NODES - 1], start=1):
        source_map[f"node_{index}"] = {
            "nodeLabel": sanitize_label(str(node.get("label") or "")),
            "paragraphIds": node.get("paragraphIds") or root_paragraph_ids[:1],
            "chunkIds": node.get("chunkIds") or root_chunk_ids[:1],
            "excerpt": str(node.get("excerpt") or source_map["root"]["excerpt"])[:180],
        }
    return source_map


def first_excerpt(paragraphs: list[Any]) -> str:
    for paragraph in paragraphs:
        if isinstance(paragraph, dict) and paragraph.get("text"):
            return str(paragraph["text"])[:180]
    return ""


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
