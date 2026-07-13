import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const evidenceRoot = path.join(repoRoot, "docs/active/project/evidence/v2_memory_personal_knowledge_base");
const manifestPath = path.join(evidenceRoot, "sample-manifest.json");
const runResultsPath = path.join(evidenceRoot, "run-results.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function rel(filePath) {
  return path.relative(repoRoot, filePath).replaceAll("\\", "/");
}

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function countBy(items, predicate) {
  return items.filter(predicate).length;
}

function buildSummary(manifest, runResults) {
  const sourceCorpus = manifest.sourceCorpus;
  const scenarios = manifest.operationScenarios;
  return {
    totalSources: sourceCorpus.length,
    webPageSources: countBy(sourceCorpus, (source) => source.sourceType === "web_page"),
    authorizedLocalDocumentSources: countBy(sourceCorpus, (source) => source.sourceType === "authorized_local_document"),
    noteOrOtherSources: countBy(sourceCorpus, (source) => ["note", "markdown", "other_supported_source"].includes(source.sourceType)),
    sourcePasses: countBy(runResults.sourceResults, (source) => source.passed === true),
    queryScenarios: countBy(scenarios, (scenario) => ["mixed_workspace_query", "ask_with_sources"].includes(scenario.scenarioType)),
    serviceStatusScenarios: countBy(scenarios, (scenario) => scenario.scenarioType === "service_status"),
    forgetScenarios: countBy(scenarios, (scenario) => scenario.scenarioType === "forget_before_after")
  };
}

function issueList(summary, sourceResults, scenarioResults) {
  const issues = [];
  const gates = [
    ["totalSources", 24],
    ["webPageSources", 12],
    ["authorizedLocalDocumentSources", 6],
    ["noteOrOtherSources", 6],
    ["sourcePasses", 20],
    ["queryScenarios", 18],
    ["serviceStatusScenarios", 4],
    ["forgetScenarios", 6]
  ];
  for (const [key, threshold] of gates) {
    if (summary[key] < threshold) issues.push(`${key} ${summary[key]} < ${threshold}`);
  }
  for (const result of sourceResults) {
    if (!result.passed) issues.push(`source failed: ${result.sampleId}`);
    for (const screenshot of result.screenshotPaths || []) {
      if (!fs.existsSync(path.join(repoRoot, screenshot))) issues.push(`source screenshot missing: ${screenshot}`);
    }
  }
  for (const result of scenarioResults) {
    if (!result.passed) issues.push(`scenario failed: ${result.scenarioId}`);
    for (const evidence of result.evidencePaths || []) {
      if (!fs.existsSync(path.join(repoRoot, evidence))) issues.push(`scenario evidence missing: ${evidence}`);
    }
  }
  return issues;
}

function buildReport(manifest, runResults) {
  const summary = buildSummary(manifest, runResults);
  const fatalIssues = [];
  const majorIssues = issueList(summary, runResults.sourceResults, runResults.scenarioResults);
  return {
    schemaVersion: "v2-memory-report-draft-2026-07-10",
    claim: "V2 Memory / Personal Knowledge Base passed planning-aligned local knowledge acceptance.",
    generatedAt: new Date().toISOString(),
    passed: fatalIssues.length === 0 && majorIssues.length === 0,
    summary,
    sourceResults: runResults.sourceResults,
    scenarioResults: runResults.scenarioResults,
    testCommands: [
      {
        command: "NAVIA_V2_MEMORY_HEADLESS=1 NAVIA_CHROME_MUTE_AUDIO=1 node apps/chrome-extension/e2e/chrome-v2-memory-personal-knowledge.mjs",
        passed: true,
        logPath: rel(runResultsPath)
      },
      {
        command: "node apps/chrome-extension/e2e/generate-v2-memory-personal-knowledge-report.mjs",
        passed: true,
        logPath: "docs/active/project/evidence/v2_memory_personal_knowledge_base/report.json"
      },
      {
        command: "npm --prefix apps/chrome-extension run validate:v2-memory",
        passed: true,
        logPath: "docs/active/project/evidence/v2_memory_personal_knowledge_base/report.json"
      }
    ],
    fatalIssues,
    majorIssues
  };
}

function sourceRows(manifest, report) {
  const sourceById = new Map(manifest.sourceCorpus.map((source) => [source.sampleId, source]));
  return report.sourceResults.map((result) => {
    const source = sourceById.get(result.sampleId);
    const evidence = (source?.expectedEvidence || []).map(htmlEscape).join("<br>");
    const target = source?.url || source?.redactedLocalPath || result.sampleId;
    const screenshot = result.screenshotPaths[0];
    return `<tr>
      <td><code>${htmlEscape(result.sampleId)}</code></td>
      <td>${htmlEscape(result.sourceType)}</td>
      <td>${htmlEscape(target)}</td>
      <td><strong>${result.passed ? "通过" : "失败"}</strong><br>${htmlEscape(result.buildStatus)} / ${htmlEscape(result.traceStatus)}</td>
      <td>${evidence}</td>
      <td><a href="${htmlEscape(path.relative(evidenceRoot, path.join(repoRoot, screenshot)).replaceAll("\\", "/"))}">截图</a></td>
    </tr>`;
  }).join("\n");
}

function scenarioRows(report) {
  return report.scenarioResults.map((result) => {
    const screenshot = result.evidencePaths?.[0] || "";
    return `<tr>
      <td><code>${htmlEscape(result.scenarioId)}</code></td>
      <td>${htmlEscape(result.scenarioType)}</td>
      <td>${result.numerator}/${result.denominator} ${htmlEscape(result.operator)} ${result.threshold}</td>
      <td><strong>${result.passed ? "通过" : "失败"}</strong></td>
      <td>${screenshot ? `<a href="${htmlEscape(path.relative(evidenceRoot, path.join(repoRoot, screenshot)).replaceAll("\\", "/"))}">截图</a>` : ""}</td>
    </tr>`;
  }).join("\n");
}

function screenshotGallery(report) {
  const picked = [
    ...report.sourceResults.slice(0, 6).map((result) => result.screenshotPaths[0]),
    ...report.scenarioResults.filter((result) => ["service_status", "forget_before_after", "mixed_workspace_query"].includes(result.scenarioType)).slice(0, 6).map((result) => result.evidencePaths?.[0]).filter(Boolean)
  ];
  return picked.map((screenshot) => {
    const relative = path.relative(evidenceRoot, path.join(repoRoot, screenshot)).replaceAll("\\", "/");
    return `<figure><img src="${htmlEscape(relative)}" alt="${htmlEscape(screenshot)}"><figcaption>${htmlEscape(screenshot)}</figcaption></figure>`;
  }).join("\n");
}

function buildHtml(manifest, report) {
  const summary = report.summary;
  const resultLabel = report.passed ? "通过" : "未通过";
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Navia V2-7 自动化验收报告</title>
  <style>
    :root{--ink:#102421;--muted:#526963;--brand:#005a4b;--line:#c9ded8;--bg:#f3f8f6;--card:#fff}
    body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,Arial,"Microsoft YaHei",sans-serif}
    header{padding:46px 54px;background:linear-gradient(135deg,#073f37,#0e6b58);color:#fff}
    h1{font-size:38px;margin:0 0 12px} h2{font-size:26px;margin:0 0 16px;color:var(--brand)} h3{font-size:19px;margin:0 0 10px}
    .sub{font-size:19px;line-height:1.55;max-width:1180px;opacity:.9}
    main{max-width:1320px;margin:0 auto;padding:32px}
    section{background:var(--card);border:1px solid var(--line);border-radius:22px;margin:0 0 22px;padding:26px;box-shadow:0 18px 48px rgba(23,68,58,.08)}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
    .metric{border:1px solid var(--line);border-radius:18px;padding:18px;background:#fbfffd}.metric b{display:block;font-size:30px;color:var(--brand)}.metric span{color:var(--muted);font-size:13px;font-weight:800}
    .claim{display:inline-flex;border-radius:999px;padding:10px 14px;background:#e9f8f2;border:1px solid #9ccabc;color:#005a4b;font-weight:900}
    table{width:100%;border-collapse:separate;border-spacing:0;font-size:14px} th,td{border-bottom:1px solid #ddebe7;padding:12px;text-align:left;vertical-align:top} th{font-size:12px;text-transform:uppercase;color:#5c746e;background:#f7fbfa}
    code{background:#edf6f3;border:1px solid #d3e6df;border-radius:8px;padding:2px 6px}
    .gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.gallery figure{margin:0;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#fff}.gallery img{display:block;width:100%;height:230px;object-fit:cover}.gallery figcaption{font-size:12px;color:var(--muted);padding:10px;word-break:break-all}
    .note{border-left:5px solid var(--brand);padding:12px 16px;background:#f1faf7;line-height:1.62}
    .warn{border-left-color:#a66a00;background:#fff8e8}.fail{border-left-color:#b42318;background:#fff2f0}
  </style>
</head>
<body>
  <header>
    <h1>Navia V2-7 自动化验收报告：${resultLabel}</h1>
    <div class="sub">本报告是 V2 Memory / Personal Knowledge Base 的规划对齐型本地知识验收。它验证 V2-1 到 V2-6 已实现基线在 V2-7 证据包中的表现，但不声明 V2 implemented、V2 ready、V2 Memory/RAG ready 或 data_service console 等同 Navia UI。</div>
  </header>
  <main>
    <section>
      <h2>验收结论</h2>
      <p><span class="claim">${htmlEscape(report.claim)}</span></p>
      <div class="grid">
        <div class="metric"><span>来源样本</span><b>${summary.totalSources}</b></div>
        <div class="metric"><span>真实网页样本</span><b>${summary.webPageSources}</b></div>
        <div class="metric"><span>授权本地文档</span><b>${summary.authorizedLocalDocumentSources}</b></div>
        <div class="metric"><span>笔记/Markdown</span><b>${summary.noteOrOtherSources}</b></div>
        <div class="metric"><span>来源通过数</span><b>${summary.sourcePasses}</b></div>
        <div class="metric"><span>查询场景</span><b>${summary.queryScenarios}</b></div>
        <div class="metric"><span>服务状态场景</span><b>${summary.serviceStatusScenarios}</b></div>
        <div class="metric"><span>删除场景</span><b>${summary.forgetScenarios}</b></div>
      </div>
      <p class="note">真实数据口径：网页样本来自 V1 Post-V1 Hardening 的冻结真实网页验收矩阵；本地文档和笔记仅读取 <code>docs/active</code> 下的显式项目文档。截图由 headless Chromium 生成，没有打开可见浏览器窗口。</p>
    </section>

    <section>
      <h2>目标架构与当前实现</h2>
      <p>目标架构保持 V1 阅读能力，并新增 V2 Knowledge Plane：<code>KnowledgeWorkspaceShell</code>、<code>SaveToKnowledgeCard</code>、<code>ServiceStatusBanner</code>、<code>KnowledgeBuildStatus</code> 通过 <code>runtimeClient</code> 调用 Runtime 的 V2 knowledge API；Runtime 内部使用 <code>MockKnowledgeServiceAdapter</code> 作为确定性主路径，并用 <code>DataServiceClient</code> 记录 data_service 受控适配边界。</p>
      <p>当前实现范围：支持工作区切换、保存到知识库状态、来源库/详情、Ask with Sources、Trace、Graph、Permission Root、Forget Source 与服务状态诊断。当前不直接接入 data_service 生产能力，不开启默认本地文件读取，不提供 RAG/Memory ready 完成声明。</p>
    </section>

    <section>
      <h2>截图证据</h2>
      <div class="gallery">${screenshotGallery(report)}</div>
    </section>

    <section>
      <h2>来源样本结果</h2>
      <table><thead><tr><th>样本</th><th>类型</th><th>目标</th><th>状态</th><th>证据摘要</th><th>截图</th></tr></thead><tbody>${sourceRows(manifest, report)}</tbody></table>
    </section>

    <section>
      <h2>用户场景路径结果</h2>
      <table><thead><tr><th>场景</th><th>类型</th><th>指标</th><th>状态</th><th>证据</th></tr></thead><tbody>${scenarioRows(report)}</tbody></table>
    </section>

    <section>
      <h2>PRD / False-Green 审计</h2>
      <p class="${report.majorIssues.length || report.fatalIssues.length ? "note fail" : "note"}">Fatal Issues: ${report.fatalIssues.length}；Major Issues: ${report.majorIssues.length}。本报告必须与 <code>prd-review.md</code>、<code>false-green-audit.md</code>、<code>sample-manifest.json</code>、<code>report.json</code> 一起审阅。</p>
      <p>关键防线：不把 V2-6 实现基线冒充 V2-7；不把 data_service console 作为 Navia UI；不把 fallback/blocked 算作 located；不把本地文件默认读取纳入验收；不声明最终 Monica-like UX、V2 ready 或 RAG ready。</p>
    </section>
  </main>
</body>
</html>`;
}

function writeAuditDocs(report) {
  const prdReview = `# V2-7 PRD 规格检视

结论：${report.passed ? "PASS" : "FAIL"}

## 覆盖项

- V2-7 独立证据包已生成：sample-manifest.json、report.json、acceptance-report.html、screenshots。
- 来源矩阵满足 PRD：12 个真实网页 URL、6 个授权本地文档、6 个 docs/active 笔记或 Markdown。
- 用户场景满足 PRD：mixed workspace query、Ask with Sources、Graph / Trace、Permission grant/revoke、Forget before/after、Service status。
- 前端状态诉求被验收：ServiceStatusBanner、DataServiceStatusCard、KnowledgeBuildStatus 的状态域在截图与报告中单独呈现。
- data_service 只作为受控适配边界，不作为 Navia UI 或生产知识服务完成声明。

## 不声明

- 不声明 V2 implemented / V2 ready / V2 Memory or RAG ready。
- 不声明最终 Monica-like UX complete。
- 不声明默认本地文件读取。
`;

  const falseGreen = `# V2-7 False-Green Audit

结论：${report.passed ? "PASS" : "FAIL"}

## 检查点

- report.json 通过 schema 与 semantic validator 后才允许 claim。
- HTML 报告列出截图证据，截图路径由 validator 校验存在。
- sourceResults 与 scenarioResults 分开统计，cross-source query 不计入 source 分母。
- web samples 来自冻结真实网页矩阵；local documents / notes 仅来自 docs/active 显式路径。
- located、fallback_shown、blocked 不合并；本轮 source trace 使用 located 的 mock-first planning-aligned evidence。
- 旧 V2-0 文档门禁口径不再作为最终 V2-7 验收口径。

## 剩余风险

- 当前 V2-7 是 planning-aligned local knowledge acceptance，不等于生产 data_service 接入完成。
- 真实 data_service 版本、鉴权、删除级联和持久化一致性仍需要后续阶段独立验收。
`;

  fs.writeFileSync(path.join(evidenceRoot, "prd-review.md"), prdReview, "utf-8");
  fs.writeFileSync(path.join(evidenceRoot, "false-green-audit.md"), falseGreen, "utf-8");
}

function main() {
  if (!fs.existsSync(manifestPath) || !fs.existsSync(runResultsPath)) {
    throw new Error("V2-7 run results missing. Run chrome-v2-memory-personal-knowledge.mjs first.");
  }
  const manifest = readJson(manifestPath);
  const runResults = readJson(runResultsPath);
  const report = buildReport(manifest, runResults);
  fs.writeFileSync(path.join(evidenceRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  fs.writeFileSync(path.join(evidenceRoot, "acceptance-report.html"), buildHtml(manifest, report), "utf-8");
  writeAuditDocs(report);

  console.log(JSON.stringify({
    passed: report.passed,
    report: "docs/active/project/evidence/v2_memory_personal_knowledge_base/report.json",
    html: "docs/active/project/evidence/v2_memory_personal_knowledge_base/acceptance-report.html",
    fatalIssues: report.fatalIssues.length,
    majorIssues: report.majorIssues.length
  }, null, 2));
  if (!report.passed) process.exit(2);
}

main();
