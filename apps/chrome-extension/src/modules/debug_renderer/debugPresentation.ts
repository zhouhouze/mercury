export type DebugEntry = {
  type: string;
  level: "info" | "warning" | "error";
  message: string;
  event?: unknown;
};

export type QualityMetricView = {
  name: string;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  threshold: number | null;
  passed: boolean | null;
  method: string;
};

export type PagePerceptionDebugView = {
  status: "pass" | "degraded" | "fail" | "unknown";
  pageId: string | null;
  contentHash: string | null;
  highSignalBlockCount: number;
  filteredBlockCount: number;
  digestItemCount: number;
  sourceRefCount: number;
  metrics: QualityMetricView[];
  issues: string[];
  sourceFallbacks: Array<{ sourceRefId: string; text: string }>;
  raw: unknown;
};

export function debugUnknownEvent(event: { type?: string }): DebugEntry {
  return {
    type: event.type ?? "unknown",
    level: "warning",
    message: "Unknown SSE event ignored by chat renderer.",
    event
  };
}

export function presentPagePerceptionDebug(payload: unknown): PagePerceptionDebugView {
  const record = isRecord(payload) ? payload : {};
  const perception = isRecord(record.perception) ? record.perception : record;
  const highSignalPage = isRecord(perception.highSignalPage) ? perception.highSignalPage : {};
  const digest = isRecord(perception.perceptionDigest) ? perception.perceptionDigest : {};
  const sourceMap = isRecord(perception.sourceMap) ? perception.sourceMap : {};
  const qualityReport = isRecord(perception.qualityReport) ? perception.qualityReport : {};
  const status = readiness(qualityReport.downstreamReadiness);
  const sourceRefs = Array.isArray(sourceMap.sourceRefs) ? sourceMap.sourceRefs.filter(isRecord) : [];
  const metrics = isRecord(qualityReport.metrics)
    ? Object.entries(qualityReport.metrics).map(([name, value]) => presentMetric(name, value))
    : [];

  return {
    status,
    pageId: stringOrNull(highSignalPage.pageId ?? digest.pageId ?? sourceMap.pageId ?? qualityReport.pageId),
    contentHash: stringOrNull(highSignalPage.contentHash ?? digest.contentHash ?? sourceMap.contentHash ?? qualityReport.contentHash),
    highSignalBlockCount: Array.isArray(highSignalPage.highSignalBlocks) ? highSignalPage.highSignalBlocks.length : 0,
    filteredBlockCount: Array.isArray(highSignalPage.filteredBlocks) ? highSignalPage.filteredBlocks.length : 0,
    digestItemCount: Array.isArray(digest.items) ? digest.items.length : 0,
    sourceRefCount: sourceRefs.length,
    metrics,
    issues: collectIssues(qualityReport),
    sourceFallbacks: sourceRefs.slice(0, 12).map((ref) => ({
      sourceRefId: String(ref.sourceRefId ?? ""),
      text: String(ref.fallbackText ?? ref.textQuote ?? "")
    })),
    raw: payload
  };
}

function presentMetric(name: string, value: unknown): QualityMetricView {
  const metric = isRecord(value) ? value : {};
  return {
    name,
    value: numberOrNull(metric.value),
    numerator: numberOrNull(metric.numerator),
    denominator: numberOrNull(metric.denominator),
    threshold: numberOrNull(metric.threshold),
    passed: typeof metric.passed === "boolean" ? metric.passed : null,
    method: typeof metric.method === "string" ? metric.method : ""
  };
}

function collectIssues(qualityReport: Record<string, unknown>): string[] {
  const issues = [...(Array.isArray(qualityReport.fatalIssues) ? qualityReport.fatalIssues : []), ...(Array.isArray(qualityReport.warnings) ? qualityReport.warnings : [])];
  return issues.filter(isRecord).map((issue) => String(issue.message ?? issue.code ?? "")).filter(Boolean);
}

function readiness(value: unknown): PagePerceptionDebugView["status"] {
  return value === "pass" || value === "degraded" || value === "fail" ? value : "unknown";
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function debugError(message: string, event?: unknown): DebugEntry {
  return {
    type: "error",
    level: "error",
    message,
    event
  };
}
