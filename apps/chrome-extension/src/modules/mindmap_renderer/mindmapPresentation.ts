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
  return {
    artifactId: artifact.artifactId,
    mermaidSource,
    renderMode: renderError ? "source_fallback" : "mermaid",
    sourceFallback: mermaidSource || "Mermaid source is unavailable.",
    nodeSourceMap,
    errorMessage: renderError ?? null
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
