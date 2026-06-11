import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { BridgeEvent, ModelProviderConfig, PromptRequest, RpcChild, RpcProcessFactory, SessionCreateRequest } from "./types.js";
import { PiEventNormalizer, createPiEventNormalizer, normalizeRawEvent } from "./event-normalizer.js";
import { sanitizeToolNames } from "./tool-policy.js";

type SessionRecord = {
  sessionId: string;
  naviaSessionId: string;
  cwd?: string;
  toolNames: string[];
  profile: string;
  toolPolicy: string;
  modelProvider?: ModelProviderConfig;
  systemPrompt?: string;
  child: RpcChild;
  queue: BridgeEvent[];
  context: { requestId?: string; turnId?: string; traceId?: string };
  normalizer: PiEventNormalizer;
  streamDebug: boolean;
  stdoutLineCount: number;
  stderrLineCount: number;
  stdoutPreviews: string[];
  stderrPreviews: string[];
};

export class SessionManager {
  private sessions = new Map<string, SessionRecord>();

  constructor(
    private readonly command = process.env.NAVIA_PI_COMMAND ?? "pi",
    private readonly safeCwd = process.env.NAVIA_PI_SAFE_CWD ?? process.cwd(),
    private readonly processFactory: RpcProcessFactory = defaultProcessFactory
  ) {}

  createSession(request: SessionCreateRequest): { sessionId: string; naviaSessionId: string; status: "created"; toolNames: string[]; modelProvider?: { type?: string; model?: string } } {
    const sessionId = `pi_sess_${randomUUID().replaceAll("-", "")}`;
    const naviaSessionId = request.naviaSessionId ?? "";
    const profile = typeof request.profile === "string" ? request.profile : "chat";
    const toolPolicy = typeof request.toolPolicy === "string" ? request.toolPolicy : "disabled";
    const cwd = profile === "chat" ? undefined : this.safeCwd;
    const toolNames = sanitizeToolNames(request.toolNames);
    const modelProvider = sanitizeModelProvider(request.modelProvider);
    const systemPrompt = sanitizeSystemPrompt(request.systemPrompt);
    const streamDebug = process.env.NAVIA_PI_STREAM_DEBUG === "true";
    const child = this.processFactory(this.command, ["--mode", "rpc", "--no-session"], { cwd: cwd ?? this.safeCwd });
    const record: SessionRecord = {
      sessionId,
      naviaSessionId,
      cwd,
      toolNames,
      profile,
      toolPolicy,
      modelProvider,
      systemPrompt,
      child,
      queue: [],
      context: {},
      streamDebug,
      stdoutLineCount: 0,
      stderrLineCount: 0,
      stdoutPreviews: [],
      stderrPreviews: [],
      normalizer: createPiEventNormalizer({
        systemPromptInjectionMode: systemPrompt ? "prompt_envelope" : undefined,
        systemPromptPreview: preview(systemPrompt)
      })
    };
    this.sessions.set(sessionId, record);
    this.attachChild(record);
    this.writeLine(record, { type: "session.init", naviaSessionId, cwd, toolNames, tools: [], messages: [], profile, toolPolicy, modelProvider, systemPrompt });
    if (systemPrompt) {
      record.queue.push({ type: "state", state: "system_prompt.injected", systemPromptInjectionMode: "prompt_envelope", systemPromptPreview: preview(systemPrompt) });
    }
    record.queue.push({ type: "state", state: "pi.session.provider", ...providerDiagnostic(modelProvider) });
    return { sessionId, naviaSessionId, status: "created", toolNames, modelProvider: publicModelProvider(modelProvider) };
  }

  prompt(sessionId: string, request: PromptRequest): { accepted: true; sessionId: string } {
    const record = this.requireSession(sessionId);
    record.context = { requestId: request.requestId, turnId: request.turnId, traceId: request.traceId };
    this.writeLine(record, { type: "prompt", message: request.message ?? "", systemPrompt: record.systemPrompt, ...record.context });
    return { accepted: true, sessionId };
  }

  abort(sessionId: string, requestId?: string): { aborted: true } {
    const record = this.requireSession(sessionId);
    this.writeLine(record, { type: "abort", requestId });
    record.queue.push({ type: "state", state: "aborted", requestId });
    return { aborted: true };
  }

  compact(sessionId: string): { compacted: true } {
    const record = this.requireSession(sessionId);
    this.writeLine(record, { type: "compact" });
    return { compacted: true };
  }

  drainEvents(sessionId: string): BridgeEvent[] {
    const record = this.requireSession(sessionId);
    const events = [...record.queue];
    if (record.streamDebug) {
      events.push({
        type: "state",
        state: "pi.stdio.debug",
        stdoutLineCount: record.stdoutLineCount,
        stderrLineCount: record.stderrLineCount,
        stdoutPreviews: [...record.stdoutPreviews],
        stderrPreviews: [...record.stderrPreviews],
        ...providerDiagnostic(record.modelProvider),
        ...record.context
      });
    }
    record.queue.length = 0;
    return events;
  }

  destroy(sessionId: string): { deleted: true } {
    const record = this.requireSession(sessionId);
    record.normalizer.destroy();
    record.child.kill("SIGTERM");
    this.sessions.delete(sessionId);
    return { deleted: true };
  }

  private attachChild(record: SessionRecord): void {
    let stdoutBuffer = "";
    record.child.stdout.on("data", (chunk: Buffer | string) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        this.acceptRawLine(record, line);
      }
    });
    record.child.stderr.on("data", (chunk: Buffer | string) => {
      const message = redactSecrets(chunk.toString());
      record.stderrLineCount += countNonEmptyLines(message);
      pushPreview(record.stderrPreviews, message);
      record.queue.push({ type: "error", code: stderrErrorCode(message), message, recoverable: true, ...record.context });
    });
    record.child.on("error", (error) => {
      record.queue.push({ type: "error", code: "piagent_process_error", message: error.message, recoverable: true, ...record.context });
    });
    record.child.on("exit", (code, signal) => {
      record.queue.push({ type: "state", state: `exited:${code ?? signal ?? "unknown"}`, ...record.context });
    });
  }

  private acceptRawLine(record: SessionRecord, line: string): void {
    record.stdoutLineCount += 1;
    pushPreview(record.stdoutPreviews, line);
    try {
      const raw = JSON.parse(line) as unknown;
      record.queue.push(...record.normalizer.normalize(raw, { ...record.context, sessionId: record.sessionId }));
    } catch {
      record.queue.push(...normalizeRawEvent({ type: "response.delta", text: line }, record.context));
    }
  }

  private writeLine(record: SessionRecord, value: Record<string, unknown>): void {
    record.child.stdin.write(`${JSON.stringify(value)}\n`);
  }

  private requireSession(sessionId: string): SessionRecord {
    const record = this.sessions.get(sessionId);
    if (!record) {
      throw new Error(`Unknown pi session: ${sessionId}`);
    }
    return record;
  }
}

function sanitizeSystemPrompt(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function preview(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/\s+/g, " ").slice(0, 80);
}

function defaultProcessFactory(command: string, args: string[], options: { cwd: string }): RpcChild {
  return spawn(command, args, { cwd: options.cwd, stdio: ["pipe", "pipe", "pipe"] });
}

function sanitizeModelProvider(value: ModelProviderConfig | undefined): ModelProviderConfig | undefined {
  if (!value) return undefined;
  return {
    type: typeof value.type === "string" ? value.type : undefined,
    baseUrl: typeof value.baseUrl === "string" ? value.baseUrl : undefined,
    model: typeof value.model === "string" ? value.model : undefined,
    apiKey: typeof value.apiKey === "string" ? value.apiKey : undefined,
    apiKeyRef: typeof value.apiKeyRef === "string" ? value.apiKeyRef : undefined,
    capabilities: typeof value.capabilities === "object" && value.capabilities !== null ? value.capabilities : undefined
  };
}

function publicModelProvider(value: ModelProviderConfig | undefined): { type?: string; model?: string } | undefined {
  if (!value) return undefined;
  return { type: value.type, model: value.model };
}

function redactSecrets(value: string): string {
  return value.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-****").replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]");
}

function providerDiagnostic(value: ModelProviderConfig | undefined): Partial<Extract<BridgeEvent, { type: "state" }>> {
  return {
    providerType: value?.type,
    providerBaseUrl: value?.baseUrl,
    providerModel: value?.model,
    providerHasApiKeyRef: typeof value?.apiKeyRef === "string" && value.apiKeyRef.length > 0,
    providerHasApiKey: typeof value?.apiKey === "string" && value.apiKey.length > 0
  };
}

function pushPreview(target: string[], value: string): void {
  const text = redactSecrets(value).replace(/\s+/g, " ").trim();
  if (!text) return;
  if (target.length < 5) target.push(text.slice(0, 120));
}

function countNonEmptyLines(value: string): number {
  return value.split(/\r?\n/).filter((line) => line.trim()).length || (value.trim() ? 1 : 0);
}

function stderrErrorCode(message: string): string {
  return /auth|unauthori[sz]ed|401|403|api[_ -]?key|invalid key|permission/i.test(message) ? "provider_auth_failed" : "piagent_stderr";
}
