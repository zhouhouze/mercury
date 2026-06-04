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
  getLastSessionId,
  restoreMessages,
  restoreRuntimeSession,
  streamRuntimeChat,
  submitRuntimePageContext,
  type ArtifactRecord,
  type ChatMessage,
  type RuntimeStatus
} from "../../src/runtimeClient";
mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });

function App() {
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>("checking");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<ExtractedPageContext | null>(null);
  const [pageSubmitted, setPageSubmitted] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string>("未提交页面上下文");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: crypto.randomUUID(), role: "system", text: "请先读取并提交当前页面，然后开始网页伴读。" }
  ]);
  const [streamStatus, setStreamStatus] = useState("idle");
  const canChat = runtimeStatus === "online" && pageSubmitted;

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

  async function restoreLastSession() {
    const lastSessionId = await getLastSessionId();
    if (!lastSessionId) return;
    try {
      const restored = await restoreRuntimeSession(lastSessionId);
      if (!restored) return;
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
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>Navia</h1>
          <p>当前网页伴读</p>
        </div>
        <span className={`status ${runtimeStatus}`}>{runtimeStatus}</span>
      </header>

      <section className="toolbar">
        <button onClick={checkRuntime}>重新连接</button>
        <button onClick={captureCurrentPage}>读取当前页面</button>
        <button onClick={submitPageContext} disabled={runtimeStatus !== "online"}>提交上下文</button>
      </section>

      <section className="panel">
        <h2>当前页面</h2>
        {pageContext ? (
          <dl>
            <dt>Title</dt>
            <dd>{pageContext.title}</dd>
            <dt>URL</dt>
            <dd>{pageContext.url}</dd>
            <dt>Domain</dt>
            <dd>{pageContext.domain}</dd>
            <dt>Headings</dt>
            <dd>{pageContext.headings.length}</dd>
          </dl>
        ) : (
          <p className="muted">尚未读取页面。</p>
        )}
      </section>

      <section className="panel">
        <h2>Chatbox</h2>
        <div className="quick-actions">
          <button disabled={!canChat || streamStatus === "streaming"} onClick={() => sendChat("总结这篇文章")}>总结</button>
          <button disabled={!canChat || streamStatus === "streaming"} onClick={() => sendChat("生成 Mermaid 思维导图")}>Mindmap</button>
          <button disabled={!canChat || streamStatus === "streaming"} onClick={() => sendChat("解释选区")}>解释选区</button>
        </div>
        <div className="messages" aria-live="polite">
          {messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <pre>{message.text || (message.role === "assistant" ? "..." : "")}</pre>
              {message.artifact?.metadata?.format === "mermaid" ? <MermaidArtifact artifact={message.artifact} /> : null}
            </article>
          ))}
        </div>
        <form
          className="chat-form"
          onSubmit={(event) => {
            event.preventDefault();
            sendChat(input);
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={canChat ? "基于当前网页提问..." : "请先连接 Runtime，并提交页面上下文。"}
          />
          <button disabled={!canChat || streamStatus === "streaming"} type="submit">发送</button>
        </form>
      </section>

      <footer>{submitStatus} · {streamStatus}</footer>
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
      {error ? (
        <div className="mermaid-fallback">
          <p>Mermaid 渲染失败，已显示源码。</p>
          <pre>{artifact.content}</pre>
        </div>
      ) : null}
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

createRoot(document.getElementById("root")!).render(<App />);
