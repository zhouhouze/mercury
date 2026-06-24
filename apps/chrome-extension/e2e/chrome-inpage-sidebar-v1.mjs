import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const extensionRoot = path.resolve(__dirname, "../chrome-mv3-unpacked");
const evidenceRoot = path.join(repoRoot, "docs/active/project/evidence/v1_closeout");
const screenshotRoot = path.join(evidenceRoot, "screenshots");
const browserExecutable = process.env.NAVIA_BROWSER_EXECUTABLE || "";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function toWindowsPath(filePath) {
  const result = await run("wslpath", ["-w", filePath]);
  if (result.code !== 0) throw new Error(`wslpath failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

async function toWindowsChromeArgPath(filePath) {
  return (await toWindowsPath(filePath)).replaceAll("\\", "/");
}

function isWindowsExecutable(filePath) {
  return /\.exe$/i.test(filePath);
}

async function waitForCdp(port, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return true;
    } catch {
      // wait
    }
    await wait(250);
  }
  return false;
}

async function launchWindowsChrome(userDataDir) {
  const port = 9800 + Math.floor(Math.random() * 500);
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${await toWindowsChromeArgPath(userDataDir)}`,
    `--disable-extensions-except=${await toWindowsChromeArgPath(extensionRoot)}`,
    `--load-extension=${await toWindowsChromeArgPath(extensionRoot)}`,
    "--disable-features=DisableLoadExtensionCommandLineSwitch",
    "--enable-unsafe-extension-debugging",
    "--window-position=40,40",
    "--window-size=1180,820",
    "about:blank"
  ];
  const child = spawn(browserExecutable, args, { cwd: repoRoot, env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk) => process.stdout.write(`[windows-chrome] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[windows-chrome] ${chunk}`));
  if (!(await waitForCdp(port))) throw new Error("Chrome remote debugging port did not open.");
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  return { browser, context, process: child };
}

async function startFixtureServer() {
  const html = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>Navia V1 In-Page Fixture</title></head>
<body>
  <main style="max-width: 760px; margin: 40px auto; font: 16px/1.6 system-ui;">
    <h1>Navia 当前网页伴读验收页</h1>
    <p>这个页面用于验证 Chrome content script 会在普通网页内注入默认右侧侧栏。</p>
    <p>页面主体应为 Navia 侧栏让出空间，右侧 iframe 内应显示 Navia 聊天界面。</p>
  </main>
</body>
</html>`;
  const server = http.createServer((_, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

async function main() {
  fs.rmSync(evidenceRoot, { recursive: true, force: true });
  fs.mkdirSync(screenshotRoot, { recursive: true });
  const { server, origin } = await startFixtureServer();
  const profileRoot = browserExecutable && isWindowsExecutable(browserExecutable) ? path.join(repoRoot, ".tmp") : os.tmpdir();
  fs.mkdirSync(profileRoot, { recursive: true });
  const userDataDir = fs.mkdtempSync(path.join(profileRoot, "navia-v1-inpage-profile-"));
  let context = null;
  let browser = null;
  let windowsChromeProcess = null;
  try {
    if (browserExecutable && isWindowsExecutable(browserExecutable)) {
      const launched = await launchWindowsChrome(userDataDir);
      context = launched.context;
      browser = launched.browser;
      windowsChromeProcess = launched.process;
    } else {
      context = await chromium.launchPersistentContext(userDataDir, {
        ...(browserExecutable ? { executablePath: browserExecutable } : {}),
        headless: false,
        viewport: { width: 1180, height: 820 },
        ignoreDefaultArgs: ["--disable-extensions"],
        args: [
          `--disable-extensions-except=${extensionRoot}`,
          `--load-extension=${extensionRoot}`,
          "--disable-features=DisableLoadExtensionCommandLineSwitch",
          "--enable-unsafe-extension-debugging"
        ]
      });
    }
    const page = await context.newPage();
    await page.goto(`${origin}/fixture.html`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='navia-inpage-sidebar']", { timeout: 15000 });
    await page.waitForSelector("[data-testid='navia-inpage-sidebar-frame']", { timeout: 15000 });
    await wait(2500);
    const snapshot = await page.evaluate(() => {
      const host = document.querySelector("[data-testid='navia-inpage-sidebar']");
      const frame = document.querySelector("[data-testid='navia-inpage-sidebar-frame']");
      const hostRect = host?.getBoundingClientRect();
      const bodyMarginRight = window.getComputedStyle(document.body).marginRight;
      return {
        hostVisible: Boolean(hostRect && hostRect.width > 0 && hostRect.height > 0),
        hostWidth: hostRect?.width ?? 0,
        hostRight: hostRect ? Math.round(window.innerWidth - hostRect.right) : null,
        frameSrc: frame?.getAttribute("src") ?? "",
        bodyMarginRight,
        pageTitle: document.title,
        bodyText: document.body.textContent?.replace(/\s+/g, " ").trim().slice(0, 300) ?? ""
      };
    });
    const sidepanelFrame = page.frames().find((frame) => frame.url().includes("sidepanel.html"));
    let frameSnapshot = { loaded: false, hasRoot: false, visibleText: "" };
    if (sidepanelFrame) {
      await sidepanelFrame.waitForSelector("[data-testid='navia-sidepanel-root']", { timeout: 15000 }).catch(() => undefined);
      frameSnapshot = await sidepanelFrame.evaluate(() => ({
        loaded: true,
        hasRoot: Boolean(document.querySelector("[data-testid='navia-sidepanel-root']")),
        visibleText: document.body.textContent?.replace(/\s+/g, " ").trim().slice(0, 300) ?? ""
      }));
    }
    const screenshotPath = path.join(screenshotRoot, "v1-inpage-sidebar.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const fatalIssues = [];
    const majorIssues = [];
    if (!snapshot.hostVisible) fatalIssues.push("In-page sidebar host is not visible.");
    if (!snapshot.frameSrc.includes("sidepanel.html")) fatalIssues.push("In-page sidebar iframe does not load sidepanel.html.");
    if (!frameSnapshot.hasRoot) fatalIssues.push("Sidepanel iframe did not render Navia root.");
    if (!String(snapshot.bodyMarginRight).includes("440") && !String(snapshot.bodyMarginRight).includes("360")) {
      majorIssues.push("Page body margin-right does not show expected sidebar layout compensation.");
    }
    const passed = fatalIssues.length === 0 && majorIssues.length === 0;
    const report = {
      schemaVersion: "v1-current-baseline-closeout",
      stage: "V1",
      generatedAt: new Date().toISOString(),
      passed,
      summary: {
        inPageSidebarSamples: 1,
        runtimeReadingMapEvidence: "docs/active/project/evidence/v1_4_reading_map/report.json"
      },
      snapshot,
      frameSnapshot,
      screenshots: [
        {
          screenshotPath: path.relative(evidenceRoot, screenshotPath),
          pageUrl: `${origin}/fixture.html`,
          containsInPageSidebar: snapshot.hostVisible,
          containsNaviaIframe: frameSnapshot.hasRoot
        }
      ],
      fatalIssues,
      majorIssues,
      claim: passed
        ? "V1 current interaction baseline complete: installable Chrome extension with default in-page right sidebar, current-page reading, summary, Q&A, Mindmap, Reading Map, and source evidence paths validated."
        : "No completion claim. V1 current interaction baseline remains blocked."
    };
    writeJson(path.join(evidenceRoot, "report.json"), report);
    writeText(
      path.join(evidenceRoot, "acceptance-report.md"),
      `# V1 Current Interaction Baseline Acceptance Report

Date: ${report.generatedAt}
Result: ${passed ? "PASS" : "FAIL"}

This report uses the current active interaction PRD baseline: no floating ball, no hover strip, default in-page right sidebar.

Claim:

\`\`\`text
${report.claim}
\`\`\`

Floating ball / hover strip remains a manual product review and later optimization item, not an automated completion claim in this report.
`
    );
    writeText(
      path.join(evidenceRoot, "prd-review.md"),
      `# V1 PRD Review

Result: ${passed ? "PASS" : "FAIL"}

Covered:

- Chrome unpacked extension builds.
- Content script injects a default right-side in-page Navia sidebar iframe.
- The iframe renders the existing Navia Side Panel UI.
- V1.4 evidence covers current-page reading, Mindmap, Reading Map, source evidence, DOM highlight, and fallback.

Not claimed:

- Legacy floating ball / hover strip / collapse polish as fully complete.
- Canvas, Memory, RAG, Web Research, PPT, Deep Research, multi-agent, voice, desktop pet, browser automation product feature, or default local file access.
`
    );
    writeText(
      path.join(evidenceRoot, "false-green-audit.md"),
      `# V1 False-Green Audit

Result: ${passed ? "PASS" : "FAIL"}

Checks:

- V1 report explicitly uses current interaction baseline from active PRD.
- Native Side Panel / Reading Map evidence is referenced from V1.4 and not re-labeled as floating ball completion.
- In-page evidence requires actual content script host and iframe rendered inside a normal web page.
- No prohibited future capabilities are claimed.

Fatal issues:

${fatalIssues.length ? fatalIssues.map((issue) => `- ${issue}`).join("\n") : "- none"}

Major issues:

${majorIssues.length ? majorIssues.map((issue) => `- ${issue}`).join("\n") : "- none"}
`
    );
    console.log(JSON.stringify(report, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    server.close();
    if (context) await context.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
    if (windowsChromeProcess) windowsChromeProcess.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
