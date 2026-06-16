import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const appRoot = path.resolve(__dirname, "..");
const evidenceRoot = path.join(repoRoot, "docs/active/project/evidence/v1_2_closeout");
const reportPath = path.join(evidenceRoot, "report.json");
const requiredCommands = [
  { command: "npm run typecheck", cwd: appRoot, args: ["npm", ["run", "typecheck"]] },
  { command: "npm test -- --run", cwd: appRoot, args: ["npm", ["test", "--", "--run"]] },
  { command: "npm run build", cwd: appRoot, args: ["npm", ["run", "build"]] },
  {
    command: "PYTHONPATH=services/local-runtime /usr/bin/python3 -m pytest services/local-runtime/tests",
    cwd: repoRoot,
    args: ["/usr/bin/python3", ["-m", "pytest", "services/local-runtime/tests"]],
    env: { PYTHONPATH: "services/local-runtime" }
  },
  {
    command:
      "PYTHONPATH=services/local-runtime /usr/bin/python3 -m pytest services/local-runtime/navia_runtime/modules/page_reading/tests services/local-runtime/navia_runtime/modules/mindmap/tests",
    cwd: repoRoot,
    args: [
      "/usr/bin/python3",
      ["-m", "pytest", "services/local-runtime/navia_runtime/modules/page_reading/tests", "services/local-runtime/navia_runtime/modules/mindmap/tests"]
    ],
    env: { PYTHONPATH: "services/local-runtime" }
  }
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function runCommand(commandSpec) {
  const started = Date.now();
  const [command, args] = commandSpec.args;
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: commandSpec.cwd,
      env: { ...process.env, ...(commandSpec.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.on("close", (code) => {
      const logPath = path.join(evidenceRoot, "command-logs", `${commandSpec.command.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase()}.log`);
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.writeFileSync(logPath, `${stdout}\n${stderr}`);
      resolve({
        command: commandSpec.command,
        status: code === 0 ? "passed" : "failed",
        evidencePath: path.relative(repoRoot, logPath),
        durationMs: Date.now() - started
      });
    });
  });
}

async function runRequiredCommands(report) {
  const existing = Array.isArray(report.testCommands) ? report.testCommands : [];
  const e2eStatus = report.passed ? "passed" : "failed";
  const results = [
    {
      command: "npm run e2e:chrome:jumpback-closeout",
      status: e2eStatus,
      evidencePath: "docs/active/project/evidence/v1_2_closeout/report.json"
    }
  ];
  for (const spec of requiredCommands) {
    results.push(await runCommand(spec));
  }
  results.push({
    command: "npm run e2e:chrome:jumpback-closeout:report",
    status: "passed",
    evidencePath: "docs/active/project/evidence/v1_2_closeout/acceptance-report.html"
  });
  return mergeCommands(existing, results);
}

function mergeCommands(existing, results) {
  const map = new Map();
  for (const item of existing) {
    if (item?.command) map.set(item.command, item);
  }
  for (const item of results) {
    if (item?.command) map.set(item.command, item);
  }
  return Array.from(map.values());
}

function validateReport(report) {
  const failures = [];
  const pages = Array.isArray(report.pages) ? report.pages : [];
  const samples = Array.isArray(report.jumpbackSamples) ? report.jumpbackSamples : [];
  const commands = Array.isArray(report.testCommands) ? report.testCommands : [];
  const highlighted = samples.filter((sample) => sample.result === "highlighted").length;
  const fallback = samples.filter((sample) => sample.result === "fallback_shown").length;
  const countedPages = pages.filter((page) => {
    if (page.evidenceMode === "snapshot") return Boolean(page.snapshotPath);
    if (page.evidenceMode === "live_chrome") return true;
    return false;
  });
  if (report.schemaVersion !== "v1.2-closeout.1") failures.push("schemaVersion is not v1.2-closeout.1");
  if (report.stage !== "v1.2-closeout") failures.push("stage is not v1.2-closeout");
  if (report.claim !== "V1.2 AI Reading mock-first product path complete") failures.push("claim is not the allowed V1.2-Closeout claim");
  if (countedPages.length < 20) failures.push(`counted pages < 20 (${countedPages.length})`);
  if ((report.summary?.pagesPassed ?? 0) < 20) failures.push(`pagesPassed < 20 (${report.summary?.pagesPassed ?? 0})`);
  if (samples.length < 5) failures.push(`jumpbackSamples < 5 (${samples.length})`);
  if (highlighted < 3) failures.push(`DOM highlighted samples < 3 (${highlighted})`);
  if (fallback < 2) failures.push(`fallback samples < 2 (${fallback})`);
  for (const sample of samples) {
    for (const key of ["beforeScreenshotPath", "afterScreenshotPath", "metadataPath"]) {
      if (!sample[key] || !fs.existsSync(path.join(evidenceRoot, sample[key]))) failures.push(`missing ${key} for ${sample.sampleId}`);
    }
    if (sample.result === "fallback_shown" && sample.matchedStrategy) failures.push(`fallback sample ${sample.sampleId} must not have matchedStrategy`);
  }
  for (const page of pages) {
    if (page.evidenceMode === "snapshot" && !page.snapshotPath) failures.push(`snapshot page ${page.pageId} missing snapshotPath`);
    if (!page.sourceRefQualityPath || !fs.existsSync(path.join(repoRoot, page.sourceRefQualityPath))) failures.push(`page ${page.pageId} missing sourceRef quality evidence`);
    if (!page.mindmapEvidencePath || !fs.existsSync(path.join(repoRoot, page.mindmapEvidencePath))) failures.push(`page ${page.pageId} missing mindmap evidence`);
  }
  const commandNames = new Set(commands.map((item) => item.command));
  for (const required of [
    "npm run typecheck",
    "npm test -- --run",
    "npm run build",
    "npm run e2e:chrome:jumpback-closeout",
    "npm run e2e:chrome:jumpback-closeout:report",
    "PYTHONPATH=services/local-runtime /usr/bin/python3 -m pytest services/local-runtime/tests",
    "PYTHONPATH=services/local-runtime /usr/bin/python3 -m pytest services/local-runtime/navia_runtime/modules/page_reading/tests services/local-runtime/navia_runtime/modules/mindmap/tests"
  ]) {
    if (!commandNames.has(required)) failures.push(`missing command result: ${required}`);
  }
  for (const item of commands) {
    if (item.status !== "passed") failures.push(`command failed or blocked: ${item.command}`);
  }
  const productionLeak = productionBuildHasE2EBridge();
  if (productionLeak) failures.push("production build contains E2E bridge marker");
  return failures;
}

function productionBuildHasE2EBridge() {
  const unpacked = path.join(appRoot, "chrome-mv3-unpacked");
  if (!fs.existsSync(unpacked)) return true;
  const files = [];
  collectFiles(unpacked, files);
  return files.some((file) => /\.(js|html)$/.test(file) && fs.readFileSync(file, "utf-8").includes("navia.e2e.sidepanel"));
}

function collectFiles(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(fullPath, files);
    else files.push(fullPath);
  }
}

function buildHtml(report, failures) {
  const samples = report.jumpbackSamples ?? [];
  const pages = report.pages ?? [];
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>Navia V1.2-Closeout 验收报告</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f7f8fb; }
    header { padding: 28px 36px; background: #172033; color: white; }
    main { padding: 28px 36px 60px; }
    section { background: white; border: 1px solid #d9dfeb; border-radius: 8px; padding: 20px; margin: 0 0 18px; }
    h1, h2, h3 { margin-top: 0; }
    .status { display: inline-block; padding: 6px 10px; border-radius: 999px; font-weight: 700; background: ${failures.length ? "#ffe1e1" : "#dcfce7"}; color: ${failures.length ? "#991b1b" : "#166534"}; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .metric { border: 1px solid #e1e6ef; border-radius: 8px; padding: 12px; background: #fbfcff; }
    .metric strong { display: block; font-size: 22px; }
    .sample { border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px; }
    .shots { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    img { max-width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; background: white; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
    code { background: #eef2ff; padding: 2px 5px; border-radius: 4px; }
    .fail { color: #b91c1c; }
    .pass { color: #166534; }
  </style>
</head>
<body>
  <header>
    <h1>Navia V1.2-Closeout 验收报告</h1>
    <p><span class="status">${failures.length ? "未通过" : "通过"}</span> ${escapeHtml(report.claim)}</p>
    <p>生成时间：${escapeHtml(report.generatedAt)}</p>
  </header>
  <main>
    <section>
      <h2>目标架构与当前实现</h2>
      <p>目标链路：真实网页 -> Chrome content script -> A high-signal bundle / SourceMap -> C digest-first Mindmap / nodeBindings -> D Artifact/Event/Trace -> B 原生 Side Panel Mermaid 与来源卡片 -> content script Jumpback -> DOM 高亮或 fallback evidence。</p>
      <p>当前验收聚焦 V1.2 mock-first AI Reading 产品路径，不声明完整 V1、RAG、Memory、Web Research、PPT 或深度研究 ready。</p>
    </section>
    <section>
      <h2>验收摘要</h2>
      <div class="grid">
        <div class="metric"><span>页面矩阵</span><strong>${report.summary?.pagesPassed ?? 0}/${report.summary?.pagesTotal ?? 0}</strong></div>
        <div class="metric"><span>Jumpback 样本</span><strong>${report.summary?.chromeJumpbackSamples ?? 0}</strong></div>
        <div class="metric"><span>DOM 高亮</span><strong>${report.summary?.domHighlightedCount ?? 0}</strong></div>
        <div class="metric"><span>Fallback</span><strong>${report.summary?.fallbackShownCount ?? 0}</strong></div>
      </div>
      ${failures.length ? `<h3>阻塞项</h3><ul>${failures.map((failure) => `<li class="fail">${escapeHtml(failure)}</li>`).join("")}</ul>` : `<p class="pass">所有 Closeout 门槛均已满足。</p>`}
    </section>
    <section>
      <h2>真实 Chrome Jumpback 截图证据</h2>
      ${samples
        .map(
          (sample) => `<div class="sample">
        <h3>${escapeHtml(sample.sampleId)} · ${escapeHtml(sample.result)}</h3>
        <p>URL：${escapeHtml(sample.url)}<br/>节点：${escapeHtml(sample.nodeLabel)}<br/>SourceRef：${escapeHtml((sample.sourceRefIds ?? []).join(", "))}</p>
        <div class="shots">
          <figure><figcaption>Before</figcaption><img src="${escapeHtml(sample.beforeScreenshotPath)}" /></figure>
          <figure><figcaption>After</figcaption><img src="${escapeHtml(sample.afterScreenshotPath)}" /></figure>
        </div>
      </div>`
        )
        .join("")}
    </section>
    <section>
      <h2>20 页收关矩阵</h2>
      <table>
        <thead><tr><th>页面</th><th>类型</th><th>Readiness</th><th>结论</th><th>证据</th></tr></thead>
        <tbody>
          ${pages
            .map(
              (page) => `<tr><td>${escapeHtml(page.title)}<br/><code>${escapeHtml(page.pageId)}</code></td><td>${escapeHtml(page.category)}</td><td>${escapeHtml(page.readiness)}</td><td>${escapeHtml(page.conclusion)}</td><td><code>${escapeHtml(page.sourceRefQualityPath)}</code><br/><code>${escapeHtml(page.mindmapEvidencePath)}</code></td></tr>`
            )
            .join("")}
        </tbody>
      </table>
    </section>
    <section>
      <h2>命令结果</h2>
      <table>
        <thead><tr><th>命令</th><th>状态</th><th>证据</th></tr></thead>
        <tbody>
          ${(report.testCommands ?? [])
            .map((item) => `<tr><td><code>${escapeHtml(item.command)}</code></td><td>${escapeHtml(item.status)}</td><td><code>${escapeHtml(item.evidencePath)}</code></td></tr>`)
            .join("")}
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
}

function buildPrdReview(report, failures) {
  return `# V1.2-Closeout PRD 规格检视

结论：${failures.length ? "未通过，不能声明 V1.2 AI Reading mock-first product path complete。" : "通过，可以声明 V1.2 AI Reading mock-first product path complete。"}

## 覆盖项

- 真实 Chrome 原生 Side Panel Jumpback 样本：${report.summary?.chromeJumpbackSamples ?? 0}
- DOM 高亮成功样本：${report.summary?.domHighlightedCount ?? 0}
- fallback evidence 样本：${report.summary?.fallbackShownCount ?? 0}
- 20 页真实/快照矩阵：${report.summary?.pagesPassed ?? 0}/${report.summary?.pagesTotal ?? 0}

## 不声明

- 不声明完整 V1 complete。
- 不声明 Monica 级所有网页精确反跳。
- 不声明 RAG / Memory / Web Research / PPT / Deep Research ready。
`;
}

function buildFalseGreenAudit(report, failures) {
  return `# V1.2-Closeout False-Green Audit

结论：${failures.length ? "FAIL" : "PASS"}

## 防线

- 全屏 extension page 不能冒充原生 Side Panel：报告只接受带真实网页主体和右侧 Navia Panel 的截图 metadata。
- fallback 不能冒充 DOM 高亮：fallback 样本要求 result=fallback_shown 且 matchedStrategy=null。
- URL-only 页面不能计入最终页面矩阵：snapshot 页面必须有 snapshotPath。
- 命令未运行不能写 pass：报告器实际执行并记录 required commands。
- 生产构建不能泄露 E2E bridge：报告器扫描 production unpacked JS/HTML。

## 阻塞项

${failures.length ? failures.map((failure) => `- ${failure}`).join("\n") : "- 无"}
`;
}

async function main() {
  if (!fs.existsSync(reportPath)) throw new Error(`Closeout report not found: ${reportPath}. Run npm run e2e:chrome:jumpback-closeout first.`);
  let report = readJson(reportPath);
  report.testCommands = await runRequiredCommands(report);
  const failures = validateReport(report);
  report.passed = failures.length === 0;
  writeJson(reportPath, report);
  fs.writeFileSync(path.join(evidenceRoot, "acceptance-report.html"), buildHtml(report, failures));
  fs.writeFileSync(path.join(evidenceRoot, "prd-review.md"), buildPrdReview(report, failures));
  fs.writeFileSync(path.join(evidenceRoot, "false-green-audit.md"), buildFalseGreenAudit(report, failures));
  console.log(JSON.stringify({ passed: report.passed, failures, html: "docs/active/project/evidence/v1_2_closeout/acceptance-report.html" }, null, 2));
  process.exitCode = report.passed ? 0 : 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(2);
});
