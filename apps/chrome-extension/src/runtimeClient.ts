import type { ExtractedPageContext } from "./pageContext";
import type { AgentEvent } from "./sse";
import { parseSseBlocks } from "./sse";

export const RUNTIME_URL = "http://127.0.0.1:17861";
export const LAST_SESSION_STORAGE_KEY = "navia_last_session_id";

export type RuntimeStatus = "checking" | "online" | "offline";
export type ChatRole = "user" | "assistant" | "system";

export type ArtifactRecord = {
  artifactId: string;
  type: string;
  sourcePageId?: string;
  turnId: string;
  toolCallId: string;
  source?: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  turnId?: string;
  artifact?: ArtifactRecord;
};

export type RestoredMessage = {
  message_id: string;
  turn_id?: string;
  role: ChatRole;
  content: string;
};

export type RestoredSession = {
  session_id: string;
  activePage?: {
    url: string;
    title: string;
    domain: string;
    captured_at?: string;
  } | null;
  messages?: RestoredMessage[];
  artifacts?: ArtifactRecord[];
};

export type StructuredPageDebug = Record<string, unknown>;

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: { message?: string };
};

export async function checkRuntimeHealth(): Promise<boolean> {
  const body = await runtimeJson<{ status: string }>({ path: "/v1/health" });
  return Boolean(body.ok);
}

export async function createRuntimeSession(source: string): Promise<string> {
  const body = await runtimeJson<{ session_id: string }>({
    path: "/v1/sessions",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { client: "chrome-extension", metadata: { source } }
  });
  const id = body.data.session_id;
  await chrome.storage.local.set({ [LAST_SESSION_STORAGE_KEY]: id });
  return id;
}

export async function getLastSessionId(): Promise<string | null> {
  const stored = await chrome.storage.local.get(LAST_SESSION_STORAGE_KEY);
  const id = stored[LAST_SESSION_STORAGE_KEY];
  return typeof id === "string" && id.startsWith("sess_") ? id : null;
}

export async function clearLastSessionId() {
  await chrome.storage.local.remove(LAST_SESSION_STORAGE_KEY);
}

export async function restoreRuntimeSession(sessionId: string): Promise<RestoredSession | null> {
  const body = await runtimeJson<RestoredSession>({ path: `/v1/sessions/${sessionId}` });
  if (!body.ok) {
    await clearLastSessionId();
    return null;
  }
  return body.data;
}

export async function submitRuntimePageContext(
  context: ExtractedPageContext,
  sessionId: string
): Promise<{ ok: boolean; pageId?: string; structuredPage?: StructuredPageDebug; message?: string }> {
  const body = await runtimeJson<{ page_id: string; structuredPage?: StructuredPageDebug }>({
    path: "/v1/page/context",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { ...context, session_id: sessionId }
  });
  if (!body.ok) return { ok: false, message: body.error?.message ?? "PageContext submit failed." };
  await chrome.storage.local.set({ [LAST_SESSION_STORAGE_KEY]: sessionId });
  return { ok: true, pageId: body.data.page_id, structuredPage: body.data.structuredPage };
}

export async function streamRuntimeChat(
  sessionId: string,
  message: string,
  onEvent: (event: AgentEvent) => void
): Promise<void> {
  const request = {
    path: "/v1/chat/stream",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {
      session_id: sessionId,
      message,
      source: "typed",
      request_id: `req_${crypto.randomUUID().replace(/-/g, "")}`
    }
  };
  if (shouldUseRuntimeProxy()) return streamRuntimeChatViaProxy(request, onEvent);
  const response = await fetch(`${RUNTIME_URL}/v1/chat/stream`, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(request.body)
  });
  if (!response.body) throw new Error("SSE response body is empty.");
  await readSse(response.body, onEvent);
}

export function restoreMessages(restored: RestoredSession): ChatMessage[] {
  const artifactsByTurn = new Map((restored.artifacts ?? []).map((artifact) => [artifact.turnId, artifact]));
  return (restored.messages ?? [])
    .filter((message) => message.role === "user" || message.role === "assistant" || message.role === "system")
    .map((message) => ({
      id: message.message_id,
      role: message.role,
      text: message.content,
      turnId: message.turn_id,
      artifact: message.turn_id ? artifactsByTurn.get(message.turn_id) : undefined
    }));
}

async function readSse(stream: ReadableStream<Uint8Array>, onEvent: (event: AgentEvent) => void) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseBlocks(buffer);
    buffer = parsed.remainder;
    for (const event of parsed.events) {
      onEvent(event);
    }
  }
}

type RuntimeRequest = {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

type RuntimeProxyResponse<T> = {
  ok: boolean;
  response?: { status: number; ok: boolean; body: ApiResponse<T> };
  error?: string;
};

async function runtimeJson<T>(request: RuntimeRequest): Promise<ApiResponse<T>> {
  if (shouldUseRuntimeProxy()) {
    const proxied = (await chrome.runtime.sendMessage({
      type: "navia.runtimeFetch",
      request
    })) as RuntimeProxyResponse<T>;
    if (!proxied.ok || !proxied.response) {
      throw new Error(proxied.error ?? "Runtime proxy failed.");
    }
    return proxied.response.body;
  }

  const response = await fetch(`${RUNTIME_URL}${request.path}`, {
    method: request.method ?? "GET",
    headers: request.headers,
    body: request.body === undefined ? undefined : JSON.stringify(request.body)
  });
  return (await response.json()) as ApiResponse<T>;
}

function shouldUseRuntimeProxy(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.sendMessage) && window.location.protocol !== "chrome-extension:";
}

async function streamRuntimeChatViaProxy(request: RuntimeRequest, onEvent: (event: AgentEvent) => void): Promise<void> {
  const port = chrome.runtime.connect({ name: "navia.runtimeStream" });
  let buffer = "";
  return new Promise((resolve, reject) => {
    port.onMessage.addListener((message) => {
      if (message?.type === "chunk" && typeof message.text === "string") {
        buffer += message.text;
        const parsed = parseSseBlocks(buffer);
        buffer = parsed.remainder;
        for (const event of parsed.events) onEvent(event);
        return;
      }
      if (message?.type === "done") {
        port.disconnect();
        resolve();
        return;
      }
      if (message?.type === "error") {
        port.disconnect();
        reject(new Error(String(message.message ?? "Runtime stream proxy failed.")));
      }
    });
    port.postMessage({ type: "navia.runtimeStream", request });
  });
}
