import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupLegacyInjectedPanel,
  createPageContextMessageHandler,
  ensureInPageSidebar,
  initializeContentBridge,
  IN_PAGE_LAUNCHER_ID,
  IN_PAGE_SIDEBAR_HOST_ID,
  JUMPBACK_MESSAGE_TYPE,
  LEGACY_INJECTED_HOST_ID,
  PAGE_CONTEXT_MESSAGE_TYPE,
  performJumpback
} from "./contentBridge";

describe("content page context bridge", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("data-navia-content-bridge-ready");
    document.body.removeAttribute("style");
    document.body.removeAttribute("data-navia-original-margin-right");
    window.localStorage.removeItem("navia.inpageSidebarState");
  });

  it("removes a legacy injected panel host during initialization", () => {
    const legacyHost = document.createElement("div");
    legacyHost.id = LEGACY_INJECTED_HOST_ID;
    document.documentElement.append(legacyHost);

    const listeners: Array<Parameters<typeof chrome.runtime.onMessage.addListener>[0]> = [];
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      runtime: {
        getURL(path: string) {
          return `chrome-extension://navia/${path}`;
        },
        onMessage: {
          addListener(listener: Parameters<typeof chrome.runtime.onMessage.addListener>[0]) {
            listeners.push(listener);
          }
        }
      }
    } as typeof chrome;

    try {
      initializeContentBridge(document, "https://example.com");
    } finally {
      globalThis.chrome = originalChrome;
    }

    expect(document.getElementById(LEGACY_INJECTED_HOST_ID)).toBeNull();
    expect(document.getElementById(IN_PAGE_SIDEBAR_HOST_ID)).not.toBeNull();
    expect(listeners).toHaveLength(1);
  });

  it("injects the current V1 in-page right sidebar iframe", () => {
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      runtime: {
        getURL(path: string) {
          return `chrome-extension://navia/${path}`;
        }
      }
    } as typeof chrome;

    try {
      const host = ensureInPageSidebar(document);
      const launcher = document.getElementById(IN_PAGE_LAUNCHER_ID);
      expect(host?.id).toBe(IN_PAGE_SIDEBAR_HOST_ID);
      expect(host?.querySelector("iframe")?.getAttribute("src")).toBe("chrome-extension://navia/sidepanel.html?naviaInPage=1");
      expect(host?.dataset.naviaMode).toBe("collapsed");
      expect(document.body.style.marginRight).toBe("");
      expect(launcher).not.toBeNull();
      expect(launcher?.dataset.naviaMode).toBe("collapsed");
      expect(launcher?.style.getPropertyValue("--navia-launcher-transform")).toContain("translateX");
      expect(document.querySelector("[data-testid='navia-inpage-sidebar-edge-toggle']")).toBeNull();
      expect(ensureInPageSidebar(document)).toBe(host);
    } finally {
      globalThis.chrome = originalChrome;
    }
  });

  it("retries in-page sidebar injection when the content script runs before body exists", async () => {
    const earlyDocument = document.implementation.createHTMLDocument("early");
    earlyDocument.documentElement.removeChild(earlyDocument.body);
    const listeners: Array<Parameters<typeof chrome.runtime.onMessage.addListener>[0]> = [];
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      runtime: {
        getURL(path: string) {
          return `chrome-extension://navia/${path}`;
        },
        onMessage: {
          addListener(listener: Parameters<typeof chrome.runtime.onMessage.addListener>[0]) {
            listeners.push(listener);
          }
        }
      }
    } as typeof chrome;

    try {
      initializeContentBridge(earlyDocument, "https://example.com");
      expect(earlyDocument.getElementById(IN_PAGE_SIDEBAR_HOST_ID)).toBeNull();

      const body = earlyDocument.createElement("body");
      earlyDocument.documentElement.append(body);
      earlyDocument.dispatchEvent(new Event("DOMContentLoaded"));
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      expect(earlyDocument.getElementById(IN_PAGE_SIDEBAR_HOST_ID)).not.toBeNull();
      expect(earlyDocument.getElementById(IN_PAGE_LAUNCHER_ID)).not.toBeNull();
      expect(listeners).toHaveLength(1);
    } finally {
      globalThis.chrome = originalChrome;
    }
  });

  it("does not bind duplicate runtime message listeners when injected more than once", () => {
    const listeners: Array<Parameters<typeof chrome.runtime.onMessage.addListener>[0]> = [];
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      runtime: {
        getURL(path: string) {
          return `chrome-extension://navia/${path}`;
        },
        onMessage: {
          addListener(listener: Parameters<typeof chrome.runtime.onMessage.addListener>[0]) {
            listeners.push(listener);
          }
        }
      }
    } as typeof chrome;

    try {
      initializeContentBridge(document, "https://example.com");
      initializeContentBridge(document, "https://example.com");

      expect(listeners).toHaveLength(1);
      expect(document.querySelectorAll("[data-testid='navia-inpage-sidebar']")).toHaveLength(1);
      expect(document.querySelectorAll("[data-testid='navia-floating-launcher']")).toHaveLength(1);
    } finally {
      globalThis.chrome = originalChrome;
    }
  });

  it("defaults to a docked launcher and expands the in-page sidebar through the launcher", () => {
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      runtime: {
        getURL(path: string) {
          return `chrome-extension://navia/${path}`;
        }
      }
    } as typeof chrome;

    try {
      const host = ensureInPageSidebar(document);
      const launcher = document.getElementById(IN_PAGE_LAUNCHER_ID);
      expect(host?.dataset.naviaMode).toBe("collapsed");
      expect(launcher?.dataset.naviaMode).toBe("collapsed");
      expect(document.body.style.marginRight).toBe("");

      launcher?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(host?.dataset.naviaMode).toBe("expanded");
      expect(launcher?.dataset.naviaMode).toBe("expanded");
      expect(document.body.style.marginRight).toContain("var(--navia-inpage-sidebar-width)");

      launcher?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(host?.dataset.naviaMode).toBe("collapsed");
      expect(launcher?.dataset.naviaMode).toBe("collapsed");
      expect(document.body.style.marginRight).toBe("");
    } finally {
      globalThis.chrome = originalChrome;
    }
  });

  it("switches to overlay layout for wide resized sidebars without pushing the page", () => {
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      runtime: {
        getURL(path: string) {
          return `chrome-extension://navia/${path}`;
        }
      }
    } as typeof chrome;

    try {
      window.localStorage.setItem(
        "navia.inpageSidebarState",
        JSON.stringify({ mode: "expanded", width: 760, launcherTopRatio: 0.5, launcherSide: "right" })
      );
      const host = ensureInPageSidebar(document);
      expect(host?.dataset.naviaLayout).toBe("overlay");
      expect(host?.dataset.naviaMode).toBe("collapsed");
      expect(document.body.style.marginRight).toBe("");
    } finally {
      window.localStorage.removeItem("navia.inpageSidebarState");
      globalThis.chrome = originalChrome;
    }
  });

  it("keeps the launcher visible when page storage is denied", () => {
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      runtime: {
        getURL(path: string) {
          return `chrome-extension://navia/${path}`;
        }
      }
    } as typeof chrome;
    const storageSpy = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Access is denied for this document.", "SecurityError");
    });

    try {
      const host = ensureInPageSidebar(document);
      expect(host).not.toBeNull();
      expect(document.getElementById(IN_PAGE_LAUNCHER_ID)).not.toBeNull();
      expect(host?.dataset.naviaMode).toBe("collapsed");
    } finally {
      storageSpy.mockRestore();
      globalThis.chrome = originalChrome;
    }
  });

  it("cleans up a legacy injected panel host directly", () => {
    const legacyHost = document.createElement("div");
    legacyHost.id = LEGACY_INJECTED_HOST_ID;
    document.documentElement.append(legacyHost);

    cleanupLegacyInjectedPanel(document);

    expect(document.getElementById(LEGACY_INJECTED_HOST_ID)).toBeNull();
  });

  it("returns extracted page context for navia.extractPageContext messages", () => {
    document.body.innerHTML = `
      <article>
        <h1>Readable article</h1>
        <h2>Section one</h2>
        <p>This page has enough visible text for the sidepanel bridge.</p>
      </article>
    `;
    document.title = "Bridge Fixture";

    let response: unknown;
    const handled = createPageContextMessageHandler(document, "https://example.com/posts/1")(
      { type: PAGE_CONTEXT_MESSAGE_TYPE },
      {} as chrome.runtime.MessageSender,
      (value) => {
        response = value;
      }
    );

    expect(handled).toBe(true);
    expect(response).toMatchObject({
      ok: true,
      context: {
        url: "https://example.com/posts/1",
        title: "Bridge Fixture",
        domain: "example.com"
      }
    });
    const context = (response as { ok: true; context: Record<string, unknown> }).context;
    expect(context.headings).toContainEqual({ level: 1, text: "Readable article" });
    expect(context.headings).toContainEqual({ level: 2, text: "Section one" });
    expect(String(context.visible_text)).toContain("sidepanel bridge");
    expect(String(context.cleaned_text)).toContain("sidepanel bridge");
  });

  it("ignores unrelated runtime messages", () => {
    let responseCalled = false;
    const handled = createPageContextMessageHandler(document, "https://example.com")(
      { type: "other.message" },
      {} as chrome.runtime.MessageSender,
      () => {
        responseCalled = true;
      }
    );

    expect(handled).toBe(false);
    expect(responseCalled).toBe(false);
  });

  it("returns a recoverable error response when page extraction fails", () => {
    let response: unknown;
    const handled = createPageContextMessageHandler(document, "not a valid url")(
      { type: PAGE_CONTEXT_MESSAGE_TYPE },
      {} as chrome.runtime.MessageSender,
      (value) => {
        response = value;
      }
    );

    expect(handled).toBe(true);
    expect(response).toMatchObject({
      ok: false
    });
    expect(String((response as { error: string }).error).length).toBeGreaterThan(0);
  });

  it("highlights source by selector for navia.jumpToSource messages", () => {
    document.body.innerHTML = `<article><p id="source-one">Navia extracts source mapped facts.</p></article>`;

    let response: unknown;
    const handled = createPageContextMessageHandler(document, "https://example.com")(
      { type: JUMPBACK_MESSAGE_TYPE, request: { selector: "#source-one", textQuote: "source mapped facts", fallbackText: "source mapped facts" } },
      {} as chrome.runtime.MessageSender,
      (value) => {
        response = value;
      }
    );

    expect(handled).toBe(true);
    expect(response).toMatchObject({ ok: true, result: { status: "highlighted", matchedStrategy: "selector" } });
    expect(document.querySelector("#source-one")?.getAttribute("data-navia-jumpback-highlight")).toBe("true");
  });

  it("falls back to textQuote when selector is unavailable", () => {
    document.body.innerHTML = `<article><p>这是一段可以通过文本证据定位的中文内容。</p></article>`;

    const result = performJumpback(document, {
      selector: "#missing-source",
      textQuote: "文本证据定位",
      fallbackText: "这是一段可以通过文本证据定位的中文内容。"
    });

    expect(result).toMatchObject({
      status: "highlighted",
      attemptedStrategies: ["selector", "textQuote"],
      matchedStrategy: "textQuote"
    });
    expect(document.querySelector("[data-navia-jumpback-highlight='true']")).not.toBeNull();
  });

  it("matches textQuote against enclosing element text when the quote spans nested text nodes", () => {
    document.body.innerHTML = `<article><section><p>Navia <strong>keeps source evidence</strong> traceable across rendering layers.</p></section></article>`;

    const result = performJumpback(document, {
      textQuote: "Navia keeps source evidence traceable across rendering layers.",
      fallbackText: "Navia keeps source evidence traceable across rendering layers."
    });

    expect(result).toMatchObject({
      status: "highlighted",
      matchedStrategy: "textQuote"
    });
    expect(document.querySelector("[data-navia-jumpback-highlight='true']")).not.toBeNull();
  });

  it("returns fallback_shown instead of fake success when no DOM match exists", () => {
    document.body.innerHTML = `<article><p>Visible page content.</p></article>`;

    const result = performJumpback(document, {
      selector: "#missing-source",
      textQuote: "unavailable quote",
      fallbackText: "Fallback evidence from SourceRef."
    });

    expect(result).toMatchObject({
      status: "fallback_shown",
      fallbackText: "Fallback evidence from SourceRef.",
      failureReason: "source_not_found_in_dom"
    });
    expect(document.querySelector("[data-navia-jumpback-highlight='true']")).toBeNull();
  });
});
