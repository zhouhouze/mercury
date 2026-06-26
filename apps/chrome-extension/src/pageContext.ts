export type ExtractedPageContext = {
  tab_id?: number;
  url: string;
  title: string;
  domain: string;
  captured_at: string;
  headings: Array<{ level: number; text: string }>;
  selected_text?: string;
  visible_text: string;
  cleaned_text: string;
  dom_signals?: DomSignals;
};

export type DomSignals = {
  meta: Array<{ name: string; content: string }>;
  links: Array<{ text: string; href: string; selector?: string; role?: string }>;
  blocks: Array<{ text: string; selector?: string; href?: string; role?: string }>;
  pageStateHints: string[];
};

export function extractPageContext(documentRef: Document, url: string): ExtractedPageContext {
  const parsedUrl = new URL(url);
  const domSignals = extractDomSignals(documentRef, url);
  const headings = Array.from(documentRef.querySelectorAll("h1,h2,h3"))
    .slice(0, 80)
    .map((node) => ({
      level: Number(node.tagName.slice(1)),
      text: normalizeText(node.textContent ?? "")
    }))
    .filter((heading) => heading.text.length > 0);
  const selection = documentRef.getSelection()?.toString();
  const body = documentRef.body;
  const rawVisibleText = body ? body.innerText || body.textContent || "" : "";
  const visibleText = normalizeText(rawVisibleText);
  const cleanedText = domSignals.pageStateHints.includes("bili_video_detail") ||
    domSignals.pageStateHints.includes("xhs_note_detail") ||
    domSignals.pageStateHints.includes("xhs_home_feed") ||
    domSignals.pageStateHints.includes("guancha_article_detail")
    ? focusedCleanedText(documentRef.title || parsedUrl.hostname, domSignals, visibleText)
    : visibleText.slice(0, 24000);
  const selectedText = selection ? cleanSelectedText(selection, domSignals.pageStateHints) : "";

  return {
    url,
    title: documentRef.title || parsedUrl.hostname,
    domain: parsedUrl.hostname,
    captured_at: new Date().toISOString(),
    headings,
    selected_text: selectedText || undefined,
    visible_text: visibleText.slice(0, 24000),
    cleaned_text: cleanedText,
    dom_signals: domSignals
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function cleanSelectedText(text: string, pageStateHints: string[]): string {
  const normalized = text.replace(/\r/g, "\n");
  const lines = normalized
    .split(/\n+|(?<=[。！？!?；;])\s+/)
    .map((line) => {
      if (pageStateHints.includes("bili_video_detail")) return normalizeBilibiliText(line);
      if (pageStateHints.includes("xhs_note_detail")) return normalizeXiaohongshuText(line);
      return normalizeText(line);
    })
    .filter((line) => isUsefulSelectedLine(line, pageStateHints));
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const key = line.replace(/[^\p{L}\p{N}#]+/gu, "").slice(0, 80).toLowerCase();
    if (!key || seen.has(key)) continue;
    if (deduped.some((item) => textOverlapRatio(item, line) > 0.82)) continue;
    seen.add(key);
    deduped.push(line);
  }
  return normalizeText(deduped.join("\n")).slice(0, 1800);
}

function isUsefulSelectedLine(line: string, pageStateHints: string[]): boolean {
  const normalized = normalizeText(line);
  if (normalized.length < 4) return false;
  if (/^(首页|动态|热门|频道|消息|投稿|登录|注册|关注|赞|收藏|分享|评论|弹幕|图\s*\d+|作者|时间)$/i.test(normalized)) return false;
  if (/^(图\s*)?\d+\s*$/.test(normalized)) return false;
  if (/https?:\/\/|www\./i.test(normalized) && normalized.length < 60) return false;
  if (/^\d{1,2}[:：]\d{2}(?::\d{2})?$/.test(normalized)) return false;
  if (/^\d+(?:\.\d+)?万?$/.test(normalized)) return false;
  if (/未经作者授权|禁止转载|下载客户端|扫码登录|登录后|自动连播|订阅合集|相关推荐/.test(normalized)) return false;
  if (/弹幕列表|按类型过滤|滚动\s*固定\s*彩色|防挡字幕|智能防挡弹幕|高级弹幕/.test(normalized)) return false;
  if (/本视频参加过|活动已结束|QQ群|群号|微信|商务请私信|充电\s*关注/.test(normalized)) return false;
  if (/沪ICP备|营业执照|公网安备|增值电信业务|网络文化经营许可证|违法不良信息举报|隐私政策|关于我们/.test(normalized)) return false;
  if (/说点什么|共\s*\d+\s*条评论|展开\s*\d+\s*条回复|回复|发布\s+\d*通知|\d+消息/.test(normalized) && normalized.length < 120) return false;
  if (pageStateHints.includes("bili_video_detail") && /(?:播放|弹幕|点赞|投币|收藏|转发|稿件投诉)/.test(normalized) && normalized.length < 80) return false;
  if (pageStateHints.includes("xhs_note_detail") && /(?:刚刚|分钟前|小时前|昨天|前天|赞过|收藏|分享)/.test(normalized) && normalized.length < 80) return false;
  const digitCount = (normalized.match(/\d/g) || []).length;
  if (digitCount >= 8 && digitCount / normalized.length > 0.32 && normalized.length < 120) return false;
  return true;
}

function textOverlapRatio(left: string, right: string): number {
  const a = left.replace(/\s+/g, "");
  const b = right.replace(/\s+/g, "");
  if (!a || !b) return 0;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  let shared = 0;
  for (let index = 0; index < shorter.length; index += 1) {
    if (longer.includes(shorter[index])) shared += 1;
  }
  return shared / shorter.length;
}

function extractDomSignals(documentRef: Document, url = documentRef.location?.href || ""): DomSignals {
  const bodyText = normalizeText(documentRef.body?.innerText || documentRef.body?.textContent || "");
  const meta = Array.from(documentRef.querySelectorAll<HTMLMetaElement>("meta[name], meta[property]"))
    .map((node) => ({
      name: normalizeText(node.getAttribute("name") || node.getAttribute("property") || ""),
      content: normalizeText(node.getAttribute("content") || "")
    }))
    .filter((item) => item.name && item.content)
    .slice(0, 40);
  const canonical = documentRef.querySelector<HTMLLinkElement>("link[rel='canonical']");
  if (canonical?.href) meta.push({ name: "canonical", content: canonical.href });
  if (isBilibiliVideoPage(url)) {
    return extractBilibiliVideoSignals(documentRef, meta, bodyText, url);
  }
  if (isXiaohongshuNotePage(url)) {
    return extractXiaohongshuNoteSignals(documentRef, meta, bodyText, url);
  }
  if (isXiaohongshuHomePage(url)) {
    return extractXiaohongshuFeedSignals(documentRef, meta, bodyText, url);
  }
  if (isGuanchaArticlePage(url)) {
    return extractGuanchaArticleSignals(documentRef, meta, bodyText, url);
  }

  const links = uniqueByTextAndHref(
    Array.from(documentRef.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .map((node) => ({
        text: normalizeText(node.textContent || node.getAttribute("aria-label") || node.getAttribute("title") || ""),
        href: node.href,
        selector: cssPath(node),
        role: classifyLink(node.href, node.textContent || "")
      }))
      .filter((item) => item.text.length >= 2 && item.href)
  ).slice(0, 160);

  const candidateSelector = [
    "article",
    "[role='article']",
    "main section",
    "li",
    "[class*='card']",
    "[class*='item']",
    "[class*='video']",
    "[class*='note']",
    "[class*='feed']"
  ].join(",");
  const blocks = uniqueByText(
    Array.from(documentRef.querySelectorAll<HTMLElement>(candidateSelector))
      .map((node) => {
        const text = normalizeText(node.innerText || node.textContent || "");
        const firstLink = node.querySelector<HTMLAnchorElement>("a[href]");
        return {
          text: text.slice(0, 520),
          selector: cssPath(node),
          href: firstLink?.href,
          role: classifyBlock(node, text)
        };
      })
      .filter((item) => item.text.length >= 16 && item.text.length <= 900)
  ).slice(0, 120);

  return {
    meta,
    links,
    blocks,
    pageStateHints: detectPageStateHints(bodyText, documentRef.title, documentRef.location?.href || "")
  };
}

function extractBilibiliVideoSignals(documentRef: Document, meta: DomSignals["meta"], bodyText: string, url: string): DomSignals {
  const blocks: DomSignals["blocks"] = [];
  const links: DomSignals["links"] = [];
  const addBlock = (selectors: string[], role: string, options: { minLength?: number; maxLength?: number } = {}) => {
    for (const selector of selectors) {
      const node = documentRef.querySelector<HTMLElement>(selector);
      if (!node) continue;
      const text = normalizeBilibiliText(node.innerText || node.textContent || "");
      if (!isUsefulBilibiliMainText(text, options)) continue;
      blocks.push({ text: text.slice(0, options.maxLength ?? 520), selector: cssPath(node), role });
      return;
    }
  };

  addBlock(["h1.video-title", ".video-title", "h1[title]", "h1"], "bili_video_title", { minLength: 4, maxLength: 180 });
  addBlock([".desc-info-text", ".video-desc-container", ".video-desc", "#v_desc", "[class*='desc-info']", "[class*='video-desc']"], "bili_video_description", { minLength: 12, maxLength: 520 });
  addBlock([".up-name", ".up-info", ".owner", "[class*='up-name']", "[class*='up-info']", "[class*='owner']"], "bili_video_author", { minLength: 2, maxLength: 180 });
  addBlock([".video-data", ".view-text", ".dm-text", ".pubdate-text", "[class*='video-data']", "[class*='view-text']", "[class*='pubdate']"], "bili_video_stats", { minLength: 4, maxLength: 260 });

  const titleMeta = firstMetaContent(meta, ["og:title", "title"]);
  if (isUsefulBilibiliMainText(titleMeta, { minLength: 4 })) {
    blocks.push({ text: titleMeta.slice(0, 180), role: "bili_video_title" });
  }
  const descriptionMeta = firstMetaContent(meta, ["description", "og:description"]);
  if (isUsefulBilibiliMainText(descriptionMeta, { minLength: 12 })) {
    blocks.push({ text: descriptionMeta.slice(0, 520), role: "bili_video_description" });
  }

  const canonical = meta.find((item) => item.name === "canonical")?.content || url;
  links.push({ text: "当前 B站视频详情页", href: canonical, role: "media_link" });

  const hints = detectPageStateHints(bodyText, documentRef.title, url);
  hints.push("media_dom_limited", "bili_video_detail");
  return {
    meta,
    links,
    blocks: uniqueByText(blocks).slice(0, 12),
    pageStateHints: Array.from(new Set(hints))
  };
}

function extractXiaohongshuNoteSignals(documentRef: Document, meta: DomSignals["meta"], bodyText: string, url: string): DomSignals {
  const blocks: DomSignals["blocks"] = [];
  const links: DomSignals["links"] = [];
  const addBlock = (selectors: string[], role: string, options: { minLength?: number; maxLength?: number } = {}) => {
    for (const selector of selectors) {
      const node = documentRef.querySelector<HTMLElement>(selector);
      if (!node) continue;
      const text = normalizeXiaohongshuText(node.innerText || node.textContent || "");
      if (!isUsefulXiaohongshuMainText(text, options)) continue;
      blocks.push({ text: text.slice(0, options.maxLength ?? 520), selector: cssPath(node), role });
      return;
    }
  };

  addBlock(
    [
      "#noteContainer .note-content .title",
      "#noteContainer .note-content [class*='title']",
      "[class*='note-content'] [class*='title']",
      "[id='noteContainer'] h1",
      "h1"
    ],
    "xhs_note_title",
    { minLength: 4, maxLength: 160 }
  );
  addBlock(
    [
      "#noteContainer .note-content .desc",
      "#noteContainer .note-content [class*='desc']",
      "#noteContainer .note-content [class*='content']",
      "#noteContainer .note-content",
      "[class*='note-content']"
    ],
    "xhs_note_body",
    { minLength: 12, maxLength: 700 }
  );
  addBlock(
    [
      "#noteContainer [class*='author'] [class*='name']",
      "#noteContainer [class*='user'] [class*='name']",
      "#noteContainer [class*='author']",
      "#noteContainer [class*='user']"
    ],
    "xhs_note_author",
    { minLength: 2, maxLength: 160 }
  );
  addBlock(
    [
      "#noteContainer [class*='date']",
      "#noteContainer [class*='publish']",
      "#noteContainer [class*='bottom']",
      "#noteContainer [class*='engage']"
    ],
    "xhs_note_stats",
    { minLength: 4, maxLength: 220 }
  );

  const titleMeta = firstMetaContent(meta, ["og:title", "title"]);
  if (isUsefulXiaohongshuMainText(titleMeta, { minLength: 4 })) {
    blocks.push({ text: titleMeta.slice(0, 160), role: "xhs_note_title" });
  }
  const descriptionMeta = firstMetaContent(meta, ["description", "og:description"]);
  if (isUsefulXiaohongshuMainText(descriptionMeta, { minLength: 12 })) {
    blocks.push({ text: descriptionMeta.slice(0, 700), role: "xhs_note_body" });
  }

  const canonical = meta.find((item) => item.name === "canonical")?.content || url;
  links.push({ text: "当前小红书笔记详情页", href: canonical, role: "content_link" });

  const hints = detectPageStateHints(bodyText, documentRef.title, url);
  hints.push("media_dom_limited", "xhs_note_detail");
  return {
    meta,
    links,
    blocks: uniqueByText(blocks).slice(0, 12),
    pageStateHints: Array.from(new Set(hints))
  };
}

function extractXiaohongshuFeedSignals(documentRef: Document, meta: DomSignals["meta"], bodyText: string, url: string): DomSignals {
  const blocks: DomSignals["blocks"] = [];
  const links: DomSignals["links"] = [];
  const cardSelector = [
    "#exploreFeeds section",
    "#exploreFeeds [class*='note']",
    "#mfContainer section",
    "[class*='feeds'] [class*='note']",
    "[class*='feed'] [class*='card']",
    "a[href*='/explore/']"
  ].join(",");
  for (const node of Array.from(documentRef.querySelectorAll<HTMLElement>(cardSelector))) {
    const element = node instanceof HTMLAnchorElement ? node : node.closest<HTMLElement>("section, article, li, [class*='note'], [class*='card']") ?? node;
    const text = normalizeXiaohongshuText(element.innerText || element.textContent || "");
    const firstLink = element instanceof HTMLAnchorElement ? element : element.querySelector<HTMLAnchorElement>("a[href*='/explore/']");
    if (!isUsefulXiaohongshuFeedText(text)) continue;
    blocks.push({
      text: text.slice(0, 420),
      selector: cssPath(element),
      href: firstLink?.href,
      role: "xhs_feed_card"
    });
    if (firstLink?.href) {
      links.push({
        text: text.slice(0, 140),
        href: firstLink.href,
        selector: cssPath(firstLink),
        role: "content_link"
      });
    }
    if (blocks.length >= 24) break;
  }
  const hints = detectPageStateHints(bodyText, documentRef.title, url);
  hints.push("xhs_home_feed");
  return {
    meta,
    links: uniqueByTextAndHref(links).slice(0, 40),
    blocks: uniqueByText(blocks).slice(0, 24),
    pageStateHints: Array.from(new Set(hints))
  };
}

function extractGuanchaArticleSignals(documentRef: Document, meta: DomSignals["meta"], bodyText: string, url: string): DomSignals {
  const blocks: DomSignals["blocks"] = [];
  const links: DomSignals["links"] = [];
  const addBlock = (selectors: string[], role: string, options: { minLength?: number; maxLength?: number } = {}) => {
    for (const selector of selectors) {
      const node = documentRef.querySelector<HTMLElement>(selector);
      if (!node) continue;
      const text = normalizeGuanchaText(node.innerText || node.textContent || "");
      if (!isUsefulGuanchaArticleText(text, options)) continue;
      blocks.push({ text: text.slice(0, options.maxLength ?? 700), selector: cssPath(node), role });
      return;
    }
  };

  addBlock(["h1", ".article-title", "[class*='article'] h1", "[class*='title']"], "guancha_article_title", { minLength: 6, maxLength: 180 });
  addBlock([".article-info", ".time", ".author", "[class*='author']", "[class*='date']"], "guancha_article_meta", { minLength: 4, maxLength: 220 });
  addBlock(
    [
      "article",
      ".article-content",
      ".article-txt",
      ".article_text",
      ".left-main",
      "[class*='article'] [class*='content']",
      "[class*='content-main'] .left-main"
    ],
    "guancha_article_body",
    { minLength: 80, maxLength: 1600 }
  );

  const titleMeta = firstMetaContent(meta, ["og:title", "title"]);
  if (isUsefulGuanchaArticleText(titleMeta, { minLength: 6 })) blocks.push({ text: titleMeta.slice(0, 180), role: "guancha_article_title" });
  const descriptionMeta = firstMetaContent(meta, ["description", "og:description"]);
  if (isUsefulGuanchaArticleText(descriptionMeta, { minLength: 24 })) blocks.push({ text: descriptionMeta.slice(0, 700), role: "guancha_article_body" });

  const canonical = meta.find((item) => item.name === "canonical")?.content || url;
  links.push({ text: "当前观察者网文章", href: canonical, role: "content_link" });

  for (const node of Array.from(documentRef.querySelectorAll<HTMLElement>("#comments-container li, [class*='comment'], [class*='recommend'], [class*='related'], [class*='video']"))) {
    const text = normalizeGuanchaText(node.innerText || node.textContent || "");
    if (text.length < 16) continue;
    const role = /comment|cmt|评论/.test(`${node.id} ${node.className}`.toLowerCase())
      ? "guancha_comment"
      : /video|视频/.test(`${node.id} ${node.className} ${text}`.toLowerCase())
        ? "guancha_video"
        : "guancha_recommendation";
    blocks.push({ text: text.slice(0, 520), selector: cssPath(node), role });
    if (blocks.length >= 40) break;
  }

  const hints = detectPageStateHints(bodyText, documentRef.title, url);
  hints.push("guancha_article_detail");
  return {
    meta,
    links: uniqueByTextAndHref(links).slice(0, 20),
    blocks: uniqueByText(blocks).slice(0, 40),
    pageStateHints: Array.from(new Set(hints))
  };
}

function uniqueByText(items: Array<{ text: string; selector?: string; href?: string; role?: string }>) {
  const seen = new Set<string>();
  const result: Array<{ text: string; selector?: string; href?: string; role?: string }> = [];
  for (const item of items) {
    const key = item.text.slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function uniqueByTextAndHref(items: Array<{ text: string; href: string; selector?: string; role?: string }>) {
  const seen = new Set<string>();
  const result: Array<{ text: string; href: string; selector?: string; role?: string }> = [];
  for (const item of items) {
    const key = `${item.text.slice(0, 80)}|${item.href.replace(/#.*$/, "")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function detectPageStateHints(text: string, title: string, href: string): string[] {
  const haystack = `${title} ${href} ${text.slice(0, 1200)}`.toLowerCase();
  const hints: string[] = [];
  if (/请先登录|扫码登录|登录后.{0,12}(查看|继续|评论|发布)|需要登录|未登录|sign in to|login to|please log in/.test(haystack)) {
    hints.push("auth_gated");
  }
  if (/验证码|安全验证|滑动验证|人机验证|verify you are human|verification required|captcha/.test(haystack)) {
    hints.push("verification_gated");
  }
  if (/(^|[^\d])404([^\d]|$)|not found|页面不见了|无法浏览|isn'?t available/.test(haystack)) hints.push("not_found");
  if (/弹幕|倍速|字幕|播放|video|bilibili|小红书|red/.test(haystack)) hints.push("media_dom_limited");
  if (/bilibili\.com\/video\//.test(haystack)) hints.push("bili_video_detail");
  if (/xiaohongshu\.com\/explore/.test(haystack)) hints.push("xhs_note_detail");
  if (/xiaohongshu\.com(?:\/explore)?(?:\s|$)/.test(haystack)) hints.push("xhs_home_feed");
  if (/guancha\.cn\/.+\.shtml/.test(haystack)) hints.push("guancha_article_detail");
  return Array.from(new Set(hints));
}

function classifyLink(href: string, text: string): string {
  const lowered = `${href} ${text}`.toLowerCase();
  if (/xiaohongshu\.com\/user\/profile/.test(lowered)) return "profile_link";
  if (/video|bvid|直播|play|watch/.test(lowered)) return "media_link";
  if (/explore|note|item|post|article|shtml|read/.test(lowered)) return "content_link";
  if (/login|passport|account|signin/.test(lowered)) return "auth_link";
  return "link";
}

function classifyBlock(node: HTMLElement, text: string): string {
  const marker = `${node.tagName} ${node.id || ""} ${node.className || ""} ${node.getAttribute("role") || ""} ${text.slice(0, 160)}`.toLowerCase();
  if (/channel-container|side-bar|app-info|sidebar|footer/.test(marker)) return "xhs_sidebar";
  if (/(mfcontainer|explorefeeds)/.test(marker) && text.length > 360) return "xhs_feed_container";
  if (/comment|评论|热评/.test(marker) && /xiaohongshu|note|red|小红书/.test(marker)) return "xhs_comment";
  if (/guancha/.test(marker) && /comment|评论|cmt/.test(marker)) return "guancha_comment";
  if (/guancha/.test(marker) && /recommend|related|最新|视频|侧栏/.test(marker)) return "guancha_recommendation";
  if (/reply|comment|评论|热评/.test(marker)) return "bili_comment";
  if (/recommend|related|rec-list|相关推荐|自动连播|订阅合集/.test(marker)) return "bili_recommendation";
  if (/danmaku|弹幕列表|弹幕设置|防挡字幕|字幕/.test(marker)) return "bili_danmaku";
  if (/activity|ad-|banner|活动|充电|关注|qq群|微信/.test(marker)) return "bili_promo";
  if (/login|验证码|扫码|sign in/.test(marker)) return "auth_block";
  if (/(^|[^\d])404([^\d]|$)|not found|页面不见了|无法浏览/.test(marker)) return "not_found_block";
  if (/video|bvid|弹幕|播放|字幕|倍速/.test(marker)) return "media_block";
  if (/card|item|feed|note|li/.test(marker)) return "feed_card";
  return "content_block";
}

function isBilibiliVideoPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /(^|\.)bilibili\.com$/.test(parsed.hostname) && parsed.pathname.startsWith("/video/");
  } catch {
    return /bilibili\.com\/video\//i.test(url);
  }
}

function isXiaohongshuNotePage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /(^|\.)xiaohongshu\.com$/.test(parsed.hostname) && (/^\/explore\//.test(parsed.pathname) || /^\/discovery\/item\//.test(parsed.pathname));
  } catch {
    return /xiaohongshu\.com\/(explore|discovery\/item)\//i.test(url);
  }
}

function isXiaohongshuHomePage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /(^|\.)xiaohongshu\.com$/.test(parsed.hostname) && (parsed.pathname === "/" || parsed.pathname === "/explore");
  } catch {
    return /xiaohongshu\.com\/?(?:explore)?(?:[?#]|$)/i.test(url);
  }
}

function isGuanchaArticlePage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /(^|\.)guancha\.cn$/.test(parsed.hostname) && parsed.pathname.endsWith(".shtml");
  } catch {
    return /guancha\.cn\/.+\.shtml/i.test(url);
  }
}

function normalizeBilibiliText(text: string): string {
  return normalizeText(text)
    .replace(/(?:，|,)?\s*相关视频[:：].*$/g, "")
    .replace(/(?:，|,)?\s*更多精彩.*$/g, "")
    .replace(/展开更多|收起|复制链接|举报|分享至.*$/g, "")
    .trim();
}

function firstMetaContent(meta: DomSignals["meta"], names: string[]): string {
  const wanted = new Set(names.map((item) => item.toLowerCase()));
  const found = meta.find((item) => wanted.has(item.name.toLowerCase()));
  return found?.content ?? "";
}

function isUsefulBilibiliMainText(text: string, options: { minLength?: number; maxLength?: number } = {}): boolean {
  const normalized = normalizeText(text);
  const minLength = options.minLength ?? 8;
  if (normalized.length < minLength) return false;
  if (/弹幕列表|按类型过滤|滚动\s+固定\s+彩色|防挡字幕|智能防挡弹幕|自动连播|订阅合集/.test(normalized)) return false;
  if (/本视频参加过|活动已结束|有砸性多壮志|QQ群|群号|微信|充电\s+关注/.test(normalized)) return false;
  if (/未经作者授权|禁止转载|下载客户端|扫码登录|登录后推荐/.test(normalized)) return false;
  if ((normalized.match(/\d+(?:\.\d+)?万/g) || []).length >= 4 && normalized.length > 80) return false;
  return true;
}

function focusedCleanedText(title: string, domSignals: DomSignals, fallback: string): string {
  const mainBlocks = domSignals.blocks
    .filter((block) => /^(bili_video_|xhs_note_|xhs_feed_card|guancha_article_)/.test(block.role || ""))
    .map((block) => block.text)
    .filter(Boolean);
  const text = [title, ...mainBlocks].join("\n");
  return normalizeText(text || fallback).slice(0, 24000);
}

function normalizeXiaohongshuText(text: string): string {
  return normalizeText(text)
    .replace(/展开更多|收起|复制链接|举报|分享至.*$/g, "")
    .replace(/说点什么.*$/g, "")
    .trim();
}

function isUsefulXiaohongshuMainText(text: string, options: { minLength?: number; maxLength?: number } = {}): boolean {
  const normalized = normalizeText(text);
  const minLength = options.minLength ?? 8;
  if (normalized.length < minLength) return false;
  if (/沪ICP备|营业执照|公网安备|增值电信业务|网络文化经营许可证|互联网药品信息|医疗器械网络交易/.test(normalized)) return false;
  if (/违法不良信息举报|互联网举报中心|网上有害信息举报专区|个性化推荐算法|关于我们|隐私政策/.test(normalized)) return false;
  if (/扫码登录|获取验证码|手机号登录|登录后推荐|发布\s+\d*通知|\d+消息/.test(normalized)) return false;
  if (/共\s*\d+\s*条评论|回复|展开\s*\d+\s*条回复|说点什么/.test(normalized) && normalized.length > 80) return false;
  if ((normalized.match(/(?:\d+\s*)?(?:小时前|分钟前|刚刚|昨天|前天|回复|赞)/g) || []).length >= 4) return false;
  return true;
}

function isUsefulXiaohongshuFeedText(text: string): boolean {
  const normalized = normalizeXiaohongshuText(text);
  if (normalized.length < 8 || normalized.length > 520) return false;
  if (/推荐\s+穿搭\s+美食\s+彩妆|首页\s+动态\s+热门|问点点\s+ai/.test(normalized)) return false;
  if (/沪ICP备|营业执照|违法不良信息举报|扫码登录|手机号登录|获取验证码/.test(normalized)) return false;
  if (/^(赞|收藏|分享|评论|关注|\d+|图\s*\d+)$/i.test(normalized)) return false;
  return true;
}

function normalizeGuanchaText(text: string): string {
  return normalizeText(text)
    .replace(/分享到：.*?来源：/g, "来源：")
    .replace(/字号：A-\s*A\s*A\+?/g, "")
    .replace(/举报\s+分享\s+回复\s+踩\d*\s+赞\d*\s+收藏/g, "")
    .replace(/最新视频\s+查看全部.*$/g, "")
    .trim();
}

function isUsefulGuanchaArticleText(text: string, options: { minLength?: number; maxLength?: number } = {}): boolean {
  const normalized = normalizeGuanchaText(text);
  const minLength = options.minLength ?? 12;
  if (normalized.length < minLength) return false;
  if (/举报\s+分享\s+回复|踩\d+\s+赞\d+|评论区|登录后评论|我来说两句/.test(normalized)) return false;
  if (/最新视频|查看全部|相关新闻|相关阅读|为您推荐|热门评论/.test(normalized)) return false;
  if (/广告|下载客户端|观察者网风闻社区/.test(normalized)) return false;
  return true;
}

function cssPath(node: Element): string {
  const parts: string[] = [];
  let current: Element | null = node;
  while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      part += `#${cssEscape(current.id)}`;
      parts.unshift(part);
      break;
    }
    const className = String(current.getAttribute("class") || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => `.${cssEscape(item)}`)
      .join("");
    part += className;
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((item) => item.tagName === current?.tagName);
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    parts.unshift(part);
    current = current.parentElement;
  }
  return parts.join(" > ");
}

function cssEscape(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
