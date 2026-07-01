import React, { useEffect, useMemo, useState } from "react";
import mermaid from "mermaid";
import type { ArtifactPreview } from "./chatViewTypes";
import {
  buildJumpbackRequest,
  presentMindmapArtifact,
  selectEvidenceCardNode,
  toReadingMapViewModel,
  type EvidenceCardNode,
  type EvidenceCardTheme,
  type ReadingMapNavItem,
  type EvidenceCardSourcePanelStatus,
  type SourceEvidenceCard
} from "../mindmap_renderer/mindmapPresentation";

export function ArtifactInlineCard({ artifact }: { artifact: ArtifactPreview }) {
  const isMermaid = artifact.metadata?.format === "mermaid" || artifact.type === "mindmap";
  return (
    <div className={`artifact-inline-card artifact-inline-card-${artifact.type}`}>
      <div className="artifact-inline-title">{artifactTitle(artifact)}</div>
      {isMermaid ? <MermaidInline artifact={artifact} /> : <TextArtifact content={artifact.content} />}
    </div>
  );
}

function TextArtifact({ content }: { content: string }) {
  const lines = content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return (
    <div className="artifact-inline-markdown">
      {lines.map((line, index) => {
        if (line.startsWith("### ")) return <h4 key={`${line}-${index}`}>{line.slice(4)}</h4>;
        if (line.startsWith("## ")) return <h3 key={`${line}-${index}`}>{line.slice(3)}</h3>;
        if (line.startsWith("- ")) return <p className="artifact-inline-bullet" key={`${line}-${index}`}>{line.slice(2)}</p>;
        return <p key={`${line}-${index}`}>{line}</p>;
      })}
    </div>
  );
}

function MermaidInline({ artifact }: { artifact: ArtifactPreview }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<EvidenceCardSourcePanelStatus>("empty");
  const [selectedFailureReason, setSelectedFailureReason] = useState<string | null>(null);
  const [jumpbackStatus, setJumpbackStatus] = useState("");
  const [collapsedThemeIds, setCollapsedThemeIds] = useState<Set<string>>(() => new Set());
  const renderId = useMemo(() => `navia_mermaid_${artifact.artifactId.replace(/\W/g, "_")}`, [artifact.artifactId]);
  const presentation = useMemo(() => presentMindmapArtifact(artifact, error || undefined), [artifact, error]);
  const evidenceView = useMemo(
    () => (selectedNodeId ? selectEvidenceCardNode(presentation.evidenceCardViewModel, selectedNodeId, selectedStatus, selectedFailureReason) : presentation.evidenceCardViewModel),
    [presentation.evidenceCardViewModel, selectedFailureReason, selectedNodeId, selectedStatus]
  );
  const readingMap = useMemo(() => toReadingMapViewModel(evidenceView, selectedNodeId), [evidenceView, selectedNodeId]);
  const nodeById = useMemo(() => new Map(evidenceView.nodes.map((node) => [node.nodeId, node])), [evidenceView.nodes]);

  useEffect(() => {
    setCollapsedThemeIds(new Set());
  }, [artifact.artifactId]);

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

  async function requestJumpback(card: SourceEvidenceCard, nodeId = card.nodeId) {
    setSelectedNodeId(nodeId);
    setSelectedStatus("locating");
    setSelectedFailureReason(null);
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
        if (result?.status === "highlighted") {
          setSelectedStatus("located");
          setJumpbackStatus("已定位并高亮来源。");
        } else if (result?.status === "blocked") {
          setSelectedStatus("blocked");
          setSelectedFailureReason(result?.failureReason ?? "source_jumpback_blocked");
          setJumpbackStatus(`当前页面阻止来源定位，已保留来源证据。${result?.failureReason ? `原因：${result.failureReason}` : ""}`);
        } else {
          setSelectedStatus("fallback_shown");
          setSelectedFailureReason(result?.failureReason ?? "dom_jumpback_unavailable");
          setJumpbackStatus(`未能定位到原文位置，已显示来源证据。${result?.failureReason ? `原因：${result.failureReason}` : ""}`);
        }
      } else {
        const errorMessage = response && typeof response === "object" && typeof (response as { error?: unknown }).error === "string" ? (response as { error: string }).error : "当前页面未返回定位结果。";
        setSelectedStatus("blocked");
        setSelectedFailureReason(errorMessage);
        setJumpbackStatus(`当前页面阻止来源定位，已保留来源证据。原因：${errorMessage}`);
      }
    } catch (jumpbackError) {
      const message = jumpbackError instanceof Error ? jumpbackError.message : "当前页面暂不支持定位。";
      setSelectedStatus("blocked");
      setSelectedFailureReason(message);
      setJumpbackStatus(`当前页面阻止来源定位，已保留来源证据。原因：${message}`);
    }
  }

  function selectNode(node: EvidenceCardNode) {
    const card = presentation.sourceCards.find((item) => item.nodeId === node.nodeId);
    setSelectedNodeId(node.nodeId);
    setSelectedStatus(card ? "ready" : "fallback_shown");
    setSelectedFailureReason(card ? null : node.degradedReason ?? "source_ref_missing");
    setJumpbackStatus(card ? "" : "未能定位到原文位置，已显示来源证据。原因：source_ref_missing");
  }

  function handleMermaidClick(event: React.MouseEvent<HTMLDivElement>) {
    const text = (event.target as Element | null)?.textContent?.trim();
    if (!text) return;
    const matched = presentation.sourceCards.find((card) => card.nodeLabel && (text.includes(card.nodeLabel) || card.nodeLabel.includes(text)));
    if (matched) void requestJumpback(matched);
  }

  function toggleTheme(theme: EvidenceCardTheme, event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setCollapsedThemeIds((current) => {
      const next = new Set(current);
      if (next.has(theme.themeId)) next.delete(theme.themeId);
      else next.add(theme.themeId);
      return next;
    });
  }

  function renderEvidenceNode(node: EvidenceCardNode, role: "theme" | "child") {
    const card = presentation.sourceCards.find((item) => item.nodeId === node.nodeId);
    const nodeLevel = role === "theme" ? 1 : 2;
    const nodeRole = role === "theme" ? "branch" : "leaf";
    return (
      <button
        className={`evidence-card-node evidence-card-node-${role} evidence-card-node-${nodeRole} evidence-card-node-depth-${nodeLevel} evidence-card-node-${node.qualityState} evidence-card-node-${node.uiState}`}
        data-node-id={node.nodeId}
        data-source-ref-ids={node.sourceRefIds.join(",")}
        data-testid={`evidence-card-node-${node.nodeId}`}
        key={node.nodeId}
        onClick={() => selectNode(node)}
        type="button"
      >
        <span className="evidence-card-node-pin" aria-hidden="true" />
        <span className="evidence-card-node-body">
          <strong title={node.label}>{compactMindmapLabel(node.label, nodeLevel, evidenceView.displayPolicy.density)}</strong>
          <span className="evidence-card-node-note">
            {compactEvidenceNote(node.note ?? node.textQuote ?? node.fallbackText ?? node.degradedReason ?? "来源证据待补充。", role)}
          </span>
          <span className="evidence-card-node-footer">
            <span className="evidence-card-node-meta">
              <span>{node.sourceCount}源</span>
              <span>{node.confidence === null ? qualityLabel(node.qualityState) : `${Math.round(node.confidence * 100)}%`}</span>
            </span>
            {card ? <span className="evidence-card-node-action">来源</span> : <span className="evidence-card-node-action evidence-card-node-action-muted">降级</span>}
          </span>
        </span>
      </button>
    );
  }

  function renderReadingMapNavItem(item: ReadingMapNavItem) {
    const node = nodeById.get(item.nodeId);
    return (
      <button
        className={`reading-map-nav-item reading-map-nav-depth-${item.depth} reading-map-nav-${item.qualityState} reading-map-nav-${item.uiState}`}
        data-node-id={item.nodeId}
        data-testid={`reading-map-nav-${item.nodeId}`}
        key={item.nodeId}
        onClick={() => (node ? selectNode(node) : undefined)}
        type="button"
      >
        <span className="reading-map-nav-label">{compactMindmapLabel(item.label, Math.min(2, item.depth), readingMap.density)}</span>
        <span className="reading-map-nav-meta">
          {item.sourceCount}源{item.hiddenChildCount > 0 ? ` · +${item.hiddenChildCount}` : ""}
        </span>
      </button>
    );
  }

  return (
    <>
      {evidenceView.renderMode === "evidence_card" ? (
        <section className="evidence-mindmap" data-testid="evidence-card-mindmap" aria-label="Evidence Card Mindmap">
          <div className="evidence-mindmap-toolbar">
            <span title={evidenceView.displayPolicy.rootLabel ?? undefined}>结构导图</span>
            <small>
              2级 · {densityLabel(evidenceView.displayPolicy.density)}
              {evidenceView.displayPolicy.hiddenNodeCount > 0 ? ` · 收纳${evidenceView.displayPolicy.hiddenNodeCount}` : ""} · {presentation.sourceCards.length} 来源
            </small>
          </div>
          <div className="reading-map" data-testid="reading-map" aria-label="Reading Map">
            <nav className="reading-map-nav" data-testid="reading-map-nav" aria-label="Reading Map nodes">
              {readingMap.navItems.map((item) => renderReadingMapNavItem(item))}
            </nav>
            <aside className="reading-map-detail" data-testid="reading-map-detail" aria-label="Reading Map detail">
              {readingMap.detail ? (
                <>
                  <div className="reading-map-detail-header">
                    <strong title={readingMap.detail.label}>{readingMap.detail.label}</strong>
                    <span>{qualityLabel(readingMap.detail.qualityState)}</span>
                  </div>
                  <p>{readingMap.detail.note ?? readingMap.detail.textQuote ?? readingMap.detail.fallbackText ?? readingMap.detail.degradedReason ?? "来源证据暂不可用。"}</p>
                  <div className="reading-map-detail-meta">
                    <span>{readingMap.detail.sourceCount} source</span>
                    {readingMap.detail.confidence !== null ? <span>{Math.round(readingMap.detail.confidence * 100)}%</span> : null}
                    {readingMap.detail.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <div className="reading-map-evidence" data-testid="reading-map-evidence">
                    {readingMap.detail.sourceItems.slice(0, 2).map((item) => (
                      <p data-jumpback-status={item.jumpbackStatus} key={item.sourceRefId}>
                        {item.displayText}
                      </p>
                    ))}
                  </div>
                </>
              ) : (
                <p>选择节点查看来源证据。</p>
              )}
            </aside>
          </div>
          <div className="evidence-mindmap-canvas" data-node-count={evidenceView.themes.length}>
            {evidenceView.themes.map((theme) => {
              const themeNode = nodeById.get(theme.nodeId);
              if (!themeNode) return null;
              const collapsed = collapsedThemeIds.has(theme.themeId);
              return (
                <div className={`evidence-theme-group${collapsed ? " evidence-theme-group-collapsed" : ""}`} data-theme-id={theme.themeId} key={theme.themeId}>
                  <div className="evidence-theme-header">
                    <button
                      aria-expanded={!collapsed}
                      aria-label={`${collapsed ? "展开" : "收起"} ${theme.label}`}
                      className="evidence-theme-toggle"
                      data-testid={`evidence-theme-toggle-${theme.nodeId}`}
                      onClick={(event) => toggleTheme(theme, event)}
                      type="button"
                    >
                      {collapsed ? "+" : "-"}
                    </button>
                    {renderEvidenceNode(themeNode, "theme")}
                    <span className="evidence-theme-count">
                      {theme.totalNodeCount}项{theme.hiddenChildCount > 0 ? ` · +${theme.hiddenChildCount}` : ""}
                    </span>
                  </div>
                  {!collapsed && theme.visibleChildNodeIds.length > 0 ? (
                    <div className="evidence-theme-children" data-testid={`evidence-theme-children-${theme.nodeId}`}>
                      {theme.visibleChildNodeIds.map((nodeId) => {
                        const childNode = nodeById.get(nodeId);
                        return childNode ? renderEvidenceNode(childNode, "child") : null;
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {evidenceView.edges.length > 0 ? (
            <div className="evidence-mindmap-edge-summary" aria-label="Mindmap edge summary">
              {evidenceView.edges.slice(0, 10).map((edge) => (
                <span className={`evidence-mindmap-edge evidence-mindmap-edge-${edge.uiState}`} key={edge.edgeId} />
              ))}
            </div>
          ) : null}
        </section>
      ) : error ? (
        <p className="mermaid-fallback">{error}</p>
      ) : svg ? (
        <div className="mermaid-render" data-testid="mindmap-svg-surface" onClick={handleMermaidClick} dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p className="muted">正在生成结果……</p>
      )}
      <details className="mindmap-debug-fallback">
        <summary>Mermaid fallback / source</summary>
        {svg && !error ? <div className="mermaid-render mermaid-render-debug" data-testid="mindmap-svg-surface" onClick={handleMermaidClick} dangerouslySetInnerHTML={{ __html: svg }} /> : null}
        <pre>{presentation.sourceFallback}</pre>
      </details>
      {presentation.sourceCards.length > 0 ? (
        <div className="mindmap-source-panel" data-testid="mindmap-source-panel">
          <div className="mindmap-source-title">来源证据</div>
          <div className="mindmap-source-list">
            {presentation.sourceCards.slice(0, 8).map((card) => (
              <button
                className={`mindmap-source-card${selectedNodeId === card.nodeId ? " mindmap-source-card-selected" : ""}`}
                data-node-id={card.nodeId}
                data-source-ref-ids={card.sourceRefIds.join(",")}
                data-testid={`mindmap-source-card-${card.nodeId}`}
                key={card.nodeId}
                onClick={() => void requestJumpback(card, card.nodeId)}
                type="button"
              >
                <span>{card.nodeLabel}</span>
                <small>{card.fallbackText || card.textQuote}</small>
              </button>
            ))}
          </div>
          {evidenceView.sourcePanel.selectedNodeId ? (
            <div className={`mindmap-source-evidence mindmap-source-evidence-${evidenceView.sourcePanel.status}`} data-testid="mindmap-source-evidence">
              <strong>{evidenceView.nodes.find((node) => node.nodeId === evidenceView.sourcePanel.selectedNodeId)?.label ?? "来源证据"}</strong>
              <span className={`mindmap-source-status mindmap-source-status-${evidenceView.sourcePanel.status}`}>
                {sourcePanelStatusLabel(evidenceView.sourcePanel.status)}
              </span>
              {evidenceView.sourcePanel.items.map((item) => (
                <p data-jumpback-status={item.jumpbackStatus} key={item.sourceRefId}>
                  {item.displayText}
                </p>
              ))}
              {jumpbackStatus ? <p className="muted">{jumpbackStatus}</p> : null}
            </div>
          ) : null}
        </div>
      ) : evidenceView.fallbacks.length > 0 ? (
        <div className="mindmap-source-panel" data-testid="mindmap-source-panel">
          <div className="mindmap-source-title">来源证据</div>
          <div className="mindmap-source-evidence" data-testid="mindmap-source-evidence">
            <strong>来源不可用</strong>
            <p>{evidenceView.fallbacks.map((fallback) => fallback.detail ?? fallback.reason).join("；")}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function sourcePanelStatusLabel(status: EvidenceCardSourcePanelStatus): string {
  if (status === "located") return "located";
  if (status === "fallback_shown") return "fallback_shown";
  if (status === "blocked") return "blocked";
  if (status === "locating") return "locating";
  if (status === "ready") return "ready";
  return "empty";
}

function artifactTitle(artifact: ArtifactPreview): string {
  const title = artifact.metadata?.title;
  if (typeof title === "string" && title.trim()) return title;
  if (artifact.type === "mindmap") return "Mindmap";
  if (artifact.type === "summary") return "Summary";
  return "Artifact";
}

function compactMindmapLabel(label: string, depth: number, density: "low" | "medium" | "high"): string {
  const normalized = label.replace(/\s+/g, " ").trim();
  const densityBudget = density === "high" ? -10 : density === "medium" ? -4 : 0;
  const maxLength = Math.max(48, (depth === 1 ? 86 : 78) + densityBudget);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function compactEvidenceNote(value: string, role: "theme" | "child"): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  const maxLength = role === "theme" ? 140 : 110;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function densityLabel(density: "low" | "medium" | "high"): string {
  if (density === "high") return "高密度";
  if (density === "medium") return "中密度";
  return "低密度";
}

function qualityLabel(qualityState: EvidenceCardNode["qualityState"]): string {
  if (qualityState === "ready") return "ready";
  if (qualityState === "degraded") return "弱";
  return "缺源";
}
