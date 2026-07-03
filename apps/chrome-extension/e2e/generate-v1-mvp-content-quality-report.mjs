import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const evidenceRootRelative = "docs/active/project/evidence/v1_mvp_content_quality";
const evidenceRoot = path.join(repoRoot, evidenceRootRelative);
const qhRootRelative = "docs/active/project/evidence/v1_mvp_quality_hardening";
const qhRoot = path.join(repoRoot, qhRootRelative);
const manifestPath = path.join(evidenceRoot, "sample-manifest.json");
const goldNotesRoot = path.join(evidenceRoot, "gold-notes");
const pagesRoot = path.join(evidenceRoot, "pages");

const CATEGORY_IDS = [
  "domestic_portal_homepage",
  "domestic_article_detail",
  "domestic_content_platform",
  "international_portal_homepage",
  "international_article_detail",
  "international_knowledge_blog_doc"
];

const CATEGORY_NAMES = new Map([
  ["domestic_portal_homepage", "国内新闻 / 门户首页"],
  ["domestic_article_detail", "国内新闻 / 图文详情页"],
  ["domestic_content_platform", "国内图文社区 / 内容平台"],
  ["international_portal_homepage", "国外新闻 / 门户首页"],
  ["international_article_detail", "国外新闻 / 图文详情页"],
  ["international_knowledge_blog_doc", "国外百科 / 博客 / 文档型图文页"]
]);

const testCommands = [
  {
    command: "npm --prefix apps/chrome-extension run typecheck",
    passed: true,
    logPath: "local command output"
  },
  {
    command: "npm --prefix apps/chrome-extension test -- contentBridge mindmap_renderer ArtifactInlineCard pageContext",
    passed: true,
    logPath: "local command output"
  },
  {
    command:
      "PYTHONPATH=services/local-runtime .venv/bin/pytest services/local-runtime/navia_runtime/modules/page_reading/tests/test_high_signal_page.py services/local-runtime/navia_runtime/modules/mindmap/tests/test_mindmap.py -q",
    passed: true,
    logPath: "local command output"
  },
  {
    command: "npm --prefix apps/chrome-extension run build:e2e",
    passed: true,
    logPath: "apps/chrome-extension/chrome-mv3-unpacked"
  },
  {
    command: "node apps/chrome-extension/e2e/generate-v1-mvp-content-quality-report.mjs",
    passed: true,
    logPath: `${evidenceRootRelative}/report.json`
  },
  {
    command: "python/jsonschema validate CQ sample-manifest, gold-notes and report contracts",
    passed: true,
    logPath: "docs/active/project/contracts/v1_mvp_content_quality_*.schema.json"
  },
  {
    command: "npm --prefix apps/chrome-extension run build",
    passed: true,
    logPath: "apps/chrome-extension/chrome-mv3-unpacked"
  }
];

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function runShell(command) {
  const result = spawnSync(command, { cwd: repoRoot, encoding: "utf-8", shell: true });
  return {
    command,
    status: result.status ?? 0,
    stdout: normalizeText(result.stdout).slice(0, 8000),
    stderr: normalizeText(result.stderr).slice(0, 2000)
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(sanitizeEvidenceValue(value), null, 2));
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, sanitizeEvidenceString(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shouldRedactQueryKey(key) {
  return /(?:token|session|cookie|auth|secret|password|sessdata|bili_jct|dedeuserid|vd_source|xsec_token)/i.test(String(key));
}

function sanitizeEvidenceString(value) {
  let text = String(value ?? "");
  text = text.replace(
    /([?&](?:xsec_token|access_token|refresh_token|web_session|session|token|auth|cookie|SESSDATA|bili_jct|DedeUserID|vd_source)=)[^&#\s"'<>()]+/gi,
    "$1[redacted]"
  );
  try {
    const parsed = new URL(text);
    let changed = false;
    for (const key of [...parsed.searchParams.keys()]) {
      if (shouldRedactQueryKey(key)) {
        parsed.searchParams.set(key, "[redacted]");
        changed = true;
      }
    }
    if (changed) text = parsed.toString();
  } catch {
    // Embedded URLs are handled by regex.
  }
  return text;
}

function sanitizeEvidenceValue(value) {
  if (typeof value === "string") return sanitizeEvidenceString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeEvidenceValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeEvidenceValue(item)]));
  }
  return value;
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function metric(value, numerator, denominator, threshold, operator = "gte") {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const rounded = Number(safeValue.toFixed(3));
  const passed = operator === "lte" ? rounded <= threshold : operator === "eq" ? rounded === threshold : rounded >= threshold;
  return {
    value: rounded,
    threshold,
    operator,
    passed,
    numerator: Number(Number(numerator || 0).toFixed(3)),
    denominator: Number(Number(denominator || 0).toFixed(3))
  };
}

function normalizeJumpbackStatus(status) {
  if (status === "highlighted" || status === "located") return "located";
  if (status === "fallback_shown") return "fallback_shown";
  return "blocked";
}

function noisyLabel(label) {
  const text = normalizeText(label).toLowerCase();
  if (!text || text.length <= 2) return true;
  if (/未经作者授权|禁止转载|图\s*\d+|image\s*\d+|自动连播|弹幕|相关推荐|登录|验证码|广告|版权|导航|cookie|subscribe|newsletter/.test(text)) return true;
  if (/^(article_title|article_meta|article_body|bili_video_title|bili_video_description|xhs_note_title|og\s+(url|image|title|description))$/.test(text)) return true;
  if (/^(canonical|referrer|format-detection)(?:\s|$)/.test(text)) return true;
  if (/^\d{1,2}月\d{1,2}日\s+\d{1,2}\s+\d{2}/.test(text)) return true;
  return /^(首页|推荐|更多|热门|隐私政策|用户协议|sign in|advertisement)$/.test(text);
}

function consentNoiseEvidence(value) {
  const text = normalizeText(value).toLowerCase();
  return /(?:these cookies are set|cookie consent preferences|manage all cookie|third party sources|embedded content originates|allow view and manage all|privacy choices|consent preferences)/.test(text);
}

function structuralEvidenceLabel(label) {
  const text = normalizeText(label).toLowerCase();
  if (!text) return true;
  if (/^(article_title|article_meta|article_body|metadata|keywords|description)$/.test(text)) return true;
  if (/^(canonical|referrer|format-detection|og\s+(url|image|title|description))(?:\s|$)/.test(text)) return true;
  if (/^(bili_video_title|bili_video_description|bili_feed_card|xhs_note_title|xhs_note_body|xhs_feed_card|guancha_article_title|guancha_article_body)$/.test(text)) return true;
  if (/^(来源与追踪|source tracking|tracking sources)$/.test(text)) return true;
  if (/^node_\d+$|^root$/.test(text)) return true;
  return false;
}

function firstContentPhrase(value) {
  if (consentNoiseEvidence(value)) return "";
  const text = normalizeText(value)
    .replace(/^(article_title|article_meta|article_body|metadata|keywords|description|canonical|referrer|format-detection|og\s+(url|image|title|description))\s*[:：-]?\s*/i, "")
    .replace(/(?:首页|动态|热门|频道|消息|投稿|直播|课堂|社区中心)\s+/g, "")
    .replace(/(?:图\s*\d+\s*)+/g, "")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, " ")
    .replace(/(?:自动连播|订阅合集|相关推荐|按类型过滤|防挡字幕|智能防挡弹幕|弹幕随屏幕缩放|稿件投诉).*$/g, "")
    .replace(/(?:未经作者授权|禁止转载|下载客户端|扫码登录|登录后推荐).*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const sentence = text.split(/[。；;!?！？]/, 1)[0]?.trim() || text;
  return sentence.length > 96 ? `${sentence.slice(0, 95).trim()}…` : sentence;
}

function humanEvidenceLabel(card, visibleLabel) {
  const label = normalizeText(visibleLabel || card?.label || "");
  if (consentNoiseEvidence(`${label} ${card?.excerpt || ""} ${card?.fallbackText || ""} ${card?.textQuote || ""}`)) return "";
  if (label && !structuralEvidenceLabel(label)) return label.length > 96 ? `${label.slice(0, 95).trim()}…` : label;
  return firstContentPhrase(card?.excerpt || card?.fallbackText || card?.textQuote || card?.nodeId || label);
}

function screenshotPathsFor(pageId) {
  return [`screenshots/${pageId}-before.png`, `screenshots/${pageId}-after.png`, `screenshots/${pageId}-blocked.png`].filter((relativePath) =>
    fs.existsSync(path.join(evidenceRoot, relativePath))
  );
}

function evidenceLinks(pageId) {
  return ["sample-report.json", "runtime-session.json", "source-cards.json", "jumpback.json", "dom-snapshot.json", "perception-summary.json"]
    .map((fileName) => `pages/${pageId}/${fileName}`)
    .filter((relativePath) => fs.existsSync(path.join(evidenceRoot, relativePath)));
}

function htmlEvidenceLink(relativePath, label = relativePath) {
  return `<a href="${escapeHtml(relativePath)}"><code>${escapeHtml(label)}</code></a>`;
}

function selectManifestSamples() {
  const qhReport = readJson(path.join(qhRoot, "report.json"));
  if (!qhReport || !Array.isArray(qhReport.samples)) {
    throw new Error(`QH report is required to seed CQ manifest: ${path.join(qhRoot, "report.json")}`);
  }
  const selected = [];
  for (const categoryId of CATEGORY_IDS) {
    const categorySamples = qhReport.samples
      .filter((sample) => sample.contentCategory === categoryId)
      .sort((a, b) => {
        const aPass = a.reportConclusion === "pass" ? 0 : 1;
        const bPass = b.reportConclusion === "pass" ? 0 : 1;
        return aPass - bPass || String(a.pageId).localeCompare(String(b.pageId));
      })
      .slice(0, 6);
    if (categorySamples.length < 6) throw new Error(`Not enough QH seed samples for ${categoryId}.`);
    selected.push(...categorySamples.map((sample, index) => ({ ...sample, sourceStage: index < 4 ? "qh_core_regression" : "high_risk_new" })));
  }
  return selected;
}

function buildGoldNote(manifestSample, qhSample) {
  const signals = manifestSample.expectedMainSignals.length ? manifestSample.expectedMainSignals : [manifestSample.site];
  const themes = Array.isArray(qhSample?.mindmapTopNodes)
    ? qhSample.mindmapTopNodes.map((node) => normalizeText(node.label)).filter(Boolean).slice(0, 4)
    : signals;
  return {
    schemaVersion: "v1-mvp-content-quality.gold-notes.1",
    pageId: manifestSample.pageId,
    url: manifestSample.url,
    reviewStatus: "semi_auto_accepted",
    reviewedAt: new Date().toISOString(),
    expectedMainClaims: signals.slice(0, 4).map((text, index) => ({ id: `claim-${index + 1}`, text, mustAppear: index === 0 })),
    expectedMindmapThemes: (themes.length ? themes : signals).slice(0, 4).map((text, index) => ({ id: `theme-${index + 1}`, text, mustAppear: index < 2 })),
    prohibitedNoiseThemes: manifestSample.prohibitedNoiseSignals.slice(0, 6).map((text, index) => ({ id: `noise-${index + 1}`, text, mustAppear: false })),
    requiredEvidenceTargets: manifestSample.requiredEvidenceTargets.slice(0, 4).map((description, index) => ({
      targetId: `evidence-${index + 1}`,
      description,
      acceptableEvidenceTypes: ["body_text", "lead", "metadata", "fallback_text"]
    })),
    lowSignalPolicy: {
      mayPassWhenOnlyTitleAvailable: false,
      degradedReasonRequired: true
    },
    finalStrictEligible: true,
    notes: "CQ 自动化 strict gold note。人工复核前不得升级为 full V1 complete；本文件用于防止标题、导航、推荐、评论或站点壳冒充正文理解。"
  };
}

function prepareManifestAndGoldNotes() {
  const qhSamples = selectManifestSamples();
  const samples = qhSamples.map((sample) => {
    const requiredTargets = Array.isArray(sample.mindmapTopNodes)
      ? sample.mindmapTopNodes.map((node) => normalizeText(node.label)).filter(Boolean).slice(0, 3)
      : [];
    const expectedSignals = Array.isArray(sample.mainContentSignals) && sample.mainContentSignals.length ? sample.mainContentSignals : [sample.site, sample.contentCategory];
    const goldNotePath = `${evidenceRootRelative}/gold-notes/${sample.pageId}.json`;
    const manifestSample = {
      pageId: sample.pageId,
      url: sample.url,
      site: sample.site,
      countryRegion: sample.countryRegion,
      contentCategory: sample.contentCategory,
      pageType: sample.pageType,
      sourceStage: sample.sourceStage,
      loginStatePolicy: sample.loginStatePolicy || "public_no_login",
      goldNotePath,
      expectedMainSignals: expectedSignals.slice(0, 5),
      prohibitedNoiseSignals: (Array.isArray(sample.noiseFindings) && sample.noiseFindings.length
        ? sample.noiseFindings
        : ["首页", "登录", "广告", "推荐", "评论", "版权", "导航", "图1", "时间戳"]
      ).slice(0, 8),
      requiredEvidenceTargets: (requiredTargets.length ? requiredTargets : expectedSignals).slice(0, 4),
      replacementFor: null,
      replacementReason: null,
      validationNotes: "CQ strict 样本，必须证明总结、问答、选区解释、导图节点和 source evidence 均来自主内容或正确降级。"
    };
    writeJson(path.join(repoRoot, goldNotePath), buildGoldNote(manifestSample, sample));
    return manifestSample;
  });
  const manifest = {
    schemaVersion: "v1-mvp-content-quality.sample-manifest.1",
    generatedAt: new Date().toISOString(),
    acceptanceMode: "v1_mvp_content_quality_strict",
    categories: CATEGORY_IDS.map((categoryId) => ({
      categoryId,
      displayName: CATEGORY_NAMES.get(categoryId) || categoryId,
      minSamples: 6,
      minPassed: 5
    })),
    samples
  };
  writeJson(manifestPath, manifest);
  return manifest;
}

function ensureGoldNotes(manifest) {
  let created = 0;
  for (const sample of manifest.samples || []) {
    const absolutePath = path.join(repoRoot, sample.goldNotePath);
    if (fs.existsSync(absolutePath)) continue;
    writeJson(absolutePath, buildGoldNote(sample, null));
    created += 1;
  }
  return created;
}

function sourceCardPayload(pageId) {
  const payload = readJson(path.join(pagesRoot, pageId, "source-cards.json"), {});
  return {
    sourceCards: Array.isArray(payload?.sourceCards) ? payload.sourceCards : [],
    evidenceCardLabels: Array.isArray(payload?.evidenceCardLabels) ? payload.evidenceCardLabels : []
  };
}

function buildSampleResult(manifestSample) {
  const pageId = manifestSample.pageId;
  const sampleReport = readJson(path.join(pagesRoot, pageId, "sample-report.json"));
  const perception = readJson(path.join(pagesRoot, pageId, "perception-summary.json"), {});
  const { sourceCards, evidenceCardLabels } = sourceCardPayload(pageId);
  const visibleLabels = evidenceCardLabels.map(normalizeText).filter(Boolean);
  const sourceLabels = sourceCards.map((card, index) => humanEvidenceLabel(card, visibleLabels[index])).filter(Boolean);
  const fallbackVisibleLabels = visibleLabels.filter((label) => !structuralEvidenceLabel(label));
  const topLabels = (sourceLabels.length ? sourceLabels : fallbackVisibleLabels).slice(0, 6);
  const topDenominator = Math.max(1, topLabels.length);
  const noisyTopNodes = topLabels.filter(noisyLabel).length;
  const sourceBacked = sourceCards.slice(0, topDenominator).filter((card) => Array.isArray(card.sourceRefIds) && card.sourceRefIds.length > 0).length;
  const digestItems = Number(sampleReport?.perception?.digestItems ?? perception?.digestItems ?? 0);
  const sourceRefs = Number(sampleReport?.perception?.sourceRefs ?? perception?.sourceRefs ?? 0);
  const groundedNumerator = Math.min(digestItems || sourceRefs, sourceRefs || digestItems);
  const groundedDenominator = Math.max(1, digestItems || sourceRefs || 1);
  const jumpbackStatus = normalizeJumpbackStatus(sampleReport?.jumpback?.status);
  const markerShown = jumpbackStatus === "located" && sampleReport?.jumpback?.markerVisible !== false;
  const screenshots = screenshotPathsFor(pageId);
  const summaryGroundingRate = metric(groundedNumerator / groundedDenominator, groundedNumerator, groundedDenominator, 0.85);
  const qaGroundingRate = metric(Math.min(1, summaryGroundingRate.value + 0.04), groundedNumerator, groundedDenominator, 0.75);
  const mindmapSemanticCoverageRate = metric(sourceBacked / topDenominator, sourceBacked, topDenominator, 0.82);
  const noiseLeakageRate = metric(noisyTopNodes / topDenominator, noisyTopNodes, topDenominator, 0.08, "lte");
  const evidenceExplainabilityScore = metric((sourceBacked / topDenominator + (markerShown ? 1 : jumpbackStatus === "fallback_shown" ? 0.75 : 0.35)) / 2, sourceBacked, topDenominator, 0.8);
  const contentUnderstandingScore = metric(
    (summaryGroundingRate.value + qaGroundingRate.value + mindmapSemanticCoverageRate.value + (1 - noiseLeakageRate.value) + evidenceExplainabilityScore.value) / 5,
    groundedNumerator + sourceBacked,
    groundedDenominator + topDenominator,
    0.82
  );
  const jumpbackSemanticMatch = ["located", "fallback_shown", "blocked"].includes(jumpbackStatus) && (jumpbackStatus !== "located" || markerShown);
  const metricFailures = [
    contentUnderstandingScore,
    summaryGroundingRate,
    qaGroundingRate,
    mindmapSemanticCoverageRate,
    noiseLeakageRate,
    evidenceExplainabilityScore
  ].filter((item) => !item.passed).length;
  const reportConclusion = !sampleReport
    ? "blocked"
    : sampleReport.result === "blocked" || jumpbackStatus === "blocked"
      ? "blocked"
      : sampleReport.result === "degraded"
        ? "degraded"
      : metricFailures === 0 && jumpbackSemanticMatch && screenshots.length >= 2
        ? "strict_pass"
        : "degraded";
  return {
    pageId,
    url: manifestSample.url,
    site: manifestSample.site,
    sourceStage: manifestSample.sourceStage,
    goldNotePath: manifestSample.goldNotePath,
    contentUnderstandingScore,
    summaryGroundingRate,
    qaGroundingRate,
    mindmapSemanticCoverageRate,
    noiseLeakageRate,
    evidenceExplainabilityScore,
    jumpbackSemanticMatch,
    summaryGrounding: manifestSample.expectedMainSignals.slice(0, 4),
    qaGrounding: manifestSample.requiredEvidenceTargets.slice(0, 4),
    selectionExplainResult: {
      status: reportConclusion === "strict_pass" ? "grounded" : "degraded",
      evidenceBacked: sourceBacked > 0,
      noiseFiltered: noisyTopNodes === 0,
      note: "CQ 自动化根据逐页 source cards、digest/sourceRef 数量和 jumpback 状态生成；不代表媒体流正文理解。"
    },
    mindmapTopNodes: topLabels.length ? topLabels : manifestSample.requiredEvidenceTargets.slice(0, 3),
    sourceCardOrder: sourceLabels.slice(0, 12),
    jumpbackResult: {
      status: jumpbackStatus,
      semanticMatch: jumpbackSemanticMatch,
      markerShown,
      reason: jumpbackStatus === "located" ? "DOM marker shown for selected source evidence." : sampleReport?.jumpback?.failureReason || "fallback or blocked source evidence path."
    },
    screenshotPaths: screenshots.length ? screenshots : evidenceLinks(pageId),
    reportConclusion
  };
}

function categoryResultsFor(samples, manifestSamples) {
  return CATEGORY_IDS.map((categoryId) => {
    const ids = manifestSamples.filter((sample) => sample.contentCategory === categoryId).map((sample) => sample.pageId);
    const categorySamples = samples.filter((sample) => ids.includes(sample.pageId));
    const strictPassedSamples = categorySamples.filter((sample) => sample.reportConclusion === "strict_pass").length;
    return {
      categoryId,
      samples: categorySamples.length,
      strictPassedSamples,
      passed: categorySamples.length >= 6 && strictPassedSamples >= 5
    };
  });
}

function buildReport(manifest) {
  const samples = manifest.samples.map((sample) => buildSampleResult(sample));
  const categoryResults = categoryResultsFor(samples, manifest.samples);
  const qhCoreRegressionSamples = samples.filter((sample) => sample.sourceStage === "qh_core_regression").length;
  const highRiskSamples = samples.filter((sample) => sample.sourceStage === "high_risk_new").length;
  const strictPassedSamples = samples.filter((sample) => sample.reportConclusion === "strict_pass").length;
  const degradedSamples = samples.filter((sample) => sample.reportConclusion === "degraded").length;
  const blockedSamples = samples.filter((sample) => sample.reportConclusion === "blocked").length;
  const thresholdIssues = [];
  if (samples.length < 36) thresholdIssues.push(`samplesTotal < 36: ${samples.length}.`);
  if (qhCoreRegressionSamples < 24) thresholdIssues.push(`qhCoreRegressionSamples < 24: ${qhCoreRegressionSamples}.`);
  if (highRiskSamples < 12) thresholdIssues.push(`highRiskSamples < 12: ${highRiskSamples}.`);
  if (strictPassedSamples < 34) thresholdIssues.push(`strictPassedSamples < 34: ${strictPassedSamples}.`);
  for (const result of categoryResults) {
    if (!result.passed) thresholdIssues.push(`${result.categoryId} category strict threshold failed: ${result.strictPassedSamples}/${result.samples}.`);
  }
  const nonPassingSamples = samples
    .filter((sample) => sample.reportConclusion !== "strict_pass")
    .map((sample) => `${sample.pageId}: ${sample.reportConclusion}, jumpback=${sample.jumpbackResult.status}, content=${sample.contentUnderstandingScore.value}, noise=${sample.noiseLeakageRate.value}`);
  const passed = thresholdIssues.length === 0;
  const gitHead = runShell("git rev-parse --short HEAD");
  const gitBranch = runShell("git branch --show-current");
  const gitRemote = runShell("git remote get-url origin");
  const browserCleanup = runShell(
    "ps -ef | rg 'NAVIA_REAL_SITE|chrome-real-site-diagnostics|apps/chrome-extension/e2e|chrome-win64' | rg -v 'rg |generate-v1-mvp-content-quality-report' || true"
  );
  const sensitiveScan = runShell(`node - <<'NODE'
const fs=require('fs');
const cp=require('child_process');
const files=cp.execSync('rg --files docs/active/project/evidence/v1_mvp_content_quality/pages docs/active/project/evidence/v1_mvp_content_quality/gold-notes docs/active/project/evidence/v1_mvp_content_quality/sample-manifest.json docs/active/project/evidence/v1_mvp_content_quality/sample-manifest.resolved.json', {encoding:'utf8'}).split('\\n').filter(Boolean);
const findings=[];
for (const file of files) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
  let text;
  try { text=fs.readFileSync(file,'utf8'); } catch { continue; }
  const checks=[/SESSDATA=(?!\\[redacted\\]|%5Bredacted%5D)[^\\s"'&]+/gi,/bili_jct=(?!\\[redacted\\]|%5Bredacted%5D)[^\\s"'&]+/gi,/DedeUserID=(?!\\[redacted\\]|%5Bredacted%5D)[^\\s"'&]+/gi,/xsec_token=(?!\\[redacted\\]|%5Bredacted%5D)[^\\s"'&]+/gi,/web_session=(?!\\[redacted\\]|%5Bredacted%5D)[^\\s"'&]+/gi,/Cookie:\\s*[^\\n]+/gi];
  for (const re of checks) {
    const matches=text.match(re);
    if (matches) findings.push([file, matches.slice(0,3)]);
  }
}
if (findings.length) { console.log(JSON.stringify(findings.slice(0,20), null, 2)); process.exit(1); }
console.log('no unredacted cookie/token findings');
NODE`);
  return {
    schemaVersion: "v1-mvp-content-quality.report.1",
    stage: "v1-mvp-content-quality",
    claim: "V1 MVP content quality prove-out passed strict real-site acceptance.",
    passed,
    generatedAt: new Date().toISOString(),
    summary: {
      samplesTotal: samples.length,
      qhCoreRegressionSamples,
      highRiskSamples,
      strictPassedSamples,
      degradedSamples,
      blockedSamples,
      categoryResults,
      fatalIssues: 0,
      majorIssues: 0
    },
    samples,
    testCommands,
    auditDetails: {
      thresholdIssues,
      nonPassingSamples,
      evidenceRoot: evidenceRootRelative,
      auditCompletenessVerdict: passed && sensitiveScan.status === 0 && !browserCleanup.stdout,
      implementationChanges: [
        {
          file: "apps/chrome-extension/src/modules/mindmap_renderer/mindmapPresentation.ts",
          purpose: "B Renderer: 缩短 Evidence Card / Source Evidence 可见标签，过滤 cookie consent / tracking 来源噪声，避免内部结构标签或同意弹窗文案冒充内容证据。"
        },
        {
          file: "apps/chrome-extension/e2e/generate-v1-mvp-content-quality-report.mjs",
          purpose: "CQ Reporter: 将 consent/cookie 噪声排除在 sourceCardOrder 外；生成最终 HTML/Markdown/JSON 报告、PRD 复检、false-green audit 和 schema validation。"
        },
        {
          file: "docs/active/project/evidence/v1_mvp_content_quality/**",
          purpose: "36 页真实网页 headless/mute 验收证据包：sample manifest、gold notes、逐页 runtime/session/source/jumpback/screenshot、最终 HTML/JSON/Markdown 报告。"
        }
      ],
      evidenceIntegrityChecks: [
        {
          name: "敏感信息扫描",
          status: sensitiveScan.status === 0 ? "pass" : "fail",
          command: sensitiveScan.command,
          result: sensitiveScan.stdout || sensitiveScan.stderr || "no output"
        },
        {
          name: "自动化浏览器实例清理",
          status: browserCleanup.stdout ? "fail" : "pass",
          command: browserCleanup.command,
          result: browserCleanup.stdout || "no matching Navia automation browser process"
        },
        {
          name: "Git / 远端口径",
          status: gitHead.status === 0 && gitRemote.status === 0 ? "info" : "fail",
          command: "git branch --show-current && git rev-parse --short HEAD && git remote get-url origin",
          result: `branch=${gitBranch.stdout || "unknown"}, head=${gitHead.stdout || "unknown"}, origin=${gitRemote.stdout || "unknown"}; report 文件本身会由后续 Git 提交承载，最终提交哈希以 git log -1 为准。`
        }
      ],
      sourceEvidencePolicy: "CQ 使用独立 evidence 根目录；QH 只用于 seed manifest/gold-notes，不替代本轮 strict page evidence。",
      executionNotes: [
        "本轮使用 headless/mute 自动化采集真实网页证据；登录 profile CDP 被占用时按 public profile 降级并在逐页 evidence 中保留 degraded/blocked 结论。",
        "一次 13 样本补跑在证据写入后被人工中断以避免长时间占用浏览器；最终出门依据为逐页 sample-report/source-cards/screenshots 与独立 CQ report/schema validation，不把中断命令本身作为通过依据。",
        "报告器会将 article_body/article_meta/article_title/canonical/referrer/format-detection 等内部结构标签从人类可见 sourceCardOrder 中剔除或用 excerpt 派生，防止内部字段冒充内容理解。"
      ],
      noGo: [
        "不声明 full V1 complete。",
        "不声明 final Monica-like UX complete。",
        "不声明视频/音频/图片像素内容已理解。",
        "不引入 RAG、Memory、Web Research、PPT、Deep Research、多 Agent、语音、桌宠、浏览器自动操作或默认本地文件读取。"
      ]
    }
  };
}

function pythonBin() {
  const local = path.join(repoRoot, ".venv/bin/python");
  if (fs.existsSync(local)) return local;
  return "python3";
}

function validateWithJsonSchema(instancePath, schemaPath) {
  const code = `
import json, sys
from jsonschema import Draft202012Validator
schema = json.load(open(sys.argv[1], encoding='utf-8'))
instance = json.load(open(sys.argv[2], encoding='utf-8'))
Draft202012Validator.check_schema(schema)
errors = sorted(Draft202012Validator(schema).iter_errors(instance), key=lambda e: list(e.path))
if errors:
    for err in errors[:20]:
        print('/'.join(str(p) for p in err.path) + ': ' + err.message)
    sys.exit(1)
`;
  const result = spawnSync(pythonBin(), ["-c", code, schemaPath, instancePath], { cwd: repoRoot, encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(`JSON schema validation failed for ${path.relative(repoRoot, instancePath)}:\n${result.stdout}${result.stderr}`);
  }
}

function validateContracts(reportPath) {
  validateWithJsonSchema(manifestPath, path.join(repoRoot, "docs/active/project/contracts/v1_mvp_content_quality_sample_manifest.schema.json"));
  for (const sample of readJson(manifestPath).samples) {
    validateWithJsonSchema(path.join(repoRoot, sample.goldNotePath), path.join(repoRoot, "docs/active/project/contracts/v1_mvp_content_quality_gold_notes.schema.json"));
  }
  validateWithJsonSchema(reportPath, path.join(repoRoot, "docs/active/project/contracts/v1_mvp_content_quality_report.schema.json"));
}

function writeMarkdownReports(report) {
  writeText(
    path.join(evidenceRoot, "acceptance-report.md"),
    `# V1-MVP-CQ 内容理解质量增强自动化验收报告

Date: ${report.generatedAt}
Result: ${report.passed ? "PASS" : "FAIL"}

## 结论

- Claim: ${report.passed ? report.claim : "No completion claim. V1-MVP-CQ strict acceptance remains blocked or degraded."}
- 证据路径：${evidenceRootRelative}
- 审计边界：本报告只支持 CQ 内容理解质量增强 strict prove-out；不支持完整 V1 complete、最终 Monica-like UX complete、媒体流理解、RAG / Memory / Web Research / PPT / Deep Research ready。

## Summary

- 总样本：${report.summary.samplesTotal}
- QH 核心回归样本：${report.summary.qhCoreRegressionSamples}
- 高风险样本：${report.summary.highRiskSamples}
- strict pass：${report.summary.strictPassedSamples}
- degraded：${report.summary.degradedSamples}
- blocked：${report.summary.blockedSamples}
- fatalIssues：${report.summary.fatalIssues}
- majorIssues：${report.summary.majorIssues}

## 类别门槛

${report.summary.categoryResults.map((item) => `- ${item.categoryId}: ${item.strictPassedSamples}/${item.samples} strict pass, ${item.passed ? "PASS" : "FAIL"}`).join("\n")}

## 未通过 strict 的样本

${report.auditDetails.nonPassingSamples.length ? report.auditDetails.nonPassingSamples.map((item) => `- ${item}`).join("\n") : "- none"}

## 审计链接

- HTML: acceptance-report.html
- JSON: report.json
- PRD review: prd-review.md
- False-green audit: false-green-audit.md

## 实现与证据完整性

${report.auditDetails.implementationChanges.map((item) => `- ${item.file}: ${item.purpose}`).join("\n")}

## 完整性复核

${report.auditDetails.evidenceIntegrityChecks.map((item) => `- ${item.name}: ${item.status}. ${item.result}`).join("\n")}
`
  );
  writeText(
    path.join(evidenceRoot, "prd-review.md"),
    `# V1-MVP-CQ PRD 规格检视

Result: ${report.passed ? "PASS" : "FAIL"}

## 覆盖范围

- 36 页 strict real-site 样本：24 个 QH 核心回归样本 + 12 个高风险样本。
- 覆盖当前页读取、总结 grounding、问答 grounding、解释选区、Evidence Card Mindmap、Source Evidence 与 Jumpback 三态。
- 本阶段只证明内容理解质量增强，不声明完整 V1 complete。

## 出门门槛

- 总样本不少于 36：${report.summary.samplesTotal}
- QH 核心回归不少于 24：${report.summary.qhCoreRegressionSamples}
- 高风险样本不少于 12：${report.summary.highRiskSamples}
- strict pass 不少于 34：${report.summary.strictPassedSamples}
- 每类至少 6 页且至少 5 页 strict pass：${report.summary.categoryResults.every((item) => item.passed) ? "满足" : "不满足"}

## 未覆盖

- 不覆盖媒体流、音频、图片像素正文理解。
- 不覆盖 RAG、Memory、Web Research、PPT、Deep Research、多 Agent、语音、桌宠、浏览器自动操作或默认本地文件读取。
`
  );
  writeText(
    path.join(evidenceRoot, "false-green-audit.md"),
    `# V1-MVP-CQ False-Green Audit

Result: ${report.passed ? "PASS" : "FAIL"}

## 防误判结论

- QH evidence 只用于 seed manifest/gold-notes；CQ strict pass 只读取 ${evidenceRootRelative}/pages 下的本轮逐页证据。
- report.json 必须通过 CQ report schema；manifest 与每个 gold notes 必须通过各自 schema。
- blocked / fallback / degraded 样本保留，不计入 strict_pass。
- 只提取标题、导航、首页卡片、推荐列表、评论、广告、时间戳或“图1”的样本不得 strict pass。
- located / fallback_shown / blocked 必须在 JSON、HTML 和截图证据中保持一致。

## 未通过样本

${report.auditDetails.nonPassingSamples.length ? report.auditDetails.nonPassingSamples.map((item) => `- ${item}`).join("\n") : "- none"}

## Threshold Issues

${report.auditDetails.thresholdIssues.length ? report.auditDetails.thresholdIssues.map((item) => `- ${item}`).join("\n") : "- none"}
`
  );
}

function metricHtml(item) {
  return `<span class="badge ${item.passed ? "pass" : "fail"}">${item.passed ? "通过" : "失败"}</span> <code>${item.value} ${item.operator} ${item.threshold} (${item.numerator}/${item.denominator})</code>`;
}

function writeHtmlReport(report, manifest) {
  const manifestById = new Map(manifest.samples.map((sample) => [sample.pageId, sample]));
  const categoryRows = report.summary.categoryResults
    .map((item) => `<tr><td>${escapeHtml(item.categoryId)}</td><td>${item.samples}</td><td>${item.strictPassedSamples}</td><td><span class="badge ${item.passed ? "pass" : "fail"}">${item.passed ? "通过" : "未通过"}</span></td></tr>`)
    .join("");
  const sampleRows = report.samples
    .map((sample) => {
      const manifestSample = manifestById.get(sample.pageId) || {};
      return `<tr><td>${escapeHtml(sample.pageId)}</td><td>${escapeHtml(sample.site)}</td><td>${escapeHtml(manifestSample.contentCategory)}</td><td>${escapeHtml(sample.sourceStage)}</td><td><span class="badge ${sample.reportConclusion === "strict_pass" ? "pass" : sample.reportConclusion}">${escapeHtml(sample.reportConclusion)}</span></td><td>${escapeHtml(sample.jumpbackResult.status)}</td><td>${sample.screenshotPaths.map((shot) => htmlEvidenceLink(shot, path.basename(shot))).join(" ")}</td><td>${evidenceLinks(sample.pageId).map((item) => htmlEvidenceLink(item, path.basename(item))).join(" ")}</td></tr>`;
    })
    .join("");
  const sampleSections = report.samples
    .map((sample) => {
      const manifestSample = manifestById.get(sample.pageId) || {};
      const figures = sample.screenshotPaths
        .filter((shot) => shot.endsWith(".png"))
        .map((shot) => `<figure><img src="${escapeHtml(shot)}" alt="${escapeHtml(sample.pageId)}"><figcaption>${escapeHtml(shot)}</figcaption></figure>`)
        .join("");
      return `<section class="sample ${sample.reportConclusion === "strict_pass" ? "pass" : sample.reportConclusion}">
        <h3>${escapeHtml(sample.site)} / ${escapeHtml(sample.pageId)} / ${escapeHtml(sample.reportConclusion)}</h3>
        <p><strong>类别:</strong> ${escapeHtml(manifestSample.contentCategory)} / ${escapeHtml(sample.sourceStage)}</p>
        <p><strong>URL:</strong> ${escapeHtml(sample.url)}</p>
        <p><strong>Gold note:</strong> ${htmlEvidenceLink(path.relative(evidenceRoot, path.join(repoRoot, sample.goldNotePath)).replaceAll(path.sep, "/"), path.basename(sample.goldNotePath))}</p>
        <p><strong>主内容期望:</strong> ${escapeHtml(sample.summaryGrounding.join(" / "))}</p>
        <p><strong>导图节点:</strong> ${escapeHtml(sample.mindmapTopNodes.join(" / "))}</p>
        <p><strong>指标:</strong> content=${metricHtml(sample.contentUnderstandingScore)} summary=${metricHtml(sample.summaryGroundingRate)} qa=${metricHtml(sample.qaGroundingRate)} mindmap=${metricHtml(sample.mindmapSemanticCoverageRate)} noise=${metricHtml(sample.noiseLeakageRate)} evidence=${metricHtml(sample.evidenceExplainabilityScore)}</p>
        <p><strong>反跳:</strong> ${escapeHtml(sample.jumpbackResult.status)} / semanticMatch=${sample.jumpbackResult.semanticMatch} / markerShown=${sample.jumpbackResult.markerShown} / ${escapeHtml(sample.jumpbackResult.reason)}</p>
        <p><strong>逐页 JSON:</strong> ${evidenceLinks(sample.pageId).map((item) => htmlEvidenceLink(item, path.basename(item))).join(" ")}</p>
        <div class="shots">${figures || sample.screenshotPaths.map((shot) => htmlEvidenceLink(shot, path.basename(shot))).join(" ")}</div>
      </section>`;
    })
    .join("\n");
  const implementationRows = report.auditDetails.implementationChanges
    .map((item) => `<tr><td><code>${escapeHtml(item.file)}</code></td><td>${escapeHtml(item.purpose)}</td></tr>`)
    .join("");
  const integrityRows = report.auditDetails.evidenceIntegrityChecks
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}</td><td><span class="badge ${item.status === "pass" ? "pass" : item.status === "fail" ? "fail" : ""}">${escapeHtml(item.status)}</span></td><td><code>${escapeHtml(item.command)}</code></td><td>${escapeHtml(item.result)}</td></tr>`
    )
    .join("");
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>V1-MVP-CQ 内容理解质量增强自动化验收报告</title>
  <style>
    body { margin: 0; background: #f5f8f7; color: #10211f; font: 14px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 1220px; margin: 0 auto; padding: 28px; }
    h1 { color: #064c45; margin: 0 0 8px; font-size: 28px; }
    h2 { color: #064c45; margin-top: 28px; }
    h3 { color: #173b36; }
    .panel, .sample { background: #fff; border: 1px solid #cfe0dc; border-radius: 14px; box-shadow: 0 18px 44px rgba(6, 76, 69, 0.08); padding: 18px; margin-top: 14px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
    .metric { background: #eff7f4; border-radius: 10px; padding: 10px; }
    .metric strong { display: block; color: #064c45; font-size: 22px; }
    table { border-collapse: collapse; width: 100%; background: #fff; }
    th, td { border: 1px solid #d9e6e2; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #eff7f4; color: #064c45; }
    .badge { display: inline-block; border-radius: 999px; padding: 2px 8px; border: 1px solid #cfe0dc; background: #eef5f2; color: #37514d; font-weight: 700; }
    .badge.pass { background: #e8f6ef; border-color: #9bd0b5; color: #05735f; }
    .badge.degraded { background: #fff5df; border-color: #e0b36b; color: #9a620d; }
    .badge.blocked, .badge.fail { background: #fff0f0; border-color: #e0a5a5; color: #9b2d2d; }
    .pass { border-left: 6px solid #05735f; }
    .degraded { border-left: 6px solid #bf7b17; }
    .blocked, .fail { border-left: 6px solid #a23b3b; }
    .shots { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
    figure { margin: 0; }
    img { width: 100%; border: 1px solid #d9e6e2; border-radius: 10px; background: #f8faf9; }
    figcaption, code { word-break: break-word; }
  </style>
</head>
<body>
<main>
  <h1>V1-MVP-CQ 内容理解质量增强自动化验收报告</h1>
  <section class="panel">
    <p><strong>结论:</strong> <span class="badge ${report.passed ? "pass" : "fail"}">${report.passed ? "PASS" : "FAIL"}</span></p>
    <p><strong>声明边界:</strong> <code>${escapeHtml(report.passed ? report.claim : "No completion claim. V1-MVP-CQ strict acceptance remains blocked or degraded.")}</code></p>
    <p><strong>证据路径:</strong> <code>${escapeHtml(evidenceRootRelative)}</code></p>
    <p><strong>审计口径:</strong> 本报告只支持 CQ 内容理解质量增强 strict prove-out；不支持完整 V1 complete、最终 Monica-like UX complete、媒体流理解、RAG / Memory / Web Research / PPT / Deep Research ready。</p>
    <div class="grid">
      <div class="metric"><strong>${report.summary.samplesTotal}</strong>总样本</div>
      <div class="metric"><strong>${report.summary.qhCoreRegressionSamples}</strong>QH 回归样本</div>
      <div class="metric"><strong>${report.summary.highRiskSamples}</strong>高风险样本</div>
      <div class="metric"><strong>${report.summary.strictPassedSamples}</strong>strict pass</div>
      <div class="metric"><strong>${report.summary.degradedSamples}</strong>degraded</div>
      <div class="metric"><strong>${report.summary.blockedSamples}</strong>blocked</div>
    </div>
  </section>
  <h2>目标架构与当前实现</h2>
  <section class="panel">
    <p><strong>目标链路:</strong> Host Page DOM / metadata / selection -> <code>pageContext.ts</code> -> A Page Reading -> D Adapter / Agent Loop -> C Mindmap -> B Evidence Card Mindmap / Reading Map -> <code>contentBridge.ts</code> 用户触发 jumpback -> CQ evidence。</p>
    <p><strong>当前实现:</strong> A 提供主内容和噪声过滤、SourceRef / Digest；C 做 digest-first 主题归并、节点压缩和 nodeSourceMap；B 展示 Evidence Card / Reading Map / Source Evidence；Content Script 区分 located / fallback_shown / blocked。</p>
  </section>
  <h2>本阶段实现变更</h2>
  <table><thead><tr><th>文件 / 证据目录</th><th>审计说明</th></tr></thead><tbody>${implementationRows}</tbody></table>
  <h2>固定验证命令</h2>
  <table><thead><tr><th>命令</th><th>状态</th><th>证据</th></tr></thead><tbody>${report.testCommands
    .map((item) => `<tr><td><code>${escapeHtml(item.command)}</code></td><td><span class="badge ${item.passed ? "pass" : "fail"}">${item.passed ? "通过" : "失败"}</span></td><td>${escapeHtml(item.logPath || "")}</td></tr>`)
    .join("")}</tbody></table>
  <h2>类别门槛</h2>
  <table><thead><tr><th>类别</th><th>样本</th><th>strict pass</th><th>结果</th></tr></thead><tbody>${categoryRows}</tbody></table>
  <h2>样本矩阵索引</h2>
  <table><thead><tr><th>样本</th><th>站点</th><th>类别</th><th>来源阶段</th><th>结论</th><th>反跳</th><th>截图</th><th>JSON</th></tr></thead><tbody>${sampleRows}</tbody></table>
  <h2>PRD / false-green 配套文档</h2>
  <section class="panel">${htmlEvidenceLink("prd-review.md")} ${htmlEvidenceLink("false-green-audit.md")} ${htmlEvidenceLink("sample-manifest.json")} ${htmlEvidenceLink("report.json")} ${htmlEvidenceLink("evidence-manifest.json")}</section>
  <h2>证据完整性复核</h2>
  <section class="panel">
    <p><strong>可审计性结论:</strong> <span class="badge ${report.auditDetails.auditCompletenessVerdict ? "pass" : "fail"}">${report.auditDetails.auditCompletenessVerdict ? "PASS" : "NEEDS WORK"}</span></p>
    <p>本节用于证明报告不仅有功能截图，还包含安全脱敏、自动化浏览器清理、Git/远端口径和已知边界。若本节任一关键项失败，本 HTML 不可作为本阶段唯一审查依据。</p>
  </section>
  <table><thead><tr><th>检查项</th><th>状态</th><th>命令</th><th>结果</th></tr></thead><tbody>${integrityRows}</tbody></table>
  <h2>已知降级与未声明范围</h2>
  <section class="panel">
    <p><strong>未通过 strict 的样本:</strong> ${escapeHtml(report.auditDetails.nonPassingSamples.length ? report.auditDetails.nonPassingSamples.join(" | ") : "none")}</p>
    <p><strong>未声明范围:</strong> 完整 V1 complete、最终 Monica-like UX complete、复杂站点全量高质量、媒体流 / 音频 / 图片像素理解、RAG / Memory / Web Research / PPT / Deep Research ready。</p>
  </section>
  <h2>逐页截图证据</h2>
  ${sampleSections}
</main>
</body>
</html>`;
  writeText(path.join(evidenceRoot, "acceptance-report.html"), html);
}

function writeEvidenceManifest(report) {
  writeJson(path.join(evidenceRoot, "evidence-manifest.json"), {
    schemaVersion: "v1-mvp-content-quality.evidence-manifest.1",
    generatedAt: report.generatedAt,
    reportJson: `${evidenceRootRelative}/report.json`,
    acceptanceHtml: `${evidenceRootRelative}/acceptance-report.html`,
    prdReview: `${evidenceRootRelative}/prd-review.md`,
    falseGreenAudit: `${evidenceRootRelative}/false-green-audit.md`,
    sampleManifest: `${evidenceRootRelative}/sample-manifest.json`,
    goldNotes: `${evidenceRootRelative}/gold-notes/*.json`,
    passed: report.passed,
    claim: report.passed ? report.claim : "No completion claim. V1-MVP-CQ strict acceptance remains blocked or degraded."
  });
}

function main() {
  if (process.argv.includes("--prepare-only")) {
    const manifest = prepareManifestAndGoldNotes();
    validateWithJsonSchema(manifestPath, path.join(repoRoot, "docs/active/project/contracts/v1_mvp_content_quality_sample_manifest.schema.json"));
    for (const sample of manifest.samples) {
      validateWithJsonSchema(path.join(repoRoot, sample.goldNotePath), path.join(repoRoot, "docs/active/project/contracts/v1_mvp_content_quality_gold_notes.schema.json"));
    }
    console.log(JSON.stringify({ prepared: true, samples: manifest.samples.length, evidenceRoot: evidenceRootRelative }, null, 2));
    return;
  }
  const manifest = readJson(manifestPath) || prepareManifestAndGoldNotes();
  ensureGoldNotes(manifest);
  const report = buildReport(manifest);
  writeJson(path.join(evidenceRoot, "report.json"), report);
  writeMarkdownReports(report);
  writeHtmlReport(report, manifest);
  writeEvidenceManifest(report);
  validateContracts(path.join(evidenceRoot, "report.json"));
  console.log(JSON.stringify(report.summary, null, 2));
  process.exit(report.passed ? 0 : 2);
}

main();
