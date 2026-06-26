import { describe, expect, it } from "vitest";
import { extractPageContext } from "./pageContext";

describe("extractPageContext", () => {
  it("extracts title, domain, headings and cleaned text", () => {
    document.body.innerHTML = `
      <main>
        <h1>Article title</h1>
        <h2>Section</h2>
        <p>This is a realistic page paragraph.</p>
      </main>
    `;
    document.title = "Fixture page";

    const context = extractPageContext(document, "https://example.com/article");
    expect(context.title).toBe("Fixture page");
    expect(context.domain).toBe("example.com");
    expect(context.headings).toEqual([
      { level: 1, text: "Article title" },
      { level: 2, text: "Section" }
    ]);
    expect(context.cleaned_text).toContain("realistic page paragraph");
  });

  it("extracts visible DOM signals for feed and gated pages", () => {
    document.head.innerHTML = `<meta property="og:description" content="A visible feed page">`;
    document.body.innerHTML = `
      <main>
        <div class="video-card">
          <a href="/video/BV123">复杂站点视频标题</a>
          <span>42.1万 2026-06-25 登录后可查看更多</span>
        </div>
        <section class="note-item">
          <a href="/explore/abc">小红书笔记标题</a>
          <p>验证码 登录 手机号登录</p>
        </section>
      </main>
    `;
    document.title = "复杂站点 Fixture";

    const context = extractPageContext(document, "https://example.com/feed");

    expect(context.dom_signals?.meta).toContainEqual({ name: "og:description", content: "A visible feed page" });
    expect(context.dom_signals?.links.some((link) => link.text === "复杂站点视频标题" && link.role === "media_link")).toBe(true);
    expect(context.dom_signals?.blocks.some((block) => block.role === "media_block" || block.role === "feed_card")).toBe(true);
    expect(context.dom_signals?.pageStateHints).toContain("auth_gated");
    expect(context.dom_signals?.pageStateHints).toContain("verification_gated");
  });

  it("does not mark feed metrics containing 404 as not found", () => {
    document.body.innerHTML = `
      <main>
        <div class="video-card">
          <a href="/video/BV123">赛事直播回放</a>
          <span>2404.0万 游戏赛事 直播中</span>
        </div>
      </main>
    `;
    document.title = "bilibili 首页";

    const context = extractPageContext(document, "https://www.bilibili.com/");

    expect(context.dom_signals?.pageStateHints).not.toContain("not_found");
  });

  it("focuses Bilibili video detail extraction on title, description, author and stats", () => {
    document.head.innerHTML = `
      <meta property="og:title" content="这期视频真正讨论的核心主题 - 哔哩哔哩">
      <meta name="description" content="视频简介：围绕一个具体议题展开分析，解释背景、过程和结论。">
      <link rel="canonical" href="https://www.bilibili.com/video/BV1gcyFBZEUf/">
    `;
    document.body.innerHTML = `
      <main>
        <h1 class="video-title">这期视频真正讨论的核心主题</h1>
        <div class="up-info"><a class="up-name">可靠UP主</a><span>已关注 充电 关注</span></div>
        <div class="video-data"><span class="view-text">12.3万播放</span><span class="dm-text">856弹幕</span><span class="pubdate-text">2026-06-25发布</span></div>
        <div class="desc-info-text">视频简介：围绕一个具体议题展开分析，解释背景、过程和结论。</div>
        <section class="recommend-list">
          <div>Rookie、青果 46.9万 3515 45:16 自动连播 订阅合集 相关推荐</div>
        </section>
        <section class="danmaku-panel">按类型过滤 滚动 固定 彩色 高级 弹幕随屏幕缩放 防挡字幕 智能防挡弹幕</section>
        <aside class="activity-banner">本视频参加过 整点电子榨菜第26期 活动已结束 QQ群549775842 微信</aside>
      </main>
    `;
    document.title = "这期视频真正讨论的核心主题 - 哔哩哔哩";

    const context = extractPageContext(
      document,
      "https://www.bilibili.com/video/BV1gcyFBZEUf?spm_id_from=333.788.recommend_more_video.0"
    );

    const roles = context.dom_signals?.blocks.map((block) => block.role) ?? [];
    const extracted = JSON.stringify(context.dom_signals?.blocks ?? []);

    expect(context.dom_signals?.pageStateHints).toContain("bili_video_detail");
    expect(roles).toEqual(expect.arrayContaining(["bili_video_title", "bili_video_description", "bili_video_author", "bili_video_stats"]));
    expect(context.cleaned_text).toContain("这期视频真正讨论的核心主题");
    expect(context.cleaned_text).toContain("视频简介");
    expect(context.cleaned_text).not.toContain("Rookie");
    expect(context.cleaned_text).not.toContain("防挡字幕");
    expect(context.cleaned_text).not.toContain("整点电子榨菜");
    expect(extracted).not.toContain("Rookie");
    expect(extracted).not.toContain("自动连播");
    expect(extracted).not.toContain("防挡字幕");
    expect(extracted).not.toContain("QQ群");
  });

  it("focuses Xiaohongshu note detail extraction on note content without comments or footer", () => {
    document.head.innerHTML = `
      <meta property="og:title" content="AI时代码农进化史 - 小红书">
      <meta name="description" content="AI时代码农进化史 #人工智能 #大模型 #码农 编辑于 6小时前 北京">
      <link rel="canonical" href="https://www.xiaohongshu.com/explore/6a3cdf8a000000001c027699">
    `;
    document.body.innerHTML = `
      <main id="noteContainer">
        <div class="author"><span class="name">凝紫暮</span><button>关注</button></div>
        <div class="note-content">
          <div class="title">AI时代码农进化史</div>
          <div class="desc">AI时代码农进化史 #人工智能 #大模型 #码农 编辑于 6小时前 北京</div>
        </div>
        <section id="comment-1" class="comment-item">momo 在美团的码农算活水吗 5小时前北京 38 9 回复 展开 8 条回复</section>
      </main>
      <aside class="side-bar">
        沪ICP备13030189号 营业执照 增值电信业务经营许可证 网上有害信息举报专区 20消息
      </aside>
    `;
    document.title = "AI时代码农进化史 - 小红书";

    const context = extractPageContext(
      document,
      "https://www.xiaohongshu.com/explore/6a3cdf8a000000001c027699?xsec_token=fixture"
    );

    const roles = context.dom_signals?.blocks.map((block) => block.role) ?? [];
    const extracted = JSON.stringify(context.dom_signals?.blocks ?? []);

    expect(context.dom_signals?.pageStateHints).toContain("xhs_note_detail");
    expect(roles).toEqual(expect.arrayContaining(["xhs_note_title", "xhs_note_body", "xhs_note_author"]));
    expect(context.cleaned_text).toContain("AI时代码农进化史");
    expect(context.cleaned_text).toContain("人工智能");
    expect(context.cleaned_text).not.toContain("momo");
    expect(context.cleaned_text).not.toContain("展开 8 条回复");
    expect(context.cleaned_text).not.toContain("沪ICP备");
    expect(extracted).not.toContain("网上有害信息举报专区");
  });
});
