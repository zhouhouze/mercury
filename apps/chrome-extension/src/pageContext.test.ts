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
});
