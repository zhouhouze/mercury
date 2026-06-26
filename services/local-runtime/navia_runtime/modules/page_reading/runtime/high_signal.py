from __future__ import annotations

import hashlib
import re
from typing import Any

from .structured_page import build_structured_page_context, density_score


SCHEMA_VERSION = "a-v1.1-high-signal-2026-06-05"
NOISE_KEYWORDS = {
    "nav": ["home", "pricing", "sign in", "login", "menu", "subscribe", "登录", "导航", "首页", "频道", "专栏", "直播", "社区中心"],
    "footer": ["copyright", "privacy", "terms", "©", "备案", "隐私", "条款"],
    "recommendation": ["related", "recommended", "you may also", "更多推荐", "相关阅读", "不感兴趣将减少此类内容推荐", "添加至稍后再看"],
    "ad_like": ["advertisement", "sponsored", "推广", "广告"],
    "comment": ["comment", "reply", "评论", "留言"],
}
BOILERPLATE_PATTERNS = [
    r"^keywords[:：]",
    r"未经作者授权",
    r"禁止转载",
    r"下载客户端",
    r"打开客户端",
    r"扫码登录",
    r"登录后推荐",
    r"输入手机号",
    r"输入验证码",
    r"专栏\s+直播\s+活动\s+课堂\s+社区中心",
    r"首页\s+番剧\s+直播",
    r"番剧\s+电影\s+国创",
    r"会员购\s+漫画\s+赛事",
    r"本视频参加过",
    r"整点电子榨菜",
    r"活动已结束",
    r"有砸性多壮志",
    r"QQ群",
    r"群号",
    r"微信",
    r"弹幕列表",
    r"自动连播",
    r"订阅合集",
    r"防挡字幕",
    r"智能防挡弹幕",
    r"按类型过滤",
    r"滚动\s+固定\s+彩色",
    r"充电\s+关注",
    r"相关推荐",
    r"更多推荐",
    r"沪ICP备",
    r"沪公网安备",
    r"营业执照",
    r"增值电信业务经营许可证",
    r"网络文化经营许可证",
    r"互联网药品信息服务资格证书",
    r"医疗器械网络交易服务",
    r"违法不良信息举报",
    r"互联网举报中心",
    r"网上有害信息举报专区",
    r"个性化推荐算法",
    r"共\s*\d+\s*条评论",
    r"展开\s*\d+\s*条回复",
    r"说点什么",
]
BILI_MAIN_ROLES = {"bili_video_title", "bili_video_description", "bili_video_author", "bili_video_stats"}
BILI_NOISE_ROLES = {"bili_comment", "bili_recommendation", "bili_danmaku", "bili_promo"}
XHS_MAIN_ROLES = {"xhs_note_title", "xhs_note_body", "xhs_note_author", "xhs_note_stats"}
XHS_NOISE_ROLES = {"xhs_comment", "xhs_footer", "xhs_sidebar", "xhs_feed_container", "profile_link"}
DIGEST_KINDS = [
    "key_fact",
    "entity",
    "claim",
    "evidence",
    "definition",
    "procedure",
    "open_question",
    "table_fact",
    "code_fact",
    "image_metadata",
]


def build_high_signal_page_perception(input_data: dict[str, Any]) -> dict[str, Any]:
    structured_result = build_structured_page_context(input_data)
    if not structured_result.get("ok"):
        return {
            **structured_result,
            "candidateExtraction": None,
            "highSignalPage": None,
            "sourceMap": None,
            "perceptionDigest": None,
            "qualityReport": None,
        }

    structured_page = structured_result["structuredPage"]
    candidate = build_candidate_extraction(structured_page)
    source_map, source_refs_by_block = build_source_map(structured_page)
    high_signal_page = build_high_signal_page(structured_page, source_refs_by_block)
    digest = build_perception_digest(structured_page, high_signal_page, source_refs_by_block)
    quality_report = build_quality_report(structured_page, high_signal_page, source_map, digest, input_data)
    high_signal_page["qualityReportRef"] = quality_report["reportId"]
    high_signal_page["status"] = status_from_quality(quality_report, input_data)
    if high_signal_page["status"] != "ready" and "quality report is not pass" not in high_signal_page["warnings"]:
        high_signal_page["warnings"].append("quality report is not pass")

    return {
        **structured_result,
        "candidateExtraction": candidate,
        "highSignalPage": high_signal_page,
        "sourceMap": source_map,
        "perceptionDigest": digest,
        "qualityReport": quality_report,
    }


def build_candidate_extraction(page: dict[str, Any]) -> dict[str, Any]:
    paragraphs = page.get("paragraphs", [])
    return {
        "extractorName": "dom_baseline",
        "version": "a-v1.1-dom-baseline",
        "title": page.get("title", ""),
        "text": "\n".join(str(paragraph.get("text", "")) for paragraph in paragraphs[:40]),
        "metadata": {
            "pageId": page["pageId"],
            "contentHash": page["contentHash"],
            "paragraphCount": len(paragraphs),
        },
        "blocks": [
            {
                "candidateBlockId": f"cand_{page['pageId']}_{index + 1:04d}",
                "order": index,
                "text": str(paragraph.get("text", "")),
                "blockType": str(paragraph.get("sourceBlockType") or "paragraph"),
                "metadata": {"headingPath": paragraph.get("headingPath", [])},
            }
            for index, paragraph in enumerate(paragraphs[:160])
        ],
        "confidence": 0.76,
        "warnings": [],
    }


def build_source_map(page: dict[str, Any]) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
    refs: list[dict[str, Any]] = []
    refs_by_block: dict[str, list[dict[str, Any]]] = {}
    for paragraph in page.get("paragraphs", []):
        block_id = block_id_for_paragraph(paragraph)
        ref = source_ref_for_paragraph(page, paragraph, block_id, len(refs))
        refs.append(ref)
        refs_by_block.setdefault(block_id, []).append(ref)
    source_map = {
        "sourceMapId": f"smap_{page['pageId']}",
        "pageId": page["pageId"],
        "contentHash": page["contentHash"],
        "sourceRefs": refs,
    }
    return source_map, refs_by_block


def build_high_signal_page(page: dict[str, Any], source_refs_by_block: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    high_signal_blocks: list[dict[str, Any]] = []
    filtered_blocks: list[dict[str, Any]] = []

    for paragraph in page.get("paragraphs", []):
        block_id = block_id_for_paragraph(paragraph)
        block_type = schema_block_type(str(paragraph.get("sourceBlockType") or "paragraph"))
        region_type, reason, noise = classify_region_and_noise(paragraph)
        density = density_score(str(paragraph.get("text", "")))
        refs = source_refs_by_block.get(block_id, [])
        if should_filter(paragraph, region_type, noise, density):
            filtered_blocks.append(
                {
                    "blockId": block_id,
                    "pageId": page["pageId"],
                    "contentHash": page["contentHash"],
                    "blockType": block_type,
                    "order": int(paragraph.get("order") or 0),
                    "textQuote": quote(str(paragraph.get("text", ""))),
                    "textHash": text_hash(str(paragraph.get("text", ""))),
                    "regionType": region_type,
                    "noiseScore": noise,
                    "reason": reason,
                    "sourceRefs": refs,
                }
            )
            continue

        importance = clamp((density * 0.55) + ((1 - noise) * 0.35) + 0.1)
        high_signal_blocks.append(
            {
                "blockId": block_id,
                "pageId": page["pageId"],
                "contentHash": page["contentHash"],
                "blockType": block_type,
                "order": int(paragraph.get("order") or 0),
                "text": str(paragraph.get("text", ""))[:2400],
                "paragraphIds": [paragraph["paragraphId"]],
                "chunkIds": [paragraph["chunkId"]] if paragraph.get("chunkId") else [],
                "sourceRefs": refs,
                "regionType": region_type,
                "contentDensityScore": density,
                "noiseScore": noise,
                "importance": importance,
                "confidence": clamp(0.68 + (density * 0.22) - (noise * 0.25)),
                "warnings": [] if refs else ["missing source reference"],
            }
        )

    return {
        "schemaVersion": SCHEMA_VERSION,
        "pageId": page["pageId"],
        "sessionId": page.get("sessionId", ""),
        "contentHash": page["contentHash"],
        "sourceStructuredPageRef": {"pageId": page["pageId"], "contentHash": page["contentHash"]},
        "metadata": page["metadata"],
        "highSignalBlocks": high_signal_blocks,
        "filteredBlocks": filtered_blocks,
        "sourceMapRef": f"smap_{page['pageId']}",
        "digestRef": f"digest_{page['pageId']}",
        "qualityReportRef": f"q_{page['pageId']}",
        "status": "ready",
        "warnings": [],
    }


def build_perception_digest(
    page: dict[str, Any],
    high_signal_page: dict[str, Any],
    source_refs_by_block: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    for block in sorted(high_signal_page["highSignalBlocks"], key=lambda item: (-float(item["importance"]), int(item["order"]))):
        kind = digest_kind_for_block(block)
        text = digest_text_for_block(block)
        refs = block.get("sourceRefs", [])
        if not refs:
            rejected.append({"itemId": f"rej_{block['blockId']}", "text": text, "reason": "missing_source_ref", "warnings": ["missing source reference"]})
            continue
        items.append(
            {
                "itemId": f"item_{block['blockId']}",
                "kind": kind,
                "text": text,
                "importance": block["importance"],
                "confidence": block["confidence"],
                "sourceRefs": refs,
                "relatedParagraphIds": block.get("paragraphIds", []),
                "relatedChunkIds": block.get("chunkIds", []),
                "warnings": [],
            }
        )
        if len(items) >= 18:
            break

    source_ref_count = sum(len(item["sourceRefs"]) for item in items)
    digest_text = " ".join(item["text"] for item in items)
    raw_text = " ".join(str(paragraph.get("text", "")) for paragraph in page.get("paragraphs", []))
    compression = clamp(token_estimate(digest_text) / max(1, token_estimate(raw_text)))
    return {
        "digestId": f"digest_{page['pageId']}",
        "pageId": page["pageId"],
        "contentHash": page["contentHash"],
        "items": items,
        "rejectedItems": rejected,
        "summary": {
            "tldr": items[0]["text"][:220] if items else "",
            "keyTakeaways": [item["text"][:180] for item in items[:5]],
        },
        "stats": {
            "itemCount": len(items),
            "sourceRefCount": source_ref_count,
            "compressionRatio": compression,
        },
    }


def build_quality_report(
    page: dict[str, Any],
    high_signal_page: dict[str, Any],
    source_map: dict[str, Any],
    digest: dict[str, Any],
    input_data: dict[str, Any],
) -> dict[str, Any]:
    paragraphs = page.get("paragraphs", [])
    high_blocks = high_signal_page["highSignalBlocks"]
    filtered_blocks = high_signal_page["filteredBlocks"]
    source_refs = source_map["sourceRefs"]
    digest_items = digest["items"]
    all_blocks = len(high_blocks) + len(filtered_blocks)
    readable_chars = sum(len(str(paragraph.get("text", ""))) for paragraph in paragraphs)
    high_chars = sum(len(str(block.get("text", ""))) for block in high_blocks)
    high_with_source = sum(1 for block in high_blocks if block.get("sourceRefs"))
    digest_with_source = sum(1 for item in digest_items if item.get("sourceRefs"))
    refs_with_fallback = sum(1 for ref in source_refs if ref.get("textQuote") or ref.get("fallbackText"))
    raw_tokens = token_estimate(" ".join(str(paragraph.get("text", "")) for paragraph in paragraphs))
    digest_tokens = token_estimate(" ".join(str(item.get("text", "")) for item in digest_items))
    candidate_fact_items = sum(1 for item in digest_items if item["kind"] in {"key_fact", "claim", "evidence", "definition", "procedure", "table_fact", "code_fact"})

    metrics = {
        "noiseRatio": metric(len(filtered_blocks) / max(1, all_blocks), len(filtered_blocks), all_blocks, 0.25, "filteredOrDowngradedNoiseBlocks / allDetectedBlocks", less_or_equal=True),
        "contentCoverage": metric(high_chars / max(1, readable_chars), high_chars, readable_chars, 0.75, "highSignalContentChars / readableContentChars"),
        "sourceCoverage": metric(high_with_source / max(1, len(high_blocks)), high_with_source, len(high_blocks), 0.95, "highSignalBlocksWithSourceRef / highSignalBlocksTotal"),
        "groundingCompleteness": metric(digest_with_source / max(1, len(digest_items)), digest_with_source, len(digest_items), 0.95, "digestItemsWithSourceRefs / digestItemsTotal"),
        "jumpbackCoverage": metric(refs_with_fallback / max(1, len(source_refs)), refs_with_fallback, len(source_refs), 0.95, "sourceRefsWithTextQuoteOrFallbackText / sourceRefsTotal"),
        "digestCompressionRatio": metric(digest_tokens / max(1, raw_tokens), digest_tokens, raw_tokens, 0.35, "digestTextTokenEstimate / structuredPageTextTokenEstimate", less_or_equal=True),
        "candidateFactDensity": metric(candidate_fact_items / max(1, len(digest_items)), candidate_fact_items, len(digest_items), 0.5, "digestCandidateFactItems / digestItemCount"),
    }
    score = overall_score(metrics)
    fatal_issues = []
    warnings = []
    fixture_class = str(input_data.get("fixtureClass") or input_data.get("fixture_class") or "")
    low_signal = raw_tokens < 40
    page_state_hints = page_state_hints_from_metadata(page.get("metadata"))
    strongly_grounded = len(high_blocks) >= 6 and len(source_refs) >= 6 and len(digest_items) >= 6 and refs_with_fallback >= 6
    if not high_blocks:
        fatal_issues.append(issue("NO_HIGH_SIGNAL_BLOCKS", "No high-signal blocks were produced.", "fatal"))
    if low_signal and not fatal_issues:
        warnings.append(issue("LOW_SIGNAL_PAGE_DEGRADED", "Page has too little grounded readable content to be marked pass.", "major"))
    if "auth_gated" in page_state_hints:
        severity = "warning" if strongly_grounded else "major"
        warnings.append(issue("AUTH_GATED_DEGRADED", "Page shows login-gated hints; no-login output is degraded only when grounded public content is insufficient.", severity))
    if "verification_gated" in page_state_hints:
        severity = "warning" if strongly_grounded else "major"
        warnings.append(issue("VERIFICATION_GATED_DEGRADED", "Page shows verification hints; no-login output is degraded only when grounded public content is insufficient.", severity))
    if "not_found" in page_state_hints:
        warnings.append(issue("NOT_FOUND_PAGE_FAILED", "Page appears to be a 404 or unavailable detail page.", "major"))
    if "media_dom_limited" in page_state_hints:
        warnings.append(issue("MEDIA_DOM_LIMITED", "Media page output is limited to DOM-visible text and metadata; no video/audio understanding is claimed.", "warning"))
    if fixture_class == "planning_only":
        warnings.append(issue("PLANNING_ONLY_MEDIA", "Media fixture is planning-only and not real perception ready.", "major"))
    downstream = readiness(score, metrics, fatal_issues, fixture_class)
    if (
        downstream == "degraded"
        and strongly_grounded
        and metrics["sourceCoverage"]["passed"]
        and metrics["groundingCompleteness"]["passed"]
        and metrics["jumpbackCoverage"]["passed"]
        and metrics["digestCompressionRatio"]["passed"]
        and len(filtered_blocks) >= 6
        and {"auth_gated", "verification_gated", "not_found"}.isdisjoint(page_state_hints)
    ):
        downstream = "pass"
    if low_signal and downstream == "pass":
        downstream = "degraded"
    if {"auth_gated", "verification_gated"} & page_state_hints and not strongly_grounded and downstream == "pass":
        downstream = "degraded"
    if "not_found" in page_state_hints:
        downstream = "fail" if score < 0.75 else "degraded"
    return {
        "reportId": f"q_{page['pageId']}",
        "pageId": page["pageId"],
        "contentHash": page["contentHash"],
        "overallScore": score,
        "metrics": metrics,
        "downstreamReadiness": downstream,
        "fatalIssues": fatal_issues,
        "warnings": warnings,
    }


def source_ref_for_paragraph(page: dict[str, Any], paragraph: dict[str, Any], block_id: str, order: int) -> dict[str, Any]:
    text = str(paragraph.get("text", ""))
    ref = {
        "sourceRefId": f"src_{page['pageId']}_{order + 1:04d}",
        "pageId": page["pageId"],
        "contentHash": page["contentHash"],
        "blockId": block_id,
        "blockType": schema_block_type(str(paragraph.get("sourceBlockType") or "paragraph")),
        "order": order,
        "paragraphId": paragraph["paragraphId"],
        "headingPath": paragraph.get("headingPath", []),
        "textQuote": quote(text),
        "textHash": text_hash(text),
        "fallbackText": quote(text, limit=360),
        "confidence": 0.92,
    }
    if paragraph.get("selector"):
        ref["selector"] = str(paragraph["selector"])
    elif paragraph.get("domPath"):
        ref["domPath"] = str(paragraph["domPath"])
    if paragraph.get("chunkId"):
        ref["chunkId"] = paragraph["chunkId"]
    return ref


def block_id_for_paragraph(paragraph: dict[str, Any]) -> str:
    return f"block_{paragraph['paragraphId']}"


def classify_region_and_noise(paragraph: dict[str, Any]) -> tuple[str, str, float]:
    text = str(paragraph.get("text", ""))
    lowered = text.lower()
    source_type = str(paragraph.get("sourceBlockType") or "paragraph")
    dom_role = str(paragraph.get("domSignalRole") or "")
    if is_boilerplate_text(text):
        return "nav", "boilerplate", 0.94
    if dom_role in BILI_NOISE_ROLES:
        region = {
            "bili_comment": "comment",
            "bili_recommendation": "recommendation",
            "bili_danmaku": "ad_like",
            "bili_promo": "ad_like",
        }[dom_role]
        return region, dom_role, 0.96
    if dom_role in XHS_NOISE_ROLES:
        region = {
            "xhs_comment": "comment",
            "xhs_footer": "footer",
            "xhs_sidebar": "nav",
            "xhs_feed_container": "recommendation",
            "profile_link": "nav",
        }[dom_role]
        return region, dom_role, 0.96
    if dom_role in BILI_MAIN_ROLES:
        reason = "bili_video_main"
        return "main", reason, 0.04 if dom_role in {"bili_video_title", "bili_video_description"} else 0.08
    if dom_role in XHS_MAIN_ROLES:
        reason = "xhs_note_main"
        return "main", reason, 0.04 if dom_role in {"xhs_note_title", "xhs_note_body"} else 0.08
    if dom_role in {"feed_card", "media_link", "content_link", "media_block", "content_block", "metadata"}:
        return "section", "unknown", 0.12 if dom_role != "metadata" else 0.18
    if dom_role in {"auth_block", "not_found_block", "auth_link"}:
        return "unknown", dom_role, 0.82
    if source_type == "image_metadata":
        return "metadata", "unknown", 0.18
    for region, keywords in NOISE_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            reason = "ad_like" if region == "ad_like" else region
            return region, reason, 0.9
    if len(text) < 36 and not paragraph.get("headingPath"):
        return "unknown", "low_signal", 0.72
    if source_type in {"table_cell", "table_header", "code", "list_item", "quote"}:
        return "section", "unknown", 0.12
    return "main", "unknown", 0.08


def is_boilerplate_text(text: str) -> bool:
    normalized = re.sub(r"\s+", " ", text).strip()
    if not normalized:
        return True
    if any(re.search(pattern, normalized, flags=re.IGNORECASE) for pattern in BOILERPLATE_PATTERNS):
        return True
    nav_tokens = ["首页", "动态", "热门", "频道", "专栏", "直播", "课堂", "社区", "登录", "注册", "下载"]
    return sum(1 for token in nav_tokens if token in normalized) >= 5 and len(normalized) < 180


def should_filter(paragraph: dict[str, Any], region_type: str, noise: float, density: float) -> bool:
    if region_type in {"nav", "footer", "recommendation", "comment", "ad_like"}:
        return True
    return noise >= 0.7 and density < 0.35


def digest_kind_for_block(block: dict[str, Any]) -> str:
    text = str(block.get("text", ""))
    block_type = str(block.get("blockType", "paragraph"))
    region_type = str(block.get("regionType") or "")
    if block.get("noiseScore") in {0.04, 0.08} and region_type == "main":
        if re.search(r"\bUP\b|UP主|作者|发布|投稿", text, flags=re.IGNORECASE):
            return "entity"
        if re.search(r"播放|弹幕|点赞|投币|收藏|转发|\d+(?:\.\d+)?万", text):
            return "evidence"
        return "claim"
    if block_type == "image":
        return "image_metadata"
    if block_type == "table_cell":
        return "table_fact"
    if block_type == "code":
        return "code_fact"
    lowered = text.lower()
    if re.search(r"\b(step|first|second|procedure|步骤|首先|然后)\b", lowered):
        return "procedure"
    if re.search(r"\b(evidence|data|study|research|according to|证据|数据|研究)\b", lowered):
        return "evidence"
    if re.search(r"\b(argue|claim|therefore|because|观点|认为|因此|因为)\b", lowered):
        return "claim"
    if re.search(r"\b(is|are|means|defined as|定义|是指|意味着)\b", lowered):
        return "definition"
    if "?" in text or "？" in text:
        return "open_question"
    if re.search(r"\b[A-Z][A-Za-z0-9_-]{2,}\b", text):
        return "entity"
    return "key_fact"


def digest_text_for_block(block: dict[str, Any]) -> str:
    text = str(block.get("text", ""))
    words = re.findall(r"[\w\u4e00-\u9fff]+|[^\s\w]", re.sub(r"\s+", " ", text).strip())
    if not words:
        return text[:120]
    return " ".join(words[:16])[:180]


def schema_block_type(source_type: str) -> str:
    return {
        "image_metadata": "image",
        "table_header": "table_cell",
        "table_cell": "table_cell",
        "list_item": "list_item",
        "code": "code",
        "quote": "quote",
        "section": "paragraph",
    }.get(source_type, "paragraph")


def metric(value: float, numerator: float, denominator: float, threshold: float, method: str, *, less_or_equal: bool = False) -> dict[str, Any]:
    rounded = round(value, 3)
    passed = rounded <= threshold if less_or_equal else rounded >= threshold
    return {
        "value": rounded,
        "numerator": round(float(numerator), 3),
        "denominator": round(float(denominator), 3),
        "method": method,
        "threshold": threshold,
        "passed": passed,
    }


def overall_score(metrics: dict[str, dict[str, Any]]) -> float:
    weights = {
        "noiseRatio": 0.15,
        "contentCoverage": 0.15,
        "sourceCoverage": 0.18,
        "groundingCompleteness": 0.18,
        "jumpbackCoverage": 0.16,
        "digestCompressionRatio": 0.1,
        "candidateFactDensity": 0.08,
    }
    score = 0.0
    for name, weight in weights.items():
        item = metrics[name]
        value = float(item["value"])
        if name in {"noiseRatio", "digestCompressionRatio"}:
            component = 1.0 if item["passed"] else max(0.0, 1.0 - value)
        else:
            component = value
        score += component * weight
    return round(clamp(score), 3)


def readiness(score: float, metrics: dict[str, dict[str, Any]], fatal_issues: list[dict[str, Any]], fixture_class: str) -> str:
    if fatal_issues:
        return "fail"
    if fixture_class == "planning_only":
        return "degraded"
    required = ["sourceCoverage", "groundingCompleteness", "jumpbackCoverage", "noiseRatio"]
    if score >= 0.75 and all(metrics[name]["passed"] for name in required):
        return "pass"
    return "degraded" if score >= 0.45 else "fail"


def status_from_quality(quality_report: dict[str, Any], input_data: dict[str, Any]) -> str:
    if str(input_data.get("fixtureClass") or input_data.get("fixture_class") or "") == "planning_only":
        return "degraded"
    return {"pass": "ready", "degraded": "degraded", "fail": "failed"}[quality_report["downstreamReadiness"]]


def page_state_hints_from_metadata(metadata: Any) -> set[str]:
    if not isinstance(metadata, dict):
        return set()
    hints = metadata.get("pageStateHints")
    if not isinstance(hints, list):
        return set()
    return {str(item) for item in hints if isinstance(item, str)}


def issue(code: str, message: str, severity: str) -> dict[str, Any]:
    return {"code": code, "message": message, "severity": severity, "relatedIds": []}


def token_estimate(text: str) -> int:
    return max(1, len(re.findall(r"[\w\u4e00-\u9fff]+", text)))


def quote(text: str, limit: int = 220) -> str:
    safe_text = text.encode("utf-8", errors="replace").decode("utf-8")
    return re.sub(r"\s+", " ", safe_text).strip()[:limit] or "empty"


def text_hash(text: str) -> str:
    return "sha256_" + hashlib.sha256(quote(text, limit=2000).encode("utf-8", errors="replace")).hexdigest()[:32]


def clamp(value: float) -> float:
    return round(max(0.0, min(1.0, float(value))), 3)
