import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArtifactInlineCard } from "../ArtifactInlineCard";

vi.mock("mermaid", () => ({
  default: {
    render: vi.fn(async () => ({ svg: "<svg><text>Source node</text></svg>" }))
  }
}));

const artifact = {
  artifactId: "art_jumpback",
  type: "mindmap",
  sourcePageId: "page_1",
  turnId: "turn_1",
  toolCallId: "tc_1",
  source: "page",
  content: "mindmap\n  root((Source node))",
  metadata: {
    format: "mermaid",
    nodeBindings: [
      {
        nodeId: "root",
        nodeSourceMapKey: "root",
        nodeLabel: "Source node",
        mermaidLineIndex: 1,
        sourceRefIds: ["src_1"],
        paragraphIds: ["pg_1"],
        chunkIds: ["ck_1"]
      }
    ],
    nodeSourceMap: {
      root: {
        nodeLabel: "Source node",
        sourceRefIds: ["src_1"],
        paragraphIds: ["pg_1"],
        chunkIds: ["ck_1"],
        textQuote: "Traceable source quote.",
        fallbackText: "Traceable source quote.",
        jumpback: { mode: "fallback", reason: "selector_missing" }
      }
    }
  }
};

const nestedArtifact = {
  ...artifact,
  artifactId: "art_nested",
  content: "mindmap\n  root((Root))\n    theme((Dense Theme))\n      leaf((Second Level Fact))",
  metadata: {
    ...artifact.metadata,
    nodeBindings: [
      {
        nodeId: "root",
        nodeSourceMapKey: "root",
        nodeLabel: "Root",
        mermaidLineIndex: 1,
        sourceRefIds: ["src_root"],
        paragraphIds: ["pg_root"],
        chunkIds: ["ck_root"]
      },
      {
        nodeId: "theme",
        nodeSourceMapKey: "theme",
        nodeLabel: "Dense Theme",
        mermaidLineIndex: 2,
        sourceRefIds: ["src_theme"],
        paragraphIds: ["pg_theme"],
        chunkIds: ["ck_theme"]
      },
      {
        nodeId: "leaf",
        nodeSourceMapKey: "leaf",
        nodeLabel: "Second Level Fact",
        mermaidLineIndex: 3,
        sourceRefIds: ["src_leaf"],
        paragraphIds: ["pg_leaf"],
        chunkIds: ["ck_leaf"]
      }
    ],
    nodeSourceMap: {
      root: {
        nodeLabel: "Root",
        sourceRefIds: ["src_root"],
        paragraphIds: ["pg_root"],
        chunkIds: ["ck_root"],
        textQuote: "Root quote.",
        fallbackText: "Root quote.",
        jumpback: { mode: "fallback", reason: "selector_missing" }
      },
      theme: {
        nodeLabel: "Dense Theme",
        sourceRefIds: ["src_theme"],
        paragraphIds: ["pg_theme"],
        chunkIds: ["ck_theme"],
        textQuote: "Theme quote.",
        fallbackText: "Theme quote.",
        jumpback: { mode: "fallback", reason: "selector_missing" }
      },
      leaf: {
        nodeLabel: "Second Level Fact",
        sourceRefIds: ["src_leaf"],
        paragraphIds: ["pg_leaf"],
        chunkIds: ["ck_leaf"],
        textQuote: "Leaf quote.",
        fallbackText: "Leaf quote.",
        jumpback: { mode: "fallback", reason: "selector_missing" }
      }
    }
  }
};

describe("ArtifactInlineCard jumpback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("sends a current-tab jumpback request when a source card is clicked", async () => {
    const sendMessage = vi.fn(async () => ({ ok: true, result: { status: "fallback_shown" } }));
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      tabs: {
        query: vi.fn(async () => [{ id: 7 }]),
        sendMessage
      }
    } as unknown as typeof chrome;

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(<ArtifactInlineCard artifact={artifact} />);
      });
      await act(async () => {
        await Promise.resolve();
      });

      const sourceButton = container.querySelector("[data-testid='mindmap-source-card-root']");
      expect(sourceButton).toBeTruthy();
      await act(async () => {
        sourceButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(sendMessage).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          type: "navia.jumpToSource",
          request: expect.objectContaining({
            nodeId: "root",
            sourceRefIds: ["src_1"],
            fallbackText: "Traceable source quote."
          })
        })
      );
    } finally {
      root.unmount();
      globalThis.chrome = originalChrome;
    }
  });

  it("keeps blocked jumpback status distinct from fallback evidence", async () => {
    const sendMessage = vi.fn(async () => ({ ok: true, result: { status: "blocked", failureReason: "no_traceable_source_evidence" } }));
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      tabs: {
        query: vi.fn(async () => [{ id: 7 }]),
        sendMessage
      }
    } as unknown as typeof chrome;

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(<ArtifactInlineCard artifact={artifact} />);
      });
      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        container.querySelector("[data-testid='mindmap-source-card-root']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(container.querySelector("[data-testid='mindmap-source-panel']")?.textContent).toContain("blocked");
      expect(container.querySelector("[data-testid='mindmap-source-panel']")?.textContent).toContain("no_traceable_source_evidence");
      expect(container.querySelector(".mindmap-source-evidence-blocked")).toBeTruthy();
    } finally {
      root.unmount();
      globalThis.chrome = originalChrome;
    }
  });

  it("renders Evidence Card Mindmap as the primary mindmap view", async () => {
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      tabs: {
        query: vi.fn(async () => [{ id: 7 }]),
        sendMessage: vi.fn(async () => ({ ok: true, result: { status: "highlighted" } }))
      }
    } as unknown as typeof chrome;

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(<ArtifactInlineCard artifact={artifact} />);
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(container.querySelector("[data-testid='evidence-card-mindmap']")).toBeTruthy();
      expect(container.querySelector("[data-testid='reading-map']")).toBeTruthy();
      expect(container.querySelector("[data-testid='reading-map-nav-root']")?.textContent).toContain("Source node");
      expect(container.querySelector("[data-testid='reading-map-detail']")?.textContent).toContain("Traceable source quote.");
      expect(container.querySelector("[data-testid='evidence-card-node-root']")?.textContent).toContain("Source node");
      expect(container.querySelector("[data-testid='mindmap-source-panel']")).toBeTruthy();

      await act(async () => {
        container.querySelector("[data-testid='evidence-card-node-root']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(container.querySelector("[data-testid='mindmap-source-evidence']")?.textContent).toContain("Traceable source quote.");
      expect(container.querySelector("[data-testid='reading-map-evidence']")?.textContent).toContain("Traceable source quote.");
    } finally {
      root.unmount();
      globalThis.chrome = originalChrome;
    }
  });

  it("collapses and expands second-level labels under a theme", async () => {
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      tabs: {
        query: vi.fn(async () => [{ id: 7 }]),
        sendMessage: vi.fn(async () => ({ ok: true, result: { status: "highlighted" } }))
      }
    } as unknown as typeof chrome;

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(<ArtifactInlineCard artifact={nestedArtifact} />);
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(container.querySelector("[data-testid='evidence-card-node-theme']")?.textContent).toContain("Dense Theme");
      expect(container.querySelector("[data-testid='reading-map-nav-theme']")?.textContent).toContain("Dense Theme");
      expect(container.querySelector("[data-testid='reading-map-nav-leaf']")?.textContent).toContain("Second Level Fact");
      expect(container.querySelector("[data-testid='evidence-card-node-leaf']")?.textContent).toContain("Second Level Fact");

      await act(async () => {
        container.querySelector("[data-testid='evidence-theme-toggle-theme']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(container.querySelector("[data-testid='evidence-card-node-theme']")?.textContent).toContain("Dense Theme");
      expect(container.querySelector("[data-testid='evidence-card-node-leaf']")).toBeFalsy();

      await act(async () => {
        container.querySelector("[data-testid='evidence-theme-toggle-theme']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(container.querySelector("[data-testid='evidence-card-node-leaf']")?.textContent).toContain("Second Level Fact");
    } finally {
      root.unmount();
      globalThis.chrome = originalChrome;
    }
  });
});
