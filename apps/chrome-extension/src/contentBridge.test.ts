import { describe, expect, it } from "vitest";
import {
  cleanupLegacyInjectedPanel,
  createPageContextMessageHandler,
  initializeContentBridge,
  JUMPBACK_MESSAGE_TYPE,
  LEGACY_INJECTED_HOST_ID,
  PAGE_CONTEXT_MESSAGE_TYPE,
  performJumpback
} from "./contentBridge";

describe("content page context bridge", () => {
  it("removes a legacy injected panel host during initialization", () => {
    const legacyHost = document.createElement("div");
    legacyHost.id = LEGACY_INJECTED_HOST_ID;
    document.documentElement.append(legacyHost);

    const listeners: Array<Parameters<typeof chrome.runtime.onMessage.addListener>[0]> = [];
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      runtime: {
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
    expect(listeners).toHaveLength(1);
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
