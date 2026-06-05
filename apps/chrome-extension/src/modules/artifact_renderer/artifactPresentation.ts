export type ArtifactRecord = {
  artifactId: string;
  type: "summary" | "answer" | "mindmap" | string;
  sourcePageId?: string;
  sourceChunkIds?: string[];
  source?: string;
  content?: string;
  metadata?: Record<string, unknown>;
};

export type ArtifactPresentation = {
  artifactId: string;
  kind: "summary" | "answer" | "mindmap" | "unknown";
  title: string;
  body: string;
  sourcePageId: string | null;
  sourceChunkIds: string[];
  format: string;
};

export function presentArtifact(artifact: ArtifactRecord): ArtifactPresentation {
  const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
  const format = typeof metadata.format === "string" ? metadata.format : "text";
  return {
    artifactId: artifact.artifactId,
    kind: artifact.type === "summary" || artifact.type === "answer" || artifact.type === "mindmap" ? artifact.type : "unknown",
    title: typeof metadata.title === "string" ? metadata.title : artifact.type,
    body: typeof artifact.content === "string" ? artifact.content : "",
    sourcePageId: artifact.sourcePageId ?? null,
    sourceChunkIds: Array.isArray(artifact.sourceChunkIds) ? artifact.sourceChunkIds.map(String) : [],
    format
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
