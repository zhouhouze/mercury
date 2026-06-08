import { beforeEach, describe, expect, it } from "vitest";
import {
  clampPanelWidth,
  createMermaidArtifactElement,
  getPanelLayoutMode,
  mountNaviaInjectedPanel
} from "./injectedPanel";

async function waitFor(assertion: () => void, timeoutMs = 1000) {
  const started = Date.now();
  let lastError: unknown;
  while (Date.now() - started < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  if (lastError) throw lastError;
}

describe("injected panel layout", () => {
  beforeEach(() => {
    document.documentElement.style.marginLeft = "";
    document.documentElement.style.marginRight = "";
    document.documentElement.style.transition = "";
    document.body.innerHTML = "";
    document.querySelector("#navia-injected-host")?.remove();
    localStorage.clear();
  });

  it("keeps push mode below the PRD overlay threshold", () => {
    expect(getPanelLayoutMode(500, 1200, "push")).toBe("push");
  });

  it("enters overlay mode above 52vw", () => {
    expect(getPanelLayoutMode(700, 1200, "push")).toBe("overlay");
  });

  it("returns to push mode below 48vw", () => {
    expect(getPanelLayoutMode(560, 1200, "overlay")).toBe("push");
  });

  it("uses overlay mode on small viewports", () => {
    expect(getPanelLayoutMode(440, 800, "push")).toBe("overlay");
  });

  it("clamps width to 440px and 80vw", () => {
    expect(clampPanelWidth(200, 1200)).toBe(440);
    expect(clampPanelWidth(1200, 1200)).toBe(960);
  });

  it("mounts an in-page host and can open/collapse through its controller", () => {
    document.body.innerHTML = "<main><h1>Fixture</h1><p>Realistic page text.</p></main>";
    const controller = mountNaviaInjectedPanel();
    expect(controller).not.toBeNull();

    const host = document.querySelector("#navia-injected-host");
    const frame = host?.shadowRoot?.querySelector<HTMLElement>("[data-testid='navia-frame']");
    expect(frame?.dataset.open).toBe("false");

    controller?.open();
    expect(frame?.dataset.open).toBe("true");

    controller?.close();
    expect(frame?.dataset.open).toBe("false");
  });

  it("renders a single-column shell with the debug toggle in the header", () => {
    document.body.innerHTML = "<main><h1>Fixture</h1><p>Realistic page text.</p></main>";
    mountNaviaInjectedPanel();

    const root = document.querySelector("#navia-injected-host")?.shadowRoot;
    expect(root?.querySelector(".navia-rail")).toBeNull();
    expect(root?.querySelector(".navia-tools")).toBeNull();
    expect(root?.querySelector("[data-testid='navia-debug-toggle']")).not.toBeNull();
    expect(root?.querySelector("[data-testid='navia-chat-title']")).not.toBeNull();
    expect(root?.querySelector("[data-testid='navia-composer-container']")).not.toBeNull();
  });

  it("auto-grows the composer textarea and toggles debug view from the header", () => {
    document.body.innerHTML = "<main><h1>Fixture</h1><p>Realistic page text.</p></main>";
    mountNaviaInjectedPanel();

    const root = document.querySelector("#navia-injected-host")?.shadowRoot;
    const input = root?.querySelector<HTMLTextAreaElement>("[data-testid='navia-input']");
    const debugPane = root?.querySelector<HTMLElement>("[data-testid='navia-debug-pane']");
    const debugToggle = root?.querySelector<HTMLButtonElement>("[data-testid='navia-debug-toggle']");

    expect(input).not.toBeNull();
    const originalHeight = input?.style.height ?? "";
    if (input) {
      input.value = "第一行\n第二行\n第三行";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      expect(input.style.height).not.toBe(originalHeight);
      expect(Number.parseInt(input.style.height, 10)).toBeLessThanOrEqual(160);
    }

    expect(debugPane?.classList.contains("is-visible")).toBe(false);
    debugToggle?.click();
    expect(debugPane?.classList.contains("is-visible")).toBe(true);
    expect(debugToggle?.getAttribute("aria-pressed")).toBe("true");
  });

  it("retains the mermaid artifact helper for rendered message cards", () => {
    document.body.innerHTML = "<main><h1>Fixture</h1><p>Realistic page text.</p></main>";
    const element = createMermaidArtifactElement(
      {
        artifactId: "art_123",
        type: "mindmap",
        turnId: "turn_123",
        toolCallId: "tc_123",
        content: "mindmap\n  root((Navia))",
        metadata: { format: "mermaid" }
      },
      "chrome-extension://navia/mermaid-renderer.html"
    );

    const iframe = element.querySelector<HTMLIFrameElement>("iframe.navia-mermaid-frame");
    expect(element.classList.contains("navia-artifact-viewer")).toBe(true);
    expect(element.dataset.rendered).toBe("pending");
    expect(iframe?.src).toBe("chrome-extension://navia/mermaid-renderer.html");
    expect(element.querySelector("details.navia-mermaid-source")).toBeNull();
  });

  it("does not expose source fallback in the mermaid renderer failure state", async () => {
    document.body.innerHTML = "<main><h1>Fixture</h1><p>Realistic page text.</p></main>";
    const element = createMermaidArtifactElement(
      {
        artifactId: "art_fail",
        type: "mindmap",
        turnId: "turn_fail",
        toolCallId: "tc_fail",
        content: "mindmap\n  root((Navia))",
        metadata: { format: "mermaid" }
      },
      "chrome-extension://navia/mermaid-renderer.html"
    );

    const iframe = element.querySelector<HTMLIFrameElement>("iframe.navia-mermaid-frame");
    expect(iframe).not.toBeNull();

    iframe?.dispatchEvent(new Event("load"));
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "navia.mermaidRendered", artifactId: "art_fail", status: "failed", message: "Mermaid render failed" },
        source: iframe?.contentWindow ?? window,
        origin: "chrome-extension://navia"
      })
    );

    await waitFor(() => {
      expect(element.dataset.rendered).toBe("false");
    });
    expect(element.textContent).not.toContain("root((Navia))");
    expect(element.textContent).toContain("Mermaid render failed");
  });
});
