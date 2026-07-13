import type { ExtractedPageContext } from "./pageContext";
import type { AgentEvent } from "./sse";
import { parseSseBlocks } from "./sse";

export const RUNTIME_URL = "http://127.0.0.1:17861";
export const LAST_SESSION_STORAGE_KEY = "navia_last_session_id";

export type RuntimeStatus = "checking" | "online" | "offline";
export type ChatRole = "user" | "assistant" | "system";
export type ProviderTestStatus = "ok" | "error";

export type LLMProviderConfig = {
  id: string;
  type: string;
  name: string;
  baseUrl: string;
  models: string[];
  defaultModel: string;
  isDefault: boolean;
  apiKeyMasked: string;
  testStatus: ProviderTestResult | { status: "untested"; message: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type MercurySettings = {
  providers: LLMProviderConfig[];
  defaultProviderId: string | null;
  defaultModel: string | null;
  coreProvider?: CoreProviderId | null;
  chatProvider?: ChatProviderConfig | null;
  defaultProfile?: RuntimeProfile | null;
  profiles?: Record<RuntimeProfile, ProfileConfig> | null;
  settingsMigration?: Record<string, boolean> | null;
  updatedAt: string;
};

export type CoreProviderId = "mock" | "llm_direct" | "piagent" | "custom";
export type RuntimeProfile = "chat" | "agent";

export type ToolPolicy = {
  mode: "disabled" | "approval_allowlist";
  allowedTools: string[];
};

export type ProfileConfig = {
  profile: RuntimeProfile;
  coreProvider: CoreProviderId;
  llmProviderId?: string;
  model?: string;
  toolPolicy: ToolPolicy;
  enabled: boolean;
};

export type ChatProviderConfig = {
  coreProvider: CoreProviderId;
  llmProviderId?: string;
  model?: string;
};

export type ChatIntent =
  | "general_chat"
  | "page_qa"
  | "summarize_page"
  | "mindmap_page"
  | "explain_selection"
  | "rewrite"
  | "translate"
  | "weather_lookup"
  | "web_search"
  | "realtime_news"
  | "deep_research"
  | "slide_generation"
  | "code_task"
  | "unknown";

export type ProviderTestResult =
  | {
      status: "ok";
      latencyMs: number;
      message: string;
    }
  | {
      status: "error";
      latencyMs?: number;
      message: string;
      error?: { message: string };
    };

export type PiSidecarHealth = {
  status: "ok" | "unavailable";
  provider: "piagent";
  sidecar: "reachable" | "unreachable";
  recoverable?: boolean;
  code?: string;
  message?: string;
  nextSteps?: string[];
  checkedAt: string;
};

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
  artifacts?: ArtifactRecord[];
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

export type PageRef = {
  id: string;
  url: string;
  title: string;
  domain: string;
  capturedAt: string;
  contentHash?: string;
};

export type ChatSession = {
  id: string;
  title: string;
  profile: RuntimeProfile;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  pageRef?: PageRef | null;
  messageCount: number;
  archived?: boolean;
  lastMessageExcerpt?: string;
  hasArtifacts?: boolean;
};

export type ChatMessageRecord = {
  id: string;
  sessionId: string;
  turnId?: string;
  role: ChatRole;
  kind?: "normal" | "status" | "deferred" | "error";
  content: string;
  createdAt: string;
  artifactIds?: string[];
  pageContextId?: string;
};

export type ChatSessionMessagesResponse = {
  session: ChatSession;
  messages: ChatMessageRecord[];
  artifacts: ArtifactRecord[];
};

export type StructuredPageDebug = Record<string, unknown>;

export type KnowledgeServiceStatus = {
  schemaVersion: string;
  observedAt: string;
  frontendInferredRuntimeStatus: RuntimeStatus;
  runtimeStatus: RuntimeStatus;
  adapterStatus: "ready" | "degraded" | "blocked" | "not_configured";
  dataServiceStatus: "unchecked" | "connected" | "auth_required" | "unreachable" | "version_mismatch" | "blocked_by_policy";
  sourceBuildStatus?: "not_saved" | "queued" | "ingesting" | "building" | "trace_ready" | "degraded" | "failed" | "forgotten";
  capabilities?: Record<string, boolean>;
  userAction?: string;
  message?: string;
  redactionApplied?: boolean;
};

export type KnowledgeSource = {
  sourceId: string;
  workspaceId: string;
  sourceType: string;
  title?: string;
  originUrl?: string;
  status: NonNullable<KnowledgeServiceStatus["sourceBuildStatus"]>;
  revision: number;
  operationId?: string;
  evidenceRefs?: Array<Record<string, unknown>>;
  createdAt: string;
  updatedAt?: string;
};

export type KnowledgeOperation = {
  operationId: string;
  operationType: string;
  status: "queued" | "running" | "succeeded" | "degraded" | "failed" | "cancelled";
  sourceId?: string;
  workspaceId?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt?: string;
};

export type SaveKnowledgeSourceResult = {
  source: KnowledgeSource;
  operation: KnowledgeOperation;
  idempotentReplay: boolean;
};

export type KnowledgeWorkspace = {
  workspaceId: string;
  name: string;
  description?: string;
  sourceCount: number;
  pendingBuildCount: number;
  traceCoverage: number;
  createdAt: string;
  updatedAt?: string;
};

export type KnowledgeQueryResult = {
  workspaceId: string;
  question: string;
  answer: string;
  status: "source_supported" | "degraded" | string;
  degradedReason?: string;
  evidenceRefs: Array<Record<string, unknown>>;
};

export type KnowledgeGraph = {
  workspaceId: string;
  nodes: Array<{ id: string; label: string; type: string }>;
  edges: Array<{ id: string; from: string; to: string; type: string }>;
  status: "ready" | "degraded" | string;
};

export type PermissionRoot = {
  permissionRootId: string;
  displayName: string;
  redactedPath: string;
  state: "granted" | "revoked" | string;
  scope: "single_file" | "directory" | "workspace_export" | string;
  createdAt: string;
  revokedAt?: string;
};

export type PermissionResult = {
  permissionRoot: PermissionRoot;
  operation: KnowledgeOperation;
};

export type ForgetSourceResult = {
  forgetRequest: Record<string, unknown>;
  verification: {
    verificationId: string;
    forgetRequestId: string;
    sourceId: string;
    libraryAbsent: boolean;
    askAbsent: boolean;
    graphAbsent: boolean;
    traceAbsent: boolean;
    verifiedAt: string;
  };
  operation: KnowledgeOperation;
};

type ApiResponse<T> = {
  ok: boolean;
  data: T | null;
  error?: { message?: string; code?: string; details?: Record<string, unknown> };
};

export async function checkRuntimeHealth(): Promise<boolean> {
  const body = await runtimeJson<{ status: string }>({ path: "/v1/health" });
  return Boolean(body.ok);
}

let piSidecarHealthCache: { value: PiSidecarHealth; expiresAt: number } | null = null;

export async function checkPiSidecarHealth(options: { force?: boolean } = {}): Promise<PiSidecarHealth> {
  const now = Date.now();
  if (!options.force && piSidecarHealthCache && piSidecarHealthCache.expiresAt > now) {
    return piSidecarHealthCache.value;
  }
  const body = unwrapApiResponse(await runtimeJson<PiSidecarHealth>({ path: "/v1/pi/sidecar/health" }));
  piSidecarHealthCache = { value: body, expiresAt: now + 8_000 };
  return body;
}

export async function createRuntimeSession(source: string): Promise<string> {
  const body = unwrapApiResponse(await runtimeJson<{ session_id: string }>({
    path: "/v1/sessions",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { client: "chrome-extension", metadata: { source } }
  }));
  const id = body.session_id;
  await chrome.storage.local.set({ [LAST_SESSION_STORAGE_KEY]: id });
  return id;
}

export async function listChatSessions(): Promise<ChatSession[]> {
  const body = await runtimeJson<{ sessions: ChatSession[] }>({ path: "/v1/chat/sessions" });
  return unwrapApiResponse(body).sessions;
}

export async function createChatSession(input: { title?: string; profile?: RuntimeProfile; pageRef?: PageRef; source?: string } = {}): Promise<ChatSession> {
  const body = await runtimeJson<{ session: ChatSession }>({
    path: "/v1/chat/sessions",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: input
  });
  const session = unwrapApiResponse(body).session;
  await chrome.storage.local.set({ [LAST_SESSION_STORAGE_KEY]: session.id });
  return session;
}

export async function getChatSession(sessionId: string): Promise<ChatSession | null> {
  const body = await runtimeJson<{ session: ChatSession }>({ path: `/v1/chat/sessions/${sessionId}` });
  if (!body.ok) return null;
  return unwrapApiResponse(body).session;
}

export async function patchChatSession(
  sessionId: string,
  input: Partial<Pick<ChatSession, "title" | "profile" | "archived" | "pageRef">>
): Promise<ChatSession> {
  const body = await runtimeJson<{ session: ChatSession }>({
    path: `/v1/chat/sessions/${sessionId}`,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: input
  });
  return unwrapApiResponse(body).session;
}

export async function archiveChatSession(sessionId: string): Promise<ChatSession> {
  const body = await runtimeJson<{ session: ChatSession }>({
    path: `/v1/chat/sessions/${sessionId}`,
    method: "DELETE"
  });
  return unwrapApiResponse(body).session;
}

export async function getChatSessionMessages(sessionId: string): Promise<ChatSessionMessagesResponse> {
  const body = await runtimeJson<ChatSessionMessagesResponse>({ path: `/v1/chat/sessions/${sessionId}/messages` });
  return unwrapApiResponse(body);
}

export async function getLastSessionId(): Promise<string | null> {
  const stored = await chrome.storage.local.get(LAST_SESSION_STORAGE_KEY);
  const id = stored[LAST_SESSION_STORAGE_KEY];
  return typeof id === "string" && id.startsWith("sess_") ? id : null;
}

export async function getSettings(): Promise<MercurySettings> {
  const body = await runtimeJson<MercurySettings>({ path: "/v1/settings" });
  return unwrapApiResponse(body);
}

export async function patchSettings(
  input: Partial<
    Pick<MercurySettings, "defaultProviderId" | "defaultModel" | "coreProvider" | "chatProvider" | "defaultProfile" | "profiles">
  >
): Promise<MercurySettings> {
  const body = await runtimeJson<MercurySettings>({
    path: "/v1/settings",
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: input
  });
  return unwrapApiResponse(body);
}

export async function importProvider(input: {
  providerType?: string;
  displayName?: string;
  type?: string;
  name?: string;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  models?: string[];
}): Promise<{ settings: MercurySettings; provider: LLMProviderConfig }> {
  const body = await runtimeJson<{ settings: MercurySettings; provider: LLMProviderConfig }>({
    path: "/v1/llm/providers/import",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {
      type: input.type ?? input.providerType ?? "deepseek",
      name: input.name ?? input.displayName ?? "DeepSeek",
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      defaultModel: input.defaultModel,
      models: input.models
    }
  });
  return unwrapApiResponse(body);
}

export async function deleteProvider(providerId: string): Promise<{ settings: MercurySettings }> {
  const body = await runtimeJson<MercurySettings>({
    path: `/v1/llm/providers/${providerId}`,
    method: "DELETE"
  });
  return { settings: unwrapApiResponse(body) };
}

export async function testProvider(providerId: string): Promise<ProviderTestResult> {
  const body = await runtimeJson<{ result: ProviderTestResult; provider: LLMProviderConfig }>({
    path: `/v1/llm/providers/${providerId}/test`,
    method: "POST"
  });
  return unwrapApiResponse(body).result;
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
  return unwrapApiResponse(body);
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
  const data = unwrapApiResponse(body);
  await chrome.storage.local.set({ [LAST_SESSION_STORAGE_KEY]: sessionId });
  return { ok: true, pageId: data.page_id, structuredPage: data.structuredPage };
}

export async function getKnowledgeServiceStatus(): Promise<KnowledgeServiceStatus> {
  return unwrapApiResponse(await runtimeJson<KnowledgeServiceStatus>({ path: "/v1/knowledge/status" }));
}

export async function listKnowledgeWorkspaces(): Promise<KnowledgeWorkspace[]> {
  const body = unwrapApiResponse(await runtimeJson<{ workspaces: KnowledgeWorkspace[]; cursor: string | null }>({ path: "/v1/knowledge/workspaces" }));
  return body.workspaces;
}

export async function listKnowledgeSources(workspaceId = "ws_default"): Promise<KnowledgeSource[]> {
  const body = unwrapApiResponse(await runtimeJson<{ workspaceId: string; sources: KnowledgeSource[]; cursor: string | null }>({
    path: `/v1/knowledge/sources?workspaceId=${encodeURIComponent(workspaceId)}`
  }));
  return body.sources;
}

export async function getKnowledgeSource(sourceId: string): Promise<KnowledgeSource> {
  const body = unwrapApiResponse(await runtimeJson<{ source: KnowledgeSource }>({ path: `/v1/knowledge/sources/${encodeURIComponent(sourceId)}` }));
  return body.source;
}

export async function askKnowledgeSources(input: { workspaceId: string; question: string; sourceIds?: string[] }): Promise<KnowledgeQueryResult> {
  return unwrapApiResponse(await runtimeJson<KnowledgeQueryResult>({
    path: "/v1/knowledge/query",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {
      workspaceId: input.workspaceId,
      question: input.question,
      sourceIds: input.sourceIds
    }
  }));
}

export async function getKnowledgeGraph(workspaceId = "ws_default"): Promise<KnowledgeGraph> {
  return unwrapApiResponse(await runtimeJson<KnowledgeGraph>({
    path: `/v1/knowledge/graph?workspaceId=${encodeURIComponent(workspaceId)}`
  }));
}

export async function grantKnowledgePermission(input: { displayName: string; redactedPath: string; scope: PermissionRoot["scope"] }): Promise<PermissionResult> {
  return unwrapApiResponse(await runtimeJson<PermissionResult>({
    path: "/v1/knowledge/permissions",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: input
  }));
}

export async function revokeKnowledgePermission(permissionRootId: string): Promise<PermissionResult> {
  return unwrapApiResponse(await runtimeJson<PermissionResult>({
    path: `/v1/knowledge/permissions/${encodeURIComponent(permissionRootId)}`,
    method: "DELETE"
  }));
}

export async function forgetKnowledgeSource(sourceId: string, confirmationText: string): Promise<ForgetSourceResult> {
  return unwrapApiResponse(await runtimeJson<ForgetSourceResult>({
    path: `/v1/knowledge/sources/${encodeURIComponent(sourceId)}/forget`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { confirmationText }
  }));
}

export async function saveCurrentPageToKnowledge(context: ExtractedPageContext): Promise<SaveKnowledgeSourceResult> {
  const idempotencyKey = knowledgeIdempotencyKey(context);
  const candidate = {
    candidateId: `cand_${crypto.randomUUID().replace(/-/g, "")}`,
    workspaceId: "ws_default",
    sourceType: "web_page",
    title: context.title,
    url: context.url,
    pageId: `page_${hashString(`${context.url}:${context.captured_at}`)}`,
    createdAt: context.captured_at || new Date().toISOString(),
    idempotencyKey,
    artifactIds: [],
    sourceRefs: knowledgeEvidenceRefs(context)
  };
  return unwrapApiResponse(await runtimeJson<SaveKnowledgeSourceResult>({
    path: "/v1/knowledge/sources",
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: candidate
  }));
}

export async function streamRuntimeChat(
  sessionId: string | null,
  message: string,
  onEvent: (event: AgentEvent) => void | Promise<void>,
  overrides?: {
    coreProvider?: CoreProviderId;
    llmProviderId?: string;
    model?: string;
    intentHint?: ChatIntent;
    autoContext?: boolean;
    pageId?: string;
    pageContextRef?: string;
    profile?: RuntimeProfile;
  }
): Promise<void> {
  const request = {
    path: "/v1/chat/stream",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {
      ...(sessionId ? { session_id: sessionId } : {}),
      message,
      source: "typed",
      request_id: `req_${crypto.randomUUID().replace(/-/g, "")}`,
      ...overrides
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

export function restoreChatSessionMessages(restored: ChatSessionMessagesResponse): ChatMessage[] {
  const artifactsByTurn = new Map<string, ArtifactRecord[]>();
  for (const artifact of restored.artifacts ?? []) {
    const existing = artifactsByTurn.get(artifact.turnId) ?? [];
    existing.push(artifact);
    artifactsByTurn.set(artifact.turnId, existing);
  }
  return (restored.messages ?? [])
    .filter((message) => message.role === "user" || message.role === "assistant" || message.role === "system")
    .map((message) => {
      const artifacts = message.turnId ? artifactsByTurn.get(message.turnId) ?? [] : [];
      return {
        id: message.id,
        role: message.role,
        text: message.content,
        turnId: message.turnId,
        artifact: artifacts[0],
        artifacts
      };
    });
}

async function readSse(stream: ReadableStream<Uint8Array>, onEvent: (event: AgentEvent) => void | Promise<void>) {
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
      await onEvent(event);
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

function knowledgeIdempotencyKey(context: ExtractedPageContext): string {
  return `navia-v2-${hashString(`${context.url}:${context.title}:${context.captured_at}`)}`;
}

function knowledgeEvidenceRefs(context: ExtractedPageContext): Array<Record<string, unknown>> {
  const firstBlock = context.dom_signals?.blocks?.find((block) => block.text?.trim());
  const textQuote = (firstBlock?.text || context.cleaned_text || context.visible_text || context.title).slice(0, 500);
  const ref: Record<string, unknown> = {
    evidenceRefId: `ev_${hashString(`${context.url}:${textQuote}`)}`,
    sourceId: "src_pending",
    locatorType: firstBlock?.selector ? "dom_selector" : "fallback_text",
    selector: firstBlock?.selector,
    textQuote,
    status: firstBlock?.selector ? "located" : "fallback_shown",
    fallbackText: textQuote,
    redactionApplied: true
  };
  return [Object.fromEntries(Object.entries(ref).filter(([, value]) => value !== undefined))];
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).padStart(8, "0");
}

async function streamRuntimeChatViaProxy(request: RuntimeRequest, onEvent: (event: AgentEvent) => void | Promise<void>): Promise<void> {
  const port = chrome.runtime.connect({ name: "navia.runtimeStream" });
  let buffer = "";
  let eventChain = Promise.resolve();
  return new Promise((resolve, reject) => {
    port.onMessage.addListener((message) => {
      if (message?.type === "chunk" && typeof message.text === "string") {
        buffer += message.text;
        const parsed = parseSseBlocks(buffer);
        buffer = parsed.remainder;
        eventChain = parsed.events.reduce((chain, event) => chain.then(() => onEvent(event)), eventChain);
        void eventChain.catch((error) => {
          port.disconnect();
          reject(error instanceof Error ? error : new Error("Runtime stream event handling failed."));
        });
        return;
      }
      if (message?.type === "done") {
        void eventChain
          .then(() => {
            port.disconnect();
            resolve();
          })
          .catch((error) => {
            port.disconnect();
            reject(error instanceof Error ? error : new Error("Runtime stream event handling failed."));
          });
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

function unwrapApiResponse<T>(body: ApiResponse<T>): T {
  if (!body.ok || body.data === null) {
    throw new Error(body.error?.message ?? "Runtime request failed.");
  }
  return body.data;
}
