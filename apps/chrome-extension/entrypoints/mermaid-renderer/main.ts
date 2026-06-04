import mermaid from "mermaid";

type RenderRequest = {
  type: "navia.renderMermaid";
  artifactId: string;
  source: string;
};

const root = document.querySelector<HTMLElement>("#root")!;

mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
injectStyles();

window.addEventListener("message", (event) => {
  const data = event.data as Partial<RenderRequest>;
  if (data?.type !== "navia.renderMermaid") return;
  if (typeof data.artifactId !== "string" || typeof data.source !== "string") return;
  void renderMermaid(data.artifactId, data.source, event.origin);
});

async function renderMermaid(artifactId: string, source: string, targetOrigin: string) {
  const renderId = `navia_mermaid_${artifactId.replace(/\W/g, "_")}`;
  try {
    const result = await mermaid.render(renderId, source);
    root.dataset.rendered = "true";
    root.innerHTML = result.svg;
    window.parent.postMessage(
      { type: "navia.mermaidRendered", artifactId, status: "succeeded" },
      normalizeTargetOrigin(targetOrigin)
    );
  } catch (error) {
    root.dataset.rendered = "false";
    root.innerHTML = `<p class="error">Mermaid 渲染失败，已显示源码。</p><pre></pre>`;
    root.querySelector("pre")!.textContent = source;
    window.parent.postMessage(
      {
        type: "navia.mermaidRendered",
        artifactId,
        status: "failed",
        message: error instanceof Error ? error.message : "Mermaid render failed"
      },
      normalizeTargetOrigin(targetOrigin)
    );
  }
}

function normalizeTargetOrigin(origin: string) {
  return origin === "null" ? "*" : origin;
}

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    html, body {
      margin: 0;
      min-height: 100%;
      background: #ffffff;
      color: #172033;
      font: 13px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #root {
      min-height: 220px;
      overflow: auto;
      padding: 8px;
      box-sizing: border-box;
    }
    svg {
      max-width: 100%;
      height: auto;
    }
    .placeholder,
    .error {
      margin: 0 0 8px;
      color: #52606d;
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
  `;
  document.head.appendChild(style);
}
