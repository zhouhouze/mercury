const FORBIDDEN_TOOLS = new Set(["read", "write", "edit", "bash", "grep", "find", "ls"]);

export function sanitizeToolNames(_requested: unknown): string[] {
  return [];
}

export function isForbiddenTool(toolName: string): boolean {
  return FORBIDDEN_TOOLS.has(toolName.toLowerCase());
}

export function deniedToolMessage(): string {
  return "当前是 Chat 模式，不会调用工具。这个能力会在后续版本开放。";
}
