from __future__ import annotations

from navia_runtime.modules.adapters.runtime.registry import answer_adapter, mindmap_adapter, summarize_adapter


def invocation(active_page: dict) -> dict:
    return {
        "adapterId": "page.summarize",
        "toolCallId": "tc_1",
        "sessionId": "sess_1",
        "turnId": "turn_1",
        "input": {"activePage": active_page, "userMessage": "这页讲了什么？"},
    }


def noisy_media_page() -> dict:
    return {
        "pageId": "page_bili",
        "title": "Bilibili fixture",
        "url": "https://www.bilibili.com/",
        "paragraphs": [
            {"paragraphId": "p1", "chunkId": "c1", "text": "首页 番剧 直播 游戏中心 会员购 漫画 赛事 下载客户端"},
            {"paragraphId": "p2", "chunkId": "c1", "text": "未经作者授权，禁止转载"},
            {"paragraphId": "p3", "chunkId": "c2", "text": "UP 主围绕伴随阅读产品讨论了信息提取、来源证据和结构化导图的体验问题。"},
        ],
        "chunks": [{"chunkId": "c1"}, {"chunkId": "c2"}],
        "metadata": {"pageStateHints": ["media_dom_limited"]},
        "perception": {
            "perceptionDigest": {
                "items": [
                    {"text": "未经作者授权，禁止转载", "importance": 0.99},
                    {"text": "首页 番剧 直播 游戏中心 会员购 漫画 赛事 下载客户端", "importance": 0.98},
                    {
                        "text": "UP 主围绕伴随阅读产品讨论了信息提取、来源证据和结构化导图的体验问题。",
                        "importance": 0.9,
                        "sourceRefs": [
                            {
                                "sourceRefId": "src_1",
                                "fallbackText": "UP 主围绕伴随阅读产品讨论了信息提取、来源证据和结构化导图的体验问题。",
                                "textQuote": "UP 主围绕伴随阅读产品讨论了信息提取、来源证据和结构化导图的体验问题。",
                            }
                        ],
                    },
                ]
            },
            "qualityReport": {"warnings": ["media_dom_limited"]},
        },
    }


def test_summarize_adapter_uses_high_signal_digest_and_filters_site_shell_noise() -> None:
    result = summarize_adapter(invocation(noisy_media_page()))
    summary = result["content"]["summary"]

    assert result["status"] == "succeeded"
    assert "伴随阅读产品" in summary
    assert "未经作者授权" not in summary
    assert "下载客户端" not in summary
    assert "只总结 DOM 可见文字" in summary


def test_answer_adapter_reuses_high_signal_digest_material() -> None:
    request = invocation(noisy_media_page())
    request["adapterId"] = "page.answer"
    result = answer_adapter(request)
    answer = result["content"]["answer"]

    assert result["status"] == "succeeded"
    assert "伴随阅读产品" in answer
    assert "禁止转载" not in answer
    assert "这页讲了什么？" in answer


def test_mindmap_adapter_unwraps_runtime_active_page_perception() -> None:
    structured_page = {
        "pageId": "page_xhs_detail",
        "title": "AI时代码农进化史 - 小红书",
        "url": "https://www.xiaohongshu.com/explore/example",
        "domain": "www.xiaohongshu.com",
        "paragraphs": [
            {
                "paragraphId": "p1",
                "chunkId": "c1",
                "text": "AI时代码农进化史讨论了大模型时代开发者工作方式的变化。",
            },
            {
                "paragraphId": "p2",
                "chunkId": "c1",
                "text": "评论区围绕码农转型、外卖骑手和职业流动展开讨论。",
            },
        ],
        "chunks": [{"chunkId": "c1"}],
        "metadata": {"pageStateHints": ["media_dom_limited"]},
    }
    source_map = {
        "sourceRefs": [
            {
                "sourceRefId": "src_1",
                "paragraphId": "p1",
                "chunkId": "c1",
                "fallbackText": "AI时代码农进化史讨论了大模型时代开发者工作方式的变化。",
                "textQuote": "AI时代码农进化史讨论了大模型时代开发者工作方式的变化。",
                "selector": "div#noteContainer",
            }
        ]
    }
    digest = {
        "items": [
            {
                "itemId": "d1",
                "text": "AI时代码农进化史讨论了大模型时代开发者工作方式的变化。",
                "sourceRefs": [source_map["sourceRefs"][0]],
                "relatedParagraphIds": ["p1"],
                "relatedChunkIds": ["c1"],
            }
        ]
    }
    active_page = {
        "page_id": "page_xhs_detail",
        "title": "AI时代码农进化史 - 小红书",
        "url": "https://www.xiaohongshu.com/explore/example",
        "domain": "www.xiaohongshu.com",
        "perception": {
            "structuredPage": structured_page,
            "perceptionDigest": digest,
            "sourceMap": source_map,
            "qualityReport": {"downstreamReadiness": "degraded", "warnings": ["MEDIA_DOM_LIMITED"]},
        },
    }
    request = invocation(active_page)
    request["adapterId"] = "mindmap.generate"

    result = mindmap_adapter(request)

    assert result["status"] == "succeeded"
    assert result["artifacts"]
    artifact = result["artifacts"][0]
    assert artifact["type"] == "mindmap"
    assert "AI时代码农进化史" in artifact["content"]
    assert artifact["metadata"]["nodeSourceMap"]
    assert any(node.get("sourceRefIds") for node in artifact["metadata"]["nodeSourceMap"].values())
