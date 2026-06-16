import { extractPageContext, type ExtractedPageContext } from "./pageContext";

export const PAGE_CONTEXT_MESSAGE_TYPE = "navia.extractPageContext";
export const JUMPBACK_MESSAGE_TYPE = "navia.jumpToSource";
export const LEGACY_INJECTED_HOST_ID = ["navia", "injected", "host"].join("-");

type PageContextBridgeResponse =
  | { ok: true; context: ExtractedPageContext }
  | { ok: false; error: string };

type JumpbackStrategy = "selector" | "domPath" | "textQuote";

type JumpbackRequest = {
  nodeId?: string;
  nodeSourceMapKey?: string;
  selector?: string;
  domPath?: string;
  textQuote?: string;
  fallbackText?: string;
};

type JumpbackResult = {
  status: "highlighted" | "fallback_shown";
  attemptedStrategies: JumpbackStrategy[];
  matchedStrategy?: JumpbackStrategy;
  highlightedText?: string;
  fallbackText?: string;
  failureReason?: string;
};

type ContentBridgeResponse =
  | PageContextBridgeResponse
  | { ok: true; result: JumpbackResult }
  | { ok: false; error: string };

type SendResponse = (response: ContentBridgeResponse) => void;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "页面上下文读取失败。";
}

export function initializeContentBridge(documentRef: Document, href: string): void {
  cleanupLegacyInjectedPanel(documentRef);
  chrome.runtime.onMessage.addListener(createPageContextMessageHandler(documentRef, href));
}

export function cleanupLegacyInjectedPanel(documentRef: Document = document): void {
  documentRef.getElementById(LEGACY_INJECTED_HOST_ID)?.remove();
}

export function createPageContextMessageHandler(documentRef: Document, href: string) {
  return (message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: SendResponse): boolean => {
    if (!message || typeof message !== "object") {
      return false;
    }
    const type = (message as { type?: unknown }).type;

    if (type === PAGE_CONTEXT_MESSAGE_TYPE) {
      try {
        const context = extractPageContext(documentRef, href);
        sendResponse({ ok: true, context });
      } catch (error) {
        sendResponse({ ok: false, error: getErrorMessage(error) });
      }
      return true;
    }

    if (type === JUMPBACK_MESSAGE_TYPE) {
      try {
        const request = (message as { request?: unknown }).request;
        if (!isJumpbackRequest(request)) throw new Error("Jumpback request is invalid.");
        sendResponse({ ok: true, result: performJumpback(documentRef, request) });
      } catch (error) {
        sendResponse({ ok: false, error: getErrorMessage(error) });
      }
      return true;
    }

    return false;
  };
}

export function performJumpback(documentRef: Document, request: JumpbackRequest): JumpbackResult {
  const attemptedStrategies: JumpbackStrategy[] = [];
  const selector = cleanString(request.selector);
  const domPath = cleanString(request.domPath);
  const textQuote = cleanString(request.textQuote);

  if (selector) {
    attemptedStrategies.push("selector");
    const element = findBySelector(documentRef, selector);
    if (element) return highlightElement(element, { attemptedStrategies, matchedStrategy: "selector" });
  }

  if (domPath) {
    attemptedStrategies.push("domPath");
    const element = findBySelector(documentRef, domPath);
    if (element) return highlightElement(element, { attemptedStrategies, matchedStrategy: "domPath" });
  }

  if (textQuote) {
    attemptedStrategies.push("textQuote");
    const element = findByTextQuote(documentRef, textQuote);
    if (element) return highlightElement(element, { attemptedStrategies, matchedStrategy: "textQuote" });
  }

  return {
    status: "fallback_shown",
    attemptedStrategies,
    fallbackText: cleanString(request.fallbackText) || textQuote,
    failureReason: attemptedStrategies.length ? "source_not_found_in_dom" : "no_jumpback_strategy_available"
  };
}

function isJumpbackRequest(value: unknown): value is JumpbackRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return [record.selector, record.domPath, record.textQuote, record.fallbackText].some((item) => typeof item === "string" && item.trim().length > 0);
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function findBySelector(documentRef: Document, selector: string): HTMLElement | null {
  try {
    const element = documentRef.querySelector(selector);
    return element instanceof HTMLElement ? element : null;
  } catch {
    return null;
  }
}

function findByTextQuote(documentRef: Document, textQuote: string): HTMLElement | null {
  const target = normalizeText(textQuote);
  if (!target) return null;
  const candidates = textQuoteCandidates(target);
  const walker = documentRef.createTreeWalker(documentRef.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const normalizedNodeText = normalizeText(node.textContent || "");
    if (candidates.some((candidate) => normalizedNodeText.includes(candidate))) {
      const parent = node.parentElement;
      if (parent && !["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) return parent;
    }
    node = walker.nextNode();
  }
  const elements = Array.from(documentRef.body.querySelectorAll<HTMLElement>("p, li, td, th, pre, blockquote, h1, h2, h3, h4, h5, h6, section, article, main, div"));
  for (const element of elements) {
    if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName)) continue;
    const elementText = normalizeText(element.textContent || "");
    if (!elementText) continue;
    if (candidates.some((candidate) => elementText.includes(candidate) || candidate.includes(elementText))) return element;
  }
  return null;
}

function highlightElement(
  element: HTMLElement,
  input: { attemptedStrategies: JumpbackStrategy[]; matchedStrategy: JumpbackStrategy }
): JumpbackResult {
  element.scrollIntoView?.({ behavior: "smooth", block: "center", inline: "nearest" });
  element.setAttribute("data-navia-jumpback-highlight", "true");
  element.style.outline = "3px solid #635bff";
  element.style.outlineOffset = "3px";
  element.style.backgroundColor = "rgba(99, 91, 255, 0.12)";
  return {
    status: "highlighted",
    attemptedStrategies: input.attemptedStrategies,
    matchedStrategy: input.matchedStrategy,
    highlightedText: normalizeText(element.textContent || "").slice(0, 240)
  };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function textQuoteCandidates(value: string): string[] {
  const normalized = normalizeText(value);
  const candidates = [normalized, normalized.slice(0, 160), normalized.slice(0, 120), normalized.slice(0, 80), normalized.slice(0, 48)]
    .map((item) => item.trim())
    .filter((item) => item.length >= 4);
  const sentences = normalized.split(/[。.!?；;]\s*/).map((item) => item.trim()).filter((item) => item.length >= 4);
  return Array.from(new Set([...candidates, ...sentences]));
}
