import React, { useEffect, useMemo, useState } from "react";
import mermaid from "mermaid";
import type { ArtifactPreview } from "./chatViewTypes";
import { buildJumpbackRequest, presentMindmapArtifact, type SourceEvidenceCard } from "../mindmap_renderer/mindmapPresentation";

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
  const [selectedCard, setSelectedCard] = useState<SourceEvidenceCard | null>(null);
  const [jumpbackStatus, setJumpbackStatus] = useState("");
  const renderId = useMemo(() => `navia_mermaid_${artifact.artifactId.replace(/\W/g, "_")}`, [artifact.artifactId]);
  const presentation = useMemo(() => presentMindmapArtifact(artifact, error || undefined), [artifact, error]);

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

  async function requestJumpback(card: SourceEvidenceCard) {
    setSelectedCard(card);
    setJumpbackStatus("正在定位来源……");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("未找到当前网页标签页。");
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "navia.jumpToSource",
        request: buildJumpbackRequest(card)
      });
      if (response && typeof response === "object" && (response as { ok?: unknown }).ok === true) {
        const result = (response as { result?: { status?: string; failureReason?: string } }).result;
        setJumpbackStatus(result?.status === "highlighted" ? "已定位并高亮来源。" : `未能定位到原文位置，已显示来源证据。${result?.failureReason ? `原因：${result.failureReason}` : ""}`);
      } else {
        const errorMessage = response && typeof response === "object" && typeof (response as { error?: unknown }).error === "string" ? (response as { error: string }).error : "当前页面未返回定位结果。";
        setJumpbackStatus(`未能定位到原文位置，已显示来源证据。原因：${errorMessage}`);
      }
    } catch (jumpbackError) {
      const message = jumpbackError instanceof Error ? jumpbackError.message : "当前页面暂不支持定位。";
      setJumpbackStatus(`未能定位到原文位置，已显示来源证据。原因：${message}`);
    }
  }

  function handleMermaidClick(event: React.MouseEvent<HTMLDivElement>) {
    const text = (event.target as Element | null)?.textContent?.trim();
    if (!text) return;
    const matched = presentation.sourceCards.find((card) => card.nodeLabel && (text.includes(card.nodeLabel) || card.nodeLabel.includes(text)));
    if (matched) void requestJumpback(matched);
  }

  return (
    <>
      {error ? (
        <p className="mermaid-fallback">{error}</p>
      ) : svg ? (
        <div className="mermaid-render" data-testid="mindmap-svg-surface" onClick={handleMermaidClick} dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p className="muted">正在生成结果……</p>
      )}
      {presentation.sourceCards.length > 0 ? (
        <div className="mindmap-source-panel" data-testid="mindmap-source-panel">
          <div className="mindmap-source-title">来源证据</div>
          <div className="mindmap-source-list">
            {presentation.sourceCards.slice(0, 8).map((card) => (
              <button
                className="mindmap-source-card"
                data-node-id={card.nodeId}
                data-source-ref-ids={card.sourceRefIds.join(",")}
                data-testid={`mindmap-source-card-${card.nodeId}`}
                key={card.nodeId}
                onClick={() => void requestJumpback(card)}
                type="button"
              >
                <span>{card.nodeLabel}</span>
                <small>{card.fallbackText || card.textQuote}</small>
              </button>
            ))}
          </div>
          {selectedCard ? (
            <div className="mindmap-source-evidence" data-testid="mindmap-source-evidence">
              <strong>{selectedCard.nodeLabel}</strong>
              <p>{selectedCard.fallbackText || selectedCard.textQuote}</p>
              {jumpbackStatus ? <p className="muted">{jumpbackStatus}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function artifactTitle(artifact: ArtifactPreview): string {
  const title = artifact.metadata?.title;
  if (typeof title === "string" && title.trim()) return title;
  if (artifact.type === "mindmap") return "Mindmap";
  if (artifact.type === "summary") return "Summary";
  return "Artifact";
}
