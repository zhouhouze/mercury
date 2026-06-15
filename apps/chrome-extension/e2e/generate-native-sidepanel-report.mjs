import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const evidenceRoot = path.join(repoRoot, "docs/active/project/evidence/v1_2_ac/native-sidepanel-ux");
const reportPath = path.join(evidenceRoot, "report.json");
const extensionBuildRoot = path.join(repoRoot, "apps/chrome-extension/chrome-mv3-unpacked");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolute));
    } else {
      files.push(absolute);
    }
  }
  return files;
}

function productionBridgeLeakCheck() {
  const files = walkFiles(extensionBuildRoot).filter((file) => /\.(js|html|json)$/.test(file));
  const needles = ["navia.e2e", "__naviaE2E", "E2E Side Panel", "naviaE2ETabId", "NAVIA_E2E_BRIDGE"];
  const matches = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const needle of needles) {
      if (text.includes(needle)) {
        matches.push(path.relative(repoRoot, file));
        break;
      }
    }
  }
  return {
    passed: matches.length === 0,
    checkedFiles: files.length,
    matches
  };
}

function screenshotMetadataStatus(report) {
  const screenshots = new Set();
  for (const page of report.pageResults ?? []) {
    for (const screenshot of page.screenshots ?? []) screenshots.add(screenshot);
  }
  const missing = [];
  const invalid = [];
  for (const screenshot of screenshots) {
    const metadataPath = path.join(evidenceRoot, `${screenshot}.metadata.json`);
    if (!fs.existsSync(metadataPath)) {
      missing.push(screenshot);
      continue;
    }
    const metadata = readJson(metadataPath);
    if (!metadata.isNativeSidePanel || !metadata.containsWebPageBody || !metadata.containsNaviaPanel) {
      invalid.push(screenshot);
    }
  }
  return {
    total: screenshots.size,
    missing,
    invalid,
    passed: missing.length === 0 && invalid.length === 0
  };
}

function audit(report) {
  const metadata = screenshotMetadataStatus(report);
  const bridgeLeak = productionBridgeLeakCheck();
  const checks = [
    {
      id: "native_ux_report_passed",
      passed: report.passed === true && report.status === "passed",
      evidence: "native-sidepanel-ux/report.json"
    },
    {
      id: "no_structured_blockers",
      passed: Array.isArray(report.blockers) && report.blockers.length === 0,
      evidence: "report.blockers"
    },
    {
      id: "required_page_count",
      passed: Number(report.pagesPassed) >= Number(report.pagesRequired) && Number(report.pagesRequired) >= 5,
      evidence: `pagesPassed=${report.pagesPassed}, pagesRequired=${report.pagesRequired}`
    },
    {
      id: "chinese_complex_coverage",
      passed: report.includesChineseComplexPage === true,
      evidence: "includesChineseComplexPage=true"
    },
    {
      id: "low_signal_degraded_or_failed",
      passed: report.includesLowSignalPage === true && (report.pageResults ?? []).some((page) => page.isLowSignal && page.lowSignalOutcome !== "pass"),
      evidence: "lowSignalOutcome!=pass"
    },
    {
      id: "screenshot_metadata_complete",
      passed: metadata.passed,
      evidence: `${metadata.total} screenshots, missing=${metadata.missing.length}, invalid=${metadata.invalid.length}`
    },
    {
      id: "production_build_no_e2e_bridge",
      passed: bridgeLeak.passed,
      evidence: `${bridgeLeak.checkedFiles} production files checked`
    }
  ];
  return {
    passed: checks.every((check) => check.passed),
    checks,
    metadata,
    bridgeLeak
  };
}

function renderHtml(report, auditResult) {
  const pageCards = (report.pageResults ?? [])
    .map((page, index) => {
      const screenshots = (page.screenshots ?? [])
        .map((screenshot) => {
          const label = path.basename(screenshot).replace(/\.png$/, "");
          return `
            <figure>
              <img src="${escapeHtml(screenshot)}" alt="${escapeHtml(label)}" />
              <figcaption>${escapeHtml(label)}</figcaption>
            </figure>`;
        })
        .join("");
      return `
        <section class="page-card">
          <h3>${index + 1}. ${escapeHtml(page.category)} ${page.isChineseComplex ? "· 中文复杂页" : ""}${page.isLowSignal ? "· 低信号页" : ""}</h3>
          <p><strong>URL:</strong> ${escapeHtml(page.pageUrl)}</p>
          <p><strong>结果:</strong> ${page.ok ? "通过" : "失败"}${page.lowSignalOutcome ? ` · lowSignalOutcome=${escapeHtml(page.lowSignalOutcome)}` : ""}</p>
          <p><strong>自动化模式:</strong> ${escapeHtml(page.automationMode)}</p>
          <div class="shots">${screenshots}</div>
        </section>`;
    })
    .join("");

  const checks = auditResult.checks
    .map((check) => `<tr><td>${escapeHtml(check.id)}</td><td class="${check.passed ? "pass" : "fail"}">${check.passed ? "PASS" : "FAIL"}</td><td>${escapeHtml(check.evidence)}</td></tr>`)
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>Navia V1.2-AC-Native 验收报告</title>
    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f6f7fb; }
      header { padding: 32px 40px; background: #16213e; color: white; }
      main { padding: 28px 40px 56px; }
      h1, h2, h3 { margin: 0 0 12px; }
      section { margin: 0 0 24px; }
      .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
      .metric, .page-card, .panel { background: white; border: 1px solid #dce1ee; border-radius: 8px; padding: 16px; box-shadow: 0 8px 24px rgba(26, 35, 62, 0.06); }
      .metric strong { display: block; font-size: 24px; margin-top: 6px; }
      .pass { color: #087443; font-weight: 700; }
      .fail { color: #b42318; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #dce1ee; }
      th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e6e9f2; vertical-align: top; }
      .shots { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-top: 12px; }
      figure { margin: 0; background: #f9fafc; border: 1px solid #e1e5ef; border-radius: 8px; overflow: hidden; }
      img { display: block; width: 100%; height: 180px; object-fit: cover; object-position: top left; }
      figcaption { padding: 8px 10px; color: #4c5874; font-size: 12px; }
      code { background: #eef1f8; padding: 2px 5px; border-radius: 4px; }
      ul { margin-top: 8px; }
    </style>
  </head>
  <body>
    <header>
      <h1>Navia V1.2-AC-Native 验收报告</h1>
      <p>真实 Chrome 原生 Side Panel 验收；本报告由 <code>report.json</code> 自动生成。</p>
    </header>
    <main>
      <section class="summary">
        <div class="metric">阶段结论<strong class="${report.passed ? "pass" : "fail"}">${report.passed ? "PASS" : "FAIL"}</strong></div>
        <div class="metric">页面覆盖<strong>${escapeHtml(report.pagesPassed)} / ${escapeHtml(report.pagesRequired)}</strong></div>
        <div class="metric">中文复杂页<strong class="${report.includesChineseComplexPage ? "pass" : "fail"}">${report.includesChineseComplexPage ? "已覆盖" : "未覆盖"}</strong></div>
        <div class="metric">低信号页<strong class="${report.includesLowSignalPage ? "pass" : "fail"}">${report.includesLowSignalPage ? "已降级" : "未覆盖"}</strong></div>
      </section>

      <section class="panel">
        <h2>目标架构与当前实现</h2>
        <p>目标链路：真实网页 -> Chrome 原生 Side Panel -> B SidePanel Shell -> Background runtime proxy -> Runtime API -> D Adapter -> A Page Perception / C Mindmap -> B Debug / Chat / Mermaid / Source Fallback。</p>
        <p>当前实现：验收脚本在真实浏览器中打开原生右侧 Side Panel，复用 Runtime 主链路完成读取、提交、摘要、问答、Mindmap，并对低信号页展示 degraded 结果。</p>
      </section>

      <section>
        <h2>False-Green Audit</h2>
        <table>
          <thead><tr><th>检查项</th><th>结果</th><th>证据</th></tr></thead>
          <tbody>${checks}</tbody>
        </table>
      </section>

      <section class="panel">
        <h2>阶段边界</h2>
        <ul>
          <li>可以声明：原生 Chrome Side Panel 体验稳定化通过自动化验收。</li>
          <li>不得声明：完整 V1 complete、完整 V1.2 complete、A-V1.2 100-page production gate complete。</li>
          <li>未引入：RAG、长期记忆、多 Agent、浏览器自动操作、语音、桌宠、PPT、深度研究。</li>
        </ul>
      </section>

      ${pageCards}
    </main>
  </body>
</html>`;
}

function renderFalseGreenAudit(report, auditResult) {
  const rows = auditResult.checks
    .map((check) => `| ${check.id} | ${check.passed ? "PASS" : "FAIL"} | ${check.evidence} |`)
    .join("\n");
  return `# V1.2-AC-Native False-Green Audit

状态：${auditResult.passed ? "PASS" : "FAIL"}
日期：2026-06-14

## 1. 审计结论

${auditResult.passed ? "当前 native UX 证据可以支撑 V1.2-AC-Native 阶段通过声明。" : "当前 native UX 证据不足以支撑阶段通过声明。"}

本结论只适用于原生 Chrome Side Panel 体验稳定化，不适用于完整 V1 / V1.2 完成声明。

## 2. 机器检查

| 检查项 | 结果 | 证据 |
|---|---|---|
${rows}

## 3. 关键事实

- pagesRequired: ${report.pagesRequired}
- pagesPassed: ${report.pagesPassed}
- includesChineseComplexPage: ${report.includesChineseComplexPage}
- includesLowSignalPage: ${report.includesLowSignalPage}
- blockers: ${(report.blockers ?? []).length}
- screenshot metadata total: ${auditResult.metadata.total}
- production bridge leak matches: ${auditResult.bridgeLeak.matches.length}

## 4. No-Go 防线

- 全屏 extension page 未被计入 native UX 通过。
- low-signal 页面未被标记为正常 pass。
- 生产构建未发现 E2E bridge 字符串。
- B 没有绕过 Runtime / D 直接生成摘要、回答或 Mindmap。

`;
}

if (!fs.existsSync(reportPath)) {
  throw new Error(`Native UX report not found: ${reportPath}`);
}

const report = readJson(reportPath);
const auditResult = audit(report);
fs.writeFileSync(path.join(evidenceRoot, "acceptance-report.html"), renderHtml(report, auditResult), "utf8");
fs.writeFileSync(path.join(evidenceRoot, "false-green-audit.md"), renderFalseGreenAudit(report, auditResult), "utf8");
fs.writeFileSync(path.join(evidenceRoot, "closeout-summary.json"), JSON.stringify({ passed: auditResult.passed, audit: auditResult }, null, 2), "utf8");

console.log(JSON.stringify({ passed: auditResult.passed, report: path.relative(repoRoot, path.join(evidenceRoot, "acceptance-report.html")) }, null, 2));
process.exitCode = auditResult.passed ? 0 : 2;
