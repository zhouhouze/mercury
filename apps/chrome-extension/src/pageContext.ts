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
  const cleanedText = domSignals.pageStateHints.includes("bili_video_detail") || domSignals.pageStateHints.includes("xhs_note_detail")
    ? focusedCleanedText(documentRef.title || parsedUrl.hostname, domSignals, visibleText)
    : visibleText.slice(0, 24000);

  return {
    url,
    title: documentRef.title || parsedUrl.hostname,
    domain: parsedUrl.hostname,
    captured_at: new Date().toISOString(),
    headings,
    selected_text: selection ? normalizeText(selection) : undefined,
    visible_text: visibleText.slice(0, 24000),
    cleaned_text: cleanedText,
    dom_signals: domSignals
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
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

function normalizeBilibiliText(text: string): string {
  return normalizeText(text)
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
    .filter((block) => /^(bili_video_|xhs_note_)/.test(block.role || ""))
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
