import type { ArtifactPresentation, ArtifactRecord } from "../artifact_renderer/artifactPresentation";
import { presentArtifact } from "../artifact_renderer/artifactPresentation";

export type MindmapPresentation = {
  artifactId: string;
  mermaidSource: string;
  renderMode: "mermaid" | "source_fallback";
  sourceFallback: string;
  nodeSourceMap: Record<string, unknown>;
  errorMessage: string | null;
};

export function presentMindmapArtifact(artifact: ArtifactRecord, renderError?: string): MindmapPresentation {
  const presented: ArtifactPresentation = presentArtifact(artifact);
  const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
  const nodeSourceMap = isRecord(metadata.nodeSourceMap) ? metadata.nodeSourceMap : {};
  const mermaidSource = presented.body;
  const evidenceFallback = sourceEvidenceFallback(nodeSourceMap);
  return {
    artifactId: artifact.artifactId,
    mermaidSource,
    renderMode: renderError ? "source_fallback" : "mermaid",
    sourceFallback: [mermaidSource || "Mermaid source is unavailable.", evidenceFallback].filter(Boolean).join("\n\nSources:\n"),
    nodeSourceMap,
    errorMessage: renderError ?? null
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
