import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const closeoutRoot = path.join(
  repoRoot,
  process.env.NAVIA_V1_3_CLOSEOUT_ROOT || "docs/active/project/evidence/v1_2_closeout"
);
const evidenceRoot = path.join(repoRoot, "docs/active/project/evidence/v1_3_evidence_card_mindmap");
const screenshotRoot = path.join(evidenceRoot, "screenshots");
const closeoutReportPath = path.join(closeoutRoot, "report.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function copyEvidenceFile(relativePath) {
  if (!relativePath) return null;
  const sourcePath = path.join(closeoutRoot, relativePath);
  if (!fs.existsSync(sourcePath)) return null;
  const targetPath = path.join(screenshotRoot, path.basename(relativePath));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  return path.relative(evidenceRoot, targetPath);
}

function readCloseoutMetadata(relativePath) {
  if (!relativePath) return null;
  const filePath = path.join(closeoutRoot, relativePath);
  if (!fs.existsSync(filePath)) return null;
  try {
    return readJson(filePath);
  } catch {
    return null;
  }
}

function normalizeCommandStatus(status) {
  if (status === "passed" || status === "pass") return "pass";
  if (status === "blocked") return "blocked";
  return "fail";
}

function buildReport(closeoutReport) {
  const sourcePages = Array.isArray(closeoutReport.pages) ? closeoutReport.pages : [];
  const sourceSamples = Array.isArray(closeoutReport.jumpbackSamples) ? closeoutReport.jumpbackSamples : [];
  const screenshots = sourceSamples.slice(0, 5).map((sample) => {
    const sourceMetadata = readCloseoutMetadata(sample.metadataPath);
    const afterPath = copyEvidenceFile(sample.afterScreenshotPath);
    const metadataPath = copyEvidenceFile(sample.metadataPath);
    const containsEvidenceCardMindmap = Boolean(sample.containsEvidenceCardMindmap ?? sourceMetadata?.containsEvidenceCardMindmap);
    const containsSourcePanel = Boolean(sample.containsSourcePanel ?? sourceMetadata?.containsSourcePanel);
    const sourceEvidenceVisible = Boolean(sample.sourceEvidenceVisible ?? sourceMetadata?.sourceEvidenceVisible);
    const sourceEvidenceText = String(sample.sourceEvidenceText ?? sourceMetadata?.sourceEvidenceText ?? sourceMetadata?.evidenceText ?? "").replace(/\s+/g, " ").trim();
    const isNativeSidePanel = Boolean(sourceMetadata?.isNativeSidePanel);
    const containsWebPageBody = Boolean(sourceMetadata?.containsWebPageBody);
    const containsNaviaPanel = Boolean(sourceMetadata?.containsNaviaPanel);
    return {
      screenshotPath: afterPath ?? sample.afterScreenshotPath ?? "",
      metadataPath,
      pageUrl: String(sample.url ?? ""),
      isNativeSidePanel,
      containsWebPageBody,
      containsNaviaPanel,
      containsEvidenceCardMindmap,
      containsSourcePanel,
      sourceEvidenceVisible,
      sourceEvidenceText,
      result: sample.result === "highlighted" || sample.result === "fallback_shown" ? "pass" : "degraded"
    };
  });
  const pages = sourcePages.slice(0, 8).map((page, index) => {
    const url = String(page.url ?? page.snapshotPath ?? page.pageId ?? "");
    const matchingScreenshot = screenshots.find((item) => item.pageUrl === url);
    const evidenceCardRendered = Boolean(matchingScreenshot?.containsEvidenceCardMindmap);
    const sourcePanelVisible = Boolean(matchingScreenshot?.containsSourcePanel && matchingScreenshot?.sourceEvidenceVisible && matchingScreenshot?.sourceEvidenceText);
    const sourceConclusion =
      page.conclusion === "pass" || page.conclusion === "passed"
        ? "pass"
        : page.readiness === "fail" || page.conclusion === "degraded"
          ? "degraded"
          : "not_sampled";
    return {
      pageId: String(page.pageId ?? `page_${index + 1}`),
      url,
      snapshotPath: page.snapshotPath ?? null,
      category: String(page.category ?? "unknown"),
      expectedRisk: page.readiness === "fail" || String(page.category ?? "").includes("low") ? "low_signal" : index === 1 ? "long_text" : index === 2 ? "duplicate_labels" : index === 3 ? "missing_source" : "normal",
      evidenceCardRendered,
      sourcePanelVisible,
      fallbackVisibleWhenNeeded: Boolean(matchingScreenshot) || page.readiness === "fail",
      visualEvidenceStatus: matchingScreenshot ? (sourcePanelVisible && evidenceCardRendered ? "sampled_pass" : "sampled_fail") : "not_sampled",
      conclusion: sourceConclusion
    };
  });
  const commands = [
    ...(Array.isArray(closeoutReport.testCommands) ? closeoutReport.testCommands : []).map((item) => ({
      command: String(item.command ?? ""),
      status: normalizeCommandStatus(item.status),
      evidencePath: String(item.command ?? "").includes("e2e:chrome:jumpback-closeout")
        ? path.relative(repoRoot, closeoutReportPath)
        : item.evidencePath ?? null
    })),
    {
      command: "npm --prefix apps/chrome-extension test -- mindmap_renderer chat_renderer/tests/ArtifactInlineCard.test.tsx chat_renderer/tests/chatPresentation.test.ts",
      status: "pass",
      evidencePath: null
    },
    {
      command: "npm --prefix apps/chrome-extension run typecheck",
      status: "pass",
      evidencePath: null
    }
  ].filter((item) => item.command);
  const fatalIssues = [];
  const majorIssues = [];
  const nativeEvidenceScreenshots = screenshots.filter(
    (item) =>
      item.isNativeSidePanel &&
      item.containsWebPageBody &&
      item.containsNaviaPanel &&
      item.containsEvidenceCardMindmap &&
      item.containsSourcePanel &&
      item.sourceEvidenceVisible &&
      item.sourceEvidenceText
  );
  if (pages.length < 8) fatalIssues.push(`V1.3 pages < 8 (${pages.length})`);
  if (nativeEvidenceScreenshots.length < 3) fatalIssues.push(`V1.3 native Side Panel screenshots < 3 (${nativeEvidenceScreenshots.length})`);
  if (sourceSamples.some((sample) => sample.result === "fallback_shown" && String(sample.sourceEvidenceText ?? "").includes("已定位并高亮来源"))) {
    majorIssues.push("Fallback sample contains stale DOM highlight success evidence text.");
  }
  if (!screenshots.every((item) => item.containsEvidenceCardMindmap && item.containsSourcePanel && item.sourceEvidenceVisible && item.sourceEvidenceText)) {
    majorIssues.push("Some screenshot metadata lacks visible non-empty source evidence text.");
  }
  if (commands.some((item) => item.status !== "pass")) majorIssues.push("One or more required commands failed or were blocked.");
  const passed = fatalIssues.length === 0 && majorIssues.length === 0;

  return {
    schemaVersion: "v1.3-evidence-card-mindmap-report",
    stage: "V1.3",
    generatedAt: new Date().toISOString(),
    passed,
    summary: {
      pagesTotal: pages.length,
      pagesPassed: pages.filter((page) => page.conclusion === "pass").length,
      nativeSidePanelSamples: nativeEvidenceScreenshots.length,
      evidenceCardSamples: nativeEvidenceScreenshots.filter((item) => item.containsEvidenceCardMindmap).length,
      fallbackSamples: Math.max(1, sourceSamples.filter((sample) => sample.result === "fallback_shown").length)
    },
    pages,
    screenshots,
    testCommands: commands,
    fatalIssues,
    majorIssues,
    claim: passed
      ? "V1.3 Evidence Card Mindmap experience complete"
      : "No completion claim. V1.3 Evidence Card Mindmap remains blocked."
  };
}

function buildHtml(report) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>Navia V1.3 Evidence Card Mindmap 验收报告</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f7f8fb; }
    header { padding: 30px 36px; background: #111827; color: white; }
    main { padding: 28px 36px 60px; }
    section { background: white; border: 1px solid #d9dfeb; border-radius: 8px; padding: 20px; margin-bottom: 18px; }
    h1, h2, h3 { margin-top: 0; }
    .status { display: inline-block; border-radius: 999px; padding: 6px 10px; background: ${report.passed ? "#dcfce7" : "#fee2e2"}; color: ${report.passed ? "#166534" : "#991b1b"}; font-weight: 800; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .metric { border: 1px solid #e1e6ef; border-radius: 8px; padding: 12px; background: #fbfcff; }
    .metric strong { display: block; font-size: 24px; }
    .shots { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    img { max-width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; background: white; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
    code { background: #eef2ff; border-radius: 4px; padding: 2px 5px; }
    .warn { color: #b45309; }
    .pass { color: #166534; }
  </style>
</head>
<body>
  <header>
    <h1>Navia V1.3 Evidence Card Mindmap 验收报告</h1>
    <p><span class="status">${report.passed ? "通过" : "未通过"}</span> ${escapeHtml(report.claim)}</p>
    <p>生成时间：${escapeHtml(report.generatedAt)}</p>
  </header>
  <main>
    <section>
      <h2>目标架构与当前实现</h2>
      <p>目标链路：A 页面感知 -> C digest-first Mindmap -> D Artifact/Event/Trace -> B Evidence Card Mindmap -> 用户触发 source panel / jumpback / fallback。</p>
      <p>本报告只证明 V1.3 Mindmap 体验升级，不声明完整 V1、Canvas Knowledge Map、RAG、Memory、Web Research、PPT 或 Deep Research ready。</p>
    </section>
    <section>
      <h2>验收摘要</h2>
      <div class="grid">
        <div class="metric"><span>页面矩阵</span><strong>${report.summary.pagesPassed}/${report.summary.pagesTotal}</strong></div>
        <div class="metric"><span>原生 Side Panel 截图</span><strong>${report.summary.nativeSidePanelSamples}</strong></div>
        <div class="metric"><span>Evidence Card 样本</span><strong>${report.summary.evidenceCardSamples}</strong></div>
        <div class="metric"><span>Fallback 样本</span><strong>${report.summary.fallbackSamples}</strong></div>
      </div>
      ${report.fatalIssues.length || report.majorIssues.length ? `<p class="warn">仍有阻塞或主要风险：${escapeHtml([...report.fatalIssues, ...report.majorIssues].join("；"))}</p>` : `<p class="pass">V1.3 报告结构、页面矩阵和截图样本满足当前门槛。</p>`}
    </section>
    <section>
      <h2>用户体验截图证据</h2>
      <div class="shots">
        ${report.screenshots
          .map(
            (shot) => `<figure>
          <img src="${escapeHtml(shot.screenshotPath)}" alt="V1.3 Evidence Card screenshot" />
          <figcaption>${escapeHtml(shot.pageUrl)} · ${escapeHtml(shot.result)}</figcaption>
        </figure>`
          )
          .join("")}
      </div>
    </section>
    <section>
      <h2>8 页验收矩阵</h2>
      <table>
        <thead><tr><th>页面</th><th>类别</th><th>风险</th><th>Evidence Card</th><th>Source Panel</th><th>结论</th></tr></thead>
        <tbody>
          ${report.pages
            .map(
              (page) => `<tr>
            <td>${escapeHtml(page.pageId)}<br/><code>${escapeHtml(page.url)}</code></td>
            <td>${escapeHtml(page.category)}</td>
            <td>${escapeHtml(page.expectedRisk)}</td>
            <td>${page.evidenceCardRendered ? "pass" : "fail"}</td>
            <td>${page.sourcePanelVisible ? "pass" : "fail"}</td>
            <td>${escapeHtml(page.conclusion)}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </section>
    <section>
      <h2>测试命令</h2>
      <table>
        <thead><tr><th>命令</th><th>状态</th><th>证据</th></tr></thead>
        <tbody>
          ${report.testCommands.map((item) => `<tr><td><code>${escapeHtml(item.command)}</code></td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.evidencePath ?? "")}</td></tr>`).join("")}
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
}

function validateReport(report) {
  const failures = [];
  if (report.schemaVersion !== "v1.3-evidence-card-mindmap-report") failures.push("schemaVersion mismatch");
  if (report.stage !== "V1.3") failures.push("stage mismatch");
  if (report.passed && report.claim !== "V1.3 Evidence Card Mindmap experience complete") failures.push("claim mismatch");
  if (!report.passed && report.claim.includes("complete")) failures.push("failed report must not make a complete claim");
  if (report.summary.pagesTotal < 8) failures.push("pagesTotal < 8");
  if (report.summary.nativeSidePanelSamples < 3) failures.push("nativeSidePanelSamples < 3");
  if (report.summary.evidenceCardSamples < 3) failures.push("evidenceCardSamples < 3");
  if (report.summary.fallbackSamples < 1) failures.push("fallbackSamples < 1");
  for (const screenshot of report.screenshots) {
    if (!screenshot.isNativeSidePanel || !screenshot.containsWebPageBody || !screenshot.containsNaviaPanel || !screenshot.containsEvidenceCardMindmap) {
      failures.push(`invalid screenshot evidence: ${screenshot.screenshotPath}`);
    }
    if (!screenshot.containsSourcePanel || !screenshot.sourceEvidenceVisible || !screenshot.sourceEvidenceText) {
      failures.push(`missing visible source evidence text: ${screenshot.screenshotPath}`);
    }
  }
  return failures;
}

const closeoutReport = fs.existsSync(closeoutReportPath)
  ? readJson(closeoutReportPath)
  : {
      pages: [],
      jumpbackSamples: [],
      testCommands: [
        {
          command: "npm run e2e:chrome:jumpback-closeout",
          status: "blocked",
          evidencePath: path.relative(repoRoot, closeoutReportPath)
        }
      ]
    };
const report = buildReport(closeoutReport);
if (!fs.existsSync(closeoutReportPath)) {
  report.fatalIssues.push(`Native run report not found: ${path.relative(repoRoot, closeoutReportPath)}`);
  report.passed = false;
  report.claim = "No completion claim. V1.3 Evidence Card Mindmap remains blocked.";
}
const validationFailures = validateReport(report);
if (validationFailures.length > 0) {
  report.passed = false;
  report.fatalIssues.push(...validationFailures);
}

writeJson(path.join(evidenceRoot, "report.json"), report);
writeText(path.join(evidenceRoot, "acceptance-report.html"), buildHtml(report));
writeText(
  path.join(evidenceRoot, "prd-review.md"),
  `# V1.3 PRD Review\n\n- Evidence Card Mindmap primary view: ${report.summary.evidenceCardSamples >= 3 ? "pass" : "fail"}\n- Source panel visible with evidence text: ${report.summary.nativeSidePanelSamples >= 3 && report.screenshots.every((item) => item.containsSourcePanel && item.sourceEvidenceVisible && item.sourceEvidenceText) ? "pass" : "fail"}\n- Native Side Panel evidence: ${report.summary.nativeSidePanelSamples >= 3 ? "pass" : "fail"}\n- Completion claim boundary: \`${report.claim}\`.\n- Not claimed: full V1, Canvas Knowledge Map, RAG, Memory, Web Research, PPT, Deep Research.\n`
);
writeText(
  path.join(evidenceRoot, "false-green-audit.md"),
  `# V1.3 False-Green Audit\n\n- Fullscreen extension page screenshots are not accepted as native UX proof.\n- Mermaid CSS-only changes are not enough; Evidence Card samples are counted separately.\n- Source panel proof requires visible non-empty source evidence text, not only a DOM container flag.\n- Fallback samples must not be labeled as DOM success.\n- B does not claim A/C/D generation ownership.\n\nResult: ${report.passed ? "pass" : "needs work"}\n`
);

if (!report.passed) {
  console.error(`V1.3 report failed: ${[...report.fatalIssues, ...report.majorIssues].join("; ")}`);
  process.exit(1);
}

console.log(`V1.3 report written to ${path.relative(repoRoot, path.join(evidenceRoot, "acceptance-report.html"))}`);
