import type { ArtifactPresentation, ArtifactRecord } from "../artifact_renderer/artifactPresentation";
import { presentArtifact } from "../artifact_renderer/artifactPresentation";

export type MindmapPresentation = {
  artifactId: string;
  mermaidSource: string;
  renderMode: "evidence_card" | "mermaid" | "source_fallback" | "source_unavailable";
  sourceFallback: string;
  nodeSourceMap: Record<string, unknown>;
  nodeBindings: MindmapNodeBinding[];
  sourceCards: SourceEvidenceCard[];
  evidenceCardViewModel: EvidenceCardViewModel;
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
  href?: string;
};

export type EvidenceCardNodeQualityState = "ready" | "degraded" | "missing_source";
export type EvidenceCardNodeUiState = "default" | "hover" | "focus" | "selected" | "neighbor_highlighted" | "dimmed" | "locating" | "located" | "fallback_shown" | "blocked";
export type EvidenceCardRenderMode = "evidence_card" | "mermaid_visual_fallback" | "mermaid_source_fallback" | "source_unavailable";
export type EvidenceCardSourcePanelStatus = "empty" | "ready" | "locating" | "located" | "fallback_shown" | "blocked";

export type EvidenceCardNode = {
  nodeId: string;
  label: string;
  note?: string;
  depth: number;
  parentNodeId: string | null;
  childNodeIds: string[];
  sourceRefIds: string[];
  sourceCount: number;
  confidence: number | null;
  qualityState: EvidenceCardNodeQualityState;
  uiState: EvidenceCardNodeUiState;
  tags: string[];
  degradedReason: string | null;
  textQuote: string | null;
  fallbackText: string | null;
};

export type EvidenceCardDensity = "low" | "medium" | "high";

export type EvidenceCardDisplayPolicy = {
  maxDepth: 2;
  density: EvidenceCardDensity;
  maxVisibleThemes: number;
  maxVisibleChildrenPerTheme: number;
  hiddenNodeCount: number;
  rootNodeId: string | null;
  rootLabel: string | null;
};

export type EvidenceCardTheme = {
  themeId: string;
  nodeId: string;
  label: string;
  sourceCount: number;
  confidence: number | null;
  qualityState: EvidenceCardNodeQualityState;
  uiState: EvidenceCardNodeUiState;
  childNodeIds: string[];
  visibleChildNodeIds: string[];
  hiddenChildCount: number;
  totalNodeCount: number;
  score: number;
};

export type EvidenceCardEdge = {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  uiState: "default" | "highlighted" | "dimmed";
};

export type EvidenceCardSourcePanelItem = {
  sourceRefId: string;
  displayText: string;
  jumpbackStatus: "not_attempted" | "locating" | "dom_success" | "fallback_shown" | "blocked";
  failureReason: string | null;
};

export type EvidenceCardSourcePanel = {
  status: EvidenceCardSourcePanelStatus;
  selectedNodeId: string | null;
  sourceRefIds: string[];
  items: EvidenceCardSourcePanelItem[];
  failureReason: string | null;
};

export type EvidenceCardInteractionState = {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  focusedNodeId: string | null;
  neighborNodeIds: string[];
  dimmedNodeIds: string[];
};

export type EvidenceCardFallback = {
  reason: "missing_node_source_map" | "missing_source_ref" | "mermaid_render_failed" | "dom_jumpback_failed" | "low_signal_page" | "unknown";
  visibleToUser: boolean;
  detail?: string;
};

export type EvidenceCardViewModel = {
  viewModelId: string;
  artifactId: string;
  sourcePageId: string;
  renderMode: EvidenceCardRenderMode;
  nodes: EvidenceCardNode[];
  edges: EvidenceCardEdge[];
  themes: EvidenceCardTheme[];
  displayPolicy: EvidenceCardDisplayPolicy;
  sourcePanel: EvidenceCardSourcePanel;
  interactionState: EvidenceCardInteractionState;
  fallbacks: EvidenceCardFallback[];
  warnings: string[];
};

export type ReadingMapNavItem = {
  nodeId: string;
  label: string;
  depth: number;
  sourceCount: number;
  qualityState: EvidenceCardNodeQualityState;
  uiState: EvidenceCardNodeUiState;
  childNodeIds: string[];
  hiddenChildCount: number;
};

export type ReadingMapDetail = {
  nodeId: string;
  label: string;
  note: string | null;
  sourceCount: number;
  qualityState: EvidenceCardNodeQualityState;
  confidence: number | null;
  tags: string[];
  textQuote: string | null;
  fallbackText: string | null;
  degradedReason: string | null;
  sourceItems: EvidenceCardSourcePanelItem[];
};

export type ReadingMapViewModel = {
  viewModelId: string;
  artifactId: string;
  sourcePageId: string;
  selectedNodeId: string | null;
  rootLabel: string | null;
  density: EvidenceCardDensity;
  navItems: ReadingMapNavItem[];
  detail: ReadingMapDetail | null;
  sourcePanel: EvidenceCardSourcePanel;
  warnings: string[];
  fallbacks: EvidenceCardFallback[];
};

export function presentMindmapArtifact(artifact: ArtifactRecord, renderError?: string): MindmapPresentation {
  const presented: ArtifactPresentation = presentArtifact(artifact);
  const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
  const nodeSourceMap = isRecord(metadata.nodeSourceMap) ? metadata.nodeSourceMap : {};
  const nodeBindings = parseNodeBindings(metadata.nodeBindings, nodeSourceMap);
  const sourceCards = buildSourceEvidenceCards(nodeBindings, nodeSourceMap);
  const mermaidSource = presented.body;
  const evidenceFallback = sourceEvidenceFallback(nodeSourceMap);
  const evidenceCardViewModel = toEvidenceCardViewModel(artifact, { renderError });
  const renderMode = renderError ? "source_fallback" : evidenceCardViewModel.renderMode === "evidence_card" ? "evidence_card" : evidenceCardViewModel.renderMode === "source_unavailable" ? "source_unavailable" : "mermaid";
  return {
    artifactId: artifact.artifactId,
    mermaidSource,
    renderMode,
    sourceFallback: [mermaidSource || "Mermaid source is unavailable.", evidenceFallback].filter(Boolean).join("\n\nSources:\n"),
    nodeSourceMap,
    nodeBindings,
    sourceCards,
    evidenceCardViewModel,
    errorMessage: renderError ?? null
  };
}

export function toEvidenceCardViewModel(artifact: ArtifactRecord, options: { renderError?: string } = {}): EvidenceCardViewModel {
  const presented: ArtifactPresentation = presentArtifact(artifact);
  const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
  const nodeSourceMap = isRecord(metadata.nodeSourceMap) ? metadata.nodeSourceMap : {};
  const nodeBindings = parseNodeBindings(metadata.nodeBindings, nodeSourceMap);
  const sourceCards = buildSourceEvidenceCards(nodeBindings, nodeSourceMap);
  const mermaidNodes = parseMermaidNodes(presented.body);
  const fallbacks: EvidenceCardFallback[] = [];
  const warnings: string[] = [];

  if (options.renderError) {
    fallbacks.push({ reason: "mermaid_render_failed", visibleToUser: true, detail: options.renderError });
  }
  if (Object.keys(nodeSourceMap).length === 0) {
    fallbacks.push({ reason: "missing_node_source_map", visibleToUser: true, detail: "Mindmap artifact metadata.nodeSourceMap is missing." });
  }

  const nodes = nodeBindings.map((binding, index) => buildEvidenceCardNode(binding, index, nodeSourceMap, sourceCards, mermaidNodes));
  const nodesWithTree = applyEvidenceCardTree(nodes, mermaidNodes);
  const edges = nodesWithTree
    .filter((node) => node.parentNodeId)
    .map((node) => ({
      edgeId: `${node.parentNodeId}->${node.nodeId}`,
      sourceNodeId: node.parentNodeId ?? "",
      targetNodeId: node.nodeId,
      uiState: "default" as const
    }));

  if (nodesWithTree.length === 0) {
    warnings.push("Evidence Card nodes are unavailable; falling back to Mermaid source.");
  }
  if (nodesWithTree.some((node) => node.qualityState === "missing_source")) {
    fallbacks.push({ reason: "missing_source_ref", visibleToUser: true, detail: "One or more nodes do not have source evidence." });
  }

  const { themes, displayPolicy } = buildEvidenceCardThemes(nodesWithTree);
  const renderMode: EvidenceCardRenderMode = nodesWithTree.length > 0 ? "evidence_card" : options.renderError ? "mermaid_source_fallback" : "source_unavailable";

  return {
    viewModelId: `evm_${artifact.artifactId}`,
    artifactId: artifact.artifactId,
    sourcePageId: artifact.sourcePageId ?? "source_unknown",
    renderMode,
    nodes: nodesWithTree,
    edges,
    themes,
    displayPolicy,
    sourcePanel: {
      status: "empty",
      selectedNodeId: null,
      sourceRefIds: [],
      items: [],
      failureReason: null
    },
    interactionState: {
      selectedNodeId: null,
      hoveredNodeId: null,
      focusedNodeId: null,
      neighborNodeIds: [],
      dimmedNodeIds: []
    },
    fallbacks,
    warnings
  };
}

export function toReadingMapViewModel(viewModel: EvidenceCardViewModel, selectedNodeId?: string | null): ReadingMapViewModel {
  const selected =
    (selectedNodeId ? viewModel.nodes.find((node) => node.nodeId === selectedNodeId) : null) ??
    viewModel.nodes.find((node) => node.nodeId === viewModel.displayPolicy.rootNodeId) ??
    viewModel.nodes[0] ??
    null;
  const selectedView = selected ? selectEvidenceCardNode(viewModel, selected.nodeId, viewModel.sourcePanel.status === "empty" ? "ready" : viewModel.sourcePanel.status, viewModel.sourcePanel.failureReason) : viewModel;
  const navItems = buildReadingMapNavItems(selectedView);
  return {
    viewModelId: `reading_map_${viewModel.viewModelId}`,
    artifactId: viewModel.artifactId,
    sourcePageId: viewModel.sourcePageId,
    selectedNodeId: selected?.nodeId ?? null,
    rootLabel: viewModel.displayPolicy.rootLabel,
    density: viewModel.displayPolicy.density,
    navItems,
    detail: selected ? toReadingMapDetail(selectedView.nodes.find((node) => node.nodeId === selected.nodeId) ?? selected, selectedView.sourcePanel) : null,
    sourcePanel: selectedView.sourcePanel,
    warnings: selectedView.warnings,
    fallbacks: selectedView.fallbacks
  };
}

export function selectEvidenceCardNode(viewModel: EvidenceCardViewModel, nodeId: string, status: EvidenceCardSourcePanelStatus = "ready", failureReason: string | null = null): EvidenceCardViewModel {
  const selected = viewModel.nodes.find((node) => node.nodeId === nodeId) ?? null;
  if (!selected) return viewModel;
  const neighborNodeIds = Array.from(new Set([...selected.childNodeIds, ...(selected.parentNodeId ? [selected.parentNodeId] : [])]));
  const dimmedNodeIds = viewModel.nodes
    .map((node) => node.nodeId)
    .filter((candidate) => candidate !== nodeId && !neighborNodeIds.includes(candidate));
  const sourceItems = sourcePanelItemsForNode(selected, status, failureReason);
  return {
    ...viewModel,
    nodes: viewModel.nodes.map((node) => ({
      ...node,
      uiState: node.nodeId === nodeId ? statusToNodeUiState(status) : neighborNodeIds.includes(node.nodeId) ? "neighbor_highlighted" : "dimmed"
    })),
    edges: viewModel.edges.map((edge) => ({
      ...edge,
      uiState: edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId ? "highlighted" : "dimmed"
    })),
    themes: viewModel.themes.map((theme) => {
      const isSelectedTheme = theme.nodeId === nodeId;
      const isNeighborTheme = neighborNodeIds.includes(theme.nodeId) || theme.visibleChildNodeIds.includes(nodeId);
      return {
        ...theme,
        uiState: isSelectedTheme ? statusToNodeUiState(status) : isNeighborTheme ? "neighbor_highlighted" : "dimmed"
      };
    }),
    sourcePanel: {
      status,
      selectedNodeId: nodeId,
      sourceRefIds: selected.sourceRefIds,
      items: sourceItems,
      failureReason
    },
    interactionState: {
      selectedNodeId: nodeId,
      hoveredNodeId: null,
      focusedNodeId: nodeId,
      neighborNodeIds,
      dimmedNodeIds
    }
  };
}

function buildReadingMapNavItems(viewModel: EvidenceCardViewModel): ReadingMapNavItem[] {
  const root = viewModel.nodes.find((node) => node.nodeId === viewModel.displayPolicy.rootNodeId) ?? viewModel.nodes[0] ?? null;
  const rootItem = root
    ? [{
        nodeId: root.nodeId,
        label: root.label,
        depth: 0,
        sourceCount: root.sourceCount,
        qualityState: root.qualityState,
        uiState: root.uiState,
        childNodeIds: root.childNodeIds,
        hiddenChildCount: 0
      }]
    : [];
  const themeItems = viewModel.themes.flatMap((theme) => {
    const themeNode = viewModel.nodes.find((node) => node.nodeId === theme.nodeId);
    const children = theme.visibleChildNodeIds
      .map((nodeId) => viewModel.nodes.find((node) => node.nodeId === nodeId))
      .filter((node): node is EvidenceCardNode => Boolean(node))
      .map((node) => ({
        nodeId: node.nodeId,
        label: node.label,
        depth: 2,
        sourceCount: node.sourceCount,
        qualityState: node.qualityState,
        uiState: node.uiState,
        childNodeIds: node.childNodeIds,
        hiddenChildCount: 0
      }));
    return [
      {
        nodeId: theme.nodeId,
        label: theme.label,
        depth: 1,
        sourceCount: theme.sourceCount,
        qualityState: theme.qualityState,
        uiState: theme.uiState,
        childNodeIds: theme.childNodeIds,
        hiddenChildCount: theme.hiddenChildCount
      },
      ...children
    ].filter((item) => item.nodeId !== root?.nodeId || !themeNode);
  });
  return dedupeReadingMapItems([...rootItem, ...themeItems]);
}

function toReadingMapDetail(node: EvidenceCardNode, sourcePanel: EvidenceCardSourcePanel): ReadingMapDetail {
  return {
    nodeId: node.nodeId,
    label: node.label,
    note: node.note ?? null,
    sourceCount: node.sourceCount,
    qualityState: node.qualityState,
    confidence: node.confidence,
    tags: node.tags,
    textQuote: node.textQuote,
    fallbackText: node.fallbackText,
    degradedReason: node.degradedReason,
    sourceItems: sourcePanel.selectedNodeId === node.nodeId ? sourcePanel.items : sourcePanelItemsForNode(node, "ready", null)
  };
}

function dedupeReadingMapItems(items: ReadingMapNavItem[]): ReadingMapNavItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.nodeId)) return false;
    seen.add(item.nodeId);
    return true;
  });
}

export function buildJumpbackRequest(card: SourceEvidenceCard): JumpbackRequest {
  const selector = typeof card.jumpback.selector === "string" && card.jumpback.selector.trim() ? card.jumpback.selector : undefined;
  const domPath = typeof card.jumpback.domPath === "string" && card.jumpback.domPath.trim() ? card.jumpback.domPath : undefined;
  const href = typeof card.jumpback.href === "string" && card.jumpback.href.trim() ? card.jumpback.href : undefined;
  return {
    nodeId: card.nodeId,
    nodeSourceMapKey: card.nodeSourceMapKey,
    sourceRefIds: card.sourceRefIds,
    paragraphIds: card.paragraphIds,
    chunkIds: card.chunkIds,
    textQuote: card.textQuote,
    fallbackText: card.fallbackText,
    ...(selector ? { selector } : {}),
    ...(domPath ? { domPath } : {}),
    ...(href ? { href } : {})
  };
}

export function buildEvidenceCardJumpbackRequest(node: EvidenceCardNode, sourceCard?: SourceEvidenceCard): JumpbackRequest | { nodeId: string; fallbackText: string; reason: string } {
  if (sourceCard) return buildJumpbackRequest(sourceCard);
  return {
    nodeId: node.nodeId,
    fallbackText: node.fallbackText ?? node.textQuote ?? "",
    reason: node.degradedReason ?? "source_ref_missing"
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
  const seen = new Set<string>();
  return bindings
    .map((binding) => {
      const source = nodeSourceMap[binding.nodeSourceMapKey];
      if (!isRecord(source)) return null;
      const fallbackText = compactSourcePanelText(firstString(source.fallbackText, source.textQuote, source.excerpt));
      const textQuote = compactSourcePanelText(firstString(source.textQuote, source.excerpt, source.fallbackText));
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
    .filter((card) => Boolean(card.textQuote || card.fallbackText))
    .sort((left, right) => sourceEvidenceCardScore(right) - sourceEvidenceCardScore(left))
    .filter((card) => {
      const evidenceKey = compactSourcePanelText(card.fallbackText || card.textQuote).replace(/\s+/g, "").slice(0, 120);
      const key = `${card.nodeId}|${evidenceKey}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function compactSourcePanelText(value: string): string {
  const normalized = value
    .replace(/\s+/g, " ")
    .replace(/(?:首页|动态|热门|频道|消息|投稿|直播|课堂|社区中心)\s+/g, "")
    .replace(/(?:图\s*\d+\s*)+/g, "")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, " ")
    .replace(/(?:自动连播|订阅合集|相关推荐|按类型过滤|防挡字幕|智能防挡弹幕|弹幕随屏幕缩放|稿件投诉).*$/g, "")
    .replace(/(?:未经作者授权|禁止转载|下载客户端|扫码登录|登录后推荐).*$/g, "")
    .replace(/(?:沪ICP备|沪公网安备|营业执照|增值电信业务|网络文化经营许可证).*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= 260) return normalized;
  return `${normalized.slice(0, 259).trim()}…`;
}

function sourceEvidenceCardScore(card: SourceEvidenceCard): number {
  const text = `${card.nodeLabel} ${card.textQuote} ${card.fallbackText}`.toLowerCase();
  const normalized = normalizeSourceEvidenceText(card.fallbackText || card.textQuote);
  let score = 0;
  if (card.sourceRefIds.length > 0) score += Math.min(12, card.sourceRefIds.length * 2);
  if (card.textQuote) score += 10;
  if (card.fallbackText) score += 4;
  if (/article|正文|标题|作者|发布时间|来源：|文\/|观察者网|视频简介|up主|笔记|note|feed|card|explore|bilibili\.com\/video|xiaohongshu\.com\/explore|guancha\.cn\/.+\.shtml/.test(text)) score += 24;
  if (/bili_feed_card|bilibili\.com\/video|xiaohongshu\.com\/explore|guancha\.cn\/.+\.shtml/.test(text)) score += 14;
  if (/^root$|首页|推荐\s+穿搭\s+美食\s+彩妆|频道|动态|热门|消息|投稿/.test(text)) score -= 28;
  if (/^description\b|^keywords\b|^canonical\b|^referrer\b|^server_render\b|description:|keywords:|canonical:|referrer:|server_render:/.test(text)) score -= 38;
  if (/评论|回复|热评|踩\d*|赞\d*|收藏|举报|分享|最新视频|查看全部|推荐列表|相关推荐|自动连播|订阅合集|侧栏|footer|沪icp|营业执照|隐私政策|活动横幅|qq群|微信|防挡字幕|弹幕设置|高级弹幕|稿件投诉/.test(text)) score -= 36;
  if ((normalized.match(/\d+(?:\.\d+)?万/g) || []).length >= 3) score -= 14;
  if ((normalized.match(/\b\d{1,2}:\d{2}\b/g) || []).length >= 2) score -= 14;
  if (normalized.length > 520) score -= 10;
  if (card.nodeId === "root") score -= 16;
  return score;
}

function normalizeSourceEvidenceText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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

function buildEvidenceCardNode(
  binding: MindmapNodeBinding,
  index: number,
  nodeSourceMap: Record<string, unknown>,
  sourceCards: SourceEvidenceCard[],
  mermaidNodes: ParsedMermaidNode[]
): EvidenceCardNode {
  const source = nodeSourceMap[binding.nodeSourceMapKey];
  const sourceRecord = isRecord(source) ? source : {};
  const card = sourceCards.find((item) => item.nodeId === binding.nodeId || item.nodeSourceMapKey === binding.nodeSourceMapKey);
  const mermaidNode = mermaidNodes.find((item) => item.lineIndex === binding.mermaidLineIndex) ?? mermaidNodes.find((item) => labelsMatch(item.label, binding.nodeLabel));
  const sourceRefIds = binding.sourceRefIds.length ? binding.sourceRefIds : toStringArray(sourceRecord.sourceRefIds);
  const textQuote = firstString(card?.textQuote, sourceRecord.textQuote, sourceRecord.excerpt);
  const fallbackText = firstString(card?.fallbackText, sourceRecord.fallbackText, sourceRecord.textQuote, sourceRecord.excerpt);
  const confidence = typeof sourceRecord.confidence === "number" && Number.isFinite(sourceRecord.confidence) ? clamp(sourceRecord.confidence, 0, 1) : null;
  const qualityState = sourceRefIds.length > 0 && (textQuote || fallbackText) ? "ready" : sourceRefIds.length > 0 || textQuote || fallbackText ? "degraded" : "missing_source";
  const degradedReason = qualityState === "ready" ? null : sourceRefIds.length === 0 ? "sourceRefIds missing" : "source quote unavailable";
  return {
    nodeId: binding.nodeId,
    label: truncate(binding.nodeLabel || mermaidNode?.label || binding.nodeSourceMapKey, 96),
    note: truncate(fallbackText || textQuote, 180) || undefined,
    depth: mermaidNode?.depth ?? (index === 0 ? 0 : 1),
    parentNodeId: null,
    childNodeIds: [],
    sourceRefIds,
    sourceCount: sourceRefIds.length,
    confidence,
    qualityState,
    uiState: "default",
    tags: buildEvidenceCardTags(mermaidNode?.depth ?? (index === 0 ? 0 : 1), qualityState, sourceRefIds.length),
    degradedReason,
    textQuote: textQuote || null,
    fallbackText: fallbackText || null
  };
}

function applyEvidenceCardTree(nodes: EvidenceCardNode[], mermaidNodes: ParsedMermaidNode[]): EvidenceCardNode[] {
  const stack: EvidenceCardNode[] = [];
  const nextNodes = nodes.map((node, index) => {
    const parsed = mermaidNodes[index] ?? mermaidNodes.find((item) => labelsMatch(item.label, node.label));
    const depth = parsed?.depth ?? node.depth;
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
    const parentNodeId = stack.at(-1)?.nodeId ?? null;
    const nextNode = { ...node, depth, parentNodeId };
    stack.push(nextNode);
    return nextNode;
  });

  return nextNodes.map((node) => ({
    ...node,
    childNodeIds: nextNodes.filter((candidate) => candidate.parentNodeId === node.nodeId).map((candidate) => candidate.nodeId)
  }));
}

function sourcePanelItemsForNode(node: EvidenceCardNode, status: EvidenceCardSourcePanelStatus, failureReason: string | null): EvidenceCardSourcePanelItem[] {
  const displayText = compactSourcePanelText(node.fallbackText ?? node.textQuote ?? node.degradedReason ?? "Source evidence unavailable.");
  const sourceRefId = node.sourceRefIds[0] ?? `missing_source_${node.nodeId}`;
  return [{
    sourceRefId,
    displayText,
    jumpbackStatus: statusToJumpbackStatus(status),
    failureReason
  }];
}

function statusToNodeUiState(status: EvidenceCardSourcePanelStatus): EvidenceCardNodeUiState {
  if (status === "locating") return "locating";
  if (status === "located") return "located";
  if (status === "fallback_shown") return "fallback_shown";
  if (status === "blocked") return "blocked";
  return "selected";
}

function statusToJumpbackStatus(status: EvidenceCardSourcePanelStatus): EvidenceCardSourcePanelItem["jumpbackStatus"] {
  if (status === "locating") return "locating";
  if (status === "located") return "dom_success";
  if (status === "fallback_shown") return "fallback_shown";
  if (status === "blocked") return "blocked";
  return "not_attempted";
}

function buildEvidenceCardTags(depth: number, qualityState: EvidenceCardNodeQualityState, sourceCount: number): string[] {
  const tags = [depth === 0 ? "root" : "detail"];
  if (sourceCount > 0) tags.push(`${sourceCount} source${sourceCount > 1 ? "s" : ""}`);
  if (qualityState !== "ready") tags.push(qualityState === "missing_source" ? "missing source" : "degraded");
  return tags;
}

function buildEvidenceCardThemes(nodes: EvidenceCardNode[]): { themes: EvidenceCardTheme[]; displayPolicy: EvidenceCardDisplayPolicy } {
  const density = classifyEvidenceDensity(nodes.length);
  const maxVisibleThemes = density === "high" ? 4 : density === "medium" ? 5 : 6;
  const maxVisibleChildrenPerTheme = density === "high" ? 2 : density === "medium" ? 3 : 4;
  const root = nodes.find((node) => node.depth === 0) ?? nodes[0] ?? null;
  const rootNodeId = root?.nodeId ?? null;
  const candidates = nodes.filter((node) => node.nodeId !== rootNodeId);
  const directThemes = root ? nodes.filter((node) => node.parentNodeId === root.nodeId) : candidates.filter((node) => node.parentNodeId === null);
  const naturalThemes = directThemes.length > 0 ? directThemes : candidates.length > 0 ? candidates : root ? [root] : [];
  const mostlyFlat = naturalThemes.length > maxVisibleThemes && naturalThemes.every((node) => node.childNodeIds.length === 0);
  const themeNodes = mostlyFlat
    ? rankedNodes(naturalThemes).slice(0, maxVisibleThemes)
    : naturalThemes.slice(0, maxVisibleThemes);
  const themeNodeIds = new Set(themeNodes.map((node) => node.nodeId));
  const flatChildren = mostlyFlat ? rankedNodes(naturalThemes.filter((node) => !themeNodeIds.has(node.nodeId))) : [];
  const themes = themeNodes.map((themeNode, index) => {
    const naturalChildren = nodes.filter((node) => node.parentNodeId === themeNode.nodeId);
    const syntheticChildren = mostlyFlat ? flatChildren.filter((_, childIndex) => childIndex % Math.max(1, themeNodes.length) === index) : [];
    const childNodes = rankedNodes(dedupeNodes([...naturalChildren, ...syntheticChildren]));
    const visibleChildren = childNodes.slice(0, maxVisibleChildrenPerTheme);
    return {
      themeId: `theme_${themeNode.nodeId}`,
      nodeId: themeNode.nodeId,
      label: themeNode.label,
      sourceCount: themeNode.sourceCount + visibleChildren.reduce((sum, child) => sum + child.sourceCount, 0),
      confidence: themeNode.confidence,
      qualityState: themeNode.qualityState,
      uiState: themeNode.uiState,
      childNodeIds: childNodes.map((node) => node.nodeId),
      visibleChildNodeIds: visibleChildren.map((node) => node.nodeId),
      hiddenChildCount: Math.max(0, childNodes.length - visibleChildren.length),
      totalNodeCount: 1 + childNodes.length,
      score: scoreEvidenceNode(themeNode) + visibleChildren.reduce((sum, child) => sum + scoreEvidenceNode(child), 0)
    };
  });
  const displayedNodeIds = new Set<string>();
  themes.forEach((theme) => {
    displayedNodeIds.add(theme.nodeId);
    theme.visibleChildNodeIds.forEach((nodeId) => displayedNodeIds.add(nodeId));
  });
  const hiddenNodeCount = candidates.filter((node) => !displayedNodeIds.has(node.nodeId)).length;

  return {
    themes,
    displayPolicy: {
      maxDepth: 2,
      density,
      maxVisibleThemes,
      maxVisibleChildrenPerTheme,
      hiddenNodeCount,
      rootNodeId,
      rootLabel: root?.label ?? null
    }
  };
}

function classifyEvidenceDensity(nodeCount: number): EvidenceCardDensity {
  if (nodeCount > 18) return "high";
  if (nodeCount > 8) return "medium";
  return "low";
}

function rankedNodes(nodes: EvidenceCardNode[]): EvidenceCardNode[] {
  return [...nodes].sort((left, right) => scoreEvidenceNode(right) - scoreEvidenceNode(left) || left.depth - right.depth);
}

function dedupeNodes(nodes: EvidenceCardNode[]): EvidenceCardNode[] {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    if (seen.has(node.nodeId)) return false;
    seen.add(node.nodeId);
    return true;
  });
}

function scoreEvidenceNode(node: EvidenceCardNode): number {
  const sourceScore = Math.min(node.sourceCount, 3) * 2;
  const confidenceScore = node.confidence === null ? 0.5 : node.confidence * 2;
  const quoteScore = node.textQuote || node.fallbackText ? 1.2 : 0;
  const childScore = Math.min(node.childNodeIds.length, 4) * 0.7;
  const qualityPenalty = node.qualityState === "missing_source" ? -3 : node.qualityState === "degraded" ? -1 : 0;
  const longLabelPenalty = node.label.length > 48 ? -0.4 : 0;
  return sourceScore + confidenceScore + quoteScore + childScore + qualityPenalty + longLabelPenalty;
}

type ParsedMermaidNode = {
  lineIndex: number;
  label: string;
  depth: number;
};

function parseMermaidNodes(source: string): ParsedMermaidNode[] {
  return source
    .split(/\r?\n/)
    .map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "mindmap") return null;
      const indent = line.search(/\S|$/);
      return {
        lineIndex: index,
        label: parseMermaidLabel(trimmed),
        depth: Math.max(0, Math.floor(indent / 2))
      };
    })
    .filter((item): item is ParsedMermaidNode => Boolean(item));
}

function parseMermaidLabel(trimmed: string): string {
  const bracketMatch = trimmed.match(/\(\((.+?)\)\)/);
  if (bracketMatch?.[1]) return bracketMatch[1].trim();
  return trimmed.replace(/^[\w-]+\s*/, "").replace(/[()[\]{}]/g, "").trim() || trimmed;
}

function labelsMatch(left: string, right: string): boolean {
  const a = normalizeLabel(left);
  const b = normalizeLabel(right);
  return Boolean(a && b && (a.includes(b) || b.includes(a)));
}

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…` : normalized;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
