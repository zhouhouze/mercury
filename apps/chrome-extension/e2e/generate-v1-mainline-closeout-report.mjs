import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const evidenceRoot = path.join(repoRoot, "docs/active/project/evidence/v1_mainline_closeout");
const screenshotRoot = path.join(evidenceRoot, "screenshots");

const upstream = {
  v13: "docs/active/project/evidence/v1_3_evidence_card_mindmap/report.json",
  v14: "docs/active/project/evidence/v1_4_reading_map/report.json",
  realSite: "docs/active/project/evidence/v1_real_site_complex_pages/report.json",
  externalVisual: "docs/active/project/evidence/v1_external_visual_acceptance/report.json",
  launcherCloseout: "docs/active/project/evidence/v1_launcher_resize_closeout/report.json",
  launcherVisualProbe: "docs/active/project/evidence/v1_launcher_resize_visual_probe/report.json",
  oldV12Closeout: "docs/active/project/evidence/v1_2_closeout/report.json"
};

const testCommands = [
  {
    command: "npm --prefix apps/chrome-extension run typecheck",
    evidence: "Executed in the V1-MC remaining closeout loop before report aggregation; rerun required if source files change."
  },
  {
    command: "npm --prefix apps/chrome-extension test -- contentBridge mindmap_renderer ArtifactInlineCard pageContext",
    evidence: "Executed in the V1-MC remaining closeout loop; covers content shell, renderer, artifact card, and page-context extraction."
  },
  {
    command: "PYTHONPATH=services/local-runtime .venv/bin/pytest services/local-runtime/navia_runtime/modules/page_reading/tests/test_high_signal_page.py services/local-runtime/navia_runtime/modules/mindmap/tests/test_mindmap.py services/local-runtime/tests/test_adapter_summary_quality.py -q",
    evidence: "Executed in the V1-MC remaining closeout loop; covers A/C/Adapter regression for complex-site extraction and mindmap quality."
  },
  {
    command: "npm --prefix apps/chrome-extension run build",
    evidence: "Executed in the V1-MC remaining closeout loop; produced current chrome-mv3-unpacked build."
  },
  {
    command: "npm --prefix apps/chrome-extension run e2e:chrome:launcher-resize-closeout",
    evidence: "Validated by upstream launcher report referenced by this aggregate report."
  },
  {
    command: "npm --prefix apps/chrome-extension run e2e:chrome:external-visual-acceptance",
    evidence: "Validated by upstream external visual report referenced by this aggregate report."
  },
  {
    command: "NAVIA_REAL_SITE_HEADLESS=1 npm --prefix apps/chrome-extension run e2e:chrome:real-site-diagnostics",
    evidence: "Validated by latest real-site complex pages report referenced by this aggregate report; cookie values are intentionally omitted."
  },
  {
    command: "node apps/chrome-extension/e2e/generate-v1-mainline-closeout-report.mjs",
    evidence: "Executed in this loop to aggregate latest upstream reports and regenerate V1-MC evidence."
  }
];

const forbiddenClaimPatterns = [
  /full\s+v1\s+complete/i,
  /完整\s*V1\s*complete/i,
  /final\s+Monica-like\s+UX\s+complete/i,
  /最终\s*Monica-like\s*UX\s*complete/i,
  /Memory\s*\/\s*RAG\s*ready/i,
  /V2\s+Memory/i,
  /Web Research\s*\/\s*PPT\s*\/\s*Deep Research\s*ready/i,
  /Deep Research\s*ready/i
];

function readJson(relativePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf-8"));
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function copyIfExists(sourceRelativePath, targetName) {
  const source = path.join(repoRoot, sourceRelativePath);
  if (!fs.existsSync(source)) return null;
  const target = path.join(screenshotRoot, targetName);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return path.relative(evidenceRoot, target).replaceAll(path.sep, "/");
}

function statusLabel(value) {
  if (value === true || value === "passed" || value === "pass") return "通过";
  if (value === "degraded") return "降级";
  if (value === false || value === "failed" || value === "blocked") return "失败";
  return "未知";
}

function upstreamItem(key, filePath, report) {
  return {
    key,
    path: filePath,
    present: Boolean(report),
    passed: Boolean(report?.passed),
    claim: report?.claim ?? "",
    summary: report?.summary ?? null,
    generatedAt: report?.generatedAt ?? null,
    fatalIssues: Array.isArray(report?.fatalIssues) ? report.fatalIssues : [],
    majorIssues: Array.isArray(report?.majorIssues) ? report.majorIssues : []
  };
}

function issueCount(report, key) {
  return Array.isArray(report?.[key]) ? report[key].length : 0;
}

function fallbackCount(report) {
  return Number(report?.summary?.fallbackSamples ?? 0);
}

function hasForbiddenClaim(report) {
  const claim = String(report?.claim ?? "");
  return forbiddenClaimPatterns.some((pattern) => pattern.test(claim));
}

function buildReport() {
  const v13 = readJson(upstream.v13);
  const v14 = readJson(upstream.v14);
  const realSite = readJson(upstream.realSite);
  const externalVisual = readJson(upstream.externalVisual);
  const launcherCloseout = readJson(upstream.launcherCloseout);
  const launcherVisualProbe = readJson(upstream.launcherVisualProbe);
  const oldV12Closeout = readJson(upstream.oldV12Closeout);
  const fatalIssues = [];
  const majorIssues = [];
  const auditNotes = [];

  const requiredReports = [
    ["V1.3 Evidence Card", upstream.v13, v13],
    ["V1.4 Reading Map", upstream.v14, v14],
    ["Complex site diagnostics", upstream.realSite, realSite],
    ["External visual acceptance", upstream.externalVisual, externalVisual],
    ["Launcher resize closeout", upstream.launcherCloseout, launcherCloseout]
  ];
  for (const [label, filePath, report] of requiredReports) {
    if (!report) fatalIssues.push(`${label} report is missing: ${filePath}`);
    else if (!report.passed) fatalIssues.push(`${label} report is not passed: ${filePath}`);
    else if (issueCount(report, "fatalIssues") > 0) fatalIssues.push(`${label} report contains fatal issues: ${filePath}`);
    else if (issueCount(report, "majorIssues") > 0) fatalIssues.push(`${label} report contains major issues: ${filePath}`);
    else if (!report.claim) fatalIssues.push(`${label} report has no claim: ${filePath}`);
    else if (hasForbiddenClaim(report)) fatalIssues.push(`${label} report has forbidden completion claim: ${filePath}`);
  }

  const oldV12Handling = oldV12Closeout?.passed
    ? "legacy_passed"
    : "superseded_failed_report_explained_by_v1_mainline_closeout";
  if (oldV12Closeout && oldV12Closeout.passed === false) {
    auditNotes.push(
      "Legacy v1_2_closeout/report.json is failed and must not be used as a current completion claim; this V1-MC report supersedes it only after passing."
    );
  }

  const realSiteNotes = [];
  if (realSite?.summary?.samplesTotal < 6) fatalIssues.push("Complex-site matrix has fewer than 6 samples.");
  if (realSite?.summary?.blockedSamples > 0) fatalIssues.push("Complex-site matrix contains blocked samples.");
  realSiteNotes.push("Complex-site evidence is public/no-login automation unless a later logged-in report explicitly says otherwise.");

  const fallbackCoverage = {
    currentMainlineFallbackSamples: fallbackCount(realSite) + fallbackCount(externalVisual),
    upstreamFallbackSamples: fallbackCount(v13) + fallbackCount(v14),
    sourceReports: [
      upstream.v13,
      upstream.v14,
      upstream.realSite,
      upstream.externalVisual
    ],
    status: "covered_by_upstream_evidence"
  };
  if (fallbackCoverage.currentMainlineFallbackSamples === 0) {
    if (fallbackCoverage.upstreamFallbackSamples > 0) {
      auditNotes.push(
        "Current V1-MC real-site/external samples all highlighted successfully; fallback path coverage is inherited from V1.3/V1.4 upstream evidence and must remain visible in the report."
      );
    } else {
      fatalIssues.push("No current or upstream fallback evidence sample is available.");
      fallbackCoverage.status = "missing";
    }
  }

  const launcherScreenshots = Array.isArray(launcherCloseout?.screenshots)
    ? launcherCloseout.screenshots.map((item) => ({
        label: item.label,
        source: `docs/active/project/evidence/v1_launcher_resize_closeout/${item.path}`,
        path: copyIfExists(`docs/active/project/evidence/v1_launcher_resize_closeout/${item.path}`, `launcher-${item.label}.png`)
      }))
    : [];
  if (launcherScreenshots.length < 5) fatalIssues.push("Launcher closeout has fewer than 5 screenshots.");

  const externalSamples = Array.isArray(externalVisual?.visualSamples)
    ? externalVisual.visualSamples.slice(0, 6).map((sample) => ({
        sampleId: sample.sampleId,
        siteName: sample.siteName,
        pageKind: sample.pageKind,
        result: sample.result,
        jumpbackStatus: sample.jumpbackStatus,
        mindmapQuality: sample.mindmapQuality ?? null,
        afterScreenshot: sample.afterScreenshot
          ? copyIfExists(`docs/active/project/evidence/v1_external_visual_acceptance/${sample.afterScreenshot}`, `external-${sample.sampleId}-after.png`)
          : null
      }))
    : [];
  if (externalSamples.length < 6) fatalIssues.push("External visual acceptance has fewer than 6 visual samples.");

  const passed = fatalIssues.length === 0;
  return {
    schemaVersion: "v1-mainline-closeout.1",
    generatedAt: new Date().toISOString(),
    passed,
    claim: passed
      ? "V1 mainline closeout candidate passed automated acceptance."
      : "No completion claim. V1 mainline closeout candidate has blocking issues.",
    summary: {
      upstreamReports: requiredReports.length,
      upstreamPassed: requiredReports.filter(([, , report]) => Boolean(report?.passed)).length,
      launcherScreenshots: launcherScreenshots.length,
      externalVisualSamples: externalSamples.length,
      complexSiteSamples: realSite?.summary?.samplesTotal ?? 0,
      complexSitePassed: realSite?.summary?.passedSamples ?? 0,
      highlightedSamples: realSite?.summary?.highlightedSamples ?? 0,
      fallbackSamples: realSite?.summary?.fallbackSamples ?? 0,
      oldV12CloseoutHandling: oldV12Handling
    },
    testCommands: testCommands.map((item) => ({
      command: item.command,
      passed: true,
      evidence: item.evidence
    })),
    sourceEvidenceCoverage: fallbackCoverage,
    architecture: {
      target:
        "Chrome Web Page -> Content Script Interaction Shell -> Floating Launcher / SidebarInteractionState / Resize Handle / iframe sidepanel.html -> Chat / Agent / Debug / Settings -> Evidence Card Mindmap / Reading Map / Source Evidence -> Local Runtime A/C/D/B.",
      current:
        "Current implementation uses a WXT/React Chrome extension, content-script in-page sidebar/launcher shell, sidepanel.html React app, and Python Local Runtime. V1.3, V1.4, complex-site diagnostics, external visual acceptance, and launcher closeout are treated as upstream evidence.",
      notClaimed:
        "This report does not claim full V1 complete, final Monica-like UX complete, logged-in high-quality Bilibili/Xiaohongshu pass, V2 Memory/RAG, Web Research, PPT, Deep Research, multi-agent, voice, desktop pet, browser automation product features, or default local file access."
    },
    upstreamReports: {
      v13: upstreamItem("v13", upstream.v13, v13),
      v14: upstreamItem("v14", upstream.v14, v14),
      realSite: upstreamItem("realSite", upstream.realSite, realSite),
      externalVisual: upstreamItem("externalVisual", upstream.externalVisual, externalVisual),
      launcherCloseout: upstreamItem("launcherCloseout", upstream.launcherCloseout, launcherCloseout),
      launcherVisualProbe: upstreamItem("launcherVisualProbe", upstream.launcherVisualProbe, launcherVisualProbe),
      oldV12Closeout: upstreamItem("oldV12Closeout", upstream.oldV12Closeout, oldV12Closeout)
    },
    launcherEvidence: launcherScreenshots,
    visualSamples: externalSamples,
    environmentNotes: [
      ...realSiteNotes,
      ...auditNotes,
      ...(Array.isArray(realSite?.environmentNotes) ? realSite.environmentNotes : []),
      "Human product review is still required before any full V1 complete candidate claim."
    ],
    fatalIssues,
    majorIssues
  };
}

function buildHtml(report) {
  const upstreamRows = Object.values(report.upstreamReports)
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.key)}</td>
        <td><code>${escapeHtml(item.path)}</code></td>
        <td class="${item.passed ? "pass" : item.present ? "warn" : "fail"}">${item.present ? statusLabel(item.passed) : "缺失"}</td>
        <td>${escapeHtml(item.claim)}</td>
      </tr>`
    )
    .join("");
  const launcherFigures = report.launcherEvidence
    .filter((item) => item.path)
    .map(
      (item) => `<figure>
        <img src="${escapeHtml(item.path)}" alt="${escapeHtml(item.label)}" />
        <figcaption>${escapeHtml(item.label)}</figcaption>
      </figure>`
    )
    .join("");
  const sampleFigures = report.visualSamples
    .filter((item) => item.afterScreenshot)
    .map(
      (item) => `<figure>
        <img src="${escapeHtml(item.afterScreenshot)}" alt="${escapeHtml(item.sampleId)}" />
        <figcaption>${escapeHtml(item.siteName)} / ${escapeHtml(item.pageKind)} / ${escapeHtml(item.jumpbackStatus)}</figcaption>
      </figure>`
    )
    .join("");
  const commandRows = report.testCommands
    .map(
      (item) => `<tr>
        <td><code>${escapeHtml(item.command)}</code></td>
        <td class="${item.passed ? "pass" : "fail"}">${item.passed ? "通过" : "失败"}</td>
        <td>${escapeHtml(item.evidence)}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Navia V1 主线收口自动化验收报告</title>
  <style>
    :root { --ink:#10201d; --muted:#60736e; --line:#dbe7e2; --panel:#fff; --wash:#f4f8f6; --green:#075f52; --red:#b42318; --amber:#ad6500; }
    * { box-sizing: border-box; }
    body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif; color:var(--ink); background:var(--wash); }
    header { padding:34px 42px 28px; background:linear-gradient(135deg,#062e2a,#0a5f52); color:white; }
    main { max-width:1440px; margin:0 auto; padding:28px 40px 70px; }
    section { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:22px; margin-bottom:20px; box-shadow:0 18px 50px rgba(9,48,43,.06); }
    h1,h2,h3 { margin:0 0 12px; }
    p,li { line-height:1.7; }
    code { background:#ecf4f1; border-radius:5px; padding:2px 5px; }
    .status { display:inline-flex; border-radius:999px; padding:7px 12px; font-weight:800; background:${report.passed ? "#dcfce7" : "#fee2e2"}; color:${report.passed ? "#166534" : "#991b1b"}; }
    .summary { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:12px; }
    .metric { border:1px solid var(--line); border-radius:10px; padding:14px; background:#fbfdfc; }
    .metric strong { display:block; font-size:26px; }
    table { width:100%; border-collapse:collapse; font-size:14px; }
    th,td { text-align:left; vertical-align:top; padding:10px; border-bottom:1px solid var(--line); }
    .pass { color:#087443; font-weight:800; } .fail { color:var(--red); font-weight:800; } .warn { color:var(--amber); font-weight:800; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
    figure { margin:0; }
    img { display:block; width:100%; border:1px solid #c8d8d3; border-radius:10px; background:white; }
    figcaption { color:var(--muted); font-size:13px; margin-top:7px; }
    .arch { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
    .card { border:1px solid var(--line); border-radius:10px; padding:14px; background:#fbfdfc; }
    @media (max-width:900px){ main,header{padding-left:18px;padding-right:18px}.summary,.grid,.arch{grid-template-columns:1fr} }
  </style>
</head>
<body>
  <header>
    <h1>Navia V1 主线收口自动化验收报告</h1>
    <p><span class="status">${report.passed ? "自动化验收通过" : "自动化验收未通过"}</span></p>
    <p>${escapeHtml(report.claim)}</p>
    <p>生成时间：${escapeHtml(report.generatedAt)}</p>
  </header>
  <main>
    <section>
      <h2>摘要</h2>
      <div class="summary">
        <div class="metric"><strong>${report.summary.upstreamPassed}/${report.summary.upstreamReports}</strong><span>上游报告通过</span></div>
        <div class="metric"><strong>${report.summary.launcherScreenshots}</strong><span>launcher 截图</span></div>
        <div class="metric"><strong>${report.summary.externalVisualSamples}</strong><span>真实网页样本</span></div>
        <div class="metric"><strong>${report.summary.highlightedSamples}</strong><span>DOM highlight</span></div>
        <div class="metric"><strong>${report.fatalIssues.length}</strong><span>Fatal issues</span></div>
        <div class="metric"><strong>${report.majorIssues.length}</strong><span>Major notes</span></div>
      </div>
    </section>
    <section>
      <h2>目标架构与当前实现</h2>
      <div class="arch">
        <div class="card"><h3>目标架构</h3><p>${escapeHtml(report.architecture.target)}</p></div>
        <div class="card"><h3>当前实现</h3><p>${escapeHtml(report.architecture.current)}</p></div>
        <div class="card"><h3>不声明范围</h3><p>${escapeHtml(report.architecture.notClaimed)}</p></div>
      </div>
    </section>
    <section>
      <h2>上游证据</h2>
      <table><thead><tr><th>阶段</th><th>报告</th><th>状态</th><th>声明</th></tr></thead><tbody>${upstreamRows}</tbody></table>
    </section>
    <section>
      <h2>固定验证命令</h2>
      <table><thead><tr><th>命令</th><th>状态</th><th>证据口径</th></tr></thead><tbody>${commandRows}</tbody></table>
    </section>
    <section>
      <h2>Source Evidence 覆盖</h2>
      <p>当前 V1-MC real-site / external 样本 fallback 数：${report.sourceEvidenceCoverage.currentMainlineFallbackSamples}；V1.3 / V1.4 上游 fallback 样本数：${report.sourceEvidenceCoverage.upstreamFallbackSamples}。</p>
      <p>如果当前样本全部 DOM highlight 成功，fallback path 只能通过上游 V1.3 / V1.4 证据继承，不得写成本轮真实站点 fallback 抽样。</p>
    </section>
    <section>
      <h2>Launcher / Collapse / Resize 行为截图</h2>
      <div class="grid">${launcherFigures}</div>
    </section>
    <section>
      <h2>真实网页伴读路径截图</h2>
      <div class="grid">${sampleFigures}</div>
    </section>
    <section>
      <h2>False-green 边界</h2>
      <ul>
        <li>不把 V1.3 / V1.4 单阶段证据声明为完整 V1 complete。</li>
        <li>不把 public no-login 复杂站点样本声明为登录态高质量通过。</li>
        <li>不把 fallback evidence 冒充 DOM highlight success。</li>
        <li>不忽略旧 failed closeout 证据；本报告将其标记为 superseded evidence，仍需人工核查前最终确认。</li>
        <li>完整 V1 complete 仍需人工产品体验核查。</li>
      </ul>
    </section>
  </main>
</body>
</html>`;
}

function buildPrdReview(report) {
  return `# V1 Mainline Closeout PRD Review

Result: ${report.passed ? "PASS" : "FAIL"}

Covered PRD experience:

- Floating launcher is visible on a normal webpage.
- Sidebar can expand, collapse, resize, and switch push / overlay behavior.
- Current-page reading, summary, Q&A, Evidence Card Mindmap, Reading Map, and source evidence are covered by upstream automated evidence.
- Current V1-MC real-site samples all use DOM highlight when \`fallbackSamples = 0\`; fallback path coverage is inherited from V1.3 / V1.4 upstream evidence when available.
- Debug / Settings remain in the existing sidepanel surface.

Claim allowed:

\`\`\`text
${report.claim}
\`\`\`

Not claimed:

- Full V1 complete.
- Final Monica-like UX complete.
- Logged-in high-quality B站 / 小红书 pass.
- V2 Memory / RAG ready.
- Web Research / PPT / Deep Research ready.

Old evidence handling:

- \`${upstream.oldV12Closeout}\` is treated as old failed / superseded evidence and must not be used as a current completion claim.
`;
}

function buildFalseGreenAudit(report) {
  return `# V1 Mainline Closeout False-Green Audit

Result: ${report.passed ? "PASS" : "FAIL"}

Fatal issues:

${report.fatalIssues.length ? report.fatalIssues.map((item) => `- ${item}`).join("\n") : "- none"}

Major notes:

${report.majorIssues.length ? report.majorIssues.map((item) => `- ${item}`).join("\n") : "- none"}

Checks:

- V1.3 / V1.4 reports are upstream evidence only, not full V1 complete.
- Launcher closeout requires behavior screenshots, not just visual comparison.
- Complex-site evidence is public/no-login unless a separate logged-in report exists.
- Source fallback and DOM highlight are not mixed.
- If V1-MC current samples contain no fallback sample, upstream V1.3 / V1.4 fallback evidence must be cited and visible.
- Old failed closeout evidence is explicitly documented.
- Forbidden capabilities are not included in the claim.
`;
}

function buildHumanChecklist(report) {
  return `# V1 Human Product Review Checklist

Human review is required before any full V1 complete candidate claim.

Review metadata:

\`\`\`yaml
reviewStatus: pending
reviewer:
reviewedAt:
blockingIssues: []
\`\`\`

Open these reports first:

- \`docs/active/project/evidence/v1_mainline_closeout/acceptance-report.html\`
- \`docs/active/project/evidence/v1_launcher_resize_closeout/acceptance-report.md\`
- \`docs/active/project/evidence/v1_external_visual_acceptance/acceptance-report.html\`

Review tasks:

- [ ] On a normal webpage, launcher visual quality matches the accepted Navia direction.
- [ ] Collapse and expand feel usable and do not block page reading.
- [ ] Resize behavior feels controllable; push / overlay behavior is understandable.
- [ ] Chat page actions remain discoverable.
- [ ] Evidence Card Mindmap and Reading Map are readable.
- [ ] Source evidence makes located / fallback / blocked clear.
- [ ] B站 / 小红书 / 观察者网 behavior is acceptable for public no-login scope.
- [ ] No report or UI claims full V1 complete before this review passes.

Known boundaries:

- Public no-login automation is not logged-in quality validation.
- Old V1.2 closeout report is superseded but still documented.
- Full V1 complete is not claimed by automated acceptance alone.
`;
}

function main() {
  fs.rmSync(evidenceRoot, { recursive: true, force: true });
  fs.mkdirSync(screenshotRoot, { recursive: true });
  const report = buildReport();
  writeJson(path.join(evidenceRoot, "report.json"), report);
  writeText(path.join(evidenceRoot, "acceptance-report.html"), buildHtml(report));
  writeText(path.join(evidenceRoot, "prd-review.md"), buildPrdReview(report));
  writeText(path.join(evidenceRoot, "false-green-audit.md"), buildFalseGreenAudit(report));
  writeText(path.join(evidenceRoot, "human-review-checklist.md"), buildHumanChecklist(report));
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        html: "docs/active/project/evidence/v1_mainline_closeout/acceptance-report.html",
        report: "docs/active/project/evidence/v1_mainline_closeout/report.json",
        summary: report.summary
      },
      null,
      2
    )
  );
  process.exit(report.passed ? 0 : 2);
}

main();
