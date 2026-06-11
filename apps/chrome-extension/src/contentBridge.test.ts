import { describe, expect, it } from "vitest";
import {
  cleanupLegacyInjectedPanel,
  createPageContextMessageHandler,
  initializeContentBridge,
  LEGACY_INJECTED_HOST_ID,
  PAGE_CONTEXT_MESSAGE_TYPE
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
});
