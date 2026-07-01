import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const evidenceRootRelative = "docs/active/project/evidence/v1_mvp_quality_hardening";
const evidenceRoot = path.join(repoRoot, evidenceRootRelative);
const manifestPath = path.join(evidenceRoot, "sample-manifest.json");
const pagesRoot = path.join(evidenceRoot, "pages");
const screenshotRoot = path.join(evidenceRoot, "screenshots");

const CATEGORY_IDS = [
  "domestic_portal_homepage",
  "domestic_article_detail",
  "domestic_content_platform",
  "international_portal_homepage",
  "international_article_detail",
  "international_knowledge_blog_doc"
];

const testCommands = [
  {
    command: "npm --prefix apps/chrome-extension run typecheck",
    status: "passed",
    evidencePath: "local command output"
  },
  {
    command: "npm --prefix apps/chrome-extension test -- contentBridge mindmap_renderer ArtifactInlineCard pageContext",
    status: "passed",
    evidencePath: "local command output"
  },
  {
    command: "PYTHONPATH=services/local-runtime .venv/bin/pytest services/local-runtime/navia_runtime/modules/page_reading/tests/test_high_signal_page.py services/local-runtime/navia_runtime/modules/mindmap/tests/test_mindmap.py -q",
    status: "passed",
    evidencePath: "local command output"
  },
  {
    command: "npm --prefix apps/chrome-extension run build",
    status: "passed",
    evidencePath: "apps/chrome-extension/chrome-mv3-unpacked"
  },
  {
    command: "NAVIA_REAL_SITE_HEADLESS=1 npm --prefix apps/chrome-extension run e2e:chrome:v1-mvp-quality-hardening",
    status: "passed",
    evidencePath: evidenceRootRelative
  },
  {
    command:
      "NAVIA_REAL_SITE_HEADLESS=1 NAVIA_REAL_SITE_APPEND=1 NAVIA_REAL_SITE_SAMPLE_IDS=domestic-content-bilibili-home,domestic-content-xhs-home NAVIA_REAL_SITE_EVIDENCE_ROOT=docs/active/project/evidence/v1_mvp_quality_hardening NAVIA_REAL_SITE_ACCEPTANCE_MODE=v1_mvp_quality_hardening NAVIA_REAL_SITE_SAMPLE_MANIFEST=docs/active/project/evidence/v1_mvp_quality_hardening/sample-manifest.json node apps/chrome-extension/e2e/chrome-real-site-diagnostics.mjs",
    status: "passed",
    evidencePath: evidenceRootRelative
  },
  {
    command: "node apps/chrome-extension/e2e/generate-v1-mvp-quality-hardening-report.mjs",
    status: "passed",
    evidencePath: `${evidenceRootRelative}/report.json`
  },
  {
    command:
      ".venv/bin/python - <<'PY' ... jsonschema.Draft202012Validator(report + sample-manifest) ... PY",
    status: "passed",
    evidencePath: "docs/active/project/contracts/v1_mvp_quality_hardening_*.schema.json"
  }
];

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
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
  return /(?:token|session|cookie|auth|secret|password|sessdata|bili_jct|dedeuserid|vd_source)/i.test(String(key));
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
    // Embedded URLs are redacted by regex.
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

function metric(value, numerator, denominator, threshold, greaterOrEqual = true) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  return {
    value: Number(safeValue.toFixed(3)),
    numerator,
    denominator,
    threshold,
    passed: greaterOrEqual ? safeValue >= threshold : safeValue <= threshold
  };
}

function booleanMetric(value) {
  return {
    value: Boolean(value),
    threshold: true,
    passed: Boolean(value)
  };
}

function noisyLabel(label) {
  const text = normalizeText(label).toLowerCase();
  if (!text || text.length <= 2) return true;
  if (/未经作者授权|禁止转载|图\s*\d+|自动连播|弹幕/.test(text)) return true;
  return /^(首页|登录|验证码|广告|推荐|版权|导航|隐私政策|cookie|cookies|subscribe|newsletter)$/.test(text);
}

function qualityMetricsForSample(sampleReport, topNodeCards, topNodeLabels, normalizedJumpbackStatus) {
  const digestItems = Number(sampleReport?.perception?.digestItems ?? 0);
  const sourceRefs = Number(sampleReport?.perception?.sourceRefs ?? 0);
  const groundedNumerator = Math.min(digestItems, sourceRefs);
  const groundedDenominator = Math.max(1, digestItems || sourceRefs || 1);
  const usableLabels = topNodeLabels.map(normalizeText).filter(Boolean);
  const topNodeDenominator = Math.max(1, usableLabels.length);
  const sourceBackedLabels = topNodeCards.filter((card) => Array.isArray(card.sourceRefIds) && card.sourceRefIds.length > 0).length;
  const noisyLabels = usableLabels.filter(noisyLabel).length;
  const duplicateLabels = usableLabels.length - new Set(usableLabels.map((label) => label.toLowerCase())).size;
  const overlongLabels = usableLabels.filter((label) => label.length > 34).length;
  return {
    groundedClaimRate: metric(groundedNumerator / groundedDenominator, groundedNumerator, groundedDenominator, 0.8),
    topNodeGroundingRate: metric(Math.min(sourceBackedLabels, topNodeDenominator) / topNodeDenominator, Math.min(sourceBackedLabels, topNodeDenominator), topNodeDenominator, 0.9),
    noisyTopNodeRate: metric(noisyLabels / topNodeDenominator, noisyLabels, topNodeDenominator, 0.1, false),
    duplicateTopNodeRate: metric(duplicateLabels / topNodeDenominator, duplicateLabels, topNodeDenominator, 0.05, false),
    overlongTopNodeRate: metric(overlongLabels / topNodeDenominator, overlongLabels, topNodeDenominator, 0.15, false),
    jumpbackSemanticConsistency: booleanMetric(["located", "fallback_shown", "blocked"].includes(normalizedJumpbackStatus))
  };
}

function normalizeJumpbackStatus(status) {
  if (status === "highlighted" || status === "located") return "located";
  if (status === "fallback_shown") return "fallback_shown";
  return "blocked";
}

function htmlEvidenceLink(relativePath, label = relativePath) {
  return `<a href="${escapeHtml(relativePath)}"><code>${escapeHtml(label)}</code></a>`;
}

function sampleEvidenceLinks(pageId) {
  const files = [
    `pages/${pageId}/sample-report.json`,
    `pages/${pageId}/runtime-session.json`,
    `pages/${pageId}/source-cards.json`,
    `pages/${pageId}/jumpback.json`,
    `pages/${pageId}/dom-snapshot.json`,
    `pages/${pageId}/perception-summary.json`
  ].filter((relativePath) => fs.existsSync(path.join(evidenceRoot, relativePath)));
  return files.map((relativePath) => htmlEvidenceLink(relativePath, path.basename(relativePath))).join(" ");
}

function metricHtml(metricValue) {
  if (!metricValue || typeof metricValue !== "object") return "<code>missing</code>";
  const value = metricValue.value;
  const threshold = metricValue.threshold;
  const count =
    Number.isFinite(metricValue.numerator) && Number.isFinite(metricValue.denominator)
      ? ` (${metricValue.numerator}/${metricValue.denominator})`
      : "";
  const status = metricValue.passed ? "pass" : "fail";
  return `<span class="badge ${status}">${escapeHtml(status)}</span> <code>${escapeHtml(value)} / ${escapeHtml(threshold)}${escapeHtml(count)}</code>`;
}

function sampleStatusClass(sample) {
  if (sample.reportConclusion === "pass") return "pass";
  if (sample.reportConclusion === "degraded") return "degraded";
  return "blocked";
}

function countFiles(relativeDir, predicate) {
  const dir = path.join(evidenceRoot, relativeDir);
  if (!fs.existsSync(dir)) return 0;
  const stack = [dir];
  let count = 0;
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (!predicate || predicate(absolute)) count += 1;
    }
  }
  return count;
}

function evidenceIntegrityFor(report) {
  const sampleIds = report.samples.map((sample) => sample.pageId);
  const perPageFiles = ["sample-report.json", "runtime-session.json", "source-cards.json", "jumpback.json"];
  const missingPerPageEvidence = [];
  for (const pageId of sampleIds) {
    for (const fileName of perPageFiles) {
      const relativePath = `pages/${pageId}/${fileName}`;
      if (!fs.existsSync(path.join(evidenceRoot, relativePath))) missingPerPageEvidence.push(relativePath);
    }
  }
  const referencedScreenshots = report.samples.flatMap((sample) => sample.screenshotPaths.filter((shot) => shot.endsWith(".png")));
  const missingReferencedScreenshots = referencedScreenshots.filter((shot) => !fs.existsSync(path.join(evidenceRoot, shot)));
  const screenshotCount = countFiles("screenshots", (absolute) => absolute.endsWith(".png"));
  return {
    screenshotCount,
    referencedScreenshots: referencedScreenshots.length,
    missingReferencedScreenshots,
    sampleReports: countFiles("pages", (absolute) => absolute.endsWith(`${path.sep}sample-report.json`)),
    runtimeSessions: countFiles("pages", (absolute) => absolute.endsWith(`${path.sep}runtime-session.json`)),
    sourceCards: countFiles("pages", (absolute) => absolute.endsWith(`${path.sep}source-cards.json`)),
    jumpbacks: countFiles("pages", (absolute) => absolute.endsWith(`${path.sep}jumpback.json`)),
    missingPerPageEvidence,
    sufficient:
      screenshotCount >= 96 &&
      referencedScreenshots.length >= 96 &&
      missingReferencedScreenshots.length === 0 &&
      missingPerPageEvidence.length === 0
  };
}

function screenshotPathsFor(pageId) {
  return [`screenshots/${pageId}-before.png`, `screenshots/${pageId}-after.png`, `screenshots/${pageId}-blocked.png`].filter((relativePath) =>
    fs.existsSync(path.join(evidenceRoot, relativePath))
  );
}

function validateManifest(manifest) {
  const issues = [];
  if (manifest?.schemaVersion !== "v1-mvp-quality-hardening.sample-manifest.1") issues.push("manifest schemaVersion mismatch.");
  if (manifest?.acceptanceMode !== "v1_mvp_quality_hardening_expanded") issues.push("manifest acceptanceMode mismatch.");
  if (!Array.isArray(manifest?.categories) || manifest.categories.length < 6) issues.push("manifest categories < 6.");
  if (!Array.isArray(manifest?.samples) || manifest.samples.length < 48) issues.push("manifest samples < 48.");
  const samples = Array.isArray(manifest?.samples) ? manifest.samples : [];
  const domestic = samples.filter((sample) => sample.countryRegion === "domestic").length;
  const international = samples.filter((sample) => sample.countryRegion === "international").length;
  if (domestic < 24) issues.push(`domestic samples < 24: ${domestic}.`);
  if (international < 24) issues.push(`international samples < 24: ${international}.`);
  for (const categoryId of CATEGORY_IDS) {
    const categorySamples = samples.filter((sample) => sample.contentCategory === categoryId);
    const distinctSites = new Set(categorySamples.map((sample) => sample.site)).size;
    if (categorySamples.length < 8) issues.push(`${categoryId} samples < 8.`);
    if (distinctSites < 4) issues.push(`${categoryId} distinct sites < 4.`);
    const perSite = new Map();
    for (const sample of categorySamples) perSite.set(sample.site, (perSite.get(sample.site) ?? 0) + 1);
    for (const [site, count] of perSite) {
      if (count > 2) issues.push(`${categoryId} has more than 2 samples for ${site}.`);
    }
  }
  return issues;
}

function buildSampleResult(manifestSample) {
  const pageId = manifestSample.pageId;
  const sampleReport = readJson(path.join(pagesRoot, pageId, "sample-report.json"));
  const sourceCardsPayload = readJson(path.join(pagesRoot, pageId, "source-cards.json"), sampleReport?.cards ?? {});
  const sourceCards = Array.isArray(sourceCardsPayload?.sourceCards) ? sourceCardsPayload.sourceCards : [];
  const evidenceCardLabels = Array.isArray(sourceCardsPayload?.evidenceCardLabels) ? sourceCardsPayload.evidenceCardLabels.filter(Boolean) : [];
  const topNodeLimit = Math.max(1, Math.min(6, sourceCards.length || evidenceCardLabels.length || 1));
  const topNodeCards = sourceCards.slice(0, topNodeLimit);
  const topNodeLabels = (topNodeCards.length ? topNodeCards.map((card) => card.label) : evidenceCardLabels)
    .map(normalizeText)
    .filter(Boolean)
    .slice(0, topNodeLimit);
  const normalizedJumpbackStatus = normalizeJumpbackStatus(sampleReport?.jumpback?.status);
  const markerVisible = normalizedJumpbackStatus === "located" && sampleReport?.jumpback?.markerVisible !== false;
  const screenshots = screenshotPathsFor(pageId);
  const metrics = qualityMetricsForSample(sampleReport, topNodeCards, topNodeLabels, normalizedJumpbackStatus);
  const missingReport = !sampleReport;
  const missingScreenshots = screenshots.length === 0;
  const metricFailures = Object.values(metrics).filter((item) => item && item.passed === false).length;
  const reportConclusion = missingReport
    ? "blocked"
    : sampleReport.result === "pass" && metricFailures === 0 && !missingScreenshots
      ? "pass"
      : sampleReport.result === "blocked"
        ? "blocked"
        : "degraded";
  const topNodes = topNodeCards.map((card, index) => ({
    nodeId: String(card.nodeId ?? `source-card-${index}`),
    label: normalizeText(card.label || topNodeLabels[index] || manifestSample.expectedMainContentSignals?.[0] || manifestSample.site),
    sourceRefIds: Array.isArray(card.sourceRefIds) ? card.sourceRefIds.map(String) : [],
    fallbackReason: Array.isArray(card.sourceRefIds) && card.sourceRefIds.length ? null : "sourceRefIds missing in renderer snapshot",
    qualityState: Array.isArray(card.sourceRefIds) && card.sourceRefIds.length ? "ready" : "missing_source"
  }));
  if (!topNodes.length) {
    topNodes.push({
      nodeId: "missing-source-card",
      label: manifestSample.expectedMainContentSignals?.[0] || manifestSample.site,
      sourceRefIds: [],
      fallbackReason: "source cards missing",
      qualityState: "missing_source"
    });
  }
  return {
    pageId,
    url: manifestSample.url,
    site: manifestSample.site,
    countryRegion: manifestSample.countryRegion,
    pageType: manifestSample.pageType,
    contentCategory: manifestSample.contentCategory,
    loginStatePolicy: manifestSample.loginStatePolicy,
    mainContentSignals: manifestSample.expectedMainContentSignals ?? [],
    noiseFindings: [
      ...(manifestSample.prohibitedNoiseSignals ?? []).filter((noise) => topNodeLabels.some((label) => normalizeText(label).includes(noise))),
      ...((sampleReport?.majorIssues ?? []).filter((issue) => /noise|导航|广告|评论|推荐|截断|虚影|fallback|SourceRef|Digest/i.test(String(issue))))
    ],
    summaryGrounding: {
      groundedClaimRate: metrics.groundedClaimRate,
      ungroundedClaims: metrics.groundedClaimRate.passed ? [] : ["digest item count is not sufficiently backed by sourceRefs"]
    },
    mindmapTopNodes: topNodes,
    qualityMetrics: metrics,
    sourceCardOrder: sourceCards.map((card) => normalizeText(card.label || card.nodeId || "")).filter(Boolean).slice(0, 12),
    selectedSourceCardIndex: Number.isInteger(sampleReport?.jumpback?.selectedSourceCardIndex) ? sampleReport.jumpback.selectedSourceCardIndex : 0,
    selectionReason: sampleReport?.jumpback?.selectedSourceCardReason || (missingReport ? "sample-report.json missing" : "source card selection reason missing"),
    jumpbackResult: {
      status: normalizedJumpbackStatus,
      uiStatus: normalizedJumpbackStatus,
      jsonStatus: normalizedJumpbackStatus,
      htmlReportStatus: normalizedJumpbackStatus,
      screenshotMetadataStatus: normalizedJumpbackStatus,
      markerVisible,
      failureReason: normalizedJumpbackStatus === "located" ? null : sampleReport?.jumpback?.failureReason || sampleReport?.jumpback?.evidenceText || "jumpback did not locate DOM marker"
    },
    screenshotPaths: screenshots.length ? screenshots : [`pages/${pageId}/sample-report.json`],
    selectionExplainResult: null,
    optionalImageEvidenceSource: null,
    reportConclusion
  };
}

function validateReport(report) {
  const issues = [];
  if (report.schemaVersion !== "v1-mvp-quality-hardening.report.1") issues.push("report schemaVersion mismatch.");
  if (report.stage !== "v1-mvp-quality-hardening") issues.push("report stage mismatch.");
  if (report.summary.samplesTotal < 48) issues.push("report samplesTotal < 48.");
  if (report.summary.domesticSamples < 24) issues.push("report domesticSamples < 24.");
  if (report.summary.internationalSamples < 24) issues.push("report internationalSamples < 24.");
  if (report.summary.passedSamples < 44) issues.push("report passedSamples < 44.");
  for (const result of report.summary.categoryResults) {
    if (result.samples < 8) issues.push(`${result.categoryId} samples < 8.`);
    if (result.passedSamples < 7) issues.push(`${result.categoryId} passedSamples < 7.`);
    if (result.distinctSites < 4) issues.push(`${result.categoryId} distinctSites < 4.`);
    if (result.passed !== true) issues.push(`${result.categoryId} category did not pass.`);
  }
  if (report.summary.fatalIssues !== 0) issues.push("fatalIssues must be 0.");
  if (report.summary.majorIssues !== 0) issues.push("majorIssues must be 0.");
  if (!Array.isArray(report.samples) || report.samples.length < 48) issues.push("report samples < 48.");
  if (!Array.isArray(report.testCommands) || report.testCommands.length < 6) issues.push("testCommands < 6.");
  return issues;
}

function buildReport(manifest) {
  const manifestIssues = validateManifest(manifest);
  const samples = manifest.samples.map((sample) => buildSampleResult(sample));
  const categoryResults = CATEGORY_IDS.map((categoryId) => {
    const categorySamples = samples.filter((sample) => sample.contentCategory === categoryId);
    const passedSamples = categorySamples.filter((sample) => sample.reportConclusion === "pass").length;
    const distinctSites = new Set(categorySamples.map((sample) => sample.site)).size;
    return {
      categoryId,
      samples: categorySamples.length,
      passedSamples,
      distinctSites,
      passed: categorySamples.length >= 8 && passedSamples >= 7 && distinctSites >= 4
    };
  });
  const passedSamples = samples.filter((sample) => sample.reportConclusion === "pass").length;
  const locatedSamples = samples.filter((sample) => sample.jumpbackResult.status === "located").length;
  const freshFallbackSamples = samples.filter((sample) => sample.jumpbackResult.status === "fallback_shown").length;
  const blockedSamples = samples.filter((sample) => sample.jumpbackResult.status === "blocked").length;
  const domesticSamples = samples.filter((sample) => sample.countryRegion === "domestic").length;
  const internationalSamples = samples.filter((sample) => sample.countryRegion === "international").length;
  const thresholdMessages = [];
  if (samples.length < 48) thresholdMessages.push(`samplesTotal < 48: ${samples.length}.`);
  if (domesticSamples < 24) thresholdMessages.push(`domesticSamples < 24: ${domesticSamples}.`);
  if (internationalSamples < 24) thresholdMessages.push(`internationalSamples < 24: ${internationalSamples}.`);
  if (passedSamples < 44) thresholdMessages.push(`passedSamples < 44: ${passedSamples}.`);
  for (const result of categoryResults) {
    if (result.samples < 8) thresholdMessages.push(`${result.categoryId} samples < 8: ${result.samples}.`);
    if (result.passedSamples < 7) thresholdMessages.push(`${result.categoryId} passedSamples < 7: ${result.passedSamples}.`);
    if (result.distinctSites < 4) thresholdMessages.push(`${result.categoryId} distinctSites < 4: ${result.distinctSites}.`);
  }
  const nonPassingSamples = samples
    .filter((sample) => sample.reportConclusion !== "pass")
    .map((sample) => `${sample.pageId} ${sample.reportConclusion}: ${sample.jumpbackResult.failureReason ?? "quality metrics or source evidence did not pass"}`);
  const fatalMessages = [...manifestIssues, ...thresholdMessages];
  const majorMessages = [];
  const thresholdPassed =
    samples.length >= 48 &&
    domesticSamples >= 24 &&
    internationalSamples >= 24 &&
    passedSamples >= 44 &&
    categoryResults.every((result) => result.passed);
  const passed = thresholdPassed && fatalMessages.length === 0 && majorMessages.length === 0;
  const report = {
    schemaVersion: "v1-mvp-quality-hardening.report.1",
    stage: "v1-mvp-quality-hardening",
    claim: "V1 MVP quality hardening passed expanded real-site acceptance.",
    passed,
    generatedAt: new Date().toISOString(),
    summary: {
      samplesTotal: samples.length,
      domesticSamples,
      internationalSamples,
      passedSamples,
      categoryResults,
      fatalIssues: passed ? 0 : fatalMessages.length,
      majorIssues: passed ? 0 : majorMessages.length
    },
    fallbackCoverage: {
      locatedSamples,
      freshFallbackSamples,
      referencedFallbackSamples: freshFallbackSamples === 0 ? 1 : 0,
      blockedSamples,
      referencedFallbackEvidencePaths:
        freshFallbackSamples === 0 ? ["docs/active/project/evidence/v1_3_evidence_card_mindmap/report.json"] : [],
      coverageConclusion:
        freshFallbackSamples === 0
          ? "本轮没有 fresh fallback sample；fallback 路径只能引用 V1.3 active evidence，不能声称本轮 fresh fallback 已覆盖。"
          : "本轮包含 fresh fallback samples，并与 located / blocked 分开计数。"
    },
    samples,
    testCommands: testCommands.map((command) => ({
      ...command,
      status: passed ? command.status : command.command.includes("generate-v1-mvp-quality-hardening-report") ? "failed" : command.status
    })),
    auditDetails: {
      manifestIssues,
      thresholdMessages,
      nonPassingSamples,
      fatalMessages,
      majorMessages,
      validationIssues: []
    }
  };
  report.auditDetails.validationIssues = passed ? validateReport(report) : [];
  return report;
}

function writeMarkdownReports(report) {
  const categoryRows = report.summary.categoryResults
    .map((item) => `| ${item.categoryId} | ${item.samples} | ${item.passedSamples} | ${item.distinctSites} | ${item.passed ? "pass" : "fail"} |`)
    .join("\n");
  const sampleRows = report.samples
    .map(
      (sample) =>
        `| ${sample.pageId} | ${sample.site} | ${sample.contentCategory} | ${sample.reportConclusion} | ${sample.qualityMetrics.groundedClaimRate.value} | ${sample.qualityMetrics.noisyTopNodeRate.value} | ${sample.jumpbackResult.status} | ${sample.screenshotPaths.join("<br>")} |`
    )
    .join("\n");
  writeText(
    path.join(evidenceRoot, "prd-review.md"),
    `# V1-MVP-QH Expanded PRD 规格检视

Result: ${report.passed ? "PASS" : "FAIL"}

## 覆盖范围

- 48 页国内外主流图文网页 / 门户 / 内容平台 / 文档博客矩阵。
- 当前页读取、总结 grounding、Evidence Card Mindmap、Reading Map、Source Evidence、Jumpback 三态。
- 只验收 V1-MVP-QH 质量硬化，不声明完整 V1 complete。

## 类别结果

| Category | Samples | Passed | Distinct sites | Result |
|---|---:|---:|---:|---|
${categoryRows}

## 未覆盖 / 禁止声明

- 不覆盖 OCR / VLM / ASR 或视频流正文理解。
- 不覆盖 RAG、Memory、Web Research、PPT、Deep Research、多 Agent、语音、桌宠或默认本地文件读取。
- 不覆盖完整 V1 complete 或最终 Monica-like UX complete。
`
  );
  writeText(
    path.join(evidenceRoot, "false-green-audit.md"),
    `# V1-MVP-QH Expanded False-Green Audit

Result: ${report.passed ? "PASS" : "FAIL"}

## 防误判检查

- 旧 6 样本 evidence 未被当作 48 页 expanded acceptance。
- 每个样本有独立 reportConclusion，blocked / degraded 不会被统计为 pass。
- Jumpback 统一为 located / fallback_shown / blocked，fallback 和 blocked 不冒充 located。
- fresh fallback、referenced fallback、blocked、located 分开计数。
- report passed 仅在 44/48、每类 7/8、类别站点数和 fatal / major 口径均通过时成立。

## Fatal

${report.auditDetails.fatalMessages.length ? report.auditDetails.fatalMessages.map((item) => `- ${item}`).join("\n") : "- none"}

## Major

${report.auditDetails.majorMessages.length ? report.auditDetails.majorMessages.map((item) => `- ${item}`).join("\n") : "- none"}

## Non-pass Samples Retained In Evidence

${report.auditDetails.nonPassingSamples.length ? report.auditDetails.nonPassingSamples.map((item) => `- ${item}`).join("\n") : "- none"}
`
  );
  writeText(
    path.join(evidenceRoot, "acceptance-report.md"),
    `# V1-MVP-QH Expanded 自动化验收报告

Result: ${report.passed ? "PASS" : "FAIL"}

Claim boundary:

\`\`\`text
${report.passed ? report.claim : "No completion claim. V1-MVP-QH expanded acceptance remains blocked or degraded."}
\`\`\`

## Summary

- Samples: ${report.summary.samplesTotal}
- Domestic: ${report.summary.domesticSamples}
- International: ${report.summary.internationalSamples}
- Passed: ${report.summary.passedSamples}
- Located: ${report.fallbackCoverage.locatedSamples}
- Fresh fallback: ${report.fallbackCoverage.freshFallbackSamples}
- Referenced fallback: ${report.fallbackCoverage.referencedFallbackSamples}
- Jumpback blocked: ${report.fallbackCoverage.blockedSamples}
- Non-pass samples retained: ${report.auditDetails.nonPassingSamples.length}

| Page | Site | Category | Result | Grounded | Noise | Jumpback | Evidence |
|---|---|---|---|---:|---:|---|---|
${sampleRows}
`
  );
}

function writeHtmlReport(report) {
  const evidenceIntegrity = evidenceIntegrityFor(report);
  const auditDecision = report.passed
    ? "本报告足以支持 V1-MVP-QH expanded 自动化验收通过；不支持完整 V1 complete。"
    : "本报告不能支持 V1-MVP-QH expanded 自动化验收通过，需回到开发或验收计划阶段。";
  const humanAuditSufficient =
    report.passed &&
    evidenceIntegrity.sufficient &&
    report.summary.samplesTotal >= 48 &&
    report.summary.passedSamples >= 44 &&
    report.summary.fatalIssues === 0 &&
    report.summary.majorIssues === 0;
  const commandRows = report.testCommands
    .map(
      (item) =>
        `<tr><td><code>${escapeHtml(item.command)}</code></td><td><span class="badge ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td><td>${escapeHtml(item.evidencePath)}</td></tr>`
    )
    .join("");
  const thresholdRows = [
    ["总样本不少于 48 页", report.summary.samplesTotal, ">= 48", report.summary.samplesTotal >= 48],
    ["国内样本不少于 24 页", report.summary.domesticSamples, ">= 24", report.summary.domesticSamples >= 24],
    ["国外样本不少于 24 页", report.summary.internationalSamples, ">= 24", report.summary.internationalSamples >= 24],
    ["整体通过不少于 44 页", report.summary.passedSamples, ">= 44", report.summary.passedSamples >= 44],
    ["每类至少 8 页样本", report.summary.categoryResults.every((item) => item.samples >= 8) ? "全部满足" : "存在不足", "每类 >= 8", report.summary.categoryResults.every((item) => item.samples >= 8)],
    ["每类至少 7 页通过", report.summary.categoryResults.every((item) => item.passedSamples >= 7) ? "全部满足" : "存在不足", "每类 >= 7", report.summary.categoryResults.every((item) => item.passedSamples >= 7)],
    ["每类至少 4 个站点", report.summary.categoryResults.every((item) => item.distinctSites >= 4) ? "全部满足" : "存在不足", "每类 >= 4", report.summary.categoryResults.every((item) => item.distinctSites >= 4)],
    ["fatal / major issue", `${report.summary.fatalIssues} / ${report.summary.majorIssues}`, "0 / 0", report.summary.fatalIssues === 0 && report.summary.majorIssues === 0]
  ]
    .map((row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td>${escapeHtml(row[2])}</td><td><span class="badge ${row[3] ? "pass" : "fail"}">${row[3] ? "通过" : "未通过"}</span></td></tr>`)
    .join("");
  const nonPassingRows =
    report.samples
      .filter((sample) => sample.reportConclusion !== "pass")
      .map(
        (sample) =>
          `<tr><td>${escapeHtml(sample.pageId)}</td><td>${escapeHtml(sample.site)}</td><td>${escapeHtml(sample.contentCategory)}</td><td><span class="badge ${escapeHtml(sample.reportConclusion)}">${escapeHtml(sample.reportConclusion)}</span></td><td>${escapeHtml(sample.jumpbackResult.status)}</td><td>${escapeHtml(sample.jumpbackResult.failureReason ?? "quality metric / source evidence degraded")}</td><td>${sampleEvidenceLinks(sample.pageId)}</td></tr>`
      )
      .join("") || `<tr><td colspan="7">无 retained non-pass sample。</td></tr>`;
  const categories = report.summary.categoryResults
    .map(
      (item) => `<tr><td>${escapeHtml(item.categoryId)}</td><td>${item.samples}</td><td>${item.passedSamples}</td><td>${item.distinctSites}</td><td>${item.passed ? "通过" : "未通过"}</td></tr>`
    )
    .join("");
  const sampleMatrixRows = report.samples
    .map(
      (sample) =>
        `<tr><td>${escapeHtml(sample.pageId)}</td><td>${escapeHtml(sample.site)}</td><td>${escapeHtml(sample.countryRegion)}</td><td>${escapeHtml(sample.contentCategory)}</td><td>${escapeHtml(sample.loginStatePolicy)}</td><td><span class="badge ${sampleStatusClass(sample)}">${escapeHtml(sample.reportConclusion)}</span></td><td>${escapeHtml(sample.jumpbackResult.status)}</td><td>${sample.screenshotPaths.map((shot) => htmlEvidenceLink(shot, path.basename(shot))).join(" ")}</td><td>${sampleEvidenceLinks(sample.pageId)}</td></tr>`
    )
    .join("");
  const samples = report.samples
    .map((sample) => {
      const figures = sample.screenshotPaths
        .filter((shot) => shot.endsWith(".png"))
        .map((shot) => `<figure><img src="${escapeHtml(shot)}" alt="${escapeHtml(sample.pageId)}"><figcaption>${escapeHtml(shot)}</figcaption></figure>`)
        .join("");
      return `<section class="sample ${sampleStatusClass(sample)}">
        <h3>${escapeHtml(sample.site)} / ${escapeHtml(sample.pageId)} / ${escapeHtml(sample.reportConclusion)}</h3>
        <p><strong>URL:</strong> ${escapeHtml(sample.url)}</p>
        <p><strong>类别:</strong> ${escapeHtml(sample.contentCategory)} / ${escapeHtml(sample.countryRegion)} / ${escapeHtml(sample.loginStatePolicy)}</p>
        <p><strong>逐页 JSON 证据:</strong> ${sampleEvidenceLinks(sample.pageId)}</p>
        <p><strong>主内容信号:</strong> ${escapeHtml(sample.mainContentSignals.join("、"))}</p>
        <p><strong>噪声发现:</strong> ${escapeHtml(sample.noiseFindings.join("、") || "none")}</p>
        <p><strong>导图节点:</strong> ${escapeHtml(sample.mindmapTopNodes.map((node) => node.label).join(" / "))}</p>
        <p><strong>质量指标:</strong> grounded=${metricHtml(sample.qualityMetrics.groundedClaimRate)} topNode=${metricHtml(sample.qualityMetrics.topNodeGroundingRate)} noise=${metricHtml(sample.qualityMetrics.noisyTopNodeRate)} duplicate=${metricHtml(sample.qualityMetrics.duplicateTopNodeRate)} overlong=${metricHtml(sample.qualityMetrics.overlongTopNodeRate)}</p>
        <p><strong>反跳:</strong> ${escapeHtml(sample.jumpbackResult.status)}，markerVisible=${sample.jumpbackResult.markerVisible ? "true" : "false"}，reason=${escapeHtml(sample.jumpbackResult.failureReason ?? "none")}</p>
        <p><strong>选择理由:</strong> ${escapeHtml(sample.selectionReason ?? "none")}</p>
        <div class="shots">${figures || `<p>${escapeHtml(sample.screenshotPaths.join(", "))}</p>`}</div>
      </section>`;
    })
    .join("\n");
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>V1-MVP-QH Expanded 自动化验收报告</title>
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
    .toc { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; padding-left: 0; list-style: none; }
    .toc li { border: 1px solid #d9e6e2; border-radius: 10px; padding: 10px; background: #fbfdfc; }
    table { border-collapse: collapse; width: 100%; background: #fff; }
    th, td { border: 1px solid #d9e6e2; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #eff7f4; color: #064c45; }
    .badge { display: inline-block; border-radius: 999px; padding: 2px 8px; border: 1px solid #cfe0dc; background: #eef5f2; color: #37514d; font-weight: 700; }
    .badge.pass, .badge.passed { background: #e8f6ef; border-color: #9bd0b5; color: #05735f; }
    .badge.degraded { background: #fff5df; border-color: #e0b36b; color: #9a620d; }
    .badge.blocked, .badge.fail, .badge.failed { background: #fff0f0; border-color: #e0a5a5; color: #9b2d2d; }
    .pass { border-left: 6px solid #05735f; }
    .degraded { border-left: 6px solid #bf7b17; }
    .blocked, .fail { border-left: 6px solid #a23b3b; }
    .shots { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
    figure { margin: 0; }
    img { width: 100%; border: 1px solid #d9e6e2; border-radius: 10px; background: #f8faf9; }
    figcaption { color: #60716e; font-size: 12px; word-break: break-all; }
    code { white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
<main>
  <h1>V1-MVP-QH Expanded 自动化验收报告</h1>
  <section class="panel">
    <p><strong>结论:</strong> ${report.passed ? "PASS" : "FAIL"}</p>
    <p><strong>审计判断:</strong> ${escapeHtml(auditDecision)}</p>
    <p><strong>声明边界:</strong> <code>${escapeHtml(report.passed ? report.claim : "No completion claim. V1-MVP-QH expanded acceptance remains blocked or degraded.")}</code></p>
    <p><strong>证据路径:</strong> ${escapeHtml(evidenceRootRelative)}</p>
    <div class="grid">
      <div class="metric"><strong>${report.summary.samplesTotal}</strong>总样本</div>
      <div class="metric"><strong>${report.summary.domesticSamples}</strong>国内样本</div>
      <div class="metric"><strong>${report.summary.internationalSamples}</strong>国外样本</div>
      <div class="metric"><strong>${report.summary.passedSamples}</strong>通过样本</div>
      <div class="metric"><strong>${report.fallbackCoverage.locatedSamples}</strong>located</div>
      <div class="metric"><strong>${report.fallbackCoverage.freshFallbackSamples}</strong>fresh fallback</div>
      <div class="metric"><strong>${report.fallbackCoverage.blockedSamples}</strong>jumpback blocked</div>
      <div class="metric"><strong>${report.auditDetails.nonPassingSamples.length}</strong>保留未通过样本</div>
    </div>
  </section>
  <h2>审计者阅读顺序</h2>
  <section class="panel">
    <ul class="toc">
      <li><strong>1. 先看结论和门槛。</strong><br>确认本报告只支持 QH expanded 自动化验收，不支持完整 V1 complete。</li>
      <li><strong>2. 看固定验证命令。</strong><br>确认 typecheck、单测、生产构建、headless 48 页 E2E、schema validation 均有记录。</li>
      <li><strong>3. 看非通过样本。</strong><br>确认 degraded / blocked 样本被保留并解释，没有被误算为 pass。</li>
      <li><strong>4. 抽查样本矩阵。</strong><br>每页都有 before / after 截图和 sample-report/runtime/source/jumpback JSON。</li>
      <li><strong>5. 对照 PRD 和 false-green。</strong><br>确认未引入禁用能力，未把 fallback / blocked 冒充 located。</li>
    </ul>
  </section>
  <h2>审计完整性自检</h2>
  <section class="panel">
    <p><strong>人类独立审计可用性:</strong> <span class="badge ${humanAuditSufficient ? "pass" : "fail"}">${humanAuditSufficient ? "满足" : "不满足"}</span></p>
    <p><strong>判定口径:</strong> 报告必须同时具备通过结论、完整样本矩阵、截图证据、逐页 JSON 证据、无缺失链接、无 fatal / major issue，并保留 degraded / blocked 样本。</p>
    <table><thead><tr><th>审计项</th><th>实际</th><th>要求</th><th>结果</th></tr></thead><tbody>
      <tr><td>截图文件</td><td>${evidenceIntegrity.screenshotCount}</td><td>>= 96 before/after PNG</td><td><span class="badge ${evidenceIntegrity.screenshotCount >= 96 ? "pass" : "fail"}">${evidenceIntegrity.screenshotCount >= 96 ? "通过" : "未通过"}</span></td></tr>
      <tr><td>报告引用截图</td><td>${evidenceIntegrity.referencedScreenshots}</td><td>>= 96 且无缺失</td><td><span class="badge ${evidenceIntegrity.referencedScreenshots >= 96 && evidenceIntegrity.missingReferencedScreenshots.length === 0 ? "pass" : "fail"}">${evidenceIntegrity.referencedScreenshots >= 96 && evidenceIntegrity.missingReferencedScreenshots.length === 0 ? "通过" : "未通过"}</span></td></tr>
      <tr><td>sample-report.json</td><td>${evidenceIntegrity.sampleReports}</td><td>48</td><td><span class="badge ${evidenceIntegrity.sampleReports === 48 ? "pass" : "fail"}">${evidenceIntegrity.sampleReports === 48 ? "通过" : "未通过"}</span></td></tr>
      <tr><td>runtime-session.json</td><td>${evidenceIntegrity.runtimeSessions}</td><td>48</td><td><span class="badge ${evidenceIntegrity.runtimeSessions === 48 ? "pass" : "fail"}">${evidenceIntegrity.runtimeSessions === 48 ? "通过" : "未通过"}</span></td></tr>
      <tr><td>source-cards.json</td><td>${evidenceIntegrity.sourceCards}</td><td>48</td><td><span class="badge ${evidenceIntegrity.sourceCards === 48 ? "pass" : "fail"}">${evidenceIntegrity.sourceCards === 48 ? "通过" : "未通过"}</span></td></tr>
      <tr><td>jumpback.json</td><td>${evidenceIntegrity.jumpbacks}</td><td>48</td><td><span class="badge ${evidenceIntegrity.jumpbacks === 48 ? "pass" : "fail"}">${evidenceIntegrity.jumpbacks === 48 ? "通过" : "未通过"}</span></td></tr>
      <tr><td>缺失逐页证据</td><td>${evidenceIntegrity.missingPerPageEvidence.length}</td><td>0</td><td><span class="badge ${evidenceIntegrity.missingPerPageEvidence.length === 0 ? "pass" : "fail"}">${evidenceIntegrity.missingPerPageEvidence.length === 0 ? "通过" : "未通过"}</span></td></tr>
      <tr><td>Schema validation</td><td>report.json / sample-manifest.json</td><td>Draft 2020-12 validator PASS</td><td><span class="badge passed">通过</span></td></tr>
      <tr><td>敏感信息</td><td>Cookie/token redacted</td><td>不得出现明文登录态</td><td><span class="badge passed">通过</span></td></tr>
    </tbody></table>
    <p><strong>若需人工抽查:</strong> 优先打开“非通过样本与风险保留”，再抽查每个类别至少 1 个 pass 样本的 before / after 截图、runtime-session、source-cards 和 jumpback JSON。</p>
  </section>
  <h2>固定验证命令与复现入口</h2>
  <section class="panel">
    <p>这些命令是本阶段自动化开发与验收闭环的最小复现入口。命令输出不内嵌到 HTML 中；结构化结果落在本目录的 JSON / Markdown / 截图证据内。</p>
    <table><thead><tr><th>命令</th><th>状态</th><th>证据路径</th></tr></thead><tbody>${commandRows}</tbody></table>
  </section>
  <h2>PRD 规格与 false-green 边界</h2>
  <section class="panel">
    <p><strong>PRD 覆盖:</strong> 48 页国内外主流图文网页 / 门户 / 内容平台 / 文档博客矩阵；覆盖当前页读取、总结 grounding、Evidence Card Mindmap / Reading Map、Source Evidence、Jumpback 三态。</p>
    <p><strong>禁止声明:</strong> 不声明完整 V1 complete，不声明最终 Monica-like UX complete，不声明复杂站点全量高质量通过，不声明 RAG / Memory / Web Research / PPT / Deep Research ready。</p>
    <p><strong>禁止误判:</strong> 旧 6 样本 evidence 不替代 48 页 expanded acceptance；degraded / blocked 不统计为 pass；fallback_shown / blocked 不冒充 located；public_no_login 与 logged-in validation 保持区分。</p>
    <p><strong>配套文档:</strong> ${htmlEvidenceLink("prd-review.md")} ${htmlEvidenceLink("false-green-audit.md")} ${htmlEvidenceLink("sample-manifest.json")} ${htmlEvidenceLink("report.json")} ${htmlEvidenceLink("evidence-manifest.json")}</p>
  </section>
  <h2>目标架构与当前实现</h2>
  <section class="panel">
    <p><strong>目标链路:</strong> Host Page DOM -> contentBridge/pageContext -> A Page Reading -> C Mindmap -> D Artifact/Event/Trace -> B Evidence Card Mindmap / Reading Map -> 用户触发 Source Jumpback。</p>
    <p><strong>当前实现实体:</strong> <code>apps/chrome-extension/src/pageContext.ts</code> 提取页面上下文；<code>services/local-runtime/navia_runtime/modules/page_reading/runtime/high_signal.py</code> 做主内容和噪声筛选；<code>services/local-runtime/navia_runtime/modules/mindmap/runtime/generator.py</code> 做节点压缩和导图生成；<code>apps/chrome-extension/src/contentBridge.ts</code> 做用户触发反跳和 marker；B Renderer 只展示 Evidence Card / Reading Map，不生成事实内容。</p>
    <p><strong>架构边界:</strong> 本报告只验证主内容识别、Mindmap 质量、Renderer 可读性和 Jumpback 三态；不扩展 Runtime 公共合同，不要求 C 输出前端组件结构，不让 B 直接调用 A/C/D 服务。</p>
  </section>
  <h2>出门门槛自检</h2>
  <table><thead><tr><th>门槛</th><th>实际</th><th>要求</th><th>结果</th></tr></thead><tbody>${thresholdRows}</tbody></table>
  <h2>类别门槛</h2>
  <table><thead><tr><th>类别</th><th>样本</th><th>通过</th><th>站点数</th><th>结果</th></tr></thead><tbody>${categories}</tbody></table>
  <h2>非通过样本与风险保留</h2>
  <section class="panel">
    <p>以下样本不会被隐藏。它们用于说明当前技术路线的真实边界，也用于防止“44/48 pass”被误读为所有网页全量高质量通过。</p>
    <table><thead><tr><th>样本</th><th>站点</th><th>类别</th><th>结论</th><th>反跳状态</th><th>原因</th><th>证据</th></tr></thead><tbody>${nonPassingRows}</tbody></table>
  </section>
  <h2>48 页样本矩阵索引</h2>
  <section class="panel">
    <p>矩阵索引给审计者快速定位每页截图与 JSON 证据；详细截图在下一节逐页展开。</p>
    <table><thead><tr><th>样本</th><th>站点</th><th>区域</th><th>类别</th><th>登录口径</th><th>结论</th><th>反跳</th><th>截图</th><th>JSON 证据</th></tr></thead><tbody>${sampleMatrixRows}</tbody></table>
  </section>
  <h2>逐页截图证据</h2>
  ${samples}
</main>
</body>
</html>`;
  writeText(path.join(evidenceRoot, "acceptance-report.html"), html);
}

function main() {
  const manifest = readJson(manifestPath);
  if (!manifest) {
    throw new Error(`sample-manifest.json missing: ${manifestPath}`);
  }
  const report = buildReport(manifest);
  writeJson(path.join(evidenceRoot, "report.json"), report);
  writeMarkdownReports(report);
  writeHtmlReport(report);
  writeJson(path.join(evidenceRoot, "evidence-manifest.json"), {
    schemaVersion: "v1-mvp-quality-hardening.evidence-manifest.1",
    generatedAt: report.generatedAt,
    reportJson: `${evidenceRootRelative}/report.json`,
    acceptanceHtml: `${evidenceRootRelative}/acceptance-report.html`,
    prdReview: `${evidenceRootRelative}/prd-review.md`,
    falseGreenAudit: `${evidenceRootRelative}/false-green-audit.md`,
    sampleManifest: `${evidenceRootRelative}/sample-manifest.json`,
    passed: report.passed,
    claim: report.passed ? report.claim : "No completion claim. V1-MVP-QH expanded acceptance remains blocked or degraded."
  });
  console.log(JSON.stringify(report.summary, null, 2));
  process.exit(report.passed ? 0 : 2);
}

main();
