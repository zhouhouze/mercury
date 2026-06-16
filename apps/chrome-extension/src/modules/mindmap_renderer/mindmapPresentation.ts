import type { ArtifactPresentation, ArtifactRecord } from "../artifact_renderer/artifactPresentation";
import { presentArtifact } from "../artifact_renderer/artifactPresentation";

export type MindmapPresentation = {
  artifactId: string;
  mermaidSource: string;
  renderMode: "mermaid" | "source_fallback";
  sourceFallback: string;
  nodeSourceMap: Record<string, unknown>;
  nodeBindings: MindmapNodeBinding[];
  sourceCards: SourceEvidenceCard[];
  errorMessage: string | null;
};

export type MindmapNodeBinding = {
  nodeId: string;
  nodeSourceMapKey: string;
  nodeLabel: string;
  mermaidLineIndex: number;
  sourceRefIds: string[];
  paragraphIds: string[];
  chunkIds: string[];
};

export type SourceEvidenceCard = {
  nodeId: string;
  nodeSourceMapKey: string;
  nodeLabel: string;
  sourceRefIds: string[];
  paragraphIds: string[];
  chunkIds: string[];
  textQuote: string;
  fallbackText: string;
  jumpback: Record<string, unknown>;
};

export type JumpbackRequest = {
  nodeId: string;
  nodeSourceMapKey: string;
  sourceRefIds: string[];
  paragraphIds: string[];
  chunkIds: string[];
  textQuote: string;
  fallbackText: string;
  selector?: string;
  domPath?: string;
};

export function presentMindmapArtifact(artifact: ArtifactRecord, renderError?: string): MindmapPresentation {
  const presented: ArtifactPresentation = presentArtifact(artifact);
  const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
  const nodeSourceMap = isRecord(metadata.nodeSourceMap) ? metadata.nodeSourceMap : {};
  const nodeBindings = parseNodeBindings(metadata.nodeBindings, nodeSourceMap);
  const sourceCards = buildSourceEvidenceCards(nodeBindings, nodeSourceMap);
  const mermaidSource = presented.body;
  const evidenceFallback = sourceEvidenceFallback(nodeSourceMap);
  return {
    artifactId: artifact.artifactId,
    mermaidSource,
    renderMode: renderError ? "source_fallback" : "mermaid",
    sourceFallback: [mermaidSource || "Mermaid source is unavailable.", evidenceFallback].filter(Boolean).join("\n\nSources:\n"),
    nodeSourceMap,
    nodeBindings,
    sourceCards,
    errorMessage: renderError ?? null
  };
}

export function buildJumpbackRequest(card: SourceEvidenceCard): JumpbackRequest {
  const selector = typeof card.jumpback.selector === "string" && card.jumpback.selector.trim() ? card.jumpback.selector : undefined;
  const domPath = typeof card.jumpback.domPath === "string" && card.jumpback.domPath.trim() ? card.jumpback.domPath : undefined;
  return {
    nodeId: card.nodeId,
    nodeSourceMapKey: card.nodeSourceMapKey,
    sourceRefIds: card.sourceRefIds,
    paragraphIds: card.paragraphIds,
    chunkIds: card.chunkIds,
    textQuote: card.textQuote,
    fallbackText: card.fallbackText,
    ...(selector ? { selector } : {}),
    ...(domPath ? { domPath } : {})
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseNodeBindings(value: unknown, nodeSourceMap: Record<string, unknown>): MindmapNodeBinding[] {
  if (Array.isArray(value)) {
    const bindings = value.map((item) => normalizeBinding(item)).filter((item): item is MindmapNodeBinding => Boolean(item));
    if (bindings.length > 0) return bindings;
  }
  return Object.entries(nodeSourceMap)
    .map(([key, source], index) => {
      if (!isRecord(source)) return null;
      return {
        nodeId: key,
        nodeSourceMapKey: key,
        nodeLabel: typeof source.nodeLabel === "string" && source.nodeLabel ? source.nodeLabel : key,
        mermaidLineIndex: index + 1,
        sourceRefIds: toStringArray(source.sourceRefIds),
        paragraphIds: toStringArray(source.paragraphIds),
        chunkIds: toStringArray(source.chunkIds)
      };
    })
    .filter((item): item is MindmapNodeBinding => Boolean(item));
}

function normalizeBinding(value: unknown): MindmapNodeBinding | null {
  if (!isRecord(value)) return null;
  const nodeSourceMapKey = typeof value.nodeSourceMapKey === "string" && value.nodeSourceMapKey ? value.nodeSourceMapKey : typeof value.nodeId === "string" ? value.nodeId : "";
  if (!nodeSourceMapKey) return null;
  return {
    nodeId: typeof value.nodeId === "string" && value.nodeId ? value.nodeId : nodeSourceMapKey,
    nodeSourceMapKey,
    nodeLabel: typeof value.nodeLabel === "string" && value.nodeLabel ? value.nodeLabel : nodeSourceMapKey,
    mermaidLineIndex: typeof value.mermaidLineIndex === "number" ? value.mermaidLineIndex : 0,
    sourceRefIds: toStringArray(value.sourceRefIds),
    paragraphIds: toStringArray(value.paragraphIds),
    chunkIds: toStringArray(value.chunkIds)
  };
}

function buildSourceEvidenceCards(bindings: MindmapNodeBinding[], nodeSourceMap: Record<string, unknown>): SourceEvidenceCard[] {
  return bindings
    .map((binding) => {
      const source = nodeSourceMap[binding.nodeSourceMapKey];
      if (!isRecord(source)) return null;
      const fallbackText = firstString(source.fallbackText, source.textQuote, source.excerpt);
      const textQuote = firstString(source.textQuote, source.excerpt, source.fallbackText);
      return {
        nodeId: binding.nodeId,
        nodeSourceMapKey: binding.nodeSourceMapKey,
        nodeLabel: binding.nodeLabel,
        sourceRefIds: binding.sourceRefIds.length ? binding.sourceRefIds : toStringArray(source.sourceRefIds),
        paragraphIds: binding.paragraphIds.length ? binding.paragraphIds : toStringArray(source.paragraphIds),
        chunkIds: binding.chunkIds.length ? binding.chunkIds : toStringArray(source.chunkIds),
        textQuote,
        fallbackText,
        jumpback: isRecord(source.jumpback) ? source.jumpback : { mode: "fallback", reason: "source_ref_missing" }
      };
    })
    .filter((item): item is SourceEvidenceCard => Boolean(item))
    .filter((card) => Boolean(card.textQuote || card.fallbackText));
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter((item) => item.trim()) : [];
}

function sourceEvidenceFallback(nodeSourceMap: Record<string, unknown>): string {
  return Object.entries(nodeSourceMap)
    .slice(0, 6)
    .map(([nodeId, value]) => {
      if (!isRecord(value)) return "";
      const label = typeof value.nodeLabel === "string" ? value.nodeLabel : nodeId;
      const text = typeof value.fallbackText === "string" && value.fallbackText ? value.fallbackText : typeof value.textQuote === "string" ? value.textQuote : typeof value.excerpt === "string" ? value.excerpt : "";
      return text ? `- ${label}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
}
