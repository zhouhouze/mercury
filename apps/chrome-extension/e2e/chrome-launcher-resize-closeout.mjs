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
const evidenceRoot = path.join(repoRoot, "docs/active/project/evidence/v1_launcher_resize_closeout");
const screenshotRoot = path.join(evidenceRoot, "screenshots");
const browserExecutable = process.env.NAVIA_BROWSER_EXECUTABLE || detectWindowsChromeExecutable();

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

function detectWindowsChromeExecutable() {
  const candidates = [
    path.join(repoRoot, ".tmp/chrome-for-testing/chrome-win64/chrome.exe"),
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Users/Administrator/AppData/Local/Google/Chrome/Application/chrome.exe"
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function isWindowsExecutable(filePath) {
  return /\.exe$/i.test(filePath);
}

async function toWindowsChromeArgPath(filePath) {
  const result = await run("wslpath", ["-w", filePath]);
  if (result.code !== 0) throw new Error(`wslpath failed for ${filePath}: ${result.stderr || result.stdout}`);
  return result.stdout.trim().replaceAll("\\", "/");
}

async function waitForCdp(port, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return true;
    } catch {
      // keep polling
    }
    await wait(250);
  }
  return false;
}

async function startFixtureServer() {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>Navia V1-MC Launcher Fixture</title>
  <style>
    body { margin: 0; font: 18px/1.7 system-ui, -apple-system, BlinkMacSystemFont, "Microsoft YaHei", sans-serif; color: #12302b; background: #f5faf8; }
    main { max-width: 780px; margin: 44px auto; padding: 28px; background: white; border: 1px solid #d7e7e2; border-radius: 18px; }
    h1 { margin-top: 0; color: #075f52; }
    .hero { min-height: 1200px; }
  </style>
</head>
<body>
  <main class="hero">
    <h1>Navia 当前网页伴读验收页</h1>
    <p>这个页面用于验证真实 Chrome content script 是否注入 floating launcher 和右侧 Navia sidebar。</p>
    <p>验收必须覆盖默认贴边、hover/focus 弹出、点击展开、resize、点击收起、launcher 拖拽和 overlay 布局。</p>
    <h2>可读正文</h2>
    <p>Navia 应能保持页面主体可用，并在折叠后恢复页面宽度。</p>
  </main>
</body>
</html>`;
  const server = http.createServer((_, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}/fixture.html` };
}

async function launchBrowser(userDataDir) {
  if (browserExecutable && isWindowsExecutable(browserExecutable)) {
    const port = 9700 + Math.floor(Math.random() * 500);
    const args = [
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-popup-blocking",
      "--disable-sync",
      "--window-position=40,40",
      "--window-size=1280,900",
      "--disable-features=DisableLoadExtensionCommandLineSwitch",
      "--enable-unsafe-extension-debugging",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${await toWindowsChromeArgPath(userDataDir)}`,
      `--disable-extensions-except=${await toWindowsChromeArgPath(extensionRoot)}`,
      `--load-extension=${await toWindowsChromeArgPath(extensionRoot)}`,
      "about:blank"
    ];
    const child = spawn(browserExecutable, args, { cwd: repoRoot, env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => process.stdout.write(`[chrome] ${chunk}`));
    child.stderr.on("data", (chunk) => process.stderr.write(`[chrome] ${chunk}`));
    if (!(await waitForCdp(port))) {
      child.kill("SIGTERM");
      throw new Error(`Chrome did not expose CDP on port ${port}.`);
    }
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    const context = browser.contexts()[0];
    return {
      context,
      close: async () => {
        await browser.close().catch(() => undefined);
        child.kill("SIGTERM");
      }
    };
  }

  const context = await chromium.launchPersistentContext(userDataDir, {
    ...(browserExecutable ? { executablePath: browserExecutable } : {}),
    headless: false,
    viewport: { width: 1280, height: 900 },
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-popup-blocking",
      `--disable-extensions-except=${extensionRoot}`,
      `--load-extension=${extensionRoot}`,
      "--disable-features=DisableLoadExtensionCommandLineSwitch",
      "--enable-unsafe-extension-debugging"
    ]
  });
  return { context, close: async () => context.close() };
}

async function isNaviaServiceWorker(worker) {
  if (!worker.url().startsWith("chrome-extension://")) return false;
  try {
    const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
    return manifest?.name === "Navia";
  } catch {
    return false;
  }
}

async function waitForNaviaServiceWorker(context, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    for (const worker of context.serviceWorkers()) {
      if (await isNaviaServiceWorker(worker)) return worker;
    }
    try {
      const worker = await context.waitForEvent("serviceworker", { timeout: 1000 });
      if (await isNaviaServiceWorker(worker)) return worker;
    } catch {
      // keep polling
    }
  }
  return null;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

async function capture(page, name) {
  const filePath = path.join(screenshotRoot, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  return path.relative(evidenceRoot, filePath).replaceAll(path.sep, "/");
}

async function snapshot(page, label) {
  return page.evaluate((snapshotLabel) => {
    const host = document.querySelector("[data-testid='navia-inpage-sidebar']");
    const frame = document.querySelector("[data-testid='navia-inpage-sidebar-frame']");
    const launcher = document.querySelector("[data-testid='navia-floating-launcher']");
    const handle = document.querySelector("[data-testid='navia-inpage-sidebar-resize-handle']");
    const hostRect = host?.getBoundingClientRect();
    const launcherRect = launcher?.getBoundingClientRect();
    const handleRect = handle?.getBoundingClientRect();
    const launcherStyle = launcher ? window.getComputedStyle(launcher) : null;
    const state = (() => {
      try {
        return JSON.parse(window.localStorage.getItem("navia.inpageSidebarState") || "{}");
      } catch {
        return {};
      }
    })();
    return {
      label: snapshotLabel,
      hostVisible: Boolean(hostRect && hostRect.width > 0 && hostRect.height > 0),
      launcherVisible: Boolean(launcherRect && launcherRect.width > 0 && launcherRect.height > 0),
      frameSrc: frame?.getAttribute("src") || "",
      mode: host?.getAttribute("data-navia-mode") || "",
      layout: host?.getAttribute("data-navia-layout") || "",
      hostWidth: hostRect ? Math.round(hostRect.width) : 0,
      hostRight: hostRect ? Math.round(window.innerWidth - hostRect.right) : null,
      launcherLeft: launcherRect ? Math.round(launcherRect.left) : null,
      launcherRight: launcherRect ? Math.round(window.innerWidth - launcherRect.right) : null,
      launcherTop: launcherRect ? Math.round(launcherRect.top) : null,
      launcherTransform: launcherStyle?.transform || "",
      launcherMode: launcher?.getAttribute("data-navia-mode") || "",
      launcherSide: launcher?.getAttribute("data-navia-side") || "",
      bodyMarginRight: window.getComputedStyle(document.body).marginRight,
      handleVisible: Boolean(handleRect && handleRect.height > 0),
      state
    };
  }, label);
}

async function gotoAndWaitForSidebar(page, fixtureUrl) {
  const candidates = [
    { url: fixtureUrl, label: "local-fixture" },
    { url: "https://example.com/", label: "public-example-page" }
  ];
  const attempts = [];
  for (const candidate of candidates) {
    await page.goto(candidate.url, { waitUntil: "domcontentloaded" });
    await wait(2500);
    const hasSidebar = await page.locator("[data-testid='navia-inpage-sidebar']").count().catch(() => 0);
    const hasLauncher = await page.locator("[data-testid='navia-floating-launcher']").count().catch(() => 0);
    attempts.push({ ...candidate, hasSidebar, hasLauncher });
    if (hasSidebar > 0 && hasLauncher > 0) {
      await page.waitForSelector("[data-testid='navia-inpage-sidebar']", { timeout: 5000 });
      await page.waitForSelector("[data-testid='navia-floating-launcher']", { timeout: 5000 });
      return { ...candidate, attempts };
    }
  }
  throw new Error(`Content script did not inject sidebar/launcher. Attempts=${JSON.stringify(attempts)}`);
}

function hasPushedMargin(value) {
  const amount = Number.parseFloat(String(value));
  return Number.isFinite(amount) && amount >= 300;
}

async function main() {
  fs.rmSync(evidenceRoot, { recursive: true, force: true });
  fs.mkdirSync(screenshotRoot, { recursive: true });

  const { server, url } = await startFixtureServer();
  const profileRoot = browserExecutable && isWindowsExecutable(browserExecutable) ? path.join(repoRoot, ".tmp") : os.tmpdir();
  fs.mkdirSync(profileRoot, { recursive: true });
  const userDataDir = fs.mkdtempSync(path.join(profileRoot, "navia-v1-launcher-profile-"));
  const browser = await launchBrowser(userDataDir);
  const page = await browser.context.newPage();
  const screenshots = [];
  const states = [];
  const fatalIssues = [];
  const majorIssues = [];

  try {
    const pageTarget = await gotoAndWaitForSidebar(page, url);
    const serviceWorker = await waitForNaviaServiceWorker(browser.context, 3000);
    await wait(1800);

    states.push(await snapshot(page, "docked-default"));
    screenshots.push({ label: "docked-default", path: await capture(page, "01-docked-default") });

    await page.hover("[data-testid='navia-floating-launcher']");
    await wait(500);
    states.push(await snapshot(page, "launcher-hover-peek"));
    screenshots.push({ label: "launcher-hover-peek", path: await capture(page, "02-launcher-hover-peek") });

    await page.click("[data-testid='navia-floating-launcher']");
    await wait(500);
    states.push(await snapshot(page, "expanded-after-click"));
    screenshots.push({ label: "expanded-after-click", path: await capture(page, "03-expanded-after-click") });

    const handle = await page.locator("[data-testid='navia-inpage-sidebar-resize-handle']").boundingBox();
    if (handle) {
      await page.mouse.move(handle.x + handle.width / 2, handle.y + 200);
      await page.mouse.down();
      await page.mouse.move(handle.x - 210, handle.y + 200, { steps: 12 });
      await page.mouse.up();
      await wait(700);
    }
    states.push(await snapshot(page, "resized-overlay"));
    screenshots.push({ label: "resized-overlay", path: await capture(page, "04-resized-overlay") });

    await page.click("[data-testid='navia-floating-launcher']");
    await wait(500);
    states.push(await snapshot(page, "collapsed-after-use"));
    screenshots.push({ label: "collapsed-after-use", path: await capture(page, "05-collapsed-after-use") });

    const launcherLocator = page.locator("[data-testid='navia-floating-launcher']");
    await launcherLocator.hover();
    await wait(450);
    const launcher = await launcherLocator.boundingBox();
    if (launcher) {
      await page.mouse.move(launcher.x + launcher.width / 2, launcher.y + launcher.height / 2);
      await page.mouse.down();
      await page.mouse.move(70, 430, { steps: 16 });
      await page.mouse.up();
      await wait(700);
    }
    states.push(await snapshot(page, "launcher-drag-left"));
    screenshots.push({ label: "launcher-drag-left", path: await capture(page, "06-launcher-drag-left") });

    const [dockedDefault, hoverPeek, expandedAfterClick, resized, collapsedAfterUse, dragged] = states;
    if (!dockedDefault.hostVisible || !dockedDefault.launcherVisible) {
      fatalIssues.push("Default state does not create both sidebar host and floating launcher.");
    }
    if (dockedDefault.mode !== "collapsed") fatalIssues.push("Default sidebar mode is not collapsed/docked.");
    if (hasPushedMargin(dockedDefault.bodyMarginRight)) {
      fatalIssues.push("Default docked state unexpectedly reserves page body margin.");
    }
    if (dockedDefault.launcherMode !== "collapsed") fatalIssues.push("Default launcher mode is not collapsed.");
    if (!hoverPeek.launcherVisible || hoverPeek.launcherTransform === dockedDefault.launcherTransform) {
      majorIssues.push("Launcher hover/focus peek did not produce a visible transform change.");
    }
    if (expandedAfterClick.mode !== "expanded") fatalIssues.push("Launcher click did not expand the sidebar.");
    if (!hasPushedMargin(expandedAfterClick.bodyMarginRight) && expandedAfterClick.layout === "push") {
      fatalIssues.push("Expanded push state did not reserve page body margin.");
    }
    if (resized.hostWidth <= expandedAfterClick.hostWidth + 120) {
      majorIssues.push("Resize interaction did not materially increase sidebar width.");
    }
    if (resized.layout !== "overlay") {
      majorIssues.push("Wide resized sidebar did not switch to overlay layout.");
    }
    if (collapsedAfterUse.mode !== "collapsed") fatalIssues.push("Second launcher click did not collapse the sidebar.");
    if (hasPushedMargin(collapsedAfterUse.bodyMarginRight)) fatalIssues.push("Collapsed state did not restore page margin.");
    if (!collapsedAfterUse.launcherVisible) fatalIssues.push("Collapsed state did not keep launcher visible.");
    if (dragged.launcherLeft === null || dragged.launcherLeft > 140) {
      majorIssues.push("Launcher drag did not move launcher to the left edge.");
    }
    if (!String(dragged.state?.launcherSide || "").includes("left")) {
      majorIssues.push("Launcher drag did not persist left-edge launcherSide state.");
    }

    const passed = fatalIssues.length === 0 && majorIssues.length === 0;
    const report = {
      schemaVersion: "v1-launcher-resize-closeout.1",
      generatedAt: new Date().toISOString(),
      passed,
      claim: passed
        ? "V1 docked launcher / expand / collapse / resize interaction baseline passed real Chrome behavior acceptance."
        : "No completion claim. V1 docked launcher / expand / collapse / resize behavior acceptance failed.",
      browserMode: browserExecutable && isWindowsExecutable(browserExecutable) ? "windows-chrome-temp-profile" : "playwright-chromium-temp-profile",
      serviceWorkerExposed: Boolean(serviceWorker),
      fixtureUrl: url,
      pageUrl: page.url(),
      pageTarget,
      summary: {
        screenshotSamples: screenshots.length,
        statesCaptured: states.length,
        defaultDocked: dockedDefault.mode === "collapsed" && dockedDefault.launcherVisible && !hasPushedMargin(dockedDefault.bodyMarginRight),
        launcherPeeksOnHover: hoverPeek.launcherTransform !== dockedDefault.launcherTransform,
        expandedAfterClick: expandedAfterClick.mode === "expanded",
        collapsedRestoresMargin: collapsedAfterUse.mode === "collapsed" && !hasPushedMargin(collapsedAfterUse.bodyMarginRight),
        resizedOverlay: resized.layout === "overlay",
        launcherDraggedLeft: dragged.launcherLeft !== null && dragged.launcherLeft <= 140
      },
      states,
      screenshots,
      fatalIssues,
      majorIssues,
      noGoNotes: [
        "This report does not claim full V1 complete.",
        "This report does not validate logged-in Bilibili or Xiaohongshu quality.",
        "This report does not introduce RAG, Memory, Web Research, PPT, Deep Research, multi-agent, voice, desktop pet, browser automation product features, or default local file access."
      ]
    };
    writeJson(path.join(evidenceRoot, "report.json"), report);
    writeText(
      path.join(evidenceRoot, "acceptance-report.md"),
      `# V1 Launcher / Collapse / Resize Closeout

Result: ${passed ? "PASS" : "FAIL"}

Claim:

\`\`\`text
${report.claim}
\`\`\`

Evidence:

${screenshots.map((item) => `- ${item.label}: ${item.path}`).join("\n")}

Fatal issues:

${fatalIssues.length ? fatalIssues.map((item) => `- ${item}`).join("\n") : "- none"}

Major issues:

${majorIssues.length ? majorIssues.map((item) => `- ${item}`).join("\n") : "- none"}
`
    );
    process.exitCode = passed ? 0 : 2;
  } finally {
    await browser.close().catch(() => undefined);
    server.close();
  }
}

main().catch((error) => {
  fs.mkdirSync(evidenceRoot, { recursive: true });
  writeJson(path.join(evidenceRoot, "report.json"), {
    schemaVersion: "v1-launcher-resize-closeout.1",
    generatedAt: new Date().toISOString(),
    passed: false,
    claim: "No completion claim. Launcher / resize closeout crashed.",
    fatalIssues: [error instanceof Error ? error.message : String(error)],
    majorIssues: []
  });
  console.error(error);
  process.exit(2);
});
