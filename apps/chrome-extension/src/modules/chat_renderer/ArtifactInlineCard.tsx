import React, { useEffect, useMemo, useState } from "react";
import mermaid from "mermaid";
import type { ArtifactPreview } from "./chatViewTypes";

export function ArtifactInlineCard({ artifact }: { artifact: ArtifactPreview }) {
  const isMermaid = artifact.metadata?.format === "mermaid" || artifact.type === "mindmap";
  return (
    <div className={`artifact-inline-card artifact-inline-card-${artifact.type}`}>
      <div className="artifact-inline-title">{artifactTitle(artifact)}</div>
      {isMermaid ? <MermaidInline artifact={artifact} /> : <pre>{artifact.content}</pre>}
    </div>
  );
}

function MermaidInline({ artifact }: { artifact: ArtifactPreview }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const renderId = useMemo(() => `navia_mermaid_${artifact.artifactId.replace(/\W/g, "_")}`, [artifact.artifactId]);

  useEffect(() => {
    let cancelled = false;
    mermaid
      .render(renderId, artifact.content)
      .then((result) => {
        if (!cancelled) {
          setSvg(result.svg);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSvg("");
          setError("Mermaid 渲染失败");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [artifact.content, renderId]);

  if (error) return <p className="mermaid-fallback">{error}</p>;
  return svg ? <div className="mermaid-render" dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="muted">正在生成结果……</p>;
}

function artifactTitle(artifact: ArtifactPreview): string {
  const title = artifact.metadata?.title;
  if (typeof title === "string" && title.trim()) return title;
  if (artifact.type === "mindmap") return "Mindmap";
  if (artifact.type === "summary") return "Summary";
  return "Artifact";
}
