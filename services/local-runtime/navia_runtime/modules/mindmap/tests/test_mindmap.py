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
    root = result["metadata"]["nodeSourceMap"]["root"]
    assert root["sourceRefIds"]
    assert "src_nav" not in root["sourceRefIds"]
    assert "src_meta" not in root["sourceRefIds"]
    assert "新专辑" in root["fallbackText"] or "幕后内容" in root["fallbackText"]
    labels = [node["nodeLabel"] for node in result["metadata"]["nodeSourceMap"].values()]
    assert any(label in {"核心事件", "视频与内容", "互动与传播", "互动数据", "UP主与发布", "人物与机构"} for label in labels)
    assert all(len(label) <= 64 for label in labels)


def test_bilibili_video_detail_noise_is_removed_from_mindmap_nodes() -> None:
    page = {
        "pageId": "page_bili_detail",
        "title": "这期视频真正讨论的核心主题 - 哔哩哔哩",
        "url": "https://www.bilibili.com/video/BV1gcyFBZEUf",
        "domain": "www.bilibili.com",
        "paragraphs": [
            {"paragraphId": "p1", "chunkId": "c1", "text": "这期视频真正讨论的核心主题"},
            {"paragraphId": "p2", "chunkId": "c1", "text": "视频简介：围绕一个具体议题展开分析，解释背景、过程和结论。"},
            {"paragraphId": "p3", "chunkId": "c2", "text": "Rookie、青果 46.9万 3515 45:16 自动连播 订阅合集 相关推荐"},
            {"paragraphId": "p4", "chunkId": "c2", "text": "按类型过滤 滚动 固定 彩色 高级 弹幕随屏幕缩放 防挡字幕 智能防挡弹幕"},
        ],
        "chunks": [{"chunkId": "c1"}, {"chunkId": "c2"}],
        "metadata": {"pageStateHints": ["media_dom_limited", "bili_video_detail"]},
    }
    source_map = {
        "sourceRefs": [
            {"sourceRefId": "src_title", "paragraphId": "p1", "chunkId": "c1", "fallbackText": "这期视频真正讨论的核心主题", "selector": "h1.video-title"},
            {"sourceRefId": "src_desc", "paragraphId": "p2", "chunkId": "c1", "fallbackText": "视频简介：围绕一个具体议题展开分析，解释背景、过程和结论。", "selector": ".desc-info-text"},
            {"sourceRefId": "src_rec", "paragraphId": "p3", "chunkId": "c2", "fallbackText": "Rookie、青果 46.9万 3515 45:16 自动连播 订阅合集 相关推荐"},
            {"sourceRefId": "src_danmaku", "paragraphId": "p4", "chunkId": "c2", "fallbackText": "按类型过滤 滚动 固定 彩色 高级 弹幕随屏幕缩放 防挡字幕 智能防挡弹幕"},
        ]
    }
    digest = {
        "items": [
            {"itemId": "title", "text": "这期视频真正讨论的核心主题", "sourceRefs": [source_map["sourceRefs"][0]], "relatedParagraphIds": ["p1"], "relatedChunkIds": ["c1"]},
            {"itemId": "desc", "text": "视频简介：围绕一个具体议题展开分析，解释背景、过程和结论。", "sourceRefs": [source_map["sourceRefs"][1]], "relatedParagraphIds": ["p2"], "relatedChunkIds": ["c1"]},
            {"itemId": "rec", "text": "Rookie、青果 46.9万 3515 45:16 自动连播 订阅合集 相关推荐", "sourceRefs": [source_map["sourceRefs"][2]], "relatedParagraphIds": ["p3"], "relatedChunkIds": ["c2"]},
            {"itemId": "danmaku", "text": "按类型过滤 滚动 固定 彩色 高级 弹幕随屏幕缩放 防挡字幕 智能防挡弹幕", "sourceRefs": [source_map["sourceRefs"][3]], "relatedParagraphIds": ["p4"], "relatedChunkIds": ["c2"]},
        ]
    }
    result = generate_mindmap_payload({"structuredPage": page, "perceptionDigest": digest, "sourceMap": source_map, "qualityReport": {"downstreamReadiness": "pass"}})

    assert result["ok"] is True
    assert "这期视频真正讨论的核心主题" in result["mermaidSource"]
    assert "视频简介" in result["mermaidSource"]
    assert "Rookie" not in result["mermaidSource"]
    assert "自动连播" not in result["mermaidSource"]
    assert "防挡字幕" not in result["mermaidSource"]
    assert "src_rec" not in result["metadata"]["nodeSourceMap"]["root"]["sourceRefIds"]
    assert "src_danmaku" not in result["metadata"]["nodeSourceMap"]["root"]["sourceRefIds"]


def test_social_homepage_dom_role_and_nav_shell_do_not_become_mindmap_labels() -> None:
    page = {
        "pageId": "page_social_home",
        "title": "小红书 - 你的生活兴趣社区",
        "url": "https://www.xiaohongshu.com/explore",
        "domain": "www.xiaohongshu.com",
        "paragraphs": [
            {"paragraphId": "p1", "chunkId": "c1", "text": "content_link"},
            {"paragraphId": "p2", "chunkId": "c1", "text": "问点点 ai 推荐 穿搭 美食 彩妆 影视 职场 情感 家居"},
            {"paragraphId": "p3", "chunkId": "c2", "text": "梅超疯 1.7万 星巴克61限定Mini星冰乐！啊啊啊可爱！！"},
            {"paragraphId": "p4", "chunkId": "c2", "text": "腿真的会变直变细，作者分享了训练前后的真实变化。"},
            {"paragraphId": "p5", "chunkId": "c3", "text": "拥有伟大理想的中年男士 https://www.xiaohongshu.com/explore/abc"},
            {"paragraphId": "p6", "chunkId": "c3", "text": "沪ICP备13030189号 医疗器械网络交易服务第三方平台备案"},
        ],
        "chunks": [{"chunkId": "c1"}, {"chunkId": "c2"}, {"chunkId": "c3"}],
    }
    source_map = {
        "sourceRefs": [
            {"sourceRefId": "src_role", "paragraphId": "p1", "chunkId": "c1", "fallbackText": "content_link"},
            {"sourceRefId": "src_nav", "paragraphId": "p2", "chunkId": "c1", "fallbackText": "问点点 ai 推荐 穿搭 美食 彩妆 影视 职场 情感 家居"},
            {"sourceRefId": "src_note_1", "paragraphId": "p3", "chunkId": "c2", "fallbackText": "梅超疯 1.7万 星巴克61限定Mini星冰乐！啊啊啊可爱！！", "selector": ".note-card:nth-of-type(1)"},
            {"sourceRefId": "src_note_2", "paragraphId": "p4", "chunkId": "c2", "fallbackText": "腿真的会变直变细，作者分享了训练前后的真实变化。", "selector": ".note-card:nth-of-type(2)"},
            {"sourceRefId": "src_note_3", "paragraphId": "p5", "chunkId": "c3", "fallbackText": "拥有伟大理想的中年男士 https://www.xiaohongshu.com/explore/abc", "selector": ".note-card:nth-of-type(3)"},
            {"sourceRefId": "src_footer", "paragraphId": "p6", "chunkId": "c3", "fallbackText": "沪ICP备13030189号 医疗器械网络交易服务第三方平台备案"},
        ]
    }
    digest = {
        "items": [
            {"itemId": "role", "text": "content_link", "sourceRefs": [source_map["sourceRefs"][0]], "relatedParagraphIds": ["p1"], "relatedChunkIds": ["c1"]},
            {"itemId": "nav", "text": "问点点 ai 推荐 穿搭 美食 彩妆 影视 职场 情感 家居", "sourceRefs": [source_map["sourceRefs"][1]], "relatedParagraphIds": ["p2"], "relatedChunkIds": ["c1"]},
            {"itemId": "note1", "text": "梅超疯 1.7万 星巴克61限定Mini星冰乐！啊啊啊可爱！！", "sourceRefs": [source_map["sourceRefs"][2]], "relatedParagraphIds": ["p3"], "relatedChunkIds": ["c2"]},
            {"itemId": "note2", "text": "腿真的会变直变细，作者分享了训练前后的真实变化。", "sourceRefs": [source_map["sourceRefs"][3]], "relatedParagraphIds": ["p4"], "relatedChunkIds": ["c2"]},
            {"itemId": "note3", "text": "拥有伟大理想的中年男士 https://www.xiaohongshu.com/explore/abc", "sourceRefs": [source_map["sourceRefs"][4]], "relatedParagraphIds": ["p5"], "relatedChunkIds": ["c3"]},
            {"itemId": "footer", "text": "沪ICP备13030189号 医疗器械网络交易服务第三方平台备案", "sourceRefs": [source_map["sourceRefs"][5]], "relatedParagraphIds": ["p6"], "relatedChunkIds": ["c3"]},
        ]
    }

    result = generate_mindmap_payload({"structuredPage": page, "perceptionDigest": digest, "sourceMap": source_map, "qualityReport": {"downstreamReadiness": "pass"}})

    assert result["ok"] is True
    labels = [node["nodeLabel"] for node in result["metadata"]["nodeSourceMap"].values()]
    rendered = "\n".join(labels)
    assert "content_link" not in rendered
    assert "问点点" not in rendered
    assert "ICP备" not in rendered
    assert "医疗器械" not in rendered
    assert "http" not in rendered.lower()
    assert any("星巴克" in label for label in labels)
    assert any("腿真的会变直变细" in label for label in labels)


def test_mermaid_node_limit_does_not_count_directive_line() -> None:
    source = "\n".join(["mindmap", "  root((当前页面))", *[f"    节点{i}" for i in range(1, 32)]])

    assert validate_mermaid_source(source)["valid"] is True


def test_degraded_paragraph_fallback_filters_footer_noise() -> None:
    page = {
        "pageId": "page_xhs_degraded",
        "title": "AI时代码农进化史 - 小红书",
        "url": "https://www.xiaohongshu.com/explore/example",
        "domain": "www.xiaohongshu.com",
        "paragraphs": [
            {"paragraphId": "p1", "chunkId": "c1", "text": "AI时代码农进化史讨论了大模型时代开发者工作方式的变化。"},
            {"paragraphId": "p2", "chunkId": "c2", "text": "沪ICP备13030189号 医疗器械网络交易服务第三方平台备案 营业执照"},
            {"paragraphId": "p3", "chunkId": "c2", "text": "20消息"},
        ],
        "chunks": [{"chunkId": "c1"}, {"chunkId": "c2"}],
        "metadata": {"pageStateHints": ["media_dom_limited"]},
    }

    result = generate_mindmap_payload({"structuredPage": page, "qualityReport": {"downstreamReadiness": "degraded"}})

    assert result["ok"] is True
    assert "AI时代码农进化史" in result["mermaidSource"]
    assert "ICP备" not in result["mermaidSource"]
    assert "营业执照" not in result["mermaidSource"]
    assert "20消息" not in result["mermaidSource"]


def test_xiaohongshu_comment_thread_and_spaced_urls_are_not_mindmap_nodes() -> None:
    page = {
        "pageId": "page_xhs_detail",
        "title": "AI时代码农进化史 - 小红书",
        "url": "https://www.xiaohongshu.com/explore/6a3cdf8a000000001c027699",
        "domain": "www.xiaohongshu.com",
        "paragraphs": [
            {"paragraphId": "p1", "chunkId": "c1", "text": "AI时代码农进化史 #人工智能 #大模型 #码农 编辑于 6小时前 北京"},
            {"paragraphId": "p2", "chunkId": "c2", "text": "momo 在美团的码农算活水吗 5小时前北京 38 9 回复 展开 8 条回复 摩擦力做功 进大厂了 9分钟前江苏 1 回复"},
            {"paragraphId": "p3", "chunkId": "c3", "text": "实验人实验魂（抓狂版） ( https : / / www . xiaohongshu . com / user / profile / abc )"},
            {"paragraphId": "p4", "chunkId": "c3", "text": "沪ICP备13030189号 营业执照 网上有害信息举报专区"},
        ],
        "chunks": [{"chunkId": "c1"}, {"chunkId": "c2"}, {"chunkId": "c3"}],
        "metadata": {"pageStateHints": ["media_dom_limited", "xhs_note_detail"]},
    }
    source_map = {
        "sourceRefs": [
            {"sourceRefId": "src_note", "paragraphId": "p1", "chunkId": "c1", "fallbackText": "AI时代码农进化史 #人工智能 #大模型 #码农 编辑于 6小时前 北京", "selector": "#noteContainer .desc"},
            {"sourceRefId": "src_comment", "paragraphId": "p2", "chunkId": "c2", "fallbackText": "momo 在美团的码农算活水吗 5小时前北京 38 9 回复 展开 8 条回复 摩擦力做功 进大厂了 9分钟前江苏 1 回复"},
            {"sourceRefId": "src_user", "paragraphId": "p3", "chunkId": "c3", "fallbackText": "实验人实验魂（抓狂版） ( https : / / www . xiaohongshu . com / user / profile / abc )"},
            {"sourceRefId": "src_footer", "paragraphId": "p4", "chunkId": "c3", "fallbackText": "沪ICP备13030189号 营业执照 网上有害信息举报专区"},
        ]
    }
    digest = {
        "items": [
            {"itemId": "note", "text": "AI时代码农进化史 #人工智能 #大模型 #码农 编辑于 6小时前 北京", "sourceRefs": [source_map["sourceRefs"][0]], "relatedParagraphIds": ["p1"], "relatedChunkIds": ["c1"]},
            {"itemId": "comment", "text": "momo 在美团的码农算活水吗 5小时前北京 38 9 回复 展开 8 条回复 摩擦力做功 进大厂了 9分钟前江苏 1 回复", "sourceRefs": [source_map["sourceRefs"][1]], "relatedParagraphIds": ["p2"], "relatedChunkIds": ["c2"]},
            {"itemId": "user", "text": "实验人实验魂（抓狂版） ( https : / / www . xiaohongshu . com / user / profile / abc )", "sourceRefs": [source_map["sourceRefs"][2]], "relatedParagraphIds": ["p3"], "relatedChunkIds": ["c3"]},
            {"itemId": "footer", "text": "沪ICP备13030189号 营业执照 网上有害信息举报专区", "sourceRefs": [source_map["sourceRefs"][3]], "relatedParagraphIds": ["p4"], "relatedChunkIds": ["c3"]},
        ]
    }

    result = generate_mindmap_payload({"structuredPage": page, "perceptionDigest": digest, "sourceMap": source_map, "qualityReport": {"downstreamReadiness": "pass"}})

    assert result["ok"] is True
    rendered = result["mermaidSource"]
    assert "AI时代码农进化史" in rendered
    assert "momo" not in rendered
    assert "实验人实验魂" not in rendered
    assert "ICP备" not in rendered
    assert "http" not in rendered.lower()
    assert "src_comment" not in result["metadata"]["nodeSourceMap"]["root"]["sourceRefIds"]
    assert "src_footer" not in result["metadata"]["nodeSourceMap"]["root"]["sourceRefIds"]


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
