from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from navia_runtime.modules.page_reading.runtime import build_high_signal_page_perception


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "fixtures"
SCHEMA_PATH = Path(__file__).resolve().parents[6] / "docs/active/project/contracts/a_v1_1_high_signal.schema.json"
VALID_FIXTURES = [
    "article_noise.html",
    "news_with_sidebar.html",
    "product_doc.html",
    "table_heavy_report.html",
    "code_doc.html",
]


def validator() -> Draft202012Validator:
    return Draft202012Validator(json.loads(SCHEMA_PATH.read_text(encoding="utf-8")))


def assert_schema_valid(payload: dict[str, Any]) -> None:
    errors = sorted(validator().iter_errors(payload), key=lambda error: list(error.path))
    assert errors == [], [error.message for error in errors]


def run_fixture(fixture_name: str, fixture_class: str = "valid_content") -> dict[str, Any]:
    return build_high_signal_page_perception(
        {
            "sessionId": f"sess_{fixture_name}",
            "url": f"https://module-fixtures.example/{fixture_name}",
            "title": fixture_name,
            "domain": "module-fixtures.example",
            "capturedAt": "2026-06-05T00:00:00Z",
            "fixtureClass": fixture_class,
            "html": (FIXTURE_DIR / fixture_name).read_text(encoding="utf-8"),
        }
    )


def test_valid_content_fixtures_generate_public_a_v1_1_contracts() -> None:
    for fixture_name in VALID_FIXTURES:
        result = run_fixture(fixture_name)

        assert result["ok"] is True, fixture_name
        assert_schema_valid(result["candidateExtraction"])
        assert_schema_valid(result["highSignalPage"])
        assert_schema_valid(result["sourceMap"])
        assert_schema_valid(result["perceptionDigest"])
        assert_schema_valid(result["qualityReport"])

        assert result["highSignalPage"]["status"] == "ready", fixture_name
        assert result["qualityReport"]["downstreamReadiness"] == "pass", fixture_name
        assert result["highSignalPage"]["highSignalBlocks"], fixture_name
        assert result["sourceMap"]["sourceRefs"], fixture_name
        assert all(item["sourceRefs"] for item in result["perceptionDigest"]["items"]), fixture_name
        assert result["qualityReport"]["metrics"]["sourceCoverage"]["value"] >= 0.95, fixture_name
        assert result["qualityReport"]["metrics"]["groundingCompleteness"]["value"] >= 0.95, fixture_name
        assert result["qualityReport"]["metrics"]["jumpbackCoverage"]["value"] >= 0.95, fixture_name


def test_noise_blocks_are_filtered_or_downgraded_from_high_signal_output() -> None:
    result = run_fixture("news_with_sidebar.html")
    assert result["ok"] is True
    filtered = result["highSignalPage"]["filteredBlocks"]
    high_text = " ".join(block["text"].lower() for block in result["highSignalPage"]["highSignalBlocks"])
    filtered_reasons = {block["reason"] for block in filtered}

    assert filtered
    assert "recommendation" in filtered_reasons or "ad_like" in filtered_reasons
    assert "advertisement sponsored" not in high_text
    assert "related articles" not in high_text


def test_image_fixture_uses_dom_metadata_and_does_not_infer_unknown_images() -> None:
    result = run_fixture("image_rich_article.html", fixture_class="degraded_content")

    assert result["ok"] is True
    assert_schema_valid(result["perceptionDigest"])
    image_items = [item for item in result["perceptionDigest"]["items"] if item["kind"] == "image_metadata"]
    assert image_items
    assert any("Floating Ask AI toolbar" in item["text"] for item in image_items)
    digest_text = " ".join(item["text"] for item in result["perceptionDigest"]["items"])
    assert "unknown-photo" not in digest_text


def test_empty_or_low_signal_fixture_does_not_pass() -> None:
    result = run_fixture("empty_or_low_signal.html", fixture_class="no_signal")

    assert result["ok"] is False
    assert result["error"]["code"] == "PAGE_CONTEXT_REQUIRED"
    assert result["highSignalPage"] is None
    assert result["qualityReport"] is None


def test_small_readable_page_is_degraded_without_fixture_override() -> None:
    result = build_high_signal_page_perception(
        {
            "sessionId": "sess_small_readable",
            "url": "https://example.com",
            "title": "Example Domain",
            "domain": "example.com",
            "capturedAt": "2026-06-14T00:00:00Z",
            "cleaned_text": "Example Domain. This domain is for use in documentation examples without needing permission.",
            "visible_text": "Example Domain. This domain is for use in documentation examples without needing permission.",
        }
    )

    assert result["ok"] is True
    assert result["qualityReport"]["downstreamReadiness"] == "degraded"
    assert any(issue["code"] == "LOW_SIGNAL_PAGE_DEGRADED" for issue in result["qualityReport"]["warnings"])


def test_video_stub_is_planning_only_not_real_perception_ready() -> None:
    result = run_fixture("video_page_stub.html", fixture_class="planning_only")

    assert result["ok"] is True
    assert_schema_valid(result["highSignalPage"])
    assert_schema_valid(result["qualityReport"])
    assert result["highSignalPage"]["status"] != "ready"
    assert result["qualityReport"]["downstreamReadiness"] != "pass"
    assert any(issue["code"] == "PLANNING_ONLY_MEDIA" for issue in result["qualityReport"]["warnings"])


def test_dom_signals_create_source_backed_feed_digest_items() -> None:
    result = build_high_signal_page_perception(
        {
            "sessionId": "sess_feed",
            "url": "https://www.bilibili.com/",
            "title": "Bilibili feed fixture",
            "domain": "www.bilibili.com",
            "capturedAt": "2026-06-25T00:00:00Z",
            "cleaned_text": "首页 登录 热门 知识 科技 数码 投稿 登录后你可以免费看高清视频。",
            "visible_text": "首页 登录 热门 知识 科技 数码 投稿 登录后你可以免费看高清视频。",
            "dom_signals": {
                "pageStateHints": [],
                "links": [
                    {"text": "全国清理戒网瘾学校？持续十年的战斗要结束了吗！", "href": "https://www.bilibili.com/video/BV1", "selector": "a.video-card", "role": "media_link"},
                    {"text": "他们这样为牛肉注入灵魂", "href": "https://www.bilibili.com/video/BV2", "selector": "a.video-card:nth-of-type(2)", "role": "media_link"},
                    {"text": "请辨别眼前一切的生物", "href": "https://www.bilibili.com/video/BV3", "selector": "a.video-card:nth-of-type(3)", "role": "media_link"},
                ],
                "blocks": [
                    {"text": "全国清理戒网瘾学校？持续十年的战斗要结束了吗！ 温柔JUNZ 昨天 31.5万 400", "selector": ".video-card:nth-of-type(1)", "href": "https://www.bilibili.com/video/BV1", "role": "feed_card"},
                    {"text": "他们这样为牛肉注入灵魂 美食创作者 19.7万 580", "selector": ".video-card:nth-of-type(2)", "href": "https://www.bilibili.com/video/BV2", "role": "feed_card"},
                    {"text": "请辨别眼前一切的生物！他们中混入了伪人 与山0v0 昨天 74.1万", "selector": ".video-card:nth-of-type(3)", "href": "https://www.bilibili.com/video/BV3", "role": "feed_card"},
                ],
                "meta": [{"name": "og:description", "content": "B站首页热门视频推荐"}],
            },
        }
    )

    assert result["ok"] is True
    assert len(result["sourceMap"]["sourceRefs"]) >= 4
    assert len(result["perceptionDigest"]["items"]) >= 3
    assert any(ref.get("selector") == ".video-card:nth-of-type(1)" for ref in result["sourceMap"]["sourceRefs"])
    assert any(ref.get("href") == "https://www.bilibili.com/video/BV1" for ref in result["sourceMap"]["sourceRefs"])


def test_bilibili_video_detail_uses_main_dom_signals_without_page_shell_noise() -> None:
    result = build_high_signal_page_perception(
        {
            "sessionId": "sess_bili_detail",
            "url": "https://www.bilibili.com/video/BV1gcyFBZEUf",
            "title": "这期视频真正讨论的核心主题 - 哔哩哔哩",
            "domain": "www.bilibili.com",
            "capturedAt": "2026-06-25T00:00:00Z",
            "cleaned_text": "这期视频真正讨论的核心主题\n视频简介：围绕一个具体议题展开分析，解释背景、过程和结论。",
            "visible_text": "这期视频真正讨论的核心主题 Rookie、青果 46.9万 3515 45:16 自动连播 订阅合集 按类型过滤 滚动 固定 彩色 高级 弹幕随屏幕缩放 防挡字幕 智能防挡弹幕 本视频参加过 整点电子榨菜第26期 活动已结束 QQ群549775842 微信",
            "dom_signals": {
                "pageStateHints": ["media_dom_limited", "bili_video_detail"],
                "links": [{"text": "当前 B站视频详情页", "href": "https://www.bilibili.com/video/BV1gcyFBZEUf", "role": "media_link"}],
                "blocks": [
                    {"text": "这期视频真正讨论的核心主题", "selector": "h1.video-title", "role": "bili_video_title"},
                    {"text": "视频简介：围绕一个具体议题展开分析，解释背景、过程和结论。", "selector": ".desc-info-text", "role": "bili_video_description"},
                    {"text": "可靠UP主 2026-06-25 发布", "selector": ".up-info", "role": "bili_video_author"},
                    {"text": "12.3万播放 856弹幕 2026-06-25发布", "selector": ".video-data", "role": "bili_video_stats"},
                    {"text": "Rookie、青果 46.9万 3515 45:16 自动连播 订阅合集 相关推荐", "selector": ".recommend-list", "role": "bili_recommendation"},
                    {"text": "按类型过滤 滚动 固定 彩色 高级 弹幕随屏幕缩放 防挡字幕 智能防挡弹幕", "selector": ".danmaku-panel", "role": "bili_danmaku"},
                    {"text": "本视频参加过 整点电子榨菜第26期 活动已结束 QQ群549775842 微信", "selector": ".activity-banner", "role": "bili_promo"},
                ],
                "meta": [{"name": "description", "content": "视频简介：围绕一个具体议题展开分析，解释背景、过程和结论。"}],
            },
        }
    )

    assert result["ok"] is True
    paragraph_text = " ".join(paragraph["text"] for paragraph in result["structuredPage"]["paragraphs"])
    digest_text = " ".join(item["text"] for item in result["perceptionDigest"]["items"])

    assert "这期视频真正讨论的核心主题" in paragraph_text
    assert "视频简介" in digest_text
    assert "Rookie" not in paragraph_text
    assert "防挡字幕" not in paragraph_text
    assert "整点电子榨菜" not in digest_text


def test_xiaohongshu_note_detail_uses_main_dom_signals_without_comments_or_footer() -> None:
    result = build_high_signal_page_perception(
        {
            "sessionId": "sess_xhs_detail",
            "url": "https://www.xiaohongshu.com/explore/6a3cdf8a000000001c027699",
            "title": "AI时代码农进化史 - 小红书",
            "domain": "www.xiaohongshu.com",
            "capturedAt": "2026-06-25T00:00:00Z",
            "cleaned_text": "AI时代码农进化史\nAI时代码农进化史 #人工智能 #大模型 #码农 编辑于 6小时前 北京",
            "visible_text": "首页 点点 ai 发布 20消息 沪ICP备13030189号 营业执照 AI时代码农进化史 #人工智能 #大模型 #码农 编辑于 6小时前 北京 共 27 条评论 momo 在美团的码农算活水吗 5小时前北京 38 9 回复",
            "dom_signals": {
                "pageStateHints": ["media_dom_limited", "xhs_note_detail"],
                "links": [{"text": "当前小红书笔记详情页", "href": "https://www.xiaohongshu.com/explore/6a3cdf8a000000001c027699", "role": "content_link"}],
                "blocks": [
                    {"text": "AI时代码农进化史", "selector": "#noteContainer .title", "role": "xhs_note_title"},
                    {"text": "AI时代码农进化史 #人工智能 #大模型 #码农 编辑于 6小时前 北京", "selector": "#noteContainer .desc", "role": "xhs_note_body"},
                    {"text": "凝紫暮", "selector": "#noteContainer .author .name", "role": "xhs_note_author"},
                    {"text": "共 27 条评论 momo 在美团的码农算活水吗 5小时前北京 38 9 回复", "selector": "#comment-1", "role": "xhs_comment"},
                    {"text": "沪ICP备13030189号 营业执照 网上有害信息举报专区", "selector": ".side-bar", "role": "xhs_footer"},
                ],
                "meta": [{"name": "description", "content": "AI时代码农进化史 #人工智能 #大模型 #码农"}],
            },
        }
    )

    assert result["ok"] is True
    paragraph_text = " ".join(paragraph["text"] for paragraph in result["structuredPage"]["paragraphs"])
    digest_text = " ".join(item["text"] for item in result["perceptionDigest"]["items"])

    assert "AI时代码农进化史" in paragraph_text
    assert "人工智能" in digest_text
    assert "momo" not in paragraph_text
    assert "沪ICP备" not in paragraph_text
    assert result["sourceMap"]["sourceRefs"]


def test_xiaohongshu_home_feed_uses_card_dom_signals_without_shell_noise() -> None:
    result = build_high_signal_page_perception(
        {
            "sessionId": "sess_xhs_home",
            "url": "https://www.xiaohongshu.com/explore",
            "title": "小红书 - 你的生活兴趣社区",
            "domain": "www.xiaohongshu.com",
            "capturedAt": "2026-06-26T00:00:00Z",
            "cleaned_text": "AI 编程工作流：从需求拆解到代码审查\n周末城市徒步路线，适合第一次去的人",
            "visible_text": "推荐 穿搭 美食 彩妆 首页 动态 热门 AI 编程工作流：从需求拆解到代码审查 开发者小周 1.2万点赞 周末城市徒步路线，适合第一次去的人 沪ICP备13030189号",
            "dom_signals": {
                "pageStateHints": ["media_dom_limited", "xhs_home_feed"],
                "links": [
                    {"text": "AI 编程工作流：从需求拆解到代码审查", "href": "https://www.xiaohongshu.com/explore/feed001", "selector": "#exploreFeeds .note-card:nth-of-type(1) a", "role": "content_link"},
                    {"text": "周末城市徒步路线，适合第一次去的人", "href": "https://www.xiaohongshu.com/explore/feed002", "selector": "#exploreFeeds .note-card:nth-of-type(2) a", "role": "content_link"},
                ],
                "blocks": [
                    {"text": "AI 编程工作流：从需求拆解到代码审查 开发者小周 1.2万点赞", "selector": "#exploreFeeds .note-card:nth-of-type(1)", "href": "https://www.xiaohongshu.com/explore/feed001", "role": "xhs_feed_card"},
                    {"text": "周末城市徒步路线，适合第一次去的人 城市观察员 856收藏", "selector": "#exploreFeeds .note-card:nth-of-type(2)", "href": "https://www.xiaohongshu.com/explore/feed002", "role": "xhs_feed_card"},
                    {"text": "推荐 穿搭 美食 彩妆 首页 动态 热门", "selector": "#channel-container", "role": "xhs_sidebar"},
                    {"text": "沪ICP备13030189号 营业执照 网上有害信息举报专区", "selector": ".side-bar", "role": "xhs_footer"},
                ],
                "meta": [{"name": "description", "content": "小红书首页公开笔记推荐"}],
            },
        }
    )

    assert result["ok"] is True
    paragraph_text = " ".join(paragraph["text"] for paragraph in result["structuredPage"]["paragraphs"])
    digest_text = " ".join(item["text"] for item in result["perceptionDigest"]["items"])

    assert "AI 编程工作流" in paragraph_text
    assert "周末城市徒步路线" in digest_text
    assert "推荐 穿搭 美食 彩妆" not in paragraph_text
    assert "沪ICP备" not in paragraph_text
    assert any(ref.get("selector") == "#exploreFeeds .note-card:nth-of-type(1)" for ref in result["sourceMap"]["sourceRefs"])
    assert any(ref.get("href") == "https://www.xiaohongshu.com/explore/feed001" for ref in result["sourceMap"]["sourceRefs"])


def test_guancha_article_detail_uses_article_dom_signals_without_comments_or_recommendations() -> None:
    result = build_high_signal_page_perception(
        {
            "sessionId": "sess_guancha_detail",
            "url": "https://www.guancha.cn/internation/2026_06_26_821741.shtml",
            "title": "观察者网文章核心标题 - 观察者网",
            "domain": "www.guancha.cn",
            "capturedAt": "2026-06-26T00:00:00Z",
            "cleaned_text": "观察者网文章核心标题\n来源：观察者网 发布时间：2026-06-26 作者：张三\n这是一段观察者网文章正文，围绕真实新闻事件说明背景、争议焦点和后续影响。",
            "visible_text": "观察者网文章核心标题 来源：观察者网 发布时间：2026-06-26 作者：张三 这是一段观察者网文章正文 评论区 网友回复 踩12 赞34 最新视频 查看全部 推荐阅读",
            "dom_signals": {
                "pageStateHints": ["media_dom_limited", "guancha_article_detail"],
                "links": [{"text": "当前观察者网文章", "href": "https://www.guancha.cn/internation/2026_06_26_821741.shtml", "role": "content_link"}],
                "blocks": [
                    {"text": "观察者网文章核心标题", "selector": "h1.article-title", "role": "guancha_article_title"},
                    {"text": "来源：观察者网 发布时间：2026-06-26 作者：张三", "selector": ".article-info", "role": "guancha_article_meta"},
                    {"text": "这是一段观察者网文章正文，围绕真实新闻事件说明背景、争议焦点和后续影响。第二段继续解释关键事实。", "selector": ".article-content", "role": "guancha_article_body"},
                    {"text": "评论区 网友回复 踩12 赞34 我来说两句", "selector": ".comment-list", "role": "guancha_comment"},
                    {"text": "最新视频 查看全部 推荐阅读 相关新闻", "selector": ".recommend-list", "role": "guancha_recommendation"},
                ],
                "meta": [{"name": "description", "content": "观察者网文章摘要：这是正文相关背景说明。"}],
            },
        }
    )

    assert result["ok"] is True
    paragraph_text = " ".join(paragraph["text"] for paragraph in result["structuredPage"]["paragraphs"])
    digest_text = " ".join(item["text"] for item in result["perceptionDigest"]["items"])

    assert "观察者网文章核心标题" in paragraph_text
    assert "第二段继续解释关键事实" in digest_text
    assert "评论区" not in paragraph_text
    assert "最新视频" not in paragraph_text
    assert result["sourceMap"]["sourceRefs"]


def test_dom_signal_links_without_blocks_do_not_reuse_uninitialized_role() -> None:
    result = build_high_signal_page_perception(
        {
            "sessionId": "sess_links_only",
            "url": "https://www.xiaohongshu.com/explore/6a3cdf8a000000001c027699",
            "title": "小红书链接输入",
            "domain": "www.xiaohongshu.com",
            "capturedAt": "2026-06-26T00:00:00Z",
            "cleaned_text": "AI时代码农进化史 #人工智能 #大模型 #码农 编辑于 6小时前 北京",
            "visible_text": "AI时代码农进化史 #人工智能 #大模型 #码农 编辑于 6小时前 北京",
            "dom_signals": {
                "pageStateHints": ["xhs_note_detail"],
                "links": [
                    {"text": "作者主页", "href": "https://www.xiaohongshu.com/user/profile/fixture", "role": "profile_link"},
                    {"text": "AI时代码农进化史", "href": "https://www.xiaohongshu.com/explore/fixture", "role": "content_link"},
                ],
                "blocks": [],
                "meta": [],
            },
        }
    )

    assert result["ok"] is True
    paragraph_text = " ".join(paragraph["text"] for paragraph in result["structuredPage"]["paragraphs"])
    assert "AI时代码农进化史" in paragraph_text
    assert "作者主页" not in paragraph_text


def test_auth_verification_or_not_found_dom_state_does_not_pass() -> None:
    result = build_high_signal_page_perception(
        {
            "sessionId": "sess_auth",
            "url": "https://www.xiaohongshu.com/404?error_code=300031",
            "title": "小红书 - 你访问的页面不见了",
            "domain": "www.xiaohongshu.com",
            "capturedAt": "2026-06-25T00:00:00Z",
            "cleaned_text": "登录后推荐更懂你的笔记 可用 小红书 或 微信 扫码 手机号登录 获取验证码 页面不见了 Sorry This Page Isn't Available Right Now.",
            "visible_text": "登录后推荐更懂你的笔记 可用 小红书 或 微信 扫码 手机号登录 获取验证码 页面不见了 Sorry This Page Isn't Available Right Now.",
            "dom_signals": {
                "pageStateHints": ["auth_gated", "verification_gated", "not_found"],
                "links": [],
                "blocks": [{"text": "手机号登录 获取验证码 页面不见了", "selector": ".login-box", "role": "auth_block"}],
                "meta": [],
            },
        }
    )

    assert result["ok"] is True
    assert result["qualityReport"]["downstreamReadiness"] != "pass"
    warning_codes = {issue["code"] for issue in result["qualityReport"]["warnings"]}
    assert {"AUTH_GATED_DEGRADED", "VERIFICATION_GATED_DEGRADED", "NOT_FOUND_PAGE_FAILED"} <= warning_codes


def test_unpaired_unicode_surrogate_text_does_not_crash_source_hashing() -> None:
    result = build_high_signal_page_perception(
        {
            "sessionId": "sess_surrogate",
            "url": "https://www.xiaohongshu.com/explore",
            "title": "小红书 - 你的生活兴趣社区",
            "domain": "www.xiaohongshu.com",
            "capturedAt": "2026-06-25T00:00:00Z",
            "cleaned_text": "这是一条混入非法字符的公开笔记内容 \ud83d 但仍然应该可以被读取、摘要、生成来源证据。",
            "visible_text": "这是一条混入非法字符的公开笔记内容 \ud83d 但仍然应该可以被读取、摘要、生成来源证据。",
            "dom_signals": {
                "pageStateHints": ["media_dom_limited"],
                "links": [
                    {
                        "text": "混入非法字符的笔记链接 \ud83d",
                        "href": "https://www.xiaohongshu.com/explore/surrogate",
                        "selector": "a.note-card",
                        "role": "content_link",
                    }
                ],
                "blocks": [
                    {
                        "text": "混入非法字符的笔记卡片 \ud83d 包含足够正文、作者、互动数字和可反跳来源。",
                        "selector": ".note-card",
                        "href": "https://www.xiaohongshu.com/explore/surrogate",
                        "role": "feed_card",
                    }
                ],
                "meta": [{"name": "description", "content": "小红书公开笔记 surrogate regression"}],
            },
        }
    )

    assert result["ok"] is True
    assert result["sourceMap"]["sourceRefs"]
    assert all("\ud83d" not in ref["textQuote"] for ref in result["sourceMap"]["sourceRefs"])


def test_candidate_extractor_output_is_not_leaked_to_final_payloads() -> None:
    result = run_fixture("product_doc.html")
    forbidden_keys = {"extractorName", "candidateBlockId"}

    assert forbidden_keys & recursive_keys(result["candidateExtraction"])
    for final_payload_name in ["highSignalPage", "sourceMap", "perceptionDigest", "qualityReport"]:
        assert not (forbidden_keys & recursive_keys(result[final_payload_name])), final_payload_name


def recursive_keys(value: Any) -> set[str]:
    keys: set[str] = set()
    if isinstance(value, dict):
        for key, child in value.items():
            keys.add(key)
            keys.update(recursive_keys(child))
    elif isinstance(value, list):
        for child in value:
            keys.update(recursive_keys(child))
    return keys
