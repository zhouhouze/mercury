import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const evidenceRoot = path.join(repoRoot, "docs/active/project/evidence/v1_external_visual_acceptance");
const screenshotsRoot = path.join(evidenceRoot, "screenshots");
const commandLogRoot = path.join(evidenceRoot, "command-logs");
const realSiteRoot = path.join(repoRoot, "docs/active/project/evidence/v1_real_site_complex_pages");
const realSiteScreenshotsRoot = path.join(realSiteRoot, "screenshots");
const chromeForTesting = path.join(repoRoot, ".tmp/chrome-for-testing/chrome-win64/chrome.exe");
const stableRealSiteDefaults = {
  NAVIA_REAL_SITE_BILIBILI_DETAIL_URL: "https://www.bilibili.com/video/BV18W7t6GEmc/"
};

const commandSpecs = [
  {
    label: "前端类型检查",
    command: "npm --prefix apps/chrome-extension run typecheck",
    args: ["npm", ["--prefix", "apps/chrome-extension", "run", "typecheck"]]
  },
  {
    label: "前端单元测试",
    command: "npm --prefix apps/chrome-extension test -- pageContext contentBridge",
    args: ["npm", ["--prefix", "apps/chrome-extension", "test", "--", "pageContext", "contentBridge"]]
  },
  {
    label: "A/C 模块测试",
    command:
      "PYTHONPATH=.tmp/python-deps:services/local-runtime .venv/bin/python -m pytest services/local-runtime/navia_runtime/modules/page_reading/tests services/local-runtime/navia_runtime/modules/mindmap/tests -q",
    args: [
      ".venv/bin/python",
      [
        "-m",
        "pytest",
        "services/local-runtime/navia_runtime/modules/page_reading/tests",
        "services/local-runtime/navia_runtime/modules/mindmap/tests",
        "-q"
      ]
    ],
    env: {
      PYTHONPATH: [path.join(repoRoot, ".tmp/python-deps"), path.join(repoRoot, "services/local-runtime"), process.env.PYTHONPATH]
        .filter(Boolean)
        .join(path.delimiter)
    }
  },
  {
    label: "E2E 扩展构建",
    command: "npm --prefix apps/chrome-extension run build:e2e",
    args: ["npm", ["--prefix", "apps/chrome-extension", "run", "build:e2e"]]
  },
  {
    label: "真实站点 Chrome 自动化诊断",
    command: "NAVIA_REAL_SITE_HEADLESS=1 npm --prefix apps/chrome-extension run e2e:chrome:real-site-diagnostics",
    args: ["npm", ["--prefix", "apps/chrome-extension", "run", "e2e:chrome:real-site-diagnostics"]],
    env: {
      NAVIA_REAL_SITE_HEADLESS: "1",
      NAVIA_REAL_SITE_MUTE_AUDIO: "1",
      NAVIA_REAL_SITE_BILIBILI_DETAIL_URL:
        process.env.NAVIA_REAL_SITE_BILIBILI_DETAIL_URL || stableRealSiteDefaults.NAVIA_REAL_SITE_BILIBILI_DETAIL_URL,
      ...(process.env.NAVIA_REAL_SITE_XIAOHONGSHU_DETAIL_URL
        ? { NAVIA_REAL_SITE_XIAOHONGSHU_DETAIL_URL: process.env.NAVIA_REAL_SITE_XIAOHONGSHU_DETAIL_URL }
        : {}),
      ...(fs.existsSync(chromeForTesting) ? { NAVIA_BROWSER_EXECUTABLE: chromeForTesting } : {})
    }
  }
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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
    // Embedded URLs are redacted by the regex above.
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

function slug(value) {
  return String(value)
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function relativeFromEvidence(filePath) {
  return path.relative(evidenceRoot, filePath).replaceAll(path.sep, "/");
}

function copyScreenshot(sourcePath, targetName) {
  if (!fs.existsSync(sourcePath)) return null;
  const targetPath = path.join(screenshotsRoot, targetName);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  return relativeFromEvidence(targetPath);
}

async function runCommand(spec, index) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const [command, args] = spec.args;
  return await new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...(spec.env ?? {}) },
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
      const logSlug = slug(spec.command) || slug(spec.label) || "command";
      const logPath = path.join(commandLogRoot, `${String(index + 1).padStart(2, "0")}_${logSlug}.log`);
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.writeFileSync(logPath, sanitizeEvidenceString(`${stdout}\n${stderr}`));
      resolve({
        label: spec.label,
        command: spec.command,
        status: code === 0 ? "passed" : "failed",
        exitCode: code,
        startedAt,
        durationMs: Date.now() - started,
        logPath: relativeFromEvidence(logPath)
      });
    });
  });
}

async function cleanupTempChromeProfiles() {
  await new Promise((resolve) => {
    const script =
      'Get-CimInstance Win32_Process | Where-Object { $_.Name -eq "chrome.exe" -and ($_.CommandLine -like "*navia-real-site-public-profile*" -or $_.CommandLine -like "*navia-real-site-profile*" -or $_.CommandLine -like "*navia-real-site-chromium-profile*") } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }';
    const child = spawn("powershell.exe", ["-NoProfile", "-Command", script], {
      cwd: repoRoot,
      stdio: ["ignore", "ignore", "ignore"]
    });
    child.on("close", () => resolve());
    child.on("error", () => resolve());
  });
}

function collectVisualSamples(realSiteReport) {
  const samples = Array.isArray(realSiteReport?.samples) ? realSiteReport.samples : [];
  return samples.map((sample) => {
    const before = copyScreenshot(
      path.join(realSiteScreenshotsRoot, `${sample.sampleId}-before.png`),
      `${sample.sampleId}-before.png`
    );
    const after = copyScreenshot(
      path.join(realSiteScreenshotsRoot, `${sample.sampleId}-after.png`),
      `${sample.sampleId}-after.png`
    );
    const blocked = copyScreenshot(
      path.join(realSiteScreenshotsRoot, `${sample.sampleId}-blocked.png`),
      `${sample.sampleId}-blocked.png`
    );
    return {
      sampleId: sample.sampleId,
      siteName: sample.siteName,
      pageKind: sample.pageKind,
      url: sample.url,
      finalUrl: sample.finalUrl,
      result: sample.result,
      readiness: sample.readiness,
      textLength: sample.bodyTextLength,
      sourceRefs: sample.sourceRefs,
      digestItems: sample.digestItems,
      evidenceCardCount: sample.evidenceCardCount,
      sourceCards: sample.sourceCards,
      jumpbackStatus: sample.jumpbackStatus,
      mindmapQuality: sample.mindmapQuality ?? null,
      beforeScreenshot: before,
      afterScreenshot: after ?? blocked,
      issues: [...(sample.fatalIssues ?? []), ...(sample.majorIssues ?? [])]
    };
  });
}

function buildReport(commandResults) {
  const realSiteReport = readJson(path.join(realSiteRoot, "report.json"), {});
  const v13Report = readJson(path.join(repoRoot, "docs/active/project/evidence/v1_3_evidence_card_mindmap/report.json"), {});
  const v14Report = readJson(path.join(repoRoot, "docs/active/project/evidence/v1_4_reading_map/report.json"), {});
  const visualSamples = collectVisualSamples(realSiteReport);
  const fatalIssues = [];
  const majorIssues = [];

  if (commandResults.some((item) => item.status !== "passed")) {
    fatalIssues.push("存在失败的自动化命令，不能声明对外可视化验收通过。");
  }
  if (!realSiteReport?.passed) {
    fatalIssues.push("真实站点复杂页面诊断未通过，不能声明用户体验路径通过。");
  }
  if (visualSamples.length < 6) {
    fatalIssues.push(`截图样本不足：期望至少 6 个真实页面样本，实际 ${visualSamples.length} 个。`);
  }
  if (visualSamples.some((sample) => !sample.afterScreenshot)) {
    majorIssues.push("部分样本缺少 after 截图证据。");
  }

  const passed = fatalIssues.length === 0 && majorIssues.length === 0;
  return {
    schemaVersion: "v1-external-visual-acceptance.1",
    generatedAt: new Date().toISOString(),
    passed,
    summary: {
      commandTotal: commandResults.length,
      commandPassed: commandResults.filter((item) => item.status === "passed").length,
      samplesTotal: visualSamples.length,
      samplesPassed: visualSamples.filter((item) => item.result === "pass").length,
      highlightedSamples: realSiteReport?.summary?.highlightedSamples ?? 0,
      fallbackSamples: realSiteReport?.summary?.fallbackSamples ?? 0
    },
    commandResults,
    upstreamReports: {
      realSiteComplexPages: {
        path: "docs/active/project/evidence/v1_real_site_complex_pages/report.json",
        passed: Boolean(realSiteReport?.passed),
        summary: realSiteReport?.summary ?? null,
        claim: realSiteReport?.claim ?? ""
      },
      v13EvidenceCardMindmap: {
        path: "docs/active/project/evidence/v1_3_evidence_card_mindmap/report.json",
        passed: Boolean(v13Report?.passed),
        summary: v13Report?.summary ?? null,
        claim: v13Report?.claim ?? ""
      },
      v14ReadingMap: {
        path: "docs/active/project/evidence/v1_4_reading_map/report.json",
        passed: Boolean(v14Report?.passed),
        summary: v14Report?.summary ?? null,
        claim: v14Report?.claim ?? ""
      }
    },
    architecture: {
      target:
        "Content Script 注入网页内入口/侧栏 -> Side Panel / iframe shell -> Python Local Runtime -> A Page Reading -> C Mindmap -> D Adapter/Event/Trace -> B Evidence Card Mindmap / Reading Map -> 用户触发 source evidence / DOM highlight / fallback。",
      current:
        "当前实现为 WXT/React Chrome extension + Python local runtime。页面内侧栏/launcher 与 Chrome Side Panel 作为前端承载，Mock CoreProvider 支撑本地可重复验收；A/C/D/B 模块已支持当前页读取、结构化摘要/问答、Evidence Card Mindmap、Reading Map、source cards 和 jumpback。",
      notClaimed:
        "不声明完整 V1 complete，不声明 V2 Memory/RAG、Web Research、PPT、Deep Research、多 Agent、语音、桌宠或浏览器自动操作产品能力 ready。"
    },
    visualSamples,
    fatalIssues,
    majorIssues,
    environmentNotes: realSiteReport?.environmentNotes ?? [],
    claim: passed
      ? "Navia 当前可实现的真实网页伴读、Evidence Card Mindmap、Reading Map 和 source jumpback 用户路径通过自动化可视化验收。"
      : "No completion claim. 对外可视化自动化验收存在失败或证据不足。"
  };
}

function statusLabel(value) {
  if (value === "passed" || value === "pass" || value === true) return "通过";
  if (value === "degraded") return "降级";
  if (value === "blocked" || value === "failed" || value === false) return "失败";
  return "未知";
}

function buildHtml(report) {
  const commandRows = report.commandResults
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.label)}</td>
        <td><code>${escapeHtml(item.command)}</code></td>
        <td class="${item.status === "passed" ? "pass" : "fail"}">${statusLabel(item.status)}</td>
        <td>${Math.round(item.durationMs / 1000)}s</td>
        <td><a href="${escapeHtml(item.logPath)}">日志</a></td>
      </tr>`
    )
    .join("");
  const sampleCards = report.visualSamples
    .map(
      (sample) => `<article class="sample">
        <div class="sample-head">
          <div>
            <h3>${escapeHtml(sample.siteName)} / ${escapeHtml(sample.pageKind)}</h3>
            <p>${escapeHtml(sample.finalUrl || sample.url)}</p>
          </div>
          <span class="pill ${sample.result === "pass" ? "ok" : sample.result === "degraded" ? "warn" : "bad"}">${statusLabel(sample.result)}</span>
        </div>
        <div class="metrics">
          <span>文本 ${escapeHtml(sample.textLength)}</span>
          <span>SourceRef ${escapeHtml(sample.sourceRefs)}</span>
          <span>Digest ${escapeHtml(sample.digestItems)}</span>
          <span>EvidenceCard ${escapeHtml(sample.evidenceCardCount)}</span>
          <span>Jumpback ${escapeHtml(sample.jumpbackStatus)}</span>
          ${
            sample.mindmapQuality
              ? `<span>导图标签 ${escapeHtml(sample.mindmapQuality.labelCount)} · 噪声 ${escapeHtml(Number(sample.mindmapQuality.noisyRatio ?? 0).toFixed(2))} · 唯一 ${escapeHtml(Number(sample.mindmapQuality.uniqueRatio ?? 0).toFixed(2))}</span>`
              : "<span>导图质量 n/a</span>"
          }
        </div>
        <div class="shot-grid">
          ${
            sample.beforeScreenshot
              ? `<figure><img src="${escapeHtml(sample.beforeScreenshot)}" alt="${escapeHtml(sample.sampleId)} before" /><figcaption>读取前：真实网页与 Navia 入口</figcaption></figure>`
              : ""
          }
          ${
            sample.afterScreenshot
              ? `<figure><img src="${escapeHtml(sample.afterScreenshot)}" alt="${escapeHtml(sample.sampleId)} after" /><figcaption>读取后：Mindmap / source evidence / highlight 路径</figcaption></figure>`
              : ""
          }
        </div>
        <p class="issues">${sample.issues.length ? escapeHtml(sample.issues.join("; ")) : "无 fatal / major issue"}</p>
      </article>`
    )
    .join("");
  const upstreamCards = Object.entries(report.upstreamReports)
    .map(
      ([key, item]) => `<div class="upstream">
        <strong>${escapeHtml(key)}</strong>
        <span class="${item.passed ? "pass" : "fail"}">${statusLabel(item.passed)}</span>
        <p>${escapeHtml(item.claim)}</p>
        <code>${escapeHtml(item.path)}</code>
      </div>`
    )
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Navia 对外可视化自动化验收报告</title>
  <style>
    :root { color-scheme: light; --ink: #10201d; --muted: #5b6b67; --line: #dbe7e2; --panel: #ffffff; --wash: #f4f8f6; --green: #075f52; --red: #b42318; --amber: #ad6500; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif; color: var(--ink); background: var(--wash); }
    header { padding: 34px 40px 24px; background: linear-gradient(135deg, #062e2a, #0a5f52); color: white; }
    header p { max-width: 960px; color: #d8efea; line-height: 1.7; }
    main { padding: 28px 40px 64px; max-width: 1440px; margin: 0 auto; }
    section { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 22px; margin-bottom: 20px; box-shadow: 0 18px 50px rgba(9, 48, 43, .06); }
    h1, h2, h3 { margin: 0 0 12px; letter-spacing: 0; }
    p { line-height: 1.7; }
    code { background: #ecf4f1; padding: 2px 5px; border-radius: 5px; }
    .status { display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: 999px; font-weight: 800; background: ${report.passed ? "#dcfce7" : "#fee2e2"}; color: ${report.passed ? "#166534" : "#991b1b"}; }
    .summary { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
    .metric-card { border: 1px solid var(--line); border-radius: 10px; padding: 14px; background: #fbfdfc; }
    .metric-card strong { display: block; font-size: 28px; }
    .arch { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .arch-card, .upstream { border: 1px solid var(--line); border-radius: 10px; padding: 14px; background: #fbfdfc; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
    .pass { color: #087443; font-weight: 800; }
    .fail { color: var(--red); font-weight: 800; }
    .pill { display: inline-flex; border-radius: 999px; padding: 6px 10px; font-weight: 800; white-space: nowrap; }
    .pill.ok { color: #075f52; background: #dff7ed; }
    .pill.warn { color: var(--amber); background: #fff2cc; }
    .pill.bad { color: var(--red); background: #ffe4e0; }
    .sample { border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin-bottom: 18px; background: #fbfdfc; }
    .sample-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
    .sample-head p { color: var(--muted); margin: 0; word-break: break-all; }
    .metrics { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 14px; }
    .metrics span { border: 1px solid var(--line); background: white; border-radius: 999px; padding: 5px 9px; font-size: 13px; }
    .shot-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    figure { margin: 0; }
    img { width: 100%; border: 1px solid #c8d8d3; border-radius: 10px; background: white; display: block; }
    figcaption { color: var(--muted); font-size: 13px; margin-top: 7px; }
    .issues { color: var(--muted); margin-bottom: 0; }
    .upstream-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .notes { color: var(--muted); }
    @media (max-width: 900px) { main, header { padding-left: 18px; padding-right: 18px; } .summary, .arch, .shot-grid, .upstream-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>Navia 对外可视化自动化验收报告</h1>
    <p><span class="status">${report.passed ? "验收通过" : "验收未通过"}</span></p>
    <p>${escapeHtml(report.claim)}</p>
    <p>生成时间：${escapeHtml(report.generatedAt)}</p>
  </header>
  <main>
    <section>
      <h2>验收摘要</h2>
      <div class="summary">
        <div class="metric-card"><strong>${report.summary.commandPassed}/${report.summary.commandTotal}</strong><span>自动化命令通过</span></div>
        <div class="metric-card"><strong>${report.summary.samplesPassed}/${report.summary.samplesTotal}</strong><span>真实页面样本通过</span></div>
        <div class="metric-card"><strong>${report.summary.highlightedSamples}</strong><span>DOM highlight</span></div>
        <div class="metric-card"><strong>${report.summary.fallbackSamples}</strong><span>Fallback</span></div>
        <div class="metric-card"><strong>${report.fatalIssues.length}</strong><span>Fatal issues</span></div>
        <div class="metric-card"><strong>${report.majorIssues.length}</strong><span>Major issues</span></div>
      </div>
      <p class="notes">${escapeHtml(report.environmentNotes.length ? report.environmentNotes.join(" ") : "使用标准自动化环境。")}</p>
    </section>
    <section>
      <h2>目标架构与当前实现</h2>
      <div class="arch">
        <div class="arch-card"><h3>目标架构</h3><p>${escapeHtml(report.architecture.target)}</p></div>
        <div class="arch-card"><h3>当前实现</h3><p>${escapeHtml(report.architecture.current)}</p></div>
        <div class="arch-card"><h3>不声明范围</h3><p>${escapeHtml(report.architecture.notClaimed)}</p></div>
      </div>
    </section>
    <section>
      <h2>自动化命令</h2>
      <table>
        <thead><tr><th>检查项</th><th>命令</th><th>结果</th><th>耗时</th><th>证据</th></tr></thead>
        <tbody>${commandRows}</tbody>
      </table>
    </section>
    <section>
      <h2>上游阶段证据</h2>
      <div class="upstream-grid">${upstreamCards}</div>
    </section>
    <section>
      <h2>用户体验路径截图</h2>
      <p>以下截图来自自动化打开真实网页、加载 Navia 插件、读取当前页、生成 Mindmap / Reading Map、点击 source evidence 并完成 DOM highlight 的流程。</p>
      ${sampleCards}
    </section>
    <section>
      <h2>False-green 审计</h2>
      <p>${report.fatalIssues.length || report.majorIssues.length ? "存在阻塞或主要风险，不能对外声明通过。" : "未发现 fatal / major false-green 风险。"}</p>
      <ul>
        <li>不把登录态缺失、验证码、404 或反爬页面伪装为通过。</li>
        <li>不把 fallback 误记为 DOM highlight success。</li>
        <li>不以旧截图或非当前运行结果替代本次自动化证据。</li>
        <li>不声明未验收的完整 V1、RAG、Memory、Web Research、PPT、Deep Research 或多 Agent 能力。</li>
      </ul>
    </section>
  </main>
</body>
</html>`;
}

function buildMarkdownReview(report) {
  return `# Navia 对外可视化自动化验收 PRD 复检

Result: ${report.passed ? "PASS" : "FAIL"}

覆盖的体验路径：

- 真实网页中打开 Navia 侧栏 / 入口。
- 读取当前页面并提交 Runtime。
- 生成 Evidence Card Mindmap / Reading Map。
- 展示 source evidence，并触发 DOM highlight 或 fallback。
- 使用 B站、小红书、观察者网首页与详情页作为真实复杂网页样本。

不声明：

- 完整 V1 complete。
- V2 Memory / RAG ready。
- Web Research / PPT / Deep Research / 多 Agent / 语音 / 桌宠 / 浏览器自动操作 ready。

报告：

- HTML: docs/active/project/evidence/v1_external_visual_acceptance/acceptance-report.html
- JSON: docs/active/project/evidence/v1_external_visual_acceptance/report.json
`;
}

function buildFalseGreenAudit(report) {
  return `# Navia 对外可视化自动化验收 False-green Audit

Result: ${report.passed ? "PASS" : "FAIL"}

Fatal issues:

${report.fatalIssues.length ? report.fatalIssues.map((item) => `- ${item}`).join("\n") : "- none"}

Major issues:

${report.majorIssues.length ? report.majorIssues.map((item) => `- ${item}`).join("\n") : "- none"}

审计规则：

- 必须有本次自动化命令结果，不能只复用历史截图。
- 必须有截图证据，不能只看 DOM 标记。
- source fallback 不能冒充 DOM highlight。
- 复杂站点降级或失败必须如实写入报告。
- 不扩大声明到完整 V1、RAG、Memory、Web Research、PPT、Deep Research、多 Agent 或浏览器自动操作。
`;
}

async function main() {
  fs.rmSync(evidenceRoot, { recursive: true, force: true });
  fs.mkdirSync(screenshotsRoot, { recursive: true });
  fs.mkdirSync(commandLogRoot, { recursive: true });

  const commandResults = [];
  for (const [index, spec] of commandSpecs.entries()) {
    commandResults.push(await runCommand(spec, index));
  }
  await cleanupTempChromeProfiles();

  const report = buildReport(commandResults);
  writeJson(path.join(evidenceRoot, "report.json"), report);
  writeText(path.join(evidenceRoot, "acceptance-report.html"), buildHtml(report));
  writeText(path.join(evidenceRoot, "prd-review.md"), buildMarkdownReview(report));
  writeText(path.join(evidenceRoot, "false-green-audit.md"), buildFalseGreenAudit(report));
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        html: "docs/active/project/evidence/v1_external_visual_acceptance/acceptance-report.html",
        report: "docs/active/project/evidence/v1_external_visual_acceptance/report.json",
        summary: report.summary
      },
      null,
      2
    )
  );
  process.exit(report.passed ? 0 : 2);
}

main().catch(async (error) => {
  await cleanupTempChromeProfiles();
  const report = {
    schemaVersion: "v1-external-visual-acceptance.1",
    generatedAt: new Date().toISOString(),
    passed: false,
    summary: { commandTotal: 0, commandPassed: 0, samplesTotal: 0, samplesPassed: 0, highlightedSamples: 0, fallbackSamples: 0 },
    commandResults: [],
    upstreamReports: {},
    architecture: {},
    visualSamples: [],
    fatalIssues: [error instanceof Error ? error.stack || error.message : String(error)],
    majorIssues: [],
    environmentNotes: [],
    claim: "No completion claim. 对外可视化自动化验收脚本执行异常。"
  };
  writeJson(path.join(evidenceRoot, "report.json"), report);
  writeText(path.join(evidenceRoot, "acceptance-report.html"), buildHtml(report));
  console.error(report.fatalIssues[0]);
  process.exit(2);
});
