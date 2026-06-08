import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import mermaid from "mermaid";
import "./style.css";
import type { ExtractedPageContext } from "../../src/pageContext";
import type { AgentEvent } from "../../src/sse";
import {
  checkRuntimeHealth,
  clearLastSessionId,
  createRuntimeSession,
  deleteProvider,
  getLastSessionId,
  getSettings,
  importProvider,
  restoreMessages,
  restoreRuntimeSession,
  streamRuntimeChat,
  submitRuntimePageContext,
  testProvider,
  type ArtifactRecord,
  type ChatMessage,
  type LLMProviderConfig,
  type MercurySettings,
  type ProviderTestResult,
  type RuntimeStatus
} from "../../src/runtimeClient";
mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });

type SideView = "chat" | "debug" | "settings";

function App() {
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>("checking");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<ExtractedPageContext | null>(null);
  const [pageSubmitted, setPageSubmitted] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string>("未提交页面上下文");
  const [input, setInput] = useState("");
  const [settings, setSettings] = useState<MercurySettings | null>(null);
  const [settingsStatus, setSettingsStatus] = useState<"idle" | "loading" | "saving" | "testing" | "error">("idle");
  const [settingsMessage, setSettingsMessage] = useState("尚未加载设置。");
  const [providerTestResult, setProviderTestResult] = useState<ProviderTestResult | null>(null);
  const [providerDraft, setProviderDraft] = useState({
    displayName: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    apiKey: "",
    defaultModel: "deepseek-chat"
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: crypto.randomUUID(), role: "system", text: "请先读取并提交当前页面，然后开始网页伴读。" }
  ]);
  const [streamStatus, setStreamStatus] = useState("idle");
  const [activeView, setActiveView] = useState<SideView>("chat");
  const canChat = runtimeStatus === "online" && pageSubmitted;

  function normalizeView(value: string | null | undefined): SideView {
    if (value === "debug" || value === "settings" || value === "chat") return value;
    return "chat";
  }

  function syncView(nextView: SideView) {
    setActiveView(nextView);
    const nextHash = `#${nextView}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }

  async function checkRuntime() {
    setRuntimeStatus("checking");
    try {
      const online = await checkRuntimeHealth();
      setRuntimeStatus(online ? "online" : "offline");
      if (online) await restoreLastSession();
      return online;
    } catch {
      setRuntimeStatus("offline");
      return false;
    }
  }

  async function ensureSession() {
    if (sessionId) return sessionId;
    const id = await createRuntimeSession("sidepanel");
    setSessionId(id);
    return id;
  }

  async function loadSettings() {
    setSettingsStatus("loading");
    setSettingsMessage("正在加载 LLM 设置...");
    try {
      const next = await getSettings();
      setSettings(next);
      const provider = getDefaultProvider(next);
      setProviderDraft({
        displayName: provider?.displayName ?? "DeepSeek",
        baseUrl: provider?.baseUrl ?? "https://api.deepseek.com",
        apiKey: "",
        defaultModel: provider?.defaultModel ?? next.defaultModel ?? "deepseek-chat"
      });
      setSettingsStatus("idle");
      setSettingsMessage(provider ? "LLM 设置已加载。" : "尚未配置默认 Provider，请先填写 API Key 并保存。");
    } catch (error) {
      setSettingsStatus("error");
      setSettingsMessage(error instanceof Error ? error.message : "设置加载失败。");
    }
  }

  async function restoreLastSession() {
    const lastSessionId = await getLastSessionId();
    if (!lastSessionId) return;
    try {
      const restored = await restoreRuntimeSession(lastSessionId);
      if (!restored) return;
      const currentUrl = await getActiveTabUrl();
      if (restored.activePage && currentUrl && !isSamePageUrl(restored.activePage.url, currentUrl)) {
        await clearLastSessionId();
        setSessionId(null);
        setPageContext(null);
        setPageSubmitted(false);
        setSubmitStatus("最近 session 与当前页面不匹配，请重新读取页面。");
        return;
      }
      setSessionId(restored.session_id);
      if (restored.activePage) {
        setPageContext({
          url: restored.activePage.url,
          title: restored.activePage.title,
          domain: restored.activePage.domain,
          captured_at: restored.activePage.captured_at ?? new Date().toISOString(),
          headings: [],
          visible_text: "",
          cleaned_text: ""
        });
        setPageSubmitted(true);
        setSubmitStatus(`已恢复：${restored.activePage.title}`);
      }
      const restoredMessages = restoreMessages(restored);
      if (restoredMessages.length > 0) setMessages(restoredMessages);
    } catch {
      await clearLastSessionId();
    }
  }

  async function captureCurrentPage() {
    setSubmitStatus("正在读取当前页面...");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id || !tab.url) {
        setSubmitStatus("无法定位当前标签页。");
        return;
      }
      if (!/^https?:|^file:/.test(tab.url)) {
        setSubmitStatus("当前页面不允许扩展读取，请切换到普通网页后重试。");
        return;
      }

      let context: ExtractedPageContext | null = null;
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "navia.extractPageContext" });
        if (response?.ok) context = response.context;
      } catch {
        context = null;
      }

      if (!context) {
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractPageContextInTab
        });
        context = result?.result as ExtractedPageContext | null;
      }

      if (!context) {
        setSubmitStatus("读取失败：页面未返回上下文。");
        return;
      }
      setPageContext(context);
      setPageSubmitted(false);
      setSubmitStatus(`已读取页面：${context.title}`);
    } catch (error) {
      setSubmitStatus(`读取失败：${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  async function submitPageContext() {
    if (!pageContext) {
      setSubmitStatus("请先读取当前页面");
      return;
    }
    try {
      const id = await ensureSession();
      const result = await submitRuntimePageContext(pageContext, id);
      setPageSubmitted(result.ok);
      setSubmitStatus(result.ok ? `已提交：${result.pageId}` : result.message ?? "提交失败");
    } catch {
      setPageSubmitted(false);
      setSubmitStatus("Runtime 不可用，无法提交页面上下文");
    }
  }

  async function saveProvider() {
    if (runtimeStatus !== "online") {
      setSettingsStatus("error");
      setSettingsMessage("Runtime offline，无法保存 Provider。");
      return;
    }
    if (!providerDraft.apiKey.trim()) {
      setSettingsStatus("error");
      setSettingsMessage("请输入 API Key。");
      return;
    }
    setSettingsStatus("saving");
    setSettingsMessage("正在保存 Provider...");
    try {
      const result = await importProvider({
        providerType: "deepseek",
        displayName: providerDraft.displayName.trim() || "DeepSeek",
        baseUrl: providerDraft.baseUrl.trim() || "https://api.deepseek.com",
        apiKey: providerDraft.apiKey.trim(),
        defaultModel: providerDraft.defaultModel.trim() || "deepseek-chat"
      });
      setSettings(result.settings);
      setProviderTestResult(null);
      setProviderDraft((current) => ({ ...current, apiKey: "" }));
      setSettingsStatus("idle");
      setSettingsMessage(`API Key 已配置并保存成功。${result.provider.displayName ? `（${result.provider.displayName}）` : ""}`);
    } catch (error) {
      setSettingsStatus("error");
      setSettingsMessage(error instanceof Error ? error.message : "Provider 保存失败。");
    }
  }

  async function runProviderTest() {
    const provider = getDefaultProvider(settings);
    if (!provider) {
      setSettingsStatus("error");
      setSettingsMessage("请先保存 Provider。");
      return;
    }
    setSettingsStatus("testing");
    setSettingsMessage("正在测试连接...");
    try {
      const result = await testProvider(provider.providerId);
      setProviderTestResult(result);
      setSettingsStatus(result.status === "ok" ? "idle" : "error");
      setSettingsMessage(
        result.status === "ok"
          ? `API Key 校验成功，连接正常。${result.latencyMs ? `（${result.latencyMs}ms）` : ""}`
          : result.error?.message ?? result.message
      );
      await loadSettings();
    } catch (error) {
      setSettingsStatus("error");
      setSettingsMessage(error instanceof Error ? error.message : "连接测试失败。");
    }
  }

  async function removeProvider() {
    const provider = getDefaultProvider(settings);
    if (!provider) return;
    setSettingsStatus("saving");
    setSettingsMessage("正在删除 Provider...");
    try {
      const result = await deleteProvider(provider.providerId);
      setSettings(result.settings);
      setProviderTestResult(null);
      setSettingsStatus("idle");
      setSettingsMessage("Provider 已删除。");
    } catch (error) {
      setSettingsStatus("error");
      setSettingsMessage(error instanceof Error ? error.message : "Provider 删除失败。");
    }
  }

  async function sendChat(message: string) {
    const trimmed = message.trim();
    if (!trimmed) return;
    if (runtimeStatus !== "online") {
      appendMessage("system", "Runtime offline，请启动 Local Runtime 后重试。");
      return;
    }
    if (!pageSubmitted) {
      appendMessage("system", "请先读取并提交当前页面上下文。");
      return;
    }
    const id = await ensureSession();
    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: trimmed },
      { id: assistantId, role: "assistant", text: "" }
    ]);
    setInput("");
    setStreamStatus("streaming");
    try {
      await streamRuntimeChat(id, trimmed, (event) => handleAgentEvent(event, assistantId));
      setStreamStatus("done");
    } catch (error) {
      setRuntimeStatus("offline");
      setStreamStatus("error");
      patchAssistant(assistantId, `连接 Runtime 失败：${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  function appendMessage(role: ChatMessage["role"], text: string) {
    setMessages((current) => [...current, { id: crypto.randomUUID(), role, text }]);
  }

  function patchAssistant(id: string, text: string, artifact?: ArtifactRecord) {
    setMessages((current) =>
      current.map((message) =>
        message.id === id
          ? { ...message, text: text ? `${message.text}${text}` : message.text, artifact: artifact ?? message.artifact }
          : message
      )
    );
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
        setStreamStatus(`running ${event.data.tool_name ?? "tool"}`);
        return;
      case "tool.done":
        setStreamStatus("tool done");
        return;
      case "error":
        patchAssistant(assistantId, `\n${event.data.message ?? event.data.code ?? "Runtime error"}`);
        setStreamStatus("error");
        return;
      case "state.transition":
      case "intent.detected":
      case "budget.checked":
      case "response.done":
        return;
      default:
        console.debug("Navia ignored unknown SSE event", event);
    }
  }

  useEffect(() => {
    checkRuntime();
    void loadSettings();
  }, []);

  useEffect(() => {
    const applyHash = () => setActiveView(normalizeView(window.location.hash.replace(/^#/, "")));
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  return (
    <main className="shell shell-layout">
      <section className="main-pane">
        <header className="topbar">
          <div className="topbar-copy">
            <div>
              <h1>{activeView === "chat" ? "聊天" : activeView === "debug" ? "Debug" : "设置"}</h1>
            </div>
          </div>
        </header>

        {activeView === "chat" ? (
          <section className="chat-stage">
            <div className="messages" aria-live="polite">
              {messages.map((message) => (
                <article className={`message ${message.role}`} key={message.id}>
                  <pre>{message.text || (message.role === "assistant" ? "..." : "")}</pre>
                  {message.artifact?.metadata?.format === "mermaid" ? <MermaidArtifact artifact={message.artifact} /> : null}
                </article>
              ))}
            </div>

            <div className="composer-stack">
              <div className="toolbar panel-strip pill-strip">
                <button disabled={runtimeStatus !== "online"} onClick={captureCurrentPage} type="button">读取当前页面</button>
                <button disabled={runtimeStatus !== "online"} onClick={submitPageContext} type="button">提交上下文</button>
                <button disabled={!canChat || streamStatus === "streaming"} onClick={() => sendChat("总结这篇文章")} type="button">总结</button>
                <button disabled={!canChat || streamStatus === "streaming"} onClick={() => sendChat("生成 Mermaid 思维导图")} type="button">Mindmap</button>
                <button disabled={!canChat || streamStatus === "streaming"} onClick={() => sendChat("解释选区")} type="button">解释选区</button>
                <button disabled={!canChat || streamStatus === "streaming"} onClick={() => sendChat("新对话")} type="button">新对话</button>
              </div>

              <form
                className="chat-form composer-container"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendChat(input);
                }}
              >
                <textarea
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    event.currentTarget.style.height = "auto";
                    event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 160)}px`;
                  }}
                  placeholder={canChat ? "基于当前网页提问..." : "请先连接 Runtime，并提交页面上下文。"}
                  rows={2}
                />
                <button disabled={!canChat || streamStatus === "streaming"} type="submit">发送</button>
              </form>
            </div>
          </section>
        ) : null}

        {activeView === "debug" ? (
          <section className="view-panel">
            <div className="panel-heading">
              <div>
                <h2>Debug</h2>
                <p className="muted">用于查看运行状态、页面提交与消息流。</p>
              </div>
              <button className="ghost-button" onClick={checkRuntime} type="button">重连</button>
            </div>
            <div className="debug-grid">
              <div className="debug-card">
                <dt>Runtime</dt>
                <dd>{runtimeStatus}</dd>
              </div>
              <div className="debug-card">
                <dt>Session</dt>
                <dd>{sessionId ?? "未创建"}</dd>
              </div>
              <div className="debug-card">
                <dt>Page</dt>
                <dd>{pageContext?.title ?? "尚未读取"}</dd>
              </div>
              <div className="debug-card">
                <dt>Stream</dt>
                <dd>{streamStatus}</dd>
              </div>
            </div>
            <div className="debug-log">
              <p className="muted">Runtime: {runtimeStatus}</p>
              <p className="muted">Stream: {streamStatus}</p>
              <p className="muted">Settings: {settingsStatus}</p>
              <p className="muted">{submitStatus}</p>
              <p className="muted">
                Provider test: {providerTestResult ? providerTestResult.message : "未执行"}
              </p>
              <p className="muted">
                Reconnect: {runtimeStatus === "checking" ? "checking" : runtimeStatus === "online" ? "online" : "offline"}
              </p>
              <p className="muted">
                Reconnect note: {runtimeStatus === "offline" ? "请启动本地 Runtime 后点击重连。" : runtimeStatus === "online" ? "Runtime 已连接。" : "正在检查 Runtime..."}
              </p>
              <p className="muted">{settingsMessage}</p>
            </div>
          </section>
        ) : null}

        {activeView === "settings" ? (
          <section className="view-panel">
            <div className="panel-heading panel-heading-tight">
              <div>
                <h2>LLM 设置</h2>
                <p className="muted">次级配置区，可在此保存、测试或删除 Provider。</p>
              </div>
            </div>
            <div className="settings-summary">
              <div>
                <dt>当前 Provider</dt>
                <dd>{getDefaultProvider(settings)?.displayName ?? "未配置"}</dd>
              </div>
              <div>
                <dt>默认模型</dt>
                <dd>{getDefaultProvider(settings)?.defaultModel ?? providerDraft.defaultModel}</dd>
              </div>
            </div>
            <div className="settings-grid">
              <label>
                <span>显示名称</span>
                <input
                  value={providerDraft.displayName}
                  onChange={(event) => setProviderDraft((current) => ({ ...current, displayName: event.target.value }))}
                  autoComplete="off"
                />
              </label>
              <label>
                <span>Base URL</span>
                <input
                  value={providerDraft.baseUrl}
                  onChange={(event) => setProviderDraft((current) => ({ ...current, baseUrl: event.target.value }))}
                  autoComplete="off"
                />
              </label>
              <label>
                <span>API Key</span>
                <input
                  type="password"
                  value={providerDraft.apiKey}
                  onChange={(event) => setProviderDraft((current) => ({ ...current, apiKey: event.target.value }))}
                  autoComplete="off"
                  placeholder="sk-..."
                />
              </label>
              <label>
                <span>默认模型</span>
                <select
                  value={providerDraft.defaultModel}
                  onChange={(event) => setProviderDraft((current) => ({ ...current, defaultModel: event.target.value }))}
                >
                  <option value="deepseek-chat">deepseek-chat</option>
                  <option value="deepseek-reasoner">deepseek-reasoner</option>
                </select>
              </label>
            </div>
            <div className="quick-actions settings-actions">
              <button disabled={runtimeStatus !== "online" || settingsStatus === "saving" || settingsStatus === "testing"} onClick={saveProvider} type="button">
                保存 Provider
              </button>
              <button disabled={runtimeStatus !== "online" || settingsStatus === "saving" || settingsStatus === "testing"} onClick={runProviderTest} type="button">
                测试连接
              </button>
              <button disabled={runtimeStatus !== "online" || settingsStatus === "saving" || !getDefaultProvider(settings)} onClick={removeProvider} type="button">
                删除 Provider
              </button>
            </div>
            <div className="settings-feedback" role="status" aria-live="polite">
              <p className="muted settings-feedback-message">{settingsMessage}</p>
              {providerTestResult ? (
                <p className="muted settings-feedback-submessage">
                  Provider test: {providerTestResult.message}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </section>

      <aside className="tool-rail" aria-label="Side tools">
        <button
          className={`tool-button ${activeView === "chat" ? "active" : ""}`}
          type="button"
          aria-current={activeView === "chat" ? "true" : undefined}
          onClick={() => syncView("chat")}
        >
          聊天
        </button>
        <button
          className={`tool-button ${activeView === "debug" ? "active" : ""}`}
          type="button"
          aria-current={activeView === "debug" ? "true" : undefined}
          onClick={() => syncView("debug")}
        >
          Debug
        </button>
        <button
          className={`tool-button ${activeView === "settings" ? "active" : ""}`}
          type="button"
          aria-current={activeView === "settings" ? "true" : undefined}
          onClick={() => syncView("settings")}
        >
          设置
        </button>
      </aside>
    </main>
  );
}

function MermaidArtifact({ artifact }: { artifact: ArtifactRecord }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const renderId = useMemo(() => `navia_mermaid_${artifact.artifactId.replace(/\W/g, "_")}`, [artifact.artifactId]);

  useEffect(() => {
    let cancelled = false;
    mermaid
      .render(renderId, artifact.content)
      .then((result) => {
        if (!cancelled) {
          setSvg(result.svg);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSvg("");
          setError(err instanceof Error ? err.message : "Mermaid render failed.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [artifact.content, renderId]);

  return (
    <div className="artifact">
      {svg ? <div className="mermaid-render" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      {error ? <p className="mermaid-fallback">Mermaid 渲染失败</p> : null}
    </div>
  );
}

function extractPageContextInTab(): ExtractedPageContext {
  const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim();
  const url = window.location.href;
  const parsedUrl = new URL(url);
  const headings = Array.from(document.querySelectorAll("h1,h2,h3"))
    .slice(0, 80)
    .map((node) => ({
      level: Number(node.tagName.slice(1)),
      text: normalizeText(node.textContent ?? "")
    }))
    .filter((heading) => heading.text.length > 0);
  const selection = document.getSelection()?.toString();
  const body = document.body;
  const rawVisibleText = body ? body.innerText || body.textContent || "" : "";
  const visibleText = normalizeText(rawVisibleText);

  return {
    url,
    title: document.title || parsedUrl.hostname,
    domain: parsedUrl.hostname,
    captured_at: new Date().toISOString(),
    headings,
    selected_text: selection ? normalizeText(selection) : undefined,
    visible_text: visibleText.slice(0, 24000),
    cleaned_text: visibleText.slice(0, 24000)
  };
}

function getDefaultProvider(settings: MercurySettings | null): LLMProviderConfig | null {
  const providers = settings?.providers ?? [];
  return providers.find((provider) => provider.providerId === settings?.defaultProviderId) ?? providers[0] ?? null;
}

async function getActiveTabUrl(): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return typeof tab?.url === "string" ? tab.url : null;
  } catch {
    return null;
  }
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

createRoot(document.getElementById("root")!).render(<App />);
