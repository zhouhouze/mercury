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

  return {
    url,
    title: documentRef.title || parsedUrl.hostname,
    domain: parsedUrl.hostname,
    captured_at: new Date().toISOString(),
    headings,
    selected_text: selection ? normalizeText(selection) : undefined,
    visible_text: visibleText.slice(0, 24000),
    cleaned_text: visibleText.slice(0, 24000),
    dom_signals: extractDomSignals(documentRef)
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractDomSignals(documentRef: Document): DomSignals {
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
  return Array.from(new Set(hints));
}

function classifyLink(href: string, text: string): string {
  const lowered = `${href} ${text}`.toLowerCase();
  if (/video|bvid|直播|play|watch/.test(lowered)) return "media_link";
  if (/explore|note|item|post|article|shtml|read/.test(lowered)) return "content_link";
  if (/login|passport|account|signin/.test(lowered)) return "auth_link";
  return "link";
}

function classifyBlock(node: HTMLElement, text: string): string {
  const marker = `${node.tagName} ${node.className || ""} ${node.getAttribute("role") || ""} ${text.slice(0, 160)}`.toLowerCase();
  if (/login|验证码|扫码|sign in/.test(marker)) return "auth_block";
  if (/(^|[^\d])404([^\d]|$)|not found|页面不见了|无法浏览/.test(marker)) return "not_found_block";
  if (/video|bvid|弹幕|播放|字幕|倍速/.test(marker)) return "media_block";
  if (/card|item|feed|note|li/.test(marker)) return "feed_card";
  return "content_block";
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
