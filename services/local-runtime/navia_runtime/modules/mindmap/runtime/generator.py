from __future__ import annotations

import re
from typing import Any

from navia_runtime.contracts import ErrorCode


MAX_NODES = 32
MAX_LABEL_CHARS = 64
MAX_THEME_CHILDREN = 5
MAX_THEMES = 5
MAX_CHILD_LABEL_CHARS = 34
MAX_THEME_LABEL_CHARS = 18

SITE_SHELL_TITLES = {
    "bilibili.com": "B站页面",
    "www.bilibili.com": "B站页面",
    "xiaohongshu.com": "小红书页面",
    "www.xiaohongshu.com": "小红书页面",
    "guancha.cn": "观察者网页面",
    "www.guancha.cn": "观察者网页面",
}

NOISE_TEXT_PATTERNS = [
    r"扫码登录",
    r"登录后推荐",
    r"输入手机号",
    r"输入验证码",
    r"更多精彩",
    r"下载客户端",
    r"免费看高清视频",
    r"首页\s+番剧\s+直播",
    r"番剧\s+电影\s+国创",
    r"会员购\s+漫画\s+赛事",
    r"游戏中心",
    r"不感兴趣将减少此类内容推荐",
    r"添加至稍后再看",
    r"^(dom signals|metadata|keywords|feed_card|media_link|media_block|content_block|nav_block|link)$",
    r"^keywords[:：]",
    r"关于我们",
    r"隐私政策",
    r"用户协议",
]

CHINESE_THEME_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("核心事件", ("宣布", "发生", "回应", "发布", "启动", "指出", "表示", "称", "要求", "决定")),
    ("人物与机构", ("作者", "专家", "公司", "机构", "政府", "部门", "委员会", "发言人", "代表")),
    ("背景原因", ("原因", "背景", "由于", "因为", "此前", "长期", "历史", "争议")),
    ("影响与结果", ("影响", "导致", "结果", "变化", "风险", "后果", "增长", "下降")),
    ("互动与传播", ("评论", "转发", "阅读", "播放", "点赞", "关注", "粉丝", "热评", "讨论")),
    ("视频与内容", ("视频", "直播", "番剧", "笔记", "作品", "内容", "投稿", "节目", "合集")),
    ("登录与访问限制", ("登录", "验证码", "扫码", "权限", "访问", "注册")),
]


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
    node_bindings = build_node_bindings(source_map)
    paragraph_ids = sorted({pid for node in source_map.values() for pid in node["paragraphIds"]})
    chunk_ids = sorted({cid for node in source_map.values() for cid in node["chunkIds"]})
    return {
        "ok": True,
        "mermaidSource": mermaid,
        "metadata": {
            "format": "mermaid",
            "sourcePageId": page_id,
            "nodeSourceMap": source_map,
            "nodeBindings": node_bindings,
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
        theme_nodes: dict[str, dict[str, Any]] = {}
        theme_child_counts: dict[str, int] = {}
        child_labels_by_theme: dict[str, set[str]] = {}
        global_child_labels: set[str] = set()
        for item in digest.get("items", [])[:MAX_NODES - 1]:
            if not isinstance(item, dict) or not item.get("text"):
                continue
            item_text = str(item.get("text") or "")
            if is_noise_text(item_text):
                continue
            if len(nodes) >= MAX_NODES - 1:
                break
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
            theme_label = digest_theme_label(item, first_ref)
            if len(theme_nodes) >= MAX_THEMES and theme_label not in theme_nodes:
                theme_label = "其他要点"
            if theme_label not in theme_nodes and len(nodes) < MAX_NODES - 1:
                theme_node = {
                    "nodeId": f"node_theme_{len(theme_nodes) + 1}",
                    "label": theme_label,
                    "level": 2,
                    "digestItemIds": [],
                    "sourceRefIds": [],
                    "paragraphIds": [],
                    "chunkIds": [],
                    "excerpt": "",
                    "textQuote": "",
                    "fallbackText": "",
                    "jumpback": {"mode": "fallback", "reason": "theme_summary"},
                }
                theme_nodes[theme_label] = theme_node
                theme_child_counts[theme_label] = 0
                child_labels_by_theme[theme_label] = set()
                nodes.append(theme_node)

            theme_node = theme_nodes.get(theme_label)
            if theme_node is not None:
                theme_node["digestItemIds"] = unique_values([*theme_node.get("digestItemIds", []), str(item.get("itemId") or "")])
                theme_node["sourceRefIds"] = unique_values([*theme_node.get("sourceRefIds", []), *source_ref_ids])
                theme_node["paragraphIds"] = unique_values([*theme_node.get("paragraphIds", []), *paragraph_ids])
                theme_node["chunkIds"] = unique_values([*theme_node.get("chunkIds", []), *chunk_ids])
                theme_node["excerpt"] = first_non_empty(str(theme_node.get("excerpt") or ""), str(item.get("text") or "")[:180])
                theme_node["textQuote"] = first_non_empty(str(theme_node.get("textQuote") or ""), str(first_ref.get("textQuote") or "")[:180])
                theme_node["fallbackText"] = first_non_empty(str(theme_node.get("fallbackText") or ""), str(first_ref.get("fallbackText") or item.get("text") or "")[:240])
                if theme_node.get("jumpback", {}).get("reason") == "theme_summary":
                    theme_node["jumpback"] = jumpback_from_ref(first_ref, fallback_reason="selector_missing" if first_ref else "source_ref_missing")

            if theme_child_counts.get(theme_label, 0) >= MAX_THEME_CHILDREN:
                continue
            child_label = compact_digest_label(str(item.get("text") or ""), first_ref)
            if not child_label or child_label == "未命名节点" or is_noise_text(child_label):
                continue
            child_key = normalize_label_text(child_label).lower()
            if child_key in global_child_labels:
                continue
            if child_key in child_labels_by_theme.setdefault(theme_label, set()):
                continue
            child_labels_by_theme[theme_label].add(child_key)
            global_child_labels.add(child_key)
            theme_child_counts[theme_label] = theme_child_counts.get(theme_label, 0) + 1
            if len(nodes) >= MAX_NODES - 1:
                break
            nodes.append(
                {
                    "nodeId": f"node_digest_{len(nodes) + 1}",
                    "label": child_label,
                    "level": 3,
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
    root_label = root_page_label(page)
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
    root_fallback = first_non_empty(
        first_signal_excerpt(paragraphs[:6]),
        *(str(ref.get("fallbackText") or ref.get("textQuote") or "") for ref in source_refs[:4] if not is_noise_text(str(ref.get("fallbackText") or ref.get("textQuote") or ""))),
        first_excerpt(paragraphs[:2]),
    )
    source_map: dict[str, dict[str, Any]] = {
        "root": {
            "nodeLabel": root_page_label(page)[:MAX_LABEL_CHARS],
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
            "nodeLabel": sanitize_label(str(node.get("label") or ""))[:MAX_LABEL_CHARS],
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


def build_node_bindings(source_map: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    bindings: list[dict[str, Any]] = []
    for index, (source_map_key, source) in enumerate(source_map.items()):
        node_label = str(source.get("nodeLabel") or source_map_key)[:MAX_LABEL_CHARS]
        bindings.append(
            {
                "nodeId": source_map_key,
                "nodeSourceMapKey": source_map_key,
                "nodeLabel": node_label,
                "mermaidLineIndex": index + 1,
                "sourceRefIds": [str(value) for value in source.get("sourceRefIds", []) if str(value).strip()],
                "paragraphIds": [str(value) for value in source.get("paragraphIds", []) if str(value).strip()],
                "chunkIds": [str(value) for value in source.get("chunkIds", []) if str(value).strip()],
            }
        )
    return bindings


def first_excerpt(paragraphs: list[Any]) -> str:
    for paragraph in paragraphs:
        if isinstance(paragraph, dict) and paragraph.get("text"):
            return str(paragraph["text"])[:180]
    return ""


def first_signal_excerpt(paragraphs: list[Any]) -> str:
    for paragraph in paragraphs:
        if isinstance(paragraph, dict) and paragraph.get("text"):
            text = str(paragraph["text"])
            if not is_noise_text(text):
                return text[:180]
    return ""


def first_non_empty(*values: str) -> str:
    for value in values:
        if value.strip():
            return value.strip()
    return ""


def digest_theme_label(item: dict[str, Any], first_ref: dict[str, Any]) -> str:
    heading_path = first_ref.get("headingPath")
    if isinstance(heading_path, list):
        for value in reversed(heading_path):
            label = compact_theme_label(str(value or ""))
            if label and label != "未命名节点" and not is_noise_text(label):
                return label
    text = str(item.get("text") or first_ref.get("fallbackText") or first_ref.get("textQuote") or "")
    semantic = semantic_theme_label(text)
    if semantic:
        return semantic
    lowered = text.lower()
    if any(token in lowered for token in ["source", "sourceref", "jumpback", "fallback", "evidence", "trace"]):
        return "来源与追踪"
    if any(token in lowered for token in ["api", "endpoint", "runtime", "session", "stream", "contract", "adapter"]):
        return "架构与接口"
    if any(token in lowered for token in ["install", "run", "test", "procedure", "validate", "create"]):
        return "流程与操作"
    if any(token in lowered for token in ["fail", "risk", "degraded", "missing", "cannot", "must not", "forbidden"]):
        return "限制与风险"
    return "核心要点"


def compact_digest_label(text: str, first_ref: dict[str, Any]) -> str:
    candidate = first_non_empty(str(first_ref.get("fallbackText") or ""), str(first_ref.get("textQuote") or ""), text)
    return compact_node_label(candidate, max_chars=MAX_CHILD_LABEL_CHARS)


def compact_node_label(value: str, *, max_chars: int = MAX_LABEL_CHARS) -> str:
    normalized = normalize_label_text(value)
    normalized = strip_leading_noise(normalized)
    normalized = strip_sentence_tail(normalized)
    if len(normalized) <= max_chars:
        return normalized or "未命名节点"
    truncated = normalized[: max_chars - 1]
    if re.search(r"[A-Za-z0-9]\s", truncated):
        truncated = truncated.rsplit(" ", 1)[0].strip() or normalized[: max_chars - 1]
    return f"{truncated.strip('，。；：、,. ')}…"


def compact_theme_label(value: str) -> str:
    label = compact_node_label(value, max_chars=MAX_THEME_LABEL_CHARS)
    if label.endswith("…"):
        label = label[:-1].strip()
    return label or "核心要点"


def normalize_label_text(value: str) -> str:
    normalized = re.sub(r"[\ud800-\udfff]", "", value)
    normalized = re.sub(r"[\u200b-\u200f\u202a-\u202e]", "", normalized)
    normalized = re.sub(r"[^\w\u4e00-\u9fff，。；：、,.!?！？%+\-/\s]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    normalized = re.sub(r"\s+([,.;:!?，。；：！？])", r"\1", normalized)
    normalized = re.sub(r"^(because|therefore|however|for example|for instance)\s+", "", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"^(procedure|step)\s*[:：]\s*", "", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\b(is|are|was|were)\s+defined\s+as\b", "定义为", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\b(the|a|an)\s+", "", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"[()\[\]{}<>:\"'`|]", "", normalized)
    normalized = re.sub(r"\b(media|nav|header|footer|content|main)\b[_-]?\d*", "", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\s+", " ", normalized).strip(" ，。；：、,.")
    return normalized


def strip_leading_noise(value: str) -> str:
    normalized = re.sub(r"^(首页|推荐|热门|更多|登录|注册|打开|点击|进入|分享|评论|研究)[：:、\s]+", "", value)
    normalized = re.sub(r"^(Home|Recommended|Popular|More|Login|Sign in)[:\s]+", "", normalized, flags=re.IGNORECASE)
    return normalized.strip() or value


def strip_sentence_tail(value: str) -> str:
    for separator in ["。", "；", ";"]:
        if separator in value and len(value) > 24:
            head = value.split(separator, 1)[0].strip()
            if len(head) >= 6:
                return head
    if "，" in value and len(value) > 30:
        head = value.split("，", 1)[0].strip()
        if len(head) >= 6:
            return head
    return value


def semantic_theme_label(text: str) -> str | None:
    normalized = normalize_label_text(text)
    if not normalized:
        return None
    for label, keywords in CHINESE_THEME_KEYWORDS:
        if any(keyword in normalized for keyword in keywords):
            return label
    return None


def is_noise_text(value: str) -> bool:
    normalized = normalize_label_text(value)
    if not normalized:
        return True
    if len(normalized) <= 2:
        return True
    if re.fullmatch(r"[\d\s,，.。:：;；+\-/]+", normalized):
        return True
    if sum(1 for char in normalized if char.isalnum() or "\u4e00" <= char <= "\u9fff") < max(3, len(normalized) // 3):
        return True
    return any(re.search(pattern, normalized, flags=re.IGNORECASE) for pattern in NOISE_TEXT_PATTERNS)


def root_page_label(page: dict[str, Any]) -> str:
    raw_title = normalize_label_text(str(page.get("title") or ""))
    metadata = page.get("metadata") if isinstance(page.get("metadata"), dict) else {}
    domain = str(page.get("domain") or metadata.get("domain") or "")
    if not domain:
        url = str(page.get("url") or "")
        match = re.search(r"https?://([^/]+)", url)
        domain = match.group(1).lower() if match else ""
    lower_title = raw_title.lower()
    if not raw_title or is_noise_text(raw_title) or "゜" in str(page.get("title") or "") or ("bilibili" in lower_title and len(raw_title) > 20):
        return SITE_SHELL_TITLES.get(domain.lower(), "当前页面")
    title = re.sub(r"\s*[-_—|]\s*(bilibili|小红书|观察者网|guancha).*$", "", raw_title, flags=re.IGNORECASE).strip()
    return compact_node_label(title or SITE_SHELL_TITLES.get(domain.lower(), "当前页面"), max_chars=MAX_LABEL_CHARS)


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
    return compact_node_label(value)


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
