import React, { useEffect, useReducer, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import type { ExtractedPageContext } from "../../src/pageContext";
import type { AgentEvent } from "../../src/sse";
import { AssistantMessage } from "../../src/modules/chat_renderer/AssistantMessage";
import { DeferredCapabilityNotice } from "../../src/modules/chat_renderer/DeferredCapabilityNotice";
import { InlineStatusRow } from "../../src/modules/chat_renderer/InlineStatusRow";
import { UserMessage } from "../../src/modules/chat_renderer/UserMessage";
import { chatViewReducer, createChatViewState } from "../../src/modules/chat_renderer/chatViewReducer";
import { canSubmitChatInput, shouldSubmitOnKeyDown } from "../../src/chatInputShortcuts";
import { createChatProviderTestCollector, type ChatProviderTestStatus } from "../../src/settingsDiagnostics";
import {
  checkRuntimeHealth,
  clearLastSessionId,
  createRuntimeSession,
  deleteProvider,
  getLastSessionId,
  getSettings,
  importProvider,
  patchSettings,
  restoreMessages,
  restoreRuntimeSession,
  streamRuntimeChat,
  submitRuntimePageContext,
  testProvider,
  type ChatIntent,
  type ChatProviderConfig,
  type CoreProviderId,
  type LLMProviderConfig,
  type MercurySettings,
  type ProviderTestResult,
  type RuntimeStatus
} from "../../src/runtimeClient";

declare const __NAVIA_E2E_BRIDGE__: boolean;

type SideView = "chat" | "agent" | "debug" | "settings";
type ModeState = "chat" | "agent_checking" | "agent_ready" | "agent_unavailable";
type PageContextState = "unknown" | "capture_ready" | "capturing" | "captured" | "stale" | "unsupported" | "failed";
type ChatTurnState =
  | "idle"
  | "user_submitted"
  | "intent_detecting"
  | "context_strategy_deciding"
  | "context_resolving"
  | "capability_boundary"
  | "executing_chat"
  | "streaming_response"
  | "artifact_rendering"
  | "done"
  | "error";
const DEFAULT_DEEPSEEK_MODELS = ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"];
const CORE_PROVIDERS: CoreProviderId[] = ["llm_direct", "piagent", "mock"];
const CHAT_PROVIDER_TEST_PROMPT = "请只用普通文本回复 pong，不调用任何工具。";
const CHAT_PROVIDER_TEST_TIMEOUT_MS = 20_000;

function App() {
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>("checking");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<ExtractedPageContext | null>(null);
  const [pageContextState, setPageContextState] = useState<PageContextState>("unknown");
  const [chatTurnState, setChatTurnState] = useState<ChatTurnState>("idle");
  const [pageSubmitted, setPageSubmitted] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string>("未提交页面上下文");
  const [modeState, setModeState] = useState<ModeState>("chat");
  const [input, setInput] = useState("");
  const [settings, setSettings] = useState<MercurySettings | null>(null);
  const [settingsStatus, setSettingsStatus] = useState<"idle" | "loading" | "saving" | "testing" | "error">("idle");
  const [settingsMessage, setSettingsMessage] = useState("尚未加载设置。");
  const [settingsDiagnosticEvent, setSettingsDiagnosticEvent] = useState<AgentEvent | null>(null);
  const [providerTestResult, setProviderTestResult] = useState<ProviderTestResult | null>(null);
  const [providerDraft, setProviderDraft] = useState({
    displayName: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    apiKey: "",
    defaultModel: "deepseek-v4-flash"
  });
  const [chatProviderDraft, setChatProviderDraft] = useState<ChatProviderConfig>({
    coreProvider: "llm_direct",
    llmProviderId: undefined,
    model: "deepseek-v4-flash"
  });
  const [chatView, dispatchChatView] = useReducer(chatViewReducer, undefined, () => createChatViewState("chat"));
  const [streamStatus, setStreamStatus] = useState("idle");
  const [activeView, setActiveView] = useState<SideView>("chat");
  const [isComposing, setIsComposing] = useState(false);
  const [isSubmittingChat, setIsSubmittingChat] = useState(false);
  const isSubmittingChatRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const e2eStateRef = useRef<Record<string, unknown>>({});
  const e2eHandlersRef = useRef<E2EHandlers>({});
  const canChat = runtimeStatus === "online" && streamStatus !== "streaming";
  const isStreamingOrExecuting = streamStatus === "streaming" || chatTurnState === "executing_chat" || chatTurnState === "streaming_response";
  const canStartChatAction = canChat && !isSubmittingChat && !isStreamingOrExecuting;
  const canSubmitCurrentInput = canSubmitChatInput({ value: input, canChat, isSubmitting: isSubmittingChat, isStreamingOrExecuting });

  function normalizeView(value: string | null | undefined): SideView {
    if (value === "agent" || value === "debug" || value === "settings" || value === "chat") return value;
    return "chat";
  }

  function syncView(nextView: SideView) {
    setActiveView(nextView);
    setModeState(nextView === "agent" ? (runtimeStatus === "online" ? "agent_ready" : "agent_unavailable") : "chat");
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
      const chatProvider = resolveChatProviderDraft(next);
      setProviderDraft({
        displayName: provider?.name ?? "DeepSeek",
        baseUrl: provider?.baseUrl ?? "https://api.deepseek.com",
        apiKey: "",
        defaultModel: provider?.defaultModel ?? next.defaultModel ?? "deepseek-v4-flash"
      });
      setChatProviderDraft(chatProvider);
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
        setPageContextState("stale");
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
        setPageContextState("captured");
        setSubmitStatus(`已恢复：${restored.activePage.title}`);
      }
      const restoredMessages = restoreMessages(restored);
      if (restoredMessages.length > 0) dispatchChatView({ type: "restore_messages", messages: restoredMessages });
    } catch {
      await clearLastSessionId();
    }
  }

  async function captureCurrentPage() {
    setSubmitStatus("正在读取当前页面...");
    setPageContextState("capturing");
    try {
      const context = await readCurrentPageContext();
      setPageContext(context);
      setPageSubmitted(false);
      setPageContextState("capture_ready");
      setSubmitStatus(`已读取页面：${context.title}`);
    } catch (error) {
      setPageContextState(error instanceof PageUnsupportedError ? "unsupported" : "failed");
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
      setPageContextState(result.ok ? "captured" : "failed");
      setSubmitStatus(result.ok ? `已提交：${result.pageId}` : result.message ?? "提交失败");
    } catch {
      setPageSubmitted(false);
      setPageContextState("failed");
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
        defaultModel: providerDraft.defaultModel.trim() || "deepseek-v4-flash",
        models: DEFAULT_DEEPSEEK_MODELS
      });
      setSettings(result.settings);
      setProviderTestResult(null);
      setProviderDraft((current) => ({ ...current, apiKey: "" }));
      setSettingsStatus("idle");
      setSettingsMessage(`API Key 已配置并保存成功。${result.provider.name ? `（${result.provider.name}）` : ""}`);
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
      const result = await testProvider(provider.id);
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
      const result = await deleteProvider(provider.id);
      setSettings(result.settings);
      setProviderTestResult(null);
      setSettingsStatus("idle");
      setSettingsMessage("Provider 已删除。");
    } catch (error) {
      setSettingsStatus("error");
      setSettingsMessage(error instanceof Error ? error.message : "Provider 删除失败。");
    }
  }

  async function saveChatProvider() {
    if (runtimeStatus !== "online") {
      setSettingsStatus("error");
      setSettingsMessage("Runtime offline，无法保存 Chat Provider。");
      return;
    }
    setSettingsStatus("saving");
    setSettingsMessage("正在保存 Chat Provider...");
    try {
      await patchSettings({
        coreProvider: chatProviderDraft.coreProvider,
        chatProvider: chatProviderDraft
      });
      const next = await getSettings();
      setSettings(next);
      setChatProviderDraft(resolveChatProviderDraft(next));
      setSettingsStatus("idle");
      setSettingsMessage("Chat Provider 组合已保存。");
    } catch (error) {
      setSettingsStatus("error");
      setSettingsMessage(error instanceof Error ? error.message : "Chat Provider 保存失败。");
    }
  }

  async function testChatProvider() {
    if (runtimeStatus !== "online") {
      setSettingsStatus("error");
      setSettingsMessage("Runtime offline，无法测试 Chat Provider。");
      return;
    }
    setSettingsStatus("testing");
    setSettingsMessage("正在测试 Chat Provider...");
    const collector = createChatProviderTestCollector();
    try {
      const id = await ensureSession();
      await withTimeout(
        streamRuntimeChat(id, CHAT_PROVIDER_TEST_PROMPT, (event) => {
          const status = collector.accept(event);
          if (isTerminalChatProviderTestStatus(status)) {
            throw new ChatProviderTestTerminalError();
          }
        }, { ...chatProviderDraft, intentHint: "general_chat", autoContext: false, profile: "chat" }),
        CHAT_PROVIDER_TEST_TIMEOUT_MS
      );
      const result = collector.finalize("complete");
      setSettingsDiagnosticEvent(result.rawEvent ?? null);
      setSettingsStatus(result.status === "ok" ? "idle" : "error");
      setSettingsMessage(result.message);
    } catch (error) {
      if (error instanceof ChatProviderTestTerminalError) {
        const result = collector.finalize("complete");
        setSettingsDiagnosticEvent(result.rawEvent ?? null);
        setSettingsStatus("error");
        setSettingsMessage(result.message);
        return;
      }
      const result = error instanceof ChatProviderTestTimeoutError ? collector.finalize("timeout") : null;
      setSettingsStatus("error");
      setSettingsDiagnosticEvent(result?.rawEvent ?? null);
      setSettingsMessage(result?.message ?? (error instanceof Error ? error.message : "Chat Provider 测试失败。"));
    }
  }

  async function submitMessage() {
    if (
      !canSubmitChatInput({
        value: input,
        canChat,
        isSubmitting: isSubmittingChatRef.current || isSubmittingChat,
        isStreamingOrExecuting
      })
    ) {
      return;
    }
    isSubmittingChatRef.current = true;
    setIsSubmittingChat(true);
    try {
      await sendChat(input);
    } finally {
      isSubmittingChatRef.current = false;
      setIsSubmittingChat(false);
      textareaRef.current?.focus();
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const shouldSubmit = shouldSubmitOnKeyDown({
      key: event.key,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      eventIsComposing: (event as React.KeyboardEvent<HTMLTextAreaElement> & { isComposing?: boolean }).isComposing,
      nativeIsComposing: event.nativeEvent?.isComposing,
      composingState: isComposing
    });
    if (!shouldSubmit) return;
    event.preventDefault();
    void submitMessage();
  }

  async function sendChat(message: string, intentHint?: ChatIntent, retriedAfterCapture = false) {
    const trimmed = message.trim();
    if (!trimmed) return;
    if (runtimeStatus !== "online") {
      dispatchChatView({ type: "system_message", kind: "error", text: "Runtime offline，请启动 Local Runtime 后重试。" });
      return;
    }
    setChatTurnState("intent_detecting");
    const intent = intentHint ?? detectChatIntent(trimmed);
    const turnId = createClientTurnId();
    dispatchChatView({ type: "start_turn", turnId, text: trimmed, intentHint: intent });
    setInput("");
    if (isDeferredIntent(intent)) {
      setChatTurnState("capability_boundary");
    } else {
      setChatTurnState("context_strategy_deciding");
    }
    if (intentRequiresPageContext(intent, trimmed)) {
      setChatTurnState("context_resolving");
      dispatchChatView({ type: "agent_event", event: syntheticEvent("state.transition", turnId, { from: "context_strategy_deciding", to: "context_resolving" }) });
      const contextResult = await ensurePageContext();
      if (!contextResult.ok) {
        dispatchChatView({ type: "agent_event", event: syntheticEvent("error", turnId, { message: contextResult.message, recoverable: true }) });
        setChatTurnState("error");
        return;
      }
    }
    const id = await ensureSession();
    setChatTurnState("executing_chat");
    setStreamStatus("streaming");
    try {
      await streamRuntimeChat(
        id,
        trimmed,
        async (event) => {
          if (
            event.type === "error" &&
            event.data.code === "page_context_auto_capture_required" &&
            event.data.action === "capture_page_and_retry" &&
            !retriedAfterCapture
          ) {
            const contextResult = await ensurePageContext({ forceRefresh: true });
            if (contextResult.ok) {
              await streamRuntimeChat(
                id,
                trimmed,
                (nextEvent) => dispatchChatView({ type: "agent_event", event: nextEvent }),
                chatStreamOptions(intent, false, chatProviderDraft)
              );
            } else {
              dispatchChatView({ type: "agent_event", event: syntheticEvent("error", turnId, { message: contextResult.message, recoverable: true }) });
            }
            return;
          }
          dispatchChatView({ type: "agent_event", event });
        },
        chatStreamOptions(intent, intentRequiresPageContext(intent, trimmed), chatProviderDraft)
      );
      setStreamStatus("done");
      setChatTurnState("done");
    } catch (error) {
      setRuntimeStatus("offline");
      setStreamStatus("error");
      setChatTurnState("error");
      dispatchChatView({
        type: "agent_event",
        event: syntheticEvent("error", turnId, { message: `连接 Runtime 失败：${error instanceof Error ? error.message : "unknown error"}`, recoverable: true })
      });
    }
  }

  async function ensurePageContext(options: { forceRefresh?: boolean } = {}): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
      const currentUrl = await getActiveTabUrl();
      const reusable = pageSubmitted && pageContext && currentUrl && isSamePageUrl(pageContext.url, currentUrl);
      if (reusable && !options.forceRefresh) return { ok: true };
      setPageContextState(options.forceRefresh || pageContext ? "stale" : "capture_ready");
      setPageContextState("capturing");
      const context = await readCurrentPageContext();
      setPageContext(context);
      const id = await ensureSession();
      setSubmitStatus("正在提交页面上下文...");
      const result = await submitRuntimePageContext(context, id);
      setPageSubmitted(result.ok);
      setPageContextState(result.ok ? "captured" : "failed");
      setSubmitStatus(result.ok ? `已提交：${result.pageId}` : result.message ?? "提交失败");
      return result.ok ? { ok: true } : { ok: false, message: result.message ?? "页面读取失败，可重试或继续普通聊天。" };
    } catch (error) {
      const unsupported = error instanceof PageUnsupportedError;
      setPageContextState(unsupported ? "unsupported" : "failed");
      const message = unsupported
        ? "当前页面无法读取，但你仍可以普通聊天。如果你希望我基于页面内容回答，可以复制正文给我，或换一个普通网页。"
        : `页面读取失败：${error instanceof Error ? error.message : "未知错误"}。你仍可以继续普通聊天。`;
      setSubmitStatus(message);
      return { ok: false, message };
    }
  }

  e2eStateRef.current = {
    runtimeStatus,
    sessionId,
    pageContextState,
    chatTurnState,
    streamStatus,
    activeView,
    pageSubmitted,
    submitStatus,
    pageTitle: pageContext?.title ?? null,
    messageCount: chatView.messages.length,
    debugEventCount: chatView.debugEvents.length,
    deferredNotice: Boolean(chatView.deferredNotice),
    activeStatus: chatView.activeStatus?.text ?? null
  };

  e2eHandlersRef.current = {
    checkRuntime,
    captureCurrentPage,
    submitPageContext,
    sendChat,
    syncView
  };

  useEffect(() => {
    if (!__NAVIA_E2E_BRIDGE__) return;
    const port = chrome.runtime.connect({ name: "navia.e2e.sidepanel" });
    const onMessage = (message: unknown) => {
      if (!isE2ECommandMessage(message)) return;
      void executeE2ECommand(message.command)
        .then((result) => {
          port.postMessage({
            type: "navia.e2e.response",
            commandId: message.commandId,
            ok: true,
            result,
            snapshot: e2eStateRef.current
          });
        })
        .catch((error) => {
          port.postMessage({
            type: "navia.e2e.response",
            commandId: message.commandId,
            ok: false,
            error: error instanceof Error ? error.message : "E2E command failed",
            snapshot: e2eStateRef.current
          });
        });
    };
    port.onMessage.addListener(onMessage);
    return () => {
      port.onMessage.removeListener(onMessage);
      port.disconnect();
    };
  }, []);

  async function executeE2ECommand(command: unknown): Promise<Record<string, unknown>> {
    if (!isE2ECommand(command)) throw new Error("Invalid E2E command.");
    const handlers = e2eHandlersRef.current;
    if (command.action === "snapshot") return { snapshot: e2eStateRef.current };
    if (command.action === "check_runtime") {
      await handlers.checkRuntime?.();
      return { action: command.action };
    }
    if (command.action === "view") {
      handlers.syncView?.(command.view);
      return { action: command.action, view: command.view };
    }
    if (command.action === "capture") {
      await handlers.captureCurrentPage?.();
      return { action: command.action };
    }
    if (command.action === "submit") {
      await handlers.submitPageContext?.();
      return { action: command.action };
    }
    if (command.action === "summarize") {
      await handlers.sendChat?.("总结当前页面", "summarize_page");
      return { action: command.action };
    }
    if (command.action === "question") {
      await handlers.sendChat?.(command.message ?? "这个页面的核心目标是什么？", "page_qa");
      return { action: command.action };
    }
    if (command.action === "mindmap") {
      await handlers.sendChat?.("生成当前页面的思维导图", "mindmap_page");
      return { action: command.action };
    }
    if (command.action === "source_cards_snapshot") {
      const evidenceCardCount = document.querySelectorAll("[data-testid^='evidence-card-node-']").length;
      return {
        action: command.action,
        sourceCards: sourceCardsSnapshot(),
        evidenceCardCount,
        containsEvidenceCardMindmap: evidenceCardCount > 0,
        containsSourcePanel: Boolean(document.querySelector("[data-testid='mindmap-source-panel']"))
      };
    }
    if (command.action === "jumpback_source_card") {
      return await jumpbackSourceCard(command.index ?? 0);
    }
    throw new Error(`Unsupported E2E command: ${command.action}`);
  }

  useEffect(() => {
    checkRuntime();
    void loadSettings();
  }, []);

  useEffect(() => {
    const applyHash = () => {
      const nextView = normalizeView(window.location.hash.replace(/^#/, ""));
      setActiveView(nextView);
      setModeState(nextView === "agent" ? (runtimeStatus === "online" ? "agent_ready" : "agent_unavailable") : "chat");
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [runtimeStatus]);

  return (
    <main className="shell shell-layout" data-testid="navia-sidepanel-root">
      <section className="main-pane">
        <header className="topbar">
          <div className="topbar-copy">
            <div>
              <h1>{activeView === "chat" ? "聊天" : activeView === "agent" ? "Agent" : activeView === "debug" ? "Debug" : "设置"}</h1>
              <p className="topbar-status" data-testid="runtime-status">
                Runtime {runtimeStatus} · Page {pageContextState} · {chatTurnState}
              </p>
            </div>
          </div>
        </header>

        {activeView === "chat" ? (
          <section className="chat-stage">
            <div className="messages" aria-live="polite">
              {chatView.messages.map((message) => {
                if (message.role === "user") return <UserMessage message={message} key={message.id} />;
                if (message.role === "assistant") return <AssistantMessage message={message} key={message.id} />;
                return (
                  <article className={`message system ${message.kind}`} key={message.id}>
                    <pre>{message.text}</pre>
                  </article>
                );
              })}
              {chatView.activeStatus ? <InlineStatusRow status={chatView.activeStatus} /> : null}
              {chatView.deferredNotice ? <DeferredCapabilityNotice notice={chatView.deferredNotice} /> : null}
            </div>

            <div className="composer-stack">
              <div className="toolbar panel-strip pill-strip" data-testid="native-action-strip" aria-label="Navia quick actions">
                <button data-testid="read-current-page" disabled={runtimeStatus !== "online"} onClick={captureCurrentPage} type="button">读取当前页面</button>
                <button data-testid="submit-page-context" disabled={runtimeStatus !== "online"} onClick={submitPageContext} type="button">提交上下文</button>
                <button data-testid="summarize-page" disabled={!canStartChatAction} onClick={() => sendChat("总结当前页面", "summarize_page")} type="button">总结</button>
                <button data-testid="mindmap-page" disabled={!canStartChatAction} onClick={() => sendChat("生成当前页面的思维导图", "mindmap_page")} type="button">Mindmap</button>
                <button data-testid="explain-selection" disabled={!canStartChatAction} onClick={() => sendChat("解释选中内容", "explain_selection")} type="button">解释选区</button>
                <button data-testid="new-chat" disabled={!canStartChatAction} onClick={() => sendChat("新对话", "general_chat")} type="button">新对话</button>
              </div>

              <form
                className="chat-form composer-container"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitMessage();
                }}
              >
                <textarea
                  data-testid="chat-input"
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    event.currentTarget.style.height = "auto";
                    event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 160)}px`;
                  }}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={runtimeStatus === "online" ? "你可以直接提问。Enter 发送，Shift+Enter 换行。需要页面内容时，我会自动读取当前页面。" : "请先连接 Runtime。"}
                  rows={2}
                />
                <button data-testid="send-message" disabled={!canSubmitCurrentInput} title="Enter 发送，Shift+Enter 换行" type="submit">发送</button>
              </form>
            </div>
          </section>
        ) : null}

        {activeView === "agent" ? (
          <section className="view-panel">
            <div className="panel-heading">
              <div>
                <h2>Agent</h2>
                <p className="muted">Agent 模式入口已预留，工具执行与长任务会在后续版本开放。</p>
              </div>
            </div>
            <div className="debug-grid">
              <div className="debug-card">
                <dt>Mode</dt>
                <dd>{modeState}</dd>
              </div>
              <div className="debug-card">
                <dt>Runtime</dt>
                <dd>{runtimeStatus}</dd>
              </div>
              <div className="debug-card">
                <dt>Profile</dt>
                <dd>{settings?.defaultProfile ?? "chat"}</dd>
              </div>
              <div className="debug-card">
                <dt>Tools</dt>
                <dd>disabled</dd>
              </div>
            </div>
            <div className="debug-log">
              <p className="muted">
                {runtimeStatus === "online"
                  ? "Agent 模式当前只做能力边界展示，不执行工具、不创建 AgentTask。你仍可继续使用 Chat 完成普通问答、页面总结、Mindmap 和解释选区。"
                  : "Agent 模式暂不可用。请先启动本地 Runtime；Chat 也会在 Runtime 恢复后继续可用。"}
              </p>
              <p className="muted">暂未开放：天气查询、实时搜索、Deep Research、PPT 生成、Code Task、本地文件和命令工具。</p>
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
              <div className="debug-card" data-testid="debug-runtime">
                <dt>Runtime</dt>
                <dd>{runtimeStatus}</dd>
              </div>
              <div className="debug-card">
                <dt>Session</dt>
                <dd>{sessionId ?? "未创建"}</dd>
              </div>
              <div className="debug-card" data-testid="debug-page-state">
                <dt>Page</dt>
                <dd>{pageContextState} · {pageContext?.title ?? "尚未读取"}</dd>
              </div>
              <div className="debug-card">
                <dt>Mode</dt>
                <dd>{modeState}</dd>
              </div>
              <div className="debug-card">
                <dt>Stream</dt>
                <dd>{streamStatus} · {chatTurnState}</dd>
              </div>
            </div>
            <div className="debug-log" data-testid="debug-log">
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
              <p className="muted">
                Profile config: {settings?.profiles?.chat?.coreProvider && settings?.chatProvider?.coreProvider && settings.profiles.chat.coreProvider !== settings.chatProvider.coreProvider
                  ? `profiles.chat=${settings.profiles.chat.coreProvider} / chatProvider=${settings.chatProvider.coreProvider}`
                  : "profiles.chat 与 chatProvider 未发现冲突"}
              </p>
              <p className="muted">{settingsMessage}</p>
              <p className="muted">Raw events: {chatView.debugEvents.length}</p>
              <p className="muted">Reducer warnings: {chatView.debugWarnings.length}</p>
              <p className="muted">
                Settings diagnostic event: {settingsDiagnosticEvent ? JSON.stringify(settingsDiagnosticEvent) : "none"}
              </p>
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
                <dd>{getDefaultProvider(settings)?.name ?? "未配置"}</dd>
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
                  {(getDefaultProvider(settings)?.models ?? DEFAULT_DEEPSEEK_MODELS).map((model) => (
                    <option value={model} key={model}>{model}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="settings-summary">
              <div>
                <dt>API Key</dt>
                <dd>{getDefaultProvider(settings)?.apiKeyMasked ?? "未配置"}</dd>
              </div>
              <div>
                <dt>连接状态</dt>
                <dd>{getDefaultProvider(settings)?.testStatus?.status ?? "untested"}</dd>
              </div>
            </div>
            <div className="panel-heading panel-heading-tight settings-subheading">
              <div>
                <h2>Chat Provider</h2>
                <p className="muted">选择聊天使用的 CoreProvider / LLM Provider / Model。</p>
              </div>
            </div>
            <div className="settings-summary">
              <div>
                <dt>Core</dt>
                <dd>{settings?.chatProvider?.coreProvider ?? settings?.coreProvider ?? "未配置"}</dd>
              </div>
              <div>
                <dt>Runtime 当前生效配置</dt>
                <dd>
                  {getProviderById(settings, settings?.chatProvider?.llmProviderId)?.name ?? "未配置"} / {settings?.chatProvider?.model ?? "未配置"}
                </dd>
              </div>
            </div>
            <div className="settings-summary">
              <div>
                <dt>草稿 Core</dt>
                <dd>{chatProviderDraft.coreProvider}</dd>
              </div>
              <div>
                <dt>草稿 Model</dt>
                <dd>{getProviderById(settings, chatProviderDraft.llmProviderId)?.name ?? "未配置"} / {chatProviderDraft.model ?? "未配置"}</dd>
              </div>
            </div>
            <div className="settings-grid">
              <label>
                <span>Core Provider</span>
                <select
                  value={chatProviderDraft.coreProvider}
                  onChange={(event) => setChatProviderDraft((current) => ({ ...current, coreProvider: event.target.value as CoreProviderId }))}
                >
                  {CORE_PROVIDERS.map((provider) => (
                    <option value={provider} key={provider}>{provider}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>LLM Provider</span>
                <select
                  value={chatProviderDraft.llmProviderId ?? ""}
                  onChange={(event) => {
                    const provider = getProviderById(settings, event.target.value);
                    setChatProviderDraft((current) => ({
                      ...current,
                      llmProviderId: provider?.id,
                      model: provider?.defaultModel ?? current.model
                    }));
                  }}
                >
                  <option value="">未配置</option>
                  {(settings?.providers ?? []).map((provider) => (
                    <option value={provider.id} key={provider.id}>{provider.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Chat Model</span>
                <select
                  value={chatProviderDraft.model ?? ""}
                  onChange={(event) => setChatProviderDraft((current) => ({ ...current, model: event.target.value }))}
                >
                  {(getProviderById(settings, chatProviderDraft.llmProviderId)?.models ?? DEFAULT_DEEPSEEK_MODELS).map((model) => (
                    <option value={model} key={model}>{model}</option>
                  ))}
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
              <button disabled={runtimeStatus !== "online" || settingsStatus === "saving" || settingsStatus === "testing"} onClick={saveChatProvider} type="button">
                保存 Chat Provider
              </button>
              <button disabled={runtimeStatus !== "online" || settingsStatus === "saving" || settingsStatus === "testing"} onClick={testChatProvider} type="button">
                测试 Chat Provider
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
          data-testid="nav-chat-tab"
          type="button"
          aria-current={activeView === "chat" ? "true" : undefined}
          onClick={() => syncView("chat")}
        >
          聊天
        </button>
        <button
          className={`tool-button ${activeView === "agent" ? "active" : ""}`}
          data-testid="nav-agent-tab"
          type="button"
          aria-current={activeView === "agent" ? "true" : undefined}
          onClick={() => syncView("agent")}
        >
          Agent
        </button>
        <button
          className={`tool-button ${activeView === "debug" ? "active" : ""}`}
          data-testid="nav-debug-tab"
          type="button"
          aria-current={activeView === "debug" ? "true" : undefined}
          onClick={() => syncView("debug")}
        >
          Debug
        </button>
        <button
          className={`tool-button ${activeView === "settings" ? "active" : ""}`}
          data-testid="nav-settings-tab"
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

type E2ECommand =
  | { action: "snapshot" }
  | { action: "check_runtime" }
  | { action: "view"; view: SideView }
  | { action: "capture" }
  | { action: "submit" }
  | { action: "summarize" }
  | { action: "question"; message?: string }
  | { action: "mindmap" }
  | { action: "source_cards_snapshot" }
  | { action: "jumpback_source_card"; index?: number };

type E2EHandlers = {
  checkRuntime?: () => Promise<boolean>;
  captureCurrentPage?: () => Promise<void>;
  submitPageContext?: () => Promise<void>;
  sendChat?: (message: string, intentHint?: ChatIntent, retriedAfterCapture?: boolean) => Promise<void>;
  syncView?: (nextView: SideView) => void;
};

function isE2ECommandMessage(value: unknown): value is { type: string; commandId: string; command: unknown } {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.type === "navia.e2e.command" && typeof record.commandId === "string";
}

function isE2ECommand(value: unknown): value is E2ECommand {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const action = record.action;
  if (action === "view") {
    return record.view === "chat" || record.view === "agent" || record.view === "debug" || record.view === "settings";
  }
  return (
    action === "snapshot" ||
    action === "check_runtime" ||
    action === "capture" ||
    action === "submit" ||
    action === "summarize" ||
    action === "question" ||
    action === "mindmap" ||
    action === "source_cards_snapshot" ||
    (action === "jumpback_source_card" && (record.index === undefined || typeof record.index === "number"))
  );
}

function sourceCardsSnapshot(): Array<{ index: number; testId: string | null; nodeId: string; sourceRefIds: string[]; label: string; excerpt: string }> {
  const panels = Array.from(document.querySelectorAll<HTMLElement>("[data-testid='mindmap-source-panel']"));
  const scope = panels.at(-1) ?? document;
  return Array.from(scope.querySelectorAll<HTMLButtonElement>("[data-testid^='mindmap-source-card-']")).map((button, index) => {
    const label = button.querySelector("span")?.textContent?.trim() ?? button.textContent?.trim() ?? "";
    const excerpt = button.querySelector("small")?.textContent?.trim() ?? "";
    return {
      index,
      testId: button.getAttribute("data-testid"),
      nodeId: button.dataset.nodeId ?? "",
      sourceRefIds: (button.dataset.sourceRefIds ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      label,
      excerpt
    };
  });
}

async function jumpbackSourceCard(index: number): Promise<Record<string, unknown>> {
  const panels = Array.from(document.querySelectorAll<HTMLElement>("[data-testid='mindmap-source-panel']"));
  const scope = panels.at(-1) ?? document;
  const cards = Array.from(scope.querySelectorAll<HTMLButtonElement>("[data-testid^='mindmap-source-card-']"));
  const card = cards[index];
  if (!card) {
    throw new Error(`Mindmap source card not found at index ${index}.`);
  }
  card.click();
  const startedAt = Date.now();
  let evidenceText = "";
  while (Date.now() - startedAt < 10_000) {
    evidenceText = document.querySelector("[data-testid='mindmap-source-evidence']")?.textContent?.trim() ?? "";
    if (evidenceText.includes("已定位并高亮来源") || evidenceText.includes("未能定位到原文位置")) {
      break;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }
  return {
    action: "jumpback_source_card",
    index,
    sourceCards: sourceCardsSnapshot(),
    evidenceText,
    status: evidenceText.includes("已定位并高亮来源") ? "highlighted" : evidenceText.includes("未能定位到原文位置") ? "fallback_shown" : "blocked"
  };
}

function isTerminalChatProviderTestStatus(status: ChatProviderTestStatus): boolean {
  return (
    status === "tool_boundary" ||
    status === "provider_error" ||
    status === "pi_rpc_no_text" ||
    status === "pi_normalizer_no_delta" ||
    status === "provider_auth_failed" ||
    status === "piagent_provider_config_missing"
  );
}

class PageUnsupportedError extends Error {}

async function readCurrentPageContext(): Promise<ExtractedPageContext> {
  const tab = await resolveReadableTab();
  if (!tab.id || !tab.url) {
    throw new Error("无法定位当前标签页。");
  }
  if (!/^https?:|^file:/.test(tab.url)) {
    throw new PageUnsupportedError("当前页面无法读取，但你仍可以普通聊天。");
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
    throw new Error("页面未返回上下文。");
  }
  return context;
}

async function resolveReadableTab(): Promise<chrome.tabs.Tab> {
  const e2eTabId = getE2ETabId();
  if (e2eTabId && /^\d+$/.test(e2eTabId)) {
    const tab = await chrome.tabs.get(Number(e2eTabId));
    if (tab?.id) return tab;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function detectChatIntent(message: string): ChatIntent {
  const normalized = message.trim().toLowerCase();
  if (/(天气|weather|气温)/i.test(normalized)) return "weather_lookup";
  if (/(搜索|search|查一下|google|联网)/i.test(normalized)) return "web_search";
  if (/(新闻|news|资讯|实时)/i.test(normalized)) return "realtime_news";
  if (/(deep research|深度研究|深入研究)/i.test(normalized)) return "deep_research";
  if (/(ppt|幻灯片|演示文稿)/i.test(normalized)) return "slide_generation";
  if (/(code task|代码任务|改代码|写代码)/i.test(normalized)) return "code_task";
  if (/(mindmap|mermaid|思维导图|脑图)/i.test(normalized)) return "mindmap_page";
  if (/(总结|summary|summarize)/i.test(normalized)) return "summarize_page";
  if (/(解释选区|解释选中|selection|selected text)/i.test(normalized)) return "explain_selection";
  if (/(当前页面|这个页面|这页|这篇|这篇文章|这段|上面内容|文章)/i.test(normalized)) return "page_qa";
  if (/(改写|rewrite|润色)/i.test(normalized)) return "rewrite";
  return "general_chat";
}

function isDeferredIntent(intent: ChatIntent): boolean {
  return (
    intent === "weather_lookup" ||
    intent === "web_search" ||
    intent === "realtime_news" ||
    intent === "deep_research" ||
    intent === "slide_generation" ||
    intent === "code_task"
  );
}

function createClientTurnId(): string {
  return `turn_ui_${crypto.randomUUID().replaceAll("-", "")}`;
}

function syntheticEvent(type: string, turnId: string, data: Record<string, unknown>): AgentEvent {
  return {
    event_id: `evt_ui_${crypto.randomUUID().replaceAll("-", "")}`,
    session_id: "sess_ui",
    turn_id: turnId,
    type,
    data
  };
}

function intentRequiresPageContext(intent: ChatIntent, message: string): boolean {
  if (intent === "page_qa" || intent === "summarize_page" || intent === "mindmap_page" || intent === "explain_selection") return true;
  return /(当前页面|这个页面|这页|这篇|这篇文章|这段|上面内容)/i.test(message);
}

function chatStreamOptions(
  intent: ChatIntent,
  autoContext: boolean,
  provider: ChatProviderConfig
): Partial<ChatProviderConfig> & { intentHint: ChatIntent; autoContext: boolean; profile: "chat" } {
  const base = { intentHint: intent, autoContext, profile: "chat" } as const;
  if (intent === "page_qa" || intent === "summarize_page" || intent === "mindmap_page" || intent === "explain_selection") {
    return base;
  }
  return { ...provider, ...base };
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
  return providers.find((provider) => provider.id === settings?.defaultProviderId) ?? providers[0] ?? null;
}

function getProviderById(settings: MercurySettings | null, providerId: string | undefined): LLMProviderConfig | null {
  if (!providerId) return null;
  return (settings?.providers ?? []).find((provider) => provider.id === providerId) ?? null;
}

function resolveChatProviderDraft(settings: MercurySettings): ChatProviderConfig {
  const defaultProvider = getDefaultProvider(settings);
  const configured = settings.chatProvider;
  const configuredProvider = getProviderById(settings, configured?.llmProviderId);
  const provider = configuredProvider ?? defaultProvider;
  return {
    coreProvider: configured?.coreProvider ?? settings.coreProvider ?? "llm_direct",
    llmProviderId: provider?.id,
    model: configured?.model ?? provider?.defaultModel ?? settings.defaultModel ?? "deepseek-v4-flash"
  };
}

async function getActiveTabUrl(): Promise<string | null> {
  try {
    const e2eTabId = getE2ETabId();
    if (e2eTabId && /^\d+$/.test(e2eTabId)) {
      const tab = await chrome.tabs.get(Number(e2eTabId));
      return typeof tab?.url === "string" ? tab.url : null;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return typeof tab?.url === "string" ? tab.url : null;
  } catch {
    return null;
  }
}

function getE2ETabId(): string | null {
  if (!__NAVIA_E2E_BRIDGE__) return null;
  return new URLSearchParams(window.location.search).get("naviaE2ETabId");
}

class ChatProviderTestTerminalError extends Error {}
class ChatProviderTestTimeoutError extends Error {}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new ChatProviderTestTimeoutError("Chat Provider test timeout.")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
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
