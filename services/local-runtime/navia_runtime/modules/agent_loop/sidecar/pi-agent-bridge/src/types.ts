export type BridgeEvent =
  | { type: "response.delta"; text: string; requestId?: string; turnId?: string; traceId?: string }
  | { type: "response.done"; requestId?: string; turnId?: string; traceId?: string }
  | { type: "error"; message: string; code?: string; recoverable?: boolean; requestId?: string; turnId?: string; traceId?: string }
  | { type: "state"; state: string; rawSummary?: string; requestId?: string; turnId?: string; traceId?: string }
  | { type: "tool.requested"; toolName: string; toolCallId: string; requestId?: string; turnId?: string; traceId?: string }
  | { type: "tool.denied"; toolName: string; toolCallId: string; message: string; requestId?: string; turnId?: string; traceId?: string };

export type SessionCreateRequest = {
  naviaSessionId?: string;
  cwd?: string;
  toolNames?: string[];
  modelProvider?: ModelProviderConfig;
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
