import { extractPageContext, type ExtractedPageContext } from "./pageContext";
import {
  clampPanelWidth as clampPanelWidthByRule,
  resolveLayoutMode,
  type LayoutMode
} from "./panelLayout";
import type { AgentEvent } from "./sse";
import {
  checkRuntimeHealth,
  clearLastSessionId,
  createRuntimeSession,
  getLastSessionId,
  restoreMessages,
  restoreRuntimeSession,
  streamRuntimeChat,
  submitRuntimePageContext,
  type ArtifactRecord,
  type ChatMessage,
  type ChatRole,
  type RuntimeStatus,
  type StructuredPageDebug
} from "./runtimeClient";

const HOST_ID = "navia-injected-host";
const MIN_PANEL_WIDTH = 440;
const MERMAID_RENDERER_PAGE = "mermaid-renderer.html";

type ActiveTool = "chat" | "debug";
type PanelState = {
  open: boolean;
  side: "left" | "right";
  width: number;
  activeTool: ActiveTool;
  runtimeStatus: RuntimeStatus;
  sessionId: string | null;
  pageContext: ExtractedPageContext | null;
  structuredPageDebug: StructuredPageDebug | null;
  pageSubmitted: boolean;
  statusText: string;
  streamStatus: string;
  lastError: string | null;
};

type PanelWidthState = "narrow" | "half" | "overlay" | "mobile";

export function getPanelLayoutMode(width: number, viewportWidth: number, previousMode: LayoutMode = "push"): LayoutMode {
  return resolveLayoutMode(width, viewportWidth, previousMode);
}

export function clampPanelWidth(width: number, viewportWidth: number): number {
  return clampPanelWidthByRule(width, viewportWidth);
}

export type NaviaInjectedPanelController = {
  open: () => void;
  close: () => void;
};

export function getMermaidRendererUrl(): string {
  return typeof chrome !== "undefined" && chrome.runtime?.getURL
    ? chrome.runtime.getURL(MERMAID_RENDERER_PAGE)
    : MERMAID_RENDERER_PAGE;
}

export function createMermaidArtifactElement(
  artifact: ArtifactRecord,
  rendererUrl: string = getMermaidRendererUrl()
): HTMLElement {
  const artifactEl = document.createElement("div");
  artifactEl.className = "navia-artifact navia-artifact-viewer";
  artifactEl.dataset.rendered = "pending";
  artifactEl.dataset.artifactId = artifact.artifactId;

  const iframe = document.createElement("iframe");
  iframe.className = "navia-mermaid-frame";
  iframe.title = "Mermaid mindmap";
  iframe.src = rendererUrl;
  iframe.addEventListener("load", () => {
    iframe.contentWindow?.postMessage(
      {
        type: "navia.renderMermaid",
        artifactId: artifact.artifactId,
        source: artifact.content
      },
      "*"
    );
  });

  artifactEl.append(iframe);

  const onMessage = (event: MessageEvent) => {
    if (iframe.contentWindow && event.source && event.source !== iframe.contentWindow) return;
    const data = event.data as { type?: string; artifactId?: string; status?: string; message?: string };
    if (data.type !== "navia.mermaidRendered" || data.artifactId !== artifact.artifactId) return;
    artifactEl.dataset.rendered = data.status === "succeeded" ? "true" : "false";
    if (data.status !== "succeeded") {
      const message = data.message ?? "Mermaid render failed";
      artifactEl.title = message;
      const errorEl = document.createElement("p");
      errorEl.className = "navia-mermaid-error";
      errorEl.textContent = message;
      artifactEl.append(errorEl);
    }
    window.removeEventListener("message", onMessage);
  };
  window.addEventListener("message", onMessage);

  return artifactEl;
}

export function mountNaviaInjectedPanel(): NaviaInjectedPanelController | null {
  if (document.getElementById(HOST_ID)) return null;
  if (!/^https?:|^file:/.test(window.location.href)) return null;

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  const state: PanelState = {
    open: false,
    side: "right",
    width: clampPanelWidth(MIN_PANEL_WIDTH, window.innerWidth),
    activeTool: "chat",
    runtimeStatus: "checking",
    sessionId: null,
    pageContext: null,
    structuredPageDebug: null,
    pageSubmitted: false,
    statusText: "正在检查 Runtime...",
    streamStatus: "idle",
    lastError: null
  };
  const messages: ChatMessage[] = [
    { id: newId(), role: "system", text: "展开后读取当前页面，即可开始网页伴读。" }
  ];
  const mermaidArtifactCache = new Map<string, { content: string; element: HTMLElement }>();
  let layoutMode: LayoutMode = "push";
  let restoreLayout: (() => void) | null = null;

  root.innerHTML = `${styles()}${markup()}`;

  const frame = root.querySelector<HTMLElement>("[data-testid='navia-frame']")!;
  const panel = root.querySelector<HTMLElement>("[data-testid='navia-panel']")!;
  const resizeHandle = root.querySelector<HTMLElement>("[data-testid='navia-resize-handle']")!;
  const reconnectButton = root.querySelector<HTMLButtonElement>("[data-testid='navia-reconnect']")!;
  const debugReconnectButton = root.querySelector<HTMLButtonElement>("[data-testid='navia-debug-reconnect']")!;
  const chatToolButton = root.querySelector<HTMLButtonElement>("[data-testid='navia-tool-chat']")!;
  const debugToggleButton = root.querySelector<HTMLButtonElement>("[data-testid='navia-debug-toggle']")!;
  const pageButton = root.querySelector<HTMLButtonElement>("[data-testid='navia-read-page']")!;
  const debugPageButton = root.querySelector<HTMLButtonElement>("[data-testid='navia-debug-read-page']")!;
  const summaryButton = root.querySelector<HTMLButtonElement>("[data-testid='navia-summary']")!;
  const debugSummaryButton = root.querySelector<HTMLButtonElement>("[data-testid='navia-debug-summary']")!;
  const mindmapButton = root.querySelector<HTMLButtonElement>("[data-testid='navia-mindmap']")!;
  const debugMindmapButton = root.querySelector<HTMLButtonElement>("[data-testid='navia-debug-mindmap']")!;
  const newChatButton = root.querySelector<HTMLButtonElement>("[data-testid='navia-new-chat']")!;
  const sendButton = root.querySelector<HTMLButtonElement>("[data-testid='navia-send']")!;
  const input = root.querySelector<HTMLTextAreaElement>("[data-testid='navia-input']")!;
  const messagesEl = root.querySelector<HTMLElement>("[data-testid='navia-messages']")!;
  const statusEl = root.querySelector<HTMLElement>("[data-testid='navia-status']")!;
  const pageEl = root.querySelector<HTMLElement>("[data-testid='navia-page']")!;
  const stateBannerEl = root.querySelector<HTMLElement>("[data-testid='navia-state-banner']")!;
  const chatNoticeEl = root.querySelector<HTMLElement>("[data-testid='navia-chat-notice']")!;
  const structuredJsonEl = root.querySelector<HTMLElement>("[data-testid='navia-structured-json']")!;

  reconnectButton.addEventListener("click", () => checkRuntime());
  debugReconnectButton.addEventListener("click", () => checkRuntime());
  debugToggleButton.addEventListener("click", () => setActiveTool(state.activeTool === "debug" ? "chat" : "debug"));
  pageButton.addEventListener("click", () => captureAndSubmitPage());
  debugPageButton.addEventListener("click", () => captureAndSubmitPage());
  summaryButton.addEventListener("click", () => sendChat("总结这篇文章"));
  debugSummaryButton.addEventListener("click", () => sendChat("总结这篇文章"));
  mindmapButton.addEventListener("click", () => sendChat("生成 Mermaid 思维导图"));
  debugMindmapButton.addEventListener("click", () => sendChat("生成 Mermaid 思维导图"));
  newChatButton.addEventListener("click", () => resetChat());
  sendButton.addEventListener("click", () => sendChat(input.value));
  const autoGrowInput = () => {
    const fallbackHeight = Math.max(44, input.value.split("\n").length * 22 + 24);
    input.style.height = "auto";
    input.style.height = `${Math.min(Math.max(input.scrollHeight, fallbackHeight), 120)}px`;
  };
  input.addEventListener("input", autoGrowInput);
  autoGrowInput();
  input.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      sendChat(input.value);
    }
  });

  installResize();
  window.addEventListener("resize", () => {
    state.width = clampPanelWidth(state.width, window.innerWidth);
    render();
  });
  checkRuntime();
  render();
  return { open: openPanel, close: closePanel };

  function openPanel() {
    state.open = true;
    render();
    if (state.runtimeStatus === "online" && !state.pageSubmitted) {
      void captureAndSubmitPage();
      return;
    }
    if (state.runtimeStatus !== "online") {
      void checkRuntime().then(() => {
        if (state.runtimeStatus === "online" && !state.pageSubmitted) void captureAndSubmitPage();
      });
    }
  }

  function closePanel() {
    state.open = false;
    restorePageLayout();
    render();
  }

  function setActiveTool(tool: ActiveTool) {
    state.activeTool = tool;
    render();
  }

  async function resetChat() {
    state.sessionId = null;
    state.pageContext = null;
    state.structuredPageDebug = null;
    state.pageSubmitted = false;
    state.streamStatus = "idle";
    state.lastError = null;
    state.statusText = state.runtimeStatus === "online" ? "已新建会话" : state.statusText;
    messages.splice(0, messages.length, { id: newId(), role: "system", text: "新会话已创建。读取当前页面后即可继续网页伴读。" });
    input.value = "";
    autoGrowInput();
    if (state.runtimeStatus === "online") {
      state.sessionId = await createRuntimeSession("injected-panel");
    }
    render();
  }

  async function checkRuntime() {
    state.runtimeStatus = "checking";
    state.statusText = "正在检查 Runtime...";
    state.lastError = null;
    render();
    try {
      const online = await checkRuntimeHealth();
      state.runtimeStatus = online ? "online" : "offline";
      state.statusText = online ? "Runtime online" : "Runtime offline";
      if (online) await restoreLastSession();
    } catch {
      state.runtimeStatus = "offline";
      state.statusText = "Runtime offline，请启动本地服务";
      state.lastError = "Local Runtime 未连接，启动后点击重连。";
    }
    render();
  }

  async function ensureSession() {
    if (state.sessionId) return state.sessionId;
    const id = await createRuntimeSession("injected-panel");
    state.sessionId = id;
    return id;
  }

  async function restoreLastSession() {
    const lastSessionId = await getLastSessionId();
    if (!lastSessionId) return;
    try {
      const restored = await restoreRuntimeSession(lastSessionId);
      if (!restored) return;
      if (restored.activePage && !isSamePageUrl(restored.activePage.url, window.location.href)) {
        await clearLastSessionId();
        state.sessionId = null;
        state.pageContext = null;
        state.pageSubmitted = false;
        state.statusText = "最近 session 与当前页面不匹配，请重新读取页面。";
        return;
      }
      state.sessionId = restored.session_id;
      if (restored.activePage) {
        state.pageContext = {
          url: restored.activePage.url,
          title: restored.activePage.title,
          domain: restored.activePage.domain,
          captured_at: restored.activePage.captured_at ?? new Date().toISOString(),
          headings: [],
          visible_text: "",
          cleaned_text: ""
        };
        state.pageSubmitted = true;
        state.statusText = `已恢复：${restored.activePage.title}`;
      }
      const restoredMessages = restoreMessages(restored);
      if (restoredMessages.length > 0) messages.splice(0, messages.length, ...restoredMessages);
    } catch {
      state.statusText = "最近 session 恢复失败";
    }
  }

  async function captureAndSubmitPage() {
    if (state.runtimeStatus !== "online") {
      state.statusText = "Runtime offline，无法提交页面上下文";
      state.lastError = "Runtime offline，无法读取并提交当前页面。";
      render();
      return;
    }
    state.statusText = "正在读取当前页面...";
    state.lastError = null;
    render();
    try {
      const context = extractPageContext(document, window.location.href);
      state.pageContext = context;
      const sessionId = await ensureSession();
      const result = await submitRuntimePageContext(context, sessionId);
      state.pageSubmitted = result.ok;
      state.structuredPageDebug = result.structuredPage ?? null;
      state.statusText = result.ok ? `已提交页面：${context.title}` : result.message ?? "页面上下文提交失败";
    } catch (error) {
      state.pageSubmitted = false;
      state.statusText = `读取失败：${error instanceof Error ? error.message : "unknown error"}`;
      state.lastError = error instanceof Error ? error.message : "PageContext 读取失败。";
    }
    render();
  }

  async function sendChat(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (state.runtimeStatus !== "online") {
      appendMessage("system", "Runtime offline，请启动 Local Runtime 后重试。");
      state.lastError = "Runtime offline，无法发送消息。";
      render();
      return;
    }
    if (!state.pageSubmitted) {
      appendMessage("system", "请先读取当前页面。");
      state.lastError = "缺少当前页面上下文，不能生成摘要或回答。";
      render();
      return;
    }
    const sessionId = await ensureSession();
    const assistantId = newId();
    messages.push({ id: newId(), role: "user", text: trimmed });
    messages.push({ id: assistantId, role: "assistant", text: "" });
    input.value = "";
    state.streamStatus = "streaming";
    state.lastError = null;
    render();
    try {
      await streamRuntimeChat(sessionId, trimmed, (event) => handleAgentEvent(event, assistantId));
      state.streamStatus = "done";
    } catch (error) {
      state.runtimeStatus = "offline";
      state.streamStatus = "error";
      state.lastError = `连接 Runtime 失败：${error instanceof Error ? error.message : "unknown error"}`;
      patchAssistant(assistantId, state.lastError);
    }
    render();
  }

  function handleAgentEvent(event: AgentEvent, assistantId: string) {
    switch (event.type) {
      case "response.delta":
        patchAssistant(assistantId, String(event.data.text ?? ""));
        return;
      case "artifact.created":
        patchAssistant(assistantId, "", event.data.artifact as ArtifactRecord);
        return;
      case "tool.started":
        state.streamStatus = `running ${String(event.data.tool_name ?? "tool")}`;
        render();
        return;
      case "tool.done":
        state.streamStatus = "tool done";
        render();
        return;
      case "error":
        state.lastError = String(event.data.message ?? event.data.code ?? "Runtime error");
        patchAssistant(assistantId, `\n${state.lastError}`);
        state.streamStatus = "error";
        render();
        return;
      default:
        return;
    }
  }

  function appendMessage(role: ChatRole, text: string) {
    messages.push({ id: newId(), role, text });
    render();
  }

  function patchAssistant(id: string, text: string, artifact?: ArtifactRecord) {
    const message = messages.find((item) => item.id === id);
    if (!message) return;
    if (text) message.text += text;
    if (artifact) message.artifact = artifact;
    render();
  }

  function installResize() {
    let resizing = false;
    resizeHandle.addEventListener("pointerdown", (event) => {
      resizing = true;
      resizeHandle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    resizeHandle.addEventListener("pointermove", (event) => {
      if (!resizing) return;
      const rawWidth = state.side === "right" ? window.innerWidth - event.clientX : event.clientX;
      state.width = clampPanelWidth(rawWidth, window.innerWidth);
      render();
    });
    resizeHandle.addEventListener("pointerup", () => {
      resizing = false;
    });
  }

  function render() {
    frame.dataset.open = String(state.open);
    frame.dataset.side = state.side;
    frame.style.setProperty("--navia-width", `${state.width}px`);
    layoutMode = getPanelLayoutMode(state.width, window.innerWidth, layoutMode);
    frame.dataset.mode = layoutMode;
    frame.dataset.widthState = getPanelWidthState(state.width, window.innerWidth, layoutMode);
    frame.dataset.runtime = state.runtimeStatus;
    frame.dataset.submitted = String(state.pageSubmitted);
    frame.dataset.pageState = state.pageSubmitted ? "submitted" : "missing";
    frame.dataset.stream = state.streamStatus;
    frame.dataset.error = state.lastError ? "true" : "false";
    frame.dataset.activeTool = state.activeTool;
    statusEl.textContent = `${state.statusText} · ${state.streamStatus}`;
    pageEl.textContent = state.pageContext
      ? `${state.pageContext.title} · ${state.pageContext.domain} · headings ${state.pageContext.headings.length}`
      : "尚未读取页面";
    structuredJsonEl.textContent = JSON.stringify(getStructuredDebugPayload(), null, 2);
    stateBannerEl.textContent = getStateBannerText();
    chatNoticeEl.textContent = getChatNoticeText();
    chatToolButton.classList.toggle("active", state.activeTool === "chat");
    chatToolButton.setAttribute("aria-current", state.activeTool === "chat" ? "true" : "false");
    debugToggleButton.setAttribute("aria-pressed", state.activeTool === "debug" ? "true" : "false");
    debugToggleButton.classList.toggle("active", state.activeTool === "debug");
    (root.querySelector("[data-testid='navia-debug-pane']") as HTMLElement | null)?.classList.toggle(
      "is-visible",
      state.activeTool === "debug"
    );
    summaryButton.disabled = !canChat();
    debugSummaryButton.disabled = !canChat();
    mindmapButton.disabled = !canChat();
    debugMindmapButton.disabled = !canChat();
    sendButton.disabled = !canChat();
    const shouldStickToBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 24;
    messagesEl.innerHTML = "";
    for (const message of messages) {
      const article = document.createElement("article");
      article.className = `navia-message ${message.role}`;
      const pre = document.createElement("pre");
      pre.textContent = message.text || (message.role === "assistant" ? "..." : "");
      article.appendChild(pre);
      messagesEl.appendChild(article);
      if (message.artifact?.metadata?.format === "mermaid") {
        renderMermaid(message.artifact, article);
      }
    }
    if (shouldStickToBottom) messagesEl.scrollTop = messagesEl.scrollHeight;
    if (state.open && layoutMode === "push") applyPagePush();
    if (!state.open || layoutMode === "overlay") restorePageLayout();
  }

  function canChat() {
    return state.runtimeStatus === "online" && state.pageSubmitted && state.streamStatus !== "streaming";
  }

  function getStateBannerText() {
    if (state.lastError) return state.lastError;
    if (state.runtimeStatus === "offline") return "Runtime offline，请启动本地服务后点击重连。";
    if (state.runtimeStatus === "checking") return "正在检查 Local Runtime 状态。";
    if (!state.pageSubmitted) return "尚未读取当前页面，摘要和问答会保持禁用。";
    if (state.streamStatus === "streaming") return "正在生成回复，请稍候。";
    if (state.streamStatus.startsWith("running")) return `工具执行中：${state.streamStatus.replace("running ", "")}`;
    if (state.statusText.startsWith("已恢复")) return "已恢复最近会话，可继续基于当前页面提问。";
    return "当前页面已就绪，可进行摘要和问答。";
  }

  function getChatNoticeText() {
    if (state.runtimeStatus === "offline") return "Runtime offline，启动本地服务后可继续聊天。";
    if (state.runtimeStatus === "checking") return "正在检查 Local Runtime。";
    if (!state.pageSubmitted) return "读取当前页面后，聊天会基于网页内容回答。";
    if (state.streamStatus === "streaming") return "正在生成回复。";
    if (state.streamStatus.startsWith("running")) return `正在执行工具：${state.streamStatus.replace("running ", "")}`;
    return "当前页面已就绪。";
  }

  function getStructuredDebugPayload() {
    if (!state.structuredPageDebug) {
      return {
        status: "missing",
        message: "读取当前页面后，这里会显示 A 模块返回的 StructuredPageContext。",
        expectedSignals: ["pageId", "contentHash", "metadata", "headingTree", "paragraphs", "chunks", "annotations", "summaryDraft"]
      };
    }
    return state.structuredPageDebug;
  }

  function applyPagePush() {
    if (!restoreLayout) {
      const html = document.documentElement;
      const previous = {
        marginLeft: html.style.marginLeft,
        marginRight: html.style.marginRight,
        transition: html.style.transition
      };
      restoreLayout = () => {
        html.style.marginLeft = previous.marginLeft;
        html.style.marginRight = previous.marginRight;
        html.style.transition = previous.transition;
        restoreLayout = null;
      };
    }
    const html = document.documentElement;
    html.style.transition = "margin 220ms ease";
    if (state.side === "right") {
      html.style.marginRight = `${state.width}px`;
      html.style.marginLeft = "";
    } else {
      html.style.marginLeft = `${state.width}px`;
      html.style.marginRight = "";
    }
  }

  function restorePageLayout() {
    if (restoreLayout) restoreLayout();
  }

  function renderMermaid(artifact: ArtifactRecord, container: HTMLElement) {
    const cached = mermaidArtifactCache.get(artifact.artifactId);
    if (cached && cached.content === artifact.content) {
      container.appendChild(cached.element);
      return;
    }
    const element = createMermaidArtifactElement(artifact);
    mermaidArtifactCache.set(artifact.artifactId, { content: artifact.content, element });
    container.appendChild(element);
  }

}

function getPanelWidthState(width: number, viewportWidth: number, mode: LayoutMode): PanelWidthState {
  if (viewportWidth < 900) return "mobile";
  if (mode === "overlay") return "overlay";
  return width / viewportWidth >= 0.48 ? "half" : "narrow";
}

function newId() {
  return `ui_${crypto.randomUUID().replace(/-/g, "")}`;
}

function isSamePageUrl(restoredUrl: string, currentUrl: string): boolean {
  try {
    const restored = new URL(restoredUrl);
    const current = new URL(currentUrl);
    restored.hash = "";
    current.hash = "";
    return restored.toString() === current.toString();
  } catch {
    return restoredUrl === currentUrl;
  }
}

  function markup() {
  return `
    <section class="navia-frame" data-testid="navia-frame" data-open="false" data-side="right" data-mode="push">
      <aside class="navia-panel navia-panel-shell" data-testid="navia-panel" aria-label="Navia assistant">
        <div class="navia-resize" data-testid="navia-resize-handle" role="separator" aria-orientation="vertical"></div>
        <main class="navia-workspace navia-chat-workspace">
          <section class="navia-pane navia-chat-pane" data-testid="navia-chat-pane" aria-label="Chat">
            <header class="navia-chat-header">
              <div class="navia-chat-title" data-testid="navia-chat-title">
                <div class="navia-avatar" aria-label="Navia">N</div>
                <div class="navia-chat-title-copy">
                  <strong>聊天</strong>
                  <span data-testid="navia-status"></span>
                </div>
                <span class="navia-dot" aria-hidden="true"></span>
              </div>
              <div class="navia-chat-header-actions">
                <button data-testid="navia-reconnect" class="navia-reconnect-button" type="button">重连</button>
              </div>
            </header>
            <section class="navia-messages" data-testid="navia-messages" aria-live="polite"></section>
            <footer class="navia-chat-footer">
              <p class="navia-chat-notice" data-testid="navia-chat-notice" role="status"></p>
              <div class="navia-chat-toolbar" aria-label="Chat actions">
                <button data-testid="navia-read-page">读取网页</button>
                <button data-testid="navia-summary">总结</button>
                <button data-testid="navia-mindmap">Mindmap</button>
                <button data-testid="navia-new-chat">新对话</button>
              </div>
              <div class="navia-composer-container" data-testid="navia-composer-container">
                <div class="navia-composer">
                  <textarea data-testid="navia-input" placeholder="基于当前网页提问..."></textarea>
                  <button data-testid="navia-send">发送</button>
                </div>
              </div>
            </footer>
          </section>
          <section class="navia-pane navia-debug-pane" data-testid="navia-debug-pane" aria-label="Debug">
            <header class="navia-header">
              <div>
                <strong>Debug</strong>
                <span>运行状态与页面上下文</span>
              </div>
              <button data-testid="navia-debug-reconnect">重连</button>
            </header>
            <div class="navia-page" data-testid="navia-page"></div>
            <div class="navia-state-banner" data-testid="navia-state-banner" role="status"></div>
            <section class="navia-debug-json-card" aria-label="A module structured extraction">
              <header>
                <strong>A 模块结构化提取</strong>
                <span>StructuredPageContext JSON</span>
              </header>
              <pre data-testid="navia-structured-json"></pre>
            </section>
            <div class="navia-actions">
              <button data-testid="navia-debug-read-page">读取当前页面</button>
              <button data-testid="navia-debug-summary">总结</button>
              <button data-testid="navia-debug-mindmap">Mindmap</button>
            </div>
          </section>
        </main>
        <nav class="navia-tool-dock" aria-label="Navia tools">
          <button class="navia-tool-button active" data-testid="navia-tool-chat" type="button" aria-current="true" aria-label="聊天">聊天</button>
          <button class="navia-tool-button" data-testid="navia-debug-toggle" type="button" aria-pressed="false" aria-label="切换 Debug">⚙</button>
        </nav>
      </aside>
    </section>
  `;
}

function styles() {
  return `
    <style>
      :host { all: initial; }
      .navia-frame {
        --navia-width: 440px;
        --navia-width-max: 80vw;
        --navia-mobile-rail-width: 56px;
        --navia-resize-hit-width: 8px;
        --navia-panel-padding: 14px;
        --navia-gap-sm: 8px;
        --navia-gap-md: 10px;
        --navia-gap-lg: 16px;
        --navia-text: #172033;
        --navia-text-muted: #52606d;
        --navia-brand: #635bff;
        --navia-brand-strong: #5146f4;
        --navia-brand-soft: #f4f6ff;
        --navia-surface: #ffffff;
        --navia-shell: #ffffff;
        --navia-tool-bg: #ffffff;
        --navia-border: #e5e7eb;
        --navia-border-strong: #b7b9ff;
        --navia-success: #2f9e44;
        --navia-error: #dc2626;
        --navia-warning: #d97706;
        --navia-warning-bg: #fff7ed;
        --navia-error-bg: #fef2f2;
        --navia-info-bg: #eef2ff;
        --navia-user-bg: #eef2ff;
        --navia-system-bg: #f1f5f9;
        --navia-radius-sm: 7px;
        --navia-radius-md: 8px;
        --navia-radius-pill: 999px;
        --navia-shadow-ball: 0 12px 28px rgba(15, 23, 42, 0.22);
        --navia-shadow-panel: 0 12px 48px rgba(0, 0, 0, 0.08);
        --navia-shadow-overlay: 0 0 0 9999px rgba(15, 23, 42, 0.08), 0 0 36px rgba(15, 23, 42, 0.2);
        --navia-shadow-hover: 0 14px 28px rgba(15, 23, 42, 0.16);
        --navia-motion-fast: 160ms ease;
        --navia-motion-panel: 220ms ease;
        --navia-font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--navia-text);
        font-family: var(--navia-font);
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        pointer-events: none;
      }
      .navia-panel { pointer-events: auto; }
      .navia-panel {
        position: fixed;
        top: 0;
        bottom: 0;
        box-sizing: border-box;
        width: var(--navia-width);
        max-width: var(--navia-width-max);
        min-width: 440px;
        display: flex;
        flex-direction: column;
        background: var(--navia-shell);
        border: none;
        box-shadow: var(--navia-shadow-panel);
        transform: translateX(100%);
        transition: transform var(--navia-motion-panel);
      }
      .navia-frame[data-side="right"] .navia-panel { right: 0; transform: translateX(100%); }
      .navia-frame[data-side="left"] .navia-panel { left: 0; transform: translateX(-100%); }
      .navia-frame[data-open="true"] .navia-panel { transform: translateX(0); }
      .navia-resize {
        position: absolute;
        top: 0;
        bottom: 0;
        width: var(--navia-resize-hit-width);
        cursor: ew-resize;
        background: transparent;
      }
      .navia-frame[data-side="right"] .navia-resize { left: -4px; }
      .navia-frame[data-side="left"] .navia-resize { right: -4px; }
      .navia-chat-workspace {
        min-width: 0;
        min-height: 0;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 10px;
        padding: 12px 12px 12px 14px;
      }
      .navia-avatar {
        display: none;
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: var(--navia-radius-pill);
        background: var(--navia-brand);
        color: white;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        flex: none;
      }
      .navia-dot { width: 8px; height: 8px; border-radius: var(--navia-radius-pill); background: var(--navia-success); flex: none; }
      .navia-frame[data-runtime="offline"] .navia-dot { background: var(--navia-error); }
      .navia-frame[data-runtime="checking"] .navia-dot { background: #f59e0b; }
      .navia-pane {
        min-width: 0;
        min-height: 0;
        height: 100%;
        display: grid;
      }
      .navia-frame[data-active-tool="debug"] .navia-debug-pane,
      .navia-debug-pane.is-visible {
        display: grid;
        grid-template-rows: auto auto auto auto minmax(0, 1fr);
        gap: var(--navia-gap-md);
      }
      .navia-chat-pane {
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr) auto;
        gap: var(--navia-gap-md);
      }
      .navia-chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 2px 0 0;
      }
      .navia-chat-title {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .navia-chat-title-copy {
        display: grid;
        gap: 3px;
        min-width: 0;
      }
      .navia-chat-header strong { display: block; font-size: 16px; }
      .navia-chat-header span { display: block; color: var(--navia-text-muted); font-size: 12px; }
      .navia-chat-header-actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .navia-reconnect-button {
        border: 1px solid #e5e7eb;
        background: #fff;
        color: var(--navia-text-muted);
        padding: 6px 10px;
        border-radius: 999px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
      }
      .navia-reconnect-button:hover:not(:disabled) {
        background: #f9fafb;
        color: var(--navia-text);
      }
      .navia-chat-notice {
        display: none;
      }
      .navia-frame[data-runtime="offline"] .navia-chat-notice,
      .navia-frame[data-error="true"] .navia-chat-notice,
      .navia-frame[data-page-state="missing"][data-runtime="online"] .navia-chat-notice {
        display: none;
      }
      .navia-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .navia-header strong { display: block; font-size: 16px; }
      .navia-header span { display: block; color: var(--navia-text-muted); font-size: 12px; margin-top: 4px; }
      .navia-page {
        display: none;
      }
      .navia-state-banner {
        display: none;
      }
      .navia-debug-json-card {
        display: none;
      }
      .navia-chat-footer {
        display: flex;
        flex-direction: column;
        gap: 10px;
        border-top: 1px solid #e5e7eb;
        background: #fff;
        padding: 12px 0 0;
      }
      .navia-chat-footer:focus-within {
        border-color: var(--navia-brand);
        box-shadow: 0 0 0 2px rgba(99, 91, 255, 0.08);
      }
      .navia-chat-toolbar {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        min-width: 0;
      }
      button {
        border: 1px solid #e5e7eb;
        border-radius: 999px;
        background: #fff;
        color: var(--navia-text);
        font: 500 13px/1.2 var(--navia-font);
        padding: 8px 12px;
        cursor: pointer;
      }
      .navia-chat-toolbar button:hover:not(:disabled) {
        background: #f9fafb;
      }
      button:disabled { color: #9aa6b2; cursor: not-allowed; }
      .navia-messages {
        position: relative;
        z-index: 1;
        min-height: 0;
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: var(--navia-gap-md);
        padding-right: 4px;
      }
      .navia-message {
        border-radius: 12px;
        padding: 10px;
        background: #fff;
        border: 1px solid #f3f4f6;
        min-width: 0;
        max-width: 100%;
      }
      .navia-message.user { background: #f4f6ff; border: none; color: #172033; }
      .navia-message.assistant {
        background: #ffffff;
        border: 1px solid #f3f4f6;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
      }
      .navia-message.system {
        background: #ffffff;
        border: 1px solid #f3f4f6;
        opacity: 0.9;
      }
      .navia-frame[data-stream="error"] .navia-message.assistant:last-child {
        border-color: #fecaca;
        background: var(--navia-error-bg);
      }
      .navia-message pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
        font: 13px/1.45 var(--navia-font);
      }
      .navia-artifact {
        --navia-artifact-viewer: true;
        margin-top: 10px;
        max-width: 100%;
        overflow: auto;
      }
      .navia-mermaid-frame {
        width: 100%;
        height: 280px;
        border: 1px solid var(--navia-border);
        border-radius: var(--navia-radius-md);
        background: var(--navia-surface);
      }
      .navia-mermaid-source {
        margin-top: 8px;
        color: var(--navia-text-muted);
      }
      .navia-mermaid-source summary {
        cursor: pointer;
        font-size: 12px;
      }
      .navia-mermaid-error {
        margin: 8px 0 0;
        color: #b91c1c;
        font-size: 12px;
      }
      .navia-composer-container {
        position: relative;
      }
      .navia-composer {
        position: relative;
        display: flex;
        align-items: flex-end;
        gap: 8px;
        min-width: 0;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 8px 12px;
      }
      .navia-composer textarea {
        box-sizing: border-box;
        display: block;
        min-width: 0;
        width: 100%;
        min-height: 44px;
        resize: none;
        border: none;
        border-radius: 0;
        padding: 0;
        background: transparent;
        font: 13px/1.4 var(--navia-font);
        outline: none;
        overflow: hidden;
      }
      .navia-composer:focus-within textarea {
        background: transparent;
      }
      .navia-composer button {
        position: static;
        flex: none;
        border: none;
        border-radius: 8px;
        background: var(--navia-brand);
        color: #fff;
        padding: 6px 16px;
        box-shadow: none;
      }
      .navia-composer button:hover:not(:disabled) {
        background: var(--navia-brand-strong);
      }
      .navia-tool-dock {
        position: absolute;
        top: 50%;
        right: 0;
        transform: translate(100%, -50%);
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 60px;
        padding: 10px 8px;
        border-left: 1px solid #e5e7eb;
        border-top-right-radius: 16px;
        border-bottom-right-radius: 16px;
        background: #f8f9ff;
        box-shadow: 8px 0 24px rgba(15, 23, 42, 0.04);
        backdrop-filter: blur(10px);
      }
      .navia-tool-button {
        width: 100%;
        min-height: 36px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #fff;
        padding: 0 8px;
        color: var(--navia-text-muted);
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
      }
      .navia-tool-button.active {
        background: #f4f6ff;
        border-color: #dbe2ff;
        color: var(--navia-brand-strong);
        box-shadow: 0 4px 12px rgba(99, 91, 255, 0.12);
      }
      .navia-tool-button:hover:not(:disabled) {
        background: #f9fafb;
      }
      .navia-frame[data-mode="overlay"] .navia-panel { box-shadow: var(--navia-shadow-overlay); }
      @media (max-width: 899px) {
        .navia-frame { --navia-width: 100vw; }
        .navia-panel {
          min-width: 0;
          width: min(100vw, max(320px, var(--navia-width)));
          max-width: 100vw;
          display: flex;
        }
        .navia-workspace { padding: 10px; }
        .navia-chat-header {
          align-items: flex-start;
          flex-direction: column;
        }
        .navia-chat-header-actions {
          width: 100%;
          justify-content: space-between;
        }
        .navia-composer button {
          padding-inline: 12px;
        }
        .navia-tool-dock {
          top: auto;
          right: 0;
          bottom: 12px;
          transform: translate(100%, 0);
          flex-direction: row;
          width: auto;
          border-radius: 14px;
        }
      }
    </style>
  `;
}
