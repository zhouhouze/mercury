from __future__ import annotations

import json
from pathlib import Path

from navia_runtime.contracts import ErrorCode
from navia_runtime.modules.mindmap.runtime import generate_mindmap_payload, validate_mermaid_source


A_EVIDENCE_DIR = Path(__file__).resolve().parents[2] / "page_reading/tests/evidence"


def structured_page(name: str) -> dict[str, object]:
    evidence = json.loads((A_EVIDENCE_DIR / f"{name}.structured-page.json").read_text(encoding="utf-8"))
    assert evidence["ok"] is True
    return evidence["structuredPage"]


def evidence_payload(name: str, suffix: str) -> dict[str, object]:
    return json.loads((A_EVIDENCE_DIR / f"{name}.{suffix}.json").read_text(encoding="utf-8"))


def test_article_docs_and_readme_generate_valid_traceable_mindmaps() -> None:
    for name in ["article", "docs", "github_readme"]:
        result = generate_mindmap_payload(
            {
                "sessionId": "sess_c_test",
                "turnId": "turn_c_test",
                "toolCallId": "tc_c_test",
                "structuredPage": structured_page(name),
            }
        )

        assert result["ok"] is True, name
        assert validate_mermaid_source(result["mermaidSource"])["valid"] is True
        assert result["metadata"]["format"] == "mermaid"
        assert result["metadata"]["validation"]["valid"] is True
        assert result["metadata"]["repairCount"] <= 1
        assert result["sourcePageId"]
        assert result["paragraphIds"], name
        assert result["sourceChunkIds"], name
        source_map = result["metadata"]["nodeSourceMap"]
        node_bindings = result["metadata"]["nodeBindings"]
        assert "root" in source_map
        assert node_bindings[0]["nodeSourceMapKey"] == "root"
        assert {binding["nodeSourceMapKey"] for binding in node_bindings} == set(source_map.keys())
        assert all(node["paragraphIds"] or node["chunkIds"] for node in source_map.values())


def test_repair_happens_at_most_once_for_invalid_first_render() -> None:
    result = generate_mindmap_payload(
        {
            "sessionId": "sess_c_repair",
            "turnId": "turn_c_repair",
            "toolCallId": "tc_c_repair",
            "structuredPage": structured_page("article"),
            "debugForceInvalidOnce": True,
        }
    )

    assert result["ok"] is True
    assert result["metadata"]["repairCount"] == 1
    assert result["metadata"]["validation"]["valid"] is True


def test_missing_structured_page_returns_error_without_fake_mermaid() -> None:
    result = generate_mindmap_payload(
        {
            "sessionId": "sess_c_missing",
            "turnId": "turn_c_missing",
            "toolCallId": "tc_c_missing",
        }
    )

    assert result["ok"] is False
    assert result["mermaidSource"] is None
    assert result["error"]["code"] == ErrorCode.PAGE_CONTEXT_REQUIRED.value


def test_sparse_heading_tree_uses_paragraph_fallback_with_source_refs() -> None:
    page = structured_page("article")
    page = {**page, "headingTree": []}

    result = generate_mindmap_payload(
        {
            "sessionId": "sess_c_sparse",
            "turnId": "turn_c_sparse",
            "toolCallId": "tc_c_sparse",
            "structuredPage": page,
        }
    )

    assert result["ok"] is True
    assert result["paragraphIds"]
    assert result["sourceChunkIds"]
    assert len(result["metadata"]["nodeSourceMap"]) >= 2


def test_pass_quality_uses_digest_items_and_source_refs_first() -> None:
    result = generate_mindmap_payload(
        {
            "sessionId": "sess_c_digest",
            "turnId": "turn_c_digest",
            "toolCallId": "tc_c_digest",
            "structuredPage": structured_page("article"),
            "perceptionDigest": evidence_payload("article", "perception-digest"),
            "sourceMap": evidence_payload("article", "source-map"),
            "qualityReport": evidence_payload("article", "quality-report"),
        }
    )

    assert result["ok"] is True
    node_source_map = result["metadata"]["nodeSourceMap"]
    primary_nodes = [node for node_id, node in node_source_map.items() if node_id != "root"]
    assert primary_nodes
    assert any(node["digestItemIds"] for node in primary_nodes)
    assert any(node["sourceRefIds"] for node in primary_nodes)
    assert all(node["fallbackText"] for node in primary_nodes)
    node_bindings = result["metadata"]["nodeBindings"]
    primary_bindings = [binding for binding in node_bindings if binding["nodeSourceMapKey"] != "root"]
    assert primary_bindings
    assert any(binding["sourceRefIds"] for binding in primary_bindings)
    assert all(isinstance(binding["mermaidLineIndex"], int) and binding["mermaidLineIndex"] >= 2 for binding in primary_bindings)


def test_pass_quality_groups_digest_items_into_readable_themes() -> None:
    result = generate_mindmap_payload(
        {
            "sessionId": "sess_c_grouped",
            "turnId": "turn_c_grouped",
            "toolCallId": "tc_c_grouped",
            "structuredPage": structured_page("product_doc"),
            "perceptionDigest": evidence_payload("product_doc", "perception-digest"),
            "sourceMap": evidence_payload("product_doc", "source-map"),
            "qualityReport": evidence_payload("product_doc", "quality-report"),
        }
    )

    assert result["ok"] is True
    lines = result["mermaidSource"].splitlines()
    theme_lines = [line for line in lines if line.startswith("    ") and not line.startswith("      ")]
    child_lines = [line for line in lines if line.startswith("      ")]
    assert theme_lines
    assert child_lines
    assert all(len(line.strip()) <= 64 for line in lines[1:])
    assert any("Adapter Contract" in line or "架构与接口" in line or "来源与追踪" in line or "流程与操作" in line for line in theme_lines)
    assert all("pageId , contentHash" not in line for line in theme_lines)


def test_complex_site_shell_noise_is_removed_from_digest_mindmap() -> None:
    page = {
        "pageId": "page_bili_home",
        "title": "哔哩哔哩 (゜-゜)つロ 干杯~-bilibili",
        "url": "https://www.bilibili.com/",
        "domain": "www.bilibili.com",
        "paragraphs": [
            {"paragraphId": "p1", "chunkId": "c1", "text": "首页 番剧 直播 游戏中心 会员购 漫画 赛事 下载客户端 登录 注册"},
            {"paragraphId": "p2", "chunkId": "c1", "text": "这条视频评论讨论了新专辑发布后的传播效果和观众反馈。"},
            {"paragraphId": "p3", "chunkId": "c2", "text": "作者表示后续还会更新幕后内容，粉丝关注度继续上升。"},
        ],
        "chunks": [{"chunkId": "c1"}, {"chunkId": "c2"}],
    }
    source_map = {
        "sourceRefs": [
            {"sourceRefId": "src_nav", "paragraphId": "p1", "chunkId": "c1", "fallbackText": "首页 番剧 直播 游戏中心 会员购 漫画 赛事 下载客户端 登录 注册"},
            {"sourceRefId": "src_meta", "paragraphId": "p1", "chunkId": "c1", "fallbackText": "keywords: bilibili,哔哩哔哩,弹幕视频,会员购,游戏中心"},
            {"sourceRefId": "src_video", "paragraphId": "p2", "chunkId": "c1", "fallbackText": "这条视频评论讨论了新专辑发布后的传播效果和观众反馈。"},
            {"sourceRefId": "src_author", "paragraphId": "p3", "chunkId": "c2", "fallbackText": "作者表示后续还会更新幕后内容，粉丝关注度继续上升。"},
        ]
    }
    digest = {
        "items": [
            {"itemId": "nav", "text": "首页 番剧 直播 游戏中心 会员购 漫画 赛事 下载客户端 登录 注册", "sourceRefs": [source_map["sourceRefs"][0]]},
            {"itemId": "meta", "text": "keywords: bilibili,哔哩哔哩,弹幕视频,会员购,游戏中心", "sourceRefs": [source_map["sourceRefs"][1]]},
            {"itemId": "video", "text": "这条视频评论讨论了新专辑发布后的传播效果和观众反馈。", "sourceRefs": [source_map["sourceRefs"][2]]},
            {"itemId": "author", "text": "作者表示后续还会更新幕后内容，粉丝关注度继续上升。", "sourceRefs": [source_map["sourceRefs"][3]]},
        ]
    }
    quality = {"downstreamReadiness": "pass"}

    result = generate_mindmap_payload({"structuredPage": page, "perceptionDigest": digest, "sourceMap": source_map, "qualityReport": quality})

    assert result["ok"] is True
    assert "゜" not in result["mermaidSource"]
    assert "下载客户端" not in result["mermaidSource"]
    assert "keywords" not in result["mermaidSource"]
    assert result["metadata"]["nodeSourceMap"]["root"]["nodeLabel"] == "B站页面"
    labels = [node["nodeLabel"] for node in result["metadata"]["nodeSourceMap"].values()]
    assert any(label in {"核心事件", "视频与内容", "互动与传播", "人物与机构"} for label in labels)
    assert all(len(label) <= 64 for label in labels)


def test_fail_quality_does_not_create_fake_high_signal_mindmap() -> None:
    quality = evidence_payload("article", "quality-report")
    quality = {**quality, "downstreamReadiness": "fail"}

    result = generate_mindmap_payload(
        {
            "sessionId": "sess_c_fail",
            "turnId": "turn_c_fail",
            "toolCallId": "tc_c_fail",
            "structuredPage": structured_page("article"),
            "perceptionDigest": evidence_payload("article", "perception-digest"),
            "sourceMap": evidence_payload("article", "source-map"),
            "qualityReport": quality,
        }
    )

    assert result["ok"] is False
    assert result["mermaidSource"] is None
    assert result["error"]["code"] == ErrorCode.PAGE_CONTEXT_REQUIRED.value
