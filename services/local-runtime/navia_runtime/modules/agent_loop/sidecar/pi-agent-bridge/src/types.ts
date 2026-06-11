export type BridgeEvent =
  | { type: "response.delta"; text: string; requestId?: string; turnId?: string; traceId?: string }
  | { type: "response.done"; requestId?: string; turnId?: string; traceId?: string }
  | { type: "error"; message: string; code?: string; recoverable?: boolean; requestId?: string; turnId?: string; traceId?: string }
  | {
      type: "state";
      state: string;
      rawSummary?: string;
      rawEventType?: string;
      rawEventKeys?: string[];
      messageId?: string;
      assistantMessageId?: string;
      assistantMessageIndex?: number;
      sessionId?: string;
      snapshotKey?: string;
      snapshotKeySource?: string;
      snapshotKeyFallback?: boolean;
      isTextDelta?: boolean;
      isSnapshot?: boolean;
      fullTextLength?: number;
      previousSnapshotLength?: number;
      emittedDeltaLength?: number;
      emittedDeltaPreview?: string;
      systemPromptInjectionMode?: string;
      systemPromptPreview?: string;
      stdoutLineCount?: number;
      stderrLineCount?: number;
      stdoutPreviews?: string[];
      stderrPreviews?: string[];
      providerType?: string;
      providerBaseUrl?: string;
      providerModel?: string;
      providerHasApiKeyRef?: boolean;
      providerHasApiKey?: boolean;
      requestId?: string;
      turnId?: string;
      traceId?: string;
    }
  | { type: "tool.requested"; toolName: string; toolCallId: string; requestId?: string; turnId?: string; traceId?: string }
  | { type: "tool.denied"; toolName: string; toolCallId: string; message: string; requestId?: string; turnId?: string; traceId?: string };

export type SessionCreateRequest = {
  naviaSessionId?: string;
  cwd?: string;
  toolNames?: string[];
  modelProvider?: ModelProviderConfig;
  systemPrompt?: string;
  profile?: string;
  toolPolicy?: string;
  messages?: unknown[];
};

export type ModelProviderConfig = {
  type?: string;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  apiKeyRef?: string;
  capabilities?: Record<string, unknown>;
};

export type PromptRequest = {
  message?: string;
  requestId?: string;
  turnId?: string;
  traceId?: string;
};

export type AbortRequest = {
  requestId?: string;
};

export type RpcProcessFactory = (command: string, args: string[], options: { cwd: string }) => RpcChild;

export type RpcChild = {
  stdin: NodeJS.WritableStream;
  stdout: NodeJS.ReadableStream;
  stderr: NodeJS.ReadableStream;
  kill(signal?: NodeJS.Signals | number): boolean;
  on(event: "exit", listener: (code: number | null, signal: NodeJS.Signals | null) => void): void;
  on(event: "error", listener: (error: Error) => void): void;
};
