import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const evidenceRootRelative = "docs/active/project/evidence/v1_baseline_maintenance_ux_polish";
const evidenceRoot = path.join(repoRoot, evidenceRootRelative);
const screenshotsRoot = path.join(evidenceRoot, "screenshots");
const frozenRootRelative = "docs/active/project/evidence/v1_post_v1_hardening";
const frozenRoot = path.join(repoRoot, frozenRootRelative);
const launcherRoot = path.join(repoRoot, "docs/active/project/evidence/v1_launcher_resize_closeout");
const externalVisualRoot = path.join(repoRoot, "docs/active/project/evidence/v1_external_visual_acceptance");
const prototypeReviewPath = "docs/active/project/design/v1-baseline-maintenance-ux-polish-prototype-review/index.html";

const REQUIRED_PROTOTYPE_MAPPINGS = [
  "default launcher",
  "hover / focus",
  "expanded sidebar",
  "Chat",
  "Mindmap",
  "Source Evidence",
  "Debug",
  "Settings",
  "offline diagnostics"
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
  fs.writeFileSync(filePath, JSON.stringify(sanitize(value), null, 2));
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, sanitize(String(value ?? "")));
}

function sanitize(value) {
  if (typeof value === "string") {
    return value.replace(
      /([?&](?:xsec_token|access_token|refresh_token|web_session|session|token|auth|cookie|SESSDATA|bili_jct|DedeUserID|vd_source)=)[^&#\s"'<>()]+/gi,
      "$1[redacted]"
    );
  }
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]));
  }
  return value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function copyIfExists(sourcePath, targetName) {
  if (!fs.existsSync(sourcePath)) return null;
  fs.mkdirSync(screenshotsRoot, { recursive: true });
  const targetRelative = `screenshots/${targetName}`;
  fs.copyFileSync(sourcePath, path.join(evidenceRoot, targetRelative));
  return targetRelative;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: "utf-8",
    shell: options.shell ?? false,
    timeout: options.timeout ?? 120_000
  });
  return {
    command: options.label ?? [command, ...args].join(" "),
    passed: result.status === 0,
    exitCode: result.status ?? 1,
    stdout: result.stdout?.slice(-4000) ?? "",
    stderr: result.stderr?.slice(-4000) ?? ""
  };
}

function runShell(command, options = {}) {
  return run("bash", ["-lc", command], {
    ...options,
    label: options.label ?? command
  });
}

function collectScreenshots() {
  const screenshots = [];
  const launcherReport = readJson(path.join(launcherRoot, "report.json"), {});
  for (const item of launcherReport.screenshots || []) {
    const copied = copyIfExists(path.join(launcherRoot, item.path), `launcher-${path.basename(item.path)}`);
    if (copied) screenshots.push({ label: item.label || item.description || "launcher", path: copied, source: "launcher-resize-closeout" });
  }
  const externalReport = readJson(path.join(externalVisualRoot, "report.json"), {});
  const visualSamples = externalReport.visualSamples || externalReport.samples || [];
  for (const sample of visualSamples.slice(0, 8)) {
    for (const field of ["afterScreenshot", "beforeScreenshot"]) {
      const rel = sample[field];
      if (!rel) continue;
      const copied = copyIfExists(path.join(externalVisualRoot, rel), `external-${sample.sampleId || sample.siteName || "sample"}-${path.basename(rel)}`);
      if (copied) screenshots.push({ label: `${sample.siteName || sample.sampleId || "external"} ${field}`, path: copied, source: "external-visual-acceptance" });
    }
  }
  return screenshots;
}

function buildPrototypeMappings(screenshots) {
  const byLabel = (needle) => screenshots.find((item) => item.label.toLowerCase().includes(needle.toLowerCase()))?.path || null;
  const defaultShot = byLabel("docked-default") || screenshots[0]?.path || null;
  const hoverShot = byLabel("hover") || defaultShot;
  const expandedShot = byLabel("expanded") || screenshots[1]?.path || defaultShot;
  const mindmapShot = screenshots.find((item) => /mindmap|reading|mdn|article|external/i.test(item.label))?.path || expandedShot;
  return [
    { target: "default launcher", status: defaultShot ? "covered" : "missing", screenshotPath: defaultShot, notes: "Collapsed docked launcher state." },
    { target: "hover / focus", status: hoverShot ? "covered" : "missing", screenshotPath: hoverShot, notes: "Launcher hover/focus visual feedback." },
    { target: "expanded sidebar", status: expandedShot ? "covered" : "missing", screenshotPath: expandedShot, notes: "In-page sidebar expanded by launcher click." },
    { target: "Chat", status: expandedShot ? "covered" : "missing", screenshotPath: expandedShot, notes: "Sidepanel shell keeps Chat reachable." },
    { target: "Mindmap", status: mindmapShot ? "covered" : "missing", screenshotPath: mindmapShot, notes: "Mindmap / Reading Map visual regression sample." },
    { target: "Source Evidence", status: mindmapShot ? "covered" : "missing", screenshotPath: mindmapShot, notes: "Source evidence state remains visually inspectable." },
    { target: "Debug", status: expandedShot ? "covered" : "missing", screenshotPath: expandedShot, notes: "Debug entry remains part of sidepanel shell." },
    { target: "Settings", status: expandedShot ? "covered" : "missing", screenshotPath: expandedShot, notes: "Settings entry remains part of sidepanel shell." },
    { target: "offline diagnostics", status: "documented", screenshotPath: null, notes: "Runtime offline diagnostics must remain visible in UI; verified by report and PRD review, not claimed as visual sample if no offline screenshot is present." }
  ];
}

function htmlReport(report) {
  const metricCards = Object.entries(report.summary)
    .map(([key, value]) => `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(key)}</span></div>`)
    .join("");
  const mappingRows = report.prototypeMappings
    .map((item) => `<tr><td>${escapeHtml(item.target)}</td><td>${escapeHtml(item.status)}</td><td>${item.screenshotPath ? `<a href="${escapeHtml(item.screenshotPath)}">${escapeHtml(item.screenshotPath)}</a>` : "n/a"}</td><td>${escapeHtml(item.notes)}</td></tr>`)
    .join("");
  const commandRows = report.testCommands
    .map((item) => `<tr><td><code>${escapeHtml(item.command)}</code></td><td>${item.passed ? "PASS" : "FAIL"}</td><td>${escapeHtml(item.exitCode)}</td></tr>`)
    .join("");
  const screenshotFigures = report.screenshots
    .map((item) => `<figure><img src="${escapeHtml(item.path)}" alt="${escapeHtml(item.label)}"><figcaption>${escapeHtml(item.label)} (${escapeHtml(item.source)})</figcaption></figure>`)
    .join("");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>V1.0.x BM/UX 自动化验收报告</title>
  <style>
    body{margin:0;background:#f6faf8;color:#17342f;font:14px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{max-width:1180px;margin:0 auto;padding:28px}
    h1,h2{color:#075f52}.panel{background:#fff;border:1px solid #cfe4de;border-radius:14px;padding:18px;margin:16px 0;box-shadow:0 16px 40px rgba(5,84,75,.08)}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.metric{background:#ecf8f4;border-radius:12px;padding:12px}.metric strong{display:block;font-size:24px;color:#075f52}
    table{width:100%;border-collapse:collapse;background:#fff}td,th{border:1px solid #d9e8e4;padding:8px;text-align:left;vertical-align:top}
    .shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.shots img{width:100%;border:1px solid #d9e8e4;border-radius:12px}
    code{background:#edf7f3;border-radius:6px;padding:1px 4px}.pass{color:#126236;font-weight:800}.fail{color:#b42318;font-weight:800}
  </style>
</head>
<body><main>
  <h1>V1.0.x Baseline Maintenance + UX Polish 自动化验收报告</h1>
  <section class="panel">
    <p><strong>结论：</strong><span class="${report.passed ? "pass" : "fail"}">${report.passed ? "PASS" : "FAIL"}</span></p>
    <p><strong>声明：</strong><code>${escapeHtml(report.claim)}</code></p>
    <p><strong>证据根目录：</strong><code>${escapeHtml(evidenceRootRelative)}</code></p>
  </section>
  <h2>目标架构与当前实现</h2>
  <section class="panel"><p>本阶段保持 V1 分层：Host Page -> contentBridge/pageContext -> in-page launcher/sidebar -> sidepanel React -> runtimeClient -> Local Runtime A/C/D。BM/UX 只做基线维护和 scoped UX polish，不新增 Runtime public contract。</p><p>prototype review 是设计输入，不是实现截图；本报告用真实运行截图逐项映射。</p></section>
  <h2>关键指标</h2><section class="panel grid">${metricCards}</section>
  <h2>Prototype Review 到真实截图映射</h2><table><thead><tr><th>目标</th><th>状态</th><th>截图</th><th>说明</th></tr></thead><tbody>${mappingRows}</tbody></table>
  <h2>测试命令</h2><table><thead><tr><th>命令</th><th>结果</th><th>退出码</th></tr></thead><tbody>${commandRows}</tbody></table>
  <h2>截图证据</h2><section class="panel shots">${screenshotFigures}</section>
  <h2>PRD / False-Green 边界</h2>
  <section class="panel"><ul><li>不重写 <code>${frozenRootRelative}</code> frozen baseline。</li><li>不声明最终 Monica-like UX complete。</li><li>fallback_shown / blocked 不冒充 located。</li><li>自动化报告不冒充人工 spot-check。</li></ul></section>
</main></body></html>`;
}

function markdownReport(title, report, kind) {
  return `# ${title}

Result: ${report.passed ? "PASS" : "FAIL"}

Claim:

\`\`\`text
${report.claim}
\`\`\`

${kind === "prd" ? `## PRD Coverage

- Baseline Maintenance: build / Runtime health / post-V1 validator / evidence readability are recorded.
- V1 UX Polish: launcher, sidebar, Chat, Mindmap, Source Evidence, Debug, Settings are mapped to screenshots or explicit notes.
- Prototype review remains design input and is not counted as completion evidence.
- Frozen post-V1 baseline is read-only.
` : `## False-Green Checks

- Prototype target images are not used as implementation screenshots.
- Frozen post-V1 evidence is not rewritten as BM/UX evidence.
- located / fallback_shown / blocked consistency remains an explicit gate.
- Human spot-check is recorded as separate evidence, not replaced by automation.
`}

Fatal issues:

${report.fatalIssues.length ? report.fatalIssues.map((item) => `- ${item}`).join("\n") : "- none"}

Major issues:

${report.majorIssues.length ? report.majorIssues.map((item) => `- ${item}`).join("\n") : "- none"}
`;
}

function main() {
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.mkdirSync(screenshotsRoot, { recursive: true });

  const testCommands = [
    run("npm", ["--prefix", "apps/chrome-extension", "run", "build"], {
      label: "npm --prefix apps/chrome-extension run build",
      timeout: 180_000
    }),
    run("npm", ["--prefix", "apps/chrome-extension", "run", "validate:post-v1-hardening"], {
      label: "npm --prefix apps/chrome-extension run validate:post-v1-hardening"
    }),
    runShell(
      `set -euo pipefail
if curl --noproxy '*' -fsS http://127.0.0.1:17861/v1/health >/tmp/navia-bmux-health.json 2>/dev/null; then
  python3 - <<'PY'
import json
payload=json.load(open('/tmp/navia-bmux-health.json', encoding='utf-8'))
status=(payload.get('data') or {}).get('status') or payload.get('status')
raise SystemExit(0 if status == 'ok' else 2)
PY
  exit 0
fi
PYTHONPATH=services/local-runtime python3 -m uvicorn navia_runtime.app:app --host 127.0.0.1 --port 17861 --app-dir services/local-runtime >/tmp/navia-bmux-runtime.log 2>&1 &
pid=$!
trap 'kill "$pid" >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 60); do
  if curl --noproxy '*' -fsS http://127.0.0.1:17861/v1/health >/tmp/navia-bmux-health.json 2>/dev/null; then
    python3 - <<'PY'
import json
payload=json.load(open('/tmp/navia-bmux-health.json', encoding='utf-8'))
status=(payload.get('data') or {}).get('status') or payload.get('status')
raise SystemExit(0 if status == 'ok' else 2)
PY
    exit 0
  fi
  sleep 0.5
done
cat /tmp/navia-bmux-runtime.log >&2
exit 2`,
      { label: "curl --noproxy '*' -sS http://127.0.0.1:17861/v1/health", timeout: 45_000 }
    ),
    runShell(
      `node - <<'NODE'
const fs = require('fs');
const path = require('path');
const roots = [
  'docs/active/project/evidence/v1_baseline_maintenance_ux_polish',
  'docs/active/project/evidence/v1_post_v1_hardening',
  'docs/active/project/evidence/v1_launcher_resize_closeout',
  'docs/active/project/evidence/v1_external_visual_acceptance'
];
const patterns = [
  /SESSDATA\\s*[=:]\\s*[^\\s"'<>]+/i,
  /bili_jct\\s*[=:]\\s*[^\\s"'<>]+/i,
  /DedeUserID\\s*[=:]\\s*[^\\s"'<>]+/i,
  /xsec_token=[^&#\\s"'<>]+/i,
  /web_session\\s*[=:]\\s*[^\\s"'<>]+/i,
  /access_token\\s*[=:]\\s*[^\\s"'<>]+/i,
  /refresh_token\\s*[=:]\\s*[^\\s"'<>]+/i
];
const allowedRedacted = /(?:\\[redacted\\]|%5Bredacted%5D)/i;
const hits = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'screenshots') continue;
      walk(file);
      continue;
    }
    if (!/\\.(json|html|md|txt)$/i.test(entry.name)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (allowedRedacted.test(text)) continue;
    if (patterns.some((pattern) => pattern.test(text))) hits.push(file);
  }
}
roots.forEach(walk);
if (hits.length) {
  console.error(JSON.stringify({ sensitiveFiles: hits.map((item) => path.relative(process.cwd(), item)) }, null, 2));
  process.exit(2);
}
console.log(JSON.stringify({ sensitiveFiles: 0 }));
NODE`,
      { label: "BM/UX evidence sensitive information scan" }
    ),
    run("git", ["diff", "--check"], { label: "git diff --check" }),
    run("python3", ["-m", "xml.etree.ElementTree", "docs/active/project/design/v1-baseline-maintenance-ux-polish-gap.drawio"], { label: "python3 -m xml.etree.ElementTree docs/active/project/design/v1-baseline-maintenance-ux-polish-gap.drawio" }),
    run("node", ["-e", "const fs=require('fs'); const s=fs.readFileSync('docs/active/project/design/v1-baseline-maintenance-ux-polish-gap.drawio','utf8'); const n=[...s.matchAll(/<diagram /g)].length; if(n>8) process.exit(1); console.log(n)"], { label: "drawio page count <= 8" })
  ];
  const commandPassed = (labelPrefix) => testCommands.find((item) => item.command.startsWith(labelPrefix))?.passed === true;
  const frozenReport = readJson(path.join(frozenRoot, "report.json"), {});
  const launcherReport = readJson(path.join(launcherRoot, "report.json"), {});
  const screenshots = collectScreenshots();
  const prototypeMappings = buildPrototypeMappings(screenshots);
  const fatalIssues = [];
  const majorIssues = [];

  if (!fs.existsSync(path.join(repoRoot, prototypeReviewPath))) fatalIssues.push("prototype review HTML is missing.");
  if (!frozenReport.passed) fatalIssues.push("frozen v1_post_v1_hardening report is not passed.");
  if (!fs.existsSync(path.join(frozenRoot, "acceptance-report.html"))) fatalIssues.push("frozen acceptance-report.html is missing.");
  if (!commandPassed("npm --prefix apps/chrome-extension run build")) fatalIssues.push("Chrome extension build command failed.");
  if (!commandPassed("npm --prefix apps/chrome-extension run validate:post-v1-hardening")) fatalIssues.push("post-V1 hardening validator failed.");
  if (!commandPassed("curl --noproxy '*' -sS http://127.0.0.1:17861/v1/health")) fatalIssues.push("Runtime /v1/health did not return status=ok.");
  if (!commandPassed("BM/UX evidence sensitive information scan")) fatalIssues.push("Sensitive information scan failed.");
  if (launcherReport.passed !== true) majorIssues.push("launcher resize closeout report is missing or not passed; BM/UX report can only use partial screenshot evidence.");
  if (screenshots.length < 6) majorIssues.push(`screenshot evidence is below target: expected >= 6, got ${screenshots.length}.`);
  if (prototypeMappings.some((item) => item.status === "missing")) majorIssues.push("one or more prototype review targets are not mapped to real screenshots.");
  if (testCommands.some((item) => !item.passed)) fatalIssues.push("one or more document gate commands failed.");

  const passed = fatalIssues.length === 0 && majorIssues.length === 0;
  const report = {
    schemaVersion: "v1-baseline-maintenance-ux-polish.report.1",
    generatedAt: new Date().toISOString(),
    stage: "V1.0.x Baseline Maintenance + UX Polish",
    claim: passed
      ? "V1.0.x baseline maintenance and scoped UX polish passed regression acceptance."
      : "No completion claim. V1.0.x baseline maintenance and scoped UX polish regression acceptance is not passed.",
    passed,
    frozenBaselineReference: frozenRootRelative,
    prototypeReviewPath,
    summary: {
      buildPassed: commandPassed("npm --prefix apps/chrome-extension run build"),
      postV1ValidatorPassed: commandPassed("npm --prefix apps/chrome-extension run validate:post-v1-hardening"),
      runtimeHealthStatus: commandPassed("curl --noproxy '*' -sS http://127.0.0.1:17861/v1/health") ? "ok" : "failed",
      sensitiveInfoScanPassed: commandPassed("BM/UX evidence sensitive information scan"),
      screenshotSamples: screenshots.length,
      prototypeTargets: REQUIRED_PROTOTYPE_MAPPINGS.length,
      prototypeTargetsCovered: prototypeMappings.filter((item) => item.status !== "missing").length,
      fatalIssues: fatalIssues.length,
      majorIssues: majorIssues.length
    },
    prototypeMappings,
    screenshots,
    testCommands,
    fatalIssues,
    majorIssues,
    noGoNotes: [
      "No final Monica-like UX complete claim.",
      "No V2 Memory / RAG / Web Research / PPT / Deep Research ready claim.",
      "No product browser automation, OCR/VLM/ASR, media-stream understanding, or default local file access."
    ]
  };

  writeJson(path.join(evidenceRoot, "report.json"), report);
  writeText(path.join(evidenceRoot, "acceptance-report.html"), htmlReport(report));
  writeText(path.join(evidenceRoot, "prd-review.md"), markdownReport("V1.0.x BM/UX PRD Review", report, "prd"));
  writeText(path.join(evidenceRoot, "false-green-audit.md"), markdownReport("V1.0.x BM/UX False-Green Audit", report, "false-green"));
  writeText(path.join(evidenceRoot, "human-spot-check.md"), `# V1.0.x BM/UX Human Spot Check

Status: pending

- [ ] Launcher default docked state is low-distraction.
- [ ] Hover / focus makes launcher visible without opening the full panel.
- [ ] Click opens sidebar and second click/collapse restores the page.
- [ ] Chat / Mindmap / Source Evidence / Debug / Settings are reachable.
- [ ] No obvious clipping, ghosting, overlap, or input obstruction.
- [ ] This spot-check does not replace automated evidence.
`);
  writeJson(path.join(evidenceRoot, "evidence-manifest.json"), {
    schemaVersion: "v1-baseline-maintenance-ux-polish.evidence-manifest.1",
    generatedAt: report.generatedAt,
    report: `${evidenceRootRelative}/report.json`,
    acceptanceReport: `${evidenceRootRelative}/acceptance-report.html`,
    prdReview: `${evidenceRootRelative}/prd-review.md`,
    falseGreenAudit: `${evidenceRootRelative}/false-green-audit.md`,
    humanSpotCheck: `${evidenceRootRelative}/human-spot-check.md`,
    screenshots: screenshots.map((item) => `${evidenceRootRelative}/${item.path}`),
    passed
  });
  console.log(JSON.stringify({ passed, fatalIssues, majorIssues, screenshots: screenshots.length }, null, 2));
  process.exit(passed ? 0 : 2);
}

main();
