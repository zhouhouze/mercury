import { extractPageContext, type ExtractedPageContext } from "./pageContext";

export const PAGE_CONTEXT_MESSAGE_TYPE = "navia.extractPageContext";
export const JUMPBACK_MESSAGE_TYPE = "navia.jumpToSource";
export const LEGACY_INJECTED_HOST_ID = ["navia", "injected", "host"].join("-");
export const IN_PAGE_SIDEBAR_HOST_ID = ["navia", "inpage", "sidebar"].join("-");
export const IN_PAGE_LAUNCHER_ID = ["navia", "floating", "launcher"].join("-");
const IN_PAGE_INTERACTION_STYLE_ID = ["navia", "inpage", "interaction", "style"].join("-");
const IN_PAGE_SIDEBAR_DEFAULT_WIDTH = 440;
const IN_PAGE_SIDEBAR_MIN_WIDTH = 360;
const IN_PAGE_SIDEBAR_MAX_VIEWPORT_RATIO = 0.8;
const IN_PAGE_SIDEBAR_OVERLAY_RATIO = 0.52;
const IN_PAGE_NARROW_OVERLAY_WIDTH = 900;
const IN_PAGE_SIDEBAR_INSET = 12;
const LAUNCHER_DEFAULT_TOP = 0.9;
const SIDEBAR_STATE_STORAGE_KEY = "navia.inpageSidebarState";
const SIDEBAR_DEFAULT_MODE: SidebarMode = "collapsed";
const CONTENT_BRIDGE_READY_ATTRIBUTE = "data-navia-content-bridge-ready";
const pendingSidebarReadyDocuments = new WeakSet<Document>();

type SidebarMode = "expanded" | "collapsed";
type SidebarLayoutMode = "push" | "overlay";
type LauncherSide = "left" | "right";

type SidebarInteractionState = {
  mode: SidebarMode;
  layoutMode: SidebarLayoutMode;
  width: number;
  launcherTopRatio: number;
  launcherSide: LauncherSide;
};

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
  if (documentRef.documentElement?.getAttribute(CONTENT_BRIDGE_READY_ATTRIBUTE) === "true") {
    ensureInPageSidebarWhenReady(documentRef);
    return;
  }
  documentRef.documentElement?.setAttribute(CONTENT_BRIDGE_READY_ATTRIBUTE, "true");
  cleanupLegacyInjectedPanel(documentRef);
  ensureInPageSidebarWhenReady(documentRef);
  chrome.runtime.onMessage.addListener(createPageContextMessageHandler(documentRef, href));
}

function ensureInPageSidebarWhenReady(documentRef: Document): void {
  if (ensureInPageSidebar(documentRef)) return;
  if (pendingSidebarReadyDocuments.has(documentRef)) return;
  pendingSidebarReadyDocuments.add(documentRef);

  let observer: MutationObserver | null = null;
  let timeoutId: number | null = null;
  const cleanup = () => {
    pendingSidebarReadyDocuments.delete(documentRef);
    documentRef.removeEventListener("DOMContentLoaded", retry);
    observer?.disconnect();
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  };
  const retry = () => {
    if (ensureInPageSidebar(documentRef)) cleanup();
  };

  documentRef.addEventListener("DOMContentLoaded", retry, { once: true });
  if (documentRef.documentElement) {
    observer = new MutationObserver(retry);
    observer.observe(documentRef.documentElement, { childList: true, subtree: true });
  }
  window.setTimeout(retry, 0);
  timeoutId = window.setTimeout(cleanup, 30_000);
}

export function cleanupLegacyInjectedPanel(documentRef: Document = document): void {
  documentRef.getElementById(LEGACY_INJECTED_HOST_ID)?.remove();
}

export function ensureInPageSidebar(documentRef: Document = document): HTMLElement | null {
  if (!documentRef.body || !documentRef.documentElement) return null;
  ensureInPageInteractionStyles(documentRef);
  const existing = documentRef.getElementById(IN_PAGE_SIDEBAR_HOST_ID);
  if (existing instanceof HTMLElement) {
    ensureFloatingLauncher(documentRef, existing);
    applyInPageSidebarLayout(documentRef, existing, readSidebarState(documentRef));
    return existing;
  }

  const host = documentRef.createElement("aside");
  host.id = IN_PAGE_SIDEBAR_HOST_ID;
  host.setAttribute("data-testid", "navia-inpage-sidebar");
  host.setAttribute("aria-label", "Navia in-page sidebar");
  host.dataset.naviaMode = SIDEBAR_DEFAULT_MODE;
  Object.assign(host.style, {
    position: "fixed",
    top: `${IN_PAGE_SIDEBAR_INSET}px`,
    right: `${IN_PAGE_SIDEBAR_INSET}px`,
    bottom: `${IN_PAGE_SIDEBAR_INSET}px`,
    width: `${IN_PAGE_SIDEBAR_DEFAULT_WIDTH}px`,
    maxWidth: `${Math.round(IN_PAGE_SIDEBAR_MAX_VIEWPORT_RATIO * 100)}vw`,
    minWidth: `${IN_PAGE_SIDEBAR_MIN_WIDTH}px`,
    zIndex: "2147483647",
    border: "1px solid rgba(209, 232, 228, 0.82)",
    borderRadius: "26px",
    boxShadow: "-22px 0 62px rgba(5, 84, 75, 0.16), -6px 0 18px rgba(4, 24, 21, 0.07), inset 1px 0 0 rgba(255,255,255,0.66)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(245,251,249,0.7))",
    backdropFilter: "blur(28px) saturate(160%)",
    WebkitBackdropFilter: "blur(28px) saturate(160%)",
    overflow: "visible",
    transition: "transform 360ms cubic-bezier(0.16, 1, 0.3, 1), width 260ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms ease, opacity 220ms ease",
    willChange: "transform,width"
  });

  const resizeHandle = documentRef.createElement("div");
  resizeHandle.setAttribute("data-testid", "navia-inpage-sidebar-resize-handle");
  resizeHandle.setAttribute("aria-hidden", "true");
  Object.assign(resizeHandle.style, {
    position: "absolute",
    top: "0",
    left: "-9px",
    width: "18px",
    height: "100%",
    cursor: "ew-resize",
    zIndex: "5",
    borderRadius: "12px",
    background: "transparent",
    opacity: "0"
  });
  host.append(resizeHandle);

  const frame = documentRef.createElement("iframe");
  frame.title = "Navia";
  frame.setAttribute("data-testid", "navia-inpage-sidebar-frame");
  frame.src = chrome.runtime.getURL("sidepanel.html?naviaInPage=1");
  Object.assign(frame.style, {
    width: "100%",
    height: "100%",
    border: "0",
    display: "block",
    background: "#fff",
    borderRadius: "25px",
    overflow: "hidden"
  });
  host.append(frame);
  documentRef.body.append(host);
  const state = { ...readSidebarState(documentRef), mode: SIDEBAR_DEFAULT_MODE };
  ensureFloatingLauncher(documentRef, host);
  bindSidebarInteractions(documentRef, host, resizeHandle);
  applyInPageSidebarLayout(documentRef, host, state);
  return host;
}

function ensureInPageInteractionStyles(documentRef: Document): void {
  if (documentRef.getElementById(IN_PAGE_INTERACTION_STYLE_ID)) return;
  const style = documentRef.createElement("style");
  style.id = IN_PAGE_INTERACTION_STYLE_ID;
  style.textContent = `
    #${IN_PAGE_LAUNCHER_ID} {
      transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      transform: var(--navia-launcher-transform, scale(1));
      -webkit-tap-highlight-color: transparent;
    }
    #${IN_PAGE_LAUNCHER_ID}:hover {
      transform: var(--navia-launcher-transform, scale(1)) scale(1.08) translateY(-3px);
      border-color: #05544b !important;
      background: rgba(255, 255, 255, 0.85) !important;
      box-shadow: 0 24px 50px rgba(5, 84, 75, 0.2), 0 4px 12px rgba(0,0,0,0.08) !important;
    }
    #${IN_PAGE_LAUNCHER_ID}:active {
      transform: var(--navia-launcher-transform, scale(1)) scale(0.95);
      cursor: grabbing;
    }
    #${IN_PAGE_LAUNCHER_ID}:focus {
      outline: none;
    }
    #${IN_PAGE_LAUNCHER_ID}:focus-visible {
      border-color: #05544b !important;
      background: rgba(255, 255, 255, 0.85) !important;
      box-shadow: 0 0 0 3px rgba(5, 84, 75, 0.12), 0 24px 50px rgba(5, 84, 75, 0.18), 0 4px 12px rgba(0,0,0,0.08) !important;
    }
    #${IN_PAGE_LAUNCHER_ID}:hover [data-navia-launcher-svg="true"] {
      transform: rotate(15deg) scale(1.05);
    }
    #${IN_PAGE_LAUNCHER_ID}[data-navia-mode="collapsed"] {
      filter: saturate(0.96);
    }
    #${IN_PAGE_LAUNCHER_ID}[data-navia-mode="collapsed"]:hover,
    #${IN_PAGE_LAUNCHER_ID}[data-navia-mode="collapsed"]:focus-visible {
      transform: var(--navia-launcher-peek-transform, translateX(0)) scale(1.04) translateY(-2px);
      opacity: 1 !important;
    }
    #${IN_PAGE_SIDEBAR_HOST_ID} [data-testid="navia-inpage-sidebar-resize-handle"] {
      transition: opacity 0.18s ease, background 0.18s ease;
    }
    #${IN_PAGE_SIDEBAR_HOST_ID} [data-testid="navia-inpage-sidebar-resize-handle"]:hover {
      opacity: 1 !important;
      background: linear-gradient(90deg, transparent 0 7px, rgba(5, 84, 75, 0.38) 7px 10px, transparent 10px 18px) !important;
      filter: drop-shadow(0 0 10px rgba(5, 84, 75, 0.2));
    }
    #${IN_PAGE_SIDEBAR_HOST_ID}::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 26px;
      pointer-events: none;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.82), inset 1px 0 0 rgba(255,255,255,0.52);
      z-index: 1;
    }
  `;
  documentRef.head?.append(style);
}

function ensureFloatingLauncher(documentRef: Document, host: HTMLElement): HTMLButtonElement | null {
  if (!documentRef.body || !documentRef.documentElement) return null;
  const existing = documentRef.getElementById(IN_PAGE_LAUNCHER_ID);
  if (existing instanceof HTMLButtonElement) return existing;
  const launcher = documentRef.createElement("button");
  launcher.id = IN_PAGE_LAUNCHER_ID;
  launcher.type = "button";
  launcher.setAttribute("data-testid", "navia-floating-launcher");
  launcher.setAttribute("aria-label", "打开 Navia 阅读助手");
  launcher.innerHTML = `
    <svg data-navia-launcher-svg="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
      <path d="M5 12a7 7 0 1 1 14 0c0 1.25-.33 2.42-.9 3.44M12 3v2.5M12 18v3" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M12 7.5l1.2 3.3 3.3 1.2-3.3 1.2-1.2 3.3-1.2-3.3-3.3-1.2 3.3-1.2 1.2-3.3z" fill="currentColor" stroke="none"></path>
    </svg>
    <span data-navia-launcher-dot="true"></span>
  `;
  Object.assign(launcher.style, {
    position: "fixed",
    width: "48px",
    height: "48px",
    border: "1.5px solid rgba(255, 255, 255, 0.55)",
    borderRadius: "15px",
    background: "rgba(255, 255, 255, 0.45)",
    color: "#013a33",
    boxShadow: "0 16px 40px rgba(5, 84, 75, 0.15), 0 2px 6px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.5)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    cursor: "grab",
    zIndex: "2147483646",
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });
  const svg = launcher.querySelector<SVGElement>("[data-navia-launcher-svg='true']");
  if (svg) Object.assign(svg.style, { width: "24px", height: "24px", transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)" });
  const dot = launcher.querySelector<HTMLElement>("[data-navia-launcher-dot='true']");
  if (dot) {
    Object.assign(dot.style, {
      position: "absolute",
      right: "3px",
      top: "3px",
      width: "8px",
      height: "8px",
      borderRadius: "999px",
      background: "#1c5e37",
      border: "2px solid #fff",
      boxShadow: "0 0 6px rgba(28, 94, 55, 0.5)"
    });
  }
  launcher.addEventListener("click", () => {
    if (launcher.dataset.naviaDragging === "true") return;
    const next = readSidebarState(documentRef);
    next.mode = next.mode === "expanded" ? "collapsed" : "expanded";
    writeSidebarState(documentRef, next);
    applyInPageSidebarLayout(documentRef, host, next);
  });
  bindLauncherDrag(documentRef, host, launcher);
  documentRef.body.append(launcher);
  return launcher;
}

function bindSidebarInteractions(documentRef: Document, host: HTMLElement, resizeHandle: HTMLElement): void {
  if (host.dataset.naviaInteractionsBound === "true") return;
  host.dataset.naviaInteractionsBound = "true";

  resizeHandle.addEventListener("pointerdown", (event) => {
    const view = documentRef.defaultView;
    if (!view) return;
    event.preventDefault();
    resizeHandle.setPointerCapture?.(event.pointerId);
    const startX = event.clientX;
    const start = readSidebarState(documentRef);
    const startWidth = start.width;
    const onMove = (moveEvent: PointerEvent) => {
      const next = { ...readSidebarState(documentRef), mode: "expanded" as SidebarMode };
      next.width = clampSidebarWidth(documentRef, startWidth + (startX - moveEvent.clientX));
      next.layoutMode = resolveLayoutMode(documentRef, next.width);
      writeSidebarState(documentRef, next);
      applyInPageSidebarLayout(documentRef, host, next);
    };
    const onUp = () => {
      view.removeEventListener("pointermove", onMove);
      view.removeEventListener("pointerup", onUp);
    };
    view.addEventListener("pointermove", onMove);
    view.addEventListener("pointerup", onUp, { once: true });
  });

  documentRef.defaultView?.addEventListener("resize", () => {
    const next = readSidebarState(documentRef);
    next.width = clampSidebarWidth(documentRef, next.width);
    next.layoutMode = resolveLayoutMode(documentRef, next.width);
    writeSidebarState(documentRef, next);
    applyInPageSidebarLayout(documentRef, host, next);
  });
}

function bindLauncherDrag(documentRef: Document, host: HTMLElement, launcher: HTMLButtonElement): void {
  launcher.addEventListener("pointerdown", (event) => {
    const view = documentRef.defaultView;
    if (!view) return;
    launcher.setPointerCapture?.(event.pointerId);
    launcher.style.cursor = "grabbing";
    const startX = event.clientX;
    const startY = event.clientY;
    const state = readSidebarState(documentRef);
    const startTop = launcherTopPx(documentRef, state);
    let dragged = false;
    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 5) dragged = true;
      const next = readSidebarState(documentRef);
      next.launcherTopRatio = clampLauncherTopRatio(documentRef, startTop + dy);
      next.launcherSide = moveEvent.clientX < view.innerWidth / 2 ? "left" : "right";
      writeSidebarState(documentRef, next);
      applyInPageSidebarLayout(documentRef, host, next);
    };
    const onUp = () => {
      launcher.dataset.naviaDragging = dragged ? "true" : "false";
      launcher.style.cursor = "grab";
      view.removeEventListener("pointermove", onMove);
      view.removeEventListener("pointerup", onUp);
      view.setTimeout(() => {
        launcher.dataset.naviaDragging = "false";
      }, 0);
    };
    view.addEventListener("pointermove", onMove);
    view.addEventListener("pointerup", onUp, { once: true });
  });
}

function applyInPageSidebarLayout(documentRef: Document, host: HTMLElement, state: SidebarInteractionState): void {
  const width = clampSidebarWidth(documentRef, state.width);
  const layoutMode = resolveLayoutMode(documentRef, width);
  const mode = state.mode;
  const nextState = { ...state, width, layoutMode };
  writeSidebarState(documentRef, nextState);
  documentRef.documentElement.style.setProperty("--navia-inpage-sidebar-width", `${width}px`);
  host.dataset.naviaMode = mode;
  host.dataset.naviaLayout = layoutMode;
  host.style.width = `${width}px`;
  host.style.transform = mode === "collapsed" ? `translateX(${width + IN_PAGE_SIDEBAR_INSET * 2}px)` : "translateX(0)";
  host.style.opacity = mode === "collapsed" ? "0" : "1";
  host.style.boxShadow = mode === "collapsed" ? "none" : "-22px 0 62px rgba(5, 84, 75, 0.16), -6px 0 18px rgba(4, 24, 21, 0.07), inset 1px 0 0 rgba(255,255,255,0.66)";
  host.style.pointerEvents = mode === "collapsed" ? "none" : "auto";
  const frame = host.querySelector<HTMLIFrameElement>("[data-testid='navia-inpage-sidebar-frame']");
  if (frame) frame.tabIndex = mode === "collapsed" ? -1 : 0;
  const launcher = documentRef.getElementById(IN_PAGE_LAUNCHER_ID);
  if (launcher instanceof HTMLElement) {
    const top = launcherTopPx(documentRef, nextState);
    launcher.style.top = `${top}px`;
    launcher.dataset.naviaMode = mode;
    launcher.dataset.naviaSide = nextState.launcherSide;
    if (nextState.launcherSide === "left") {
      launcher.style.left = mode === "collapsed" ? "0px" : `${IN_PAGE_SIDEBAR_INSET + 12}px`;
      launcher.style.right = "";
      launcher.style.setProperty("--navia-launcher-transform", mode === "collapsed" ? "translateX(-28px) scale(0.84)" : "scale(1)");
      launcher.style.setProperty("--navia-launcher-peek-transform", "translateX(0px)");
    } else {
      launcher.style.left = "";
      const rightWhenExpanded = mode === "expanded" ? width + IN_PAGE_SIDEBAR_INSET + 34 : 0;
      launcher.style.right = `${rightWhenExpanded}px`;
      launcher.style.setProperty("--navia-launcher-transform", mode === "collapsed" ? "translateX(28px) scale(0.84)" : "scale(1)");
      launcher.style.setProperty("--navia-launcher-peek-transform", "translateX(0px)");
    }
    launcher.style.opacity = mode === "expanded" ? "0.94" : "0.86";
    launcher.setAttribute("aria-label", mode === "expanded" ? "折叠 Navia 阅读助手" : "打开 Navia 阅读助手");
  }
  if (!documentRef.body.hasAttribute("data-navia-original-margin-right")) {
    documentRef.body.dataset.naviaOriginalMarginRight = documentRef.body.style.marginRight || "";
  }
  const shouldPush = mode === "expanded" && layoutMode === "push";
  documentRef.body.style.marginRight = shouldPush
    ? `calc(${documentRef.body.dataset.naviaOriginalMarginRight || "0px"} + var(--navia-inpage-sidebar-width) + ${IN_PAGE_SIDEBAR_INSET * 2}px)`
    : documentRef.body.dataset.naviaOriginalMarginRight || "";
}

function readSidebarState(documentRef: Document): SidebarInteractionState {
  const parsed = safeParse(readStoredSidebarState(documentRef));
  const width = typeof parsed.width === "number" ? parsed.width : IN_PAGE_SIDEBAR_DEFAULT_WIDTH;
  const mode = parsed.mode === "expanded" ? "expanded" : SIDEBAR_DEFAULT_MODE;
  const launcherSide = parsed.launcherSide === "left" ? "left" : "right";
  const launcherTopRatio = typeof parsed.launcherTopRatio === "number" ? parsed.launcherTopRatio : LAUNCHER_DEFAULT_TOP;
  const clampedWidth = clampSidebarWidth(documentRef, width);
  return {
    mode,
    width: clampedWidth,
    layoutMode: resolveLayoutMode(documentRef, clampedWidth),
    launcherTopRatio: Math.min(0.9, Math.max(0.12, launcherTopRatio)),
    launcherSide
  };
}

function writeSidebarState(documentRef: Document, state: SidebarInteractionState): void {
  try {
    documentRef.defaultView?.localStorage?.setItem(SIDEBAR_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Some embedded or restricted page contexts deny localStorage. UI state can safely fall back to defaults.
  }
}

function readStoredSidebarState(documentRef: Document): string | null {
  try {
    return documentRef.defaultView?.localStorage?.getItem(SIDEBAR_STATE_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function safeParse(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function clampSidebarWidth(documentRef: Document, width: number): number {
  const viewportWidth = documentRef.defaultView?.innerWidth ?? 1200;
  const max = Math.max(IN_PAGE_SIDEBAR_MIN_WIDTH, Math.floor(viewportWidth * IN_PAGE_SIDEBAR_MAX_VIEWPORT_RATIO));
  return Math.min(max, Math.max(IN_PAGE_SIDEBAR_MIN_WIDTH, Math.floor(width)));
}

function resolveLayoutMode(documentRef: Document, width: number): SidebarLayoutMode {
  const viewportWidth = documentRef.defaultView?.innerWidth ?? 1200;
  if (viewportWidth < IN_PAGE_NARROW_OVERLAY_WIDTH) return "overlay";
  return width / viewportWidth > IN_PAGE_SIDEBAR_OVERLAY_RATIO ? "overlay" : "push";
}

function launcherTopPx(documentRef: Document, state: Pick<SidebarInteractionState, "launcherTopRatio">): number {
  const viewportHeight = documentRef.defaultView?.innerHeight ?? 800;
  return Math.round(Math.min(viewportHeight - 72, Math.max(24, viewportHeight * state.launcherTopRatio)));
}

function clampLauncherTopRatio(documentRef: Document, topPx: number): number {
  const viewportHeight = documentRef.defaultView?.innerHeight ?? 800;
  const clamped = Math.min(viewportHeight - 72, Math.max(24, topPx));
  return clamped / viewportHeight;
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
