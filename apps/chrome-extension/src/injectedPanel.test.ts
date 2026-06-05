import { beforeEach, describe, expect, it } from "vitest";
import {
  clampPanelWidth,
  createMermaidArtifactElement,
  getPanelLayoutMode,
  mountNaviaInjectedPanel
} from "./injectedPanel";

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

  it("exposes the V1.1 semantic structure without removing existing test anchors", () => {
    document.body.innerHTML = "<main><h1>Fixture</h1><p>Realistic page text.</p></main>";
    mountNaviaInjectedPanel();

    const host = document.querySelector("#navia-injected-host");
    const root = host?.shadowRoot;
    const frame = root?.querySelector<HTMLElement>("[data-testid='navia-frame']");
    expect(frame?.dataset.runtime).toBe("checking");
    expect(frame?.dataset.submitted).toBe("false");
    expect(frame?.dataset.pageState).toBe("missing");
    expect(frame?.dataset.stream).toBe("idle");
    expect(frame?.dataset.widthState).toBe("narrow");
    expect(frame?.dataset.error).toBe("false");
    expect(frame?.dataset.activeTool).toBe("chat");
    expect(root?.querySelector(".navia-floating-entry [data-testid='navia-ball']")).not.toBeNull();
    expect(root?.querySelector(".navia-floating-entry [data-testid='navia-hover-strip']")).not.toBeNull();
    expect(root?.querySelector(".navia-panel-shell[data-testid='navia-panel']")).not.toBeNull();
    expect(root?.querySelector(".navia-left-rail [data-testid='navia-collapse']")).not.toBeNull();
    expect(root?.querySelector(".navia-chat-workspace [data-testid='navia-messages']")).not.toBeNull();
    expect(root?.querySelector("[data-testid='navia-chat-pane']")).not.toBeNull();
    expect(root?.querySelector("[data-testid='navia-debug-pane']")).not.toBeNull();
    expect(root?.querySelector("[data-testid='navia-tool-chat']")?.classList.contains("active")).toBe(true);
    expect(root?.querySelectorAll(".navia-tool-dock .navia-tool:disabled").length).toBeGreaterThan(0);
    expect(root?.querySelector("[data-testid='navia-state-banner']")?.textContent).toContain("Runtime");
  });

  it("moves diagnostic content behind the Debug tool tab", () => {
    document.body.innerHTML = "<main><h1>Fixture</h1><p>Realistic page text.</p></main>";
    mountNaviaInjectedPanel();

    const root = document.querySelector("#navia-injected-host")?.shadowRoot;
    const frame = root?.querySelector<HTMLElement>("[data-testid='navia-frame']");
    expect(frame?.dataset.activeTool).toBe("chat");
    expect(root?.querySelector<HTMLElement>("[data-testid='navia-chat-pane']")?.classList.contains("navia-chat-pane")).toBe(true);

    root?.querySelector<HTMLButtonElement>("[data-testid='navia-tool-debug']")?.click();
    expect(frame?.dataset.activeTool).toBe("debug");
    expect(root?.querySelector("[data-testid='navia-debug-pane'] [data-testid='navia-page']")).not.toBeNull();
    expect(root?.querySelector("[data-testid='navia-debug-pane'] [data-testid='navia-state-banner']")).not.toBeNull();
    expect(root?.querySelector("[data-testid='navia-debug-pane'] [data-testid='navia-structured-json']")?.textContent).toContain("StructuredPageContext");
    expect(root?.querySelector("[data-testid='navia-debug-read-page']")).not.toBeNull();
    expect(root?.querySelector("[data-testid='navia-tool-debug']")?.classList.contains("active")).toBe(true);

    root?.querySelector<HTMLButtonElement>("[data-testid='navia-tool-chat']")?.click();
    expect(frame?.dataset.activeTool).toBe("chat");
  });

  it("keeps page-context actions disabled while the page context is missing", () => {
    document.body.innerHTML = "<main><h1>Fixture</h1><p>Realistic page text.</p></main>";
    mountNaviaInjectedPanel();

    const root = document.querySelector("#navia-injected-host")?.shadowRoot;
    expect(root?.querySelector<HTMLButtonElement>("[data-testid='navia-summary']")?.disabled).toBe(true);
    expect(root?.querySelector<HTMLButtonElement>("[data-testid='navia-mindmap']")?.disabled).toBe(true);
    expect(root?.querySelector<HTMLButtonElement>("[data-testid='navia-send']")?.disabled).toBe(true);
    expect(root?.querySelector("[data-testid='navia-page']")?.textContent).toContain("尚未读取页面");
    expect(root?.querySelector("[data-testid='navia-chat-notice']")?.textContent).toMatch(/Runtime|读取当前页面/);
  });

  it("offers a PRD chat toolbar with reading actions and new chat", () => {
    document.body.innerHTML = "<main><h1>Fixture</h1><p>Realistic page text.</p></main>";
    mountNaviaInjectedPanel();

    const root = document.querySelector("#navia-injected-host")?.shadowRoot;
    expect(root?.querySelector("[data-testid='navia-chat-pane'] .navia-chat-toolbar")).not.toBeNull();
    expect(root?.querySelector("[data-testid='navia-read-page']")?.textContent).toContain("读取");
    expect(root?.querySelector("[data-testid='navia-summary']")?.textContent).toContain("总结");
    expect(root?.querySelector("[data-testid='navia-mindmap']")?.textContent).toContain("Mindmap");
    expect(root?.querySelector("[data-testid='navia-new-chat']")?.textContent).toContain("新对话");
  });

  it("marks offline and error states with visible recovery copy", async () => {
    document.body.innerHTML = "<main><h1>Fixture</h1><p>Realistic page text.</p></main>";
    mountNaviaInjectedPanel();

    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = document.querySelector("#navia-injected-host")?.shadowRoot;
    const frame = root?.querySelector<HTMLElement>("[data-testid='navia-frame']");
    expect(frame?.dataset.runtime).toBe("offline");
    expect(frame?.dataset.error).toBe("true");
    expect(root?.querySelector("[data-testid='navia-state-banner']")?.textContent).toMatch(/Runtime|Local Runtime/);
  });

  it("renders Mermaid artifacts through an extension iframe with source fallback", () => {
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
    const source = element.querySelector("details.navia-mermaid-source pre");
    expect(element.classList.contains("navia-artifact-viewer")).toBe(true);
    expect(element.dataset.rendered).toBe("pending");
    expect(iframe?.src).toBe("chrome-extension://navia/mermaid-renderer.html");
    expect(source?.textContent).toContain("root((Navia))");
  });
});
