import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const extensionRoot = fs.realpathSync(
  fs.existsSync(path.join(__dirname, "../chrome-mv3-unpacked/manifest.json"))
    ? path.join(__dirname, "../chrome-mv3-unpacked")
    : path.join(__dirname, "../.output/chrome-mv3")
);
const runtimeUrl = "http://127.0.0.1:17861";
const fixturePath = path.join(repoRoot, "docs/navia_v1_project_docs/fixtures/real_pages/article.html");
const screenshotRoot = path.join(__dirname, "screenshots/current");
const headless = process.env.NAVIA_E2E_HEADLESS === "true";

function logStep(message) {
  console.log(`[navia-visual-e2e] ${message}`);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const response = await fetch(url);
  return response.json();
}

async function isRuntimeOnline() {
  try {
    return Boolean((await fetchJson(`${runtimeUrl}/v1/health`)).ok);
  } catch {
    return false;
  }
}

async function waitForRuntime(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isRuntimeOnline()) return true;
    await wait(250);
  }
  return false;
}

function startRuntime() {
  const dbPath = path.join(os.tmpdir(), `navia-visual-e2e-${Date.now()}.sqlite3`);
  const child = spawn(
    "uvicorn",
    ["navia_runtime.app:app", "--host", "127.0.0.1", "--port", "17861", "--app-dir", "services/local-runtime"],
    {
      cwd: repoRoot,
      env: { ...process.env, NAVIA_DB_PATH: dbPath },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  child.stdout.on("data", (chunk) => process.stdout.write(`[runtime] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[runtime] ${chunk}`));
  return child;
}

function startFixtureServer() {
  const html = fs.readFileSync(fixturePath);
  const server = http.createServer((request, response) => {
    if (request.url === "/" || request.url === "/article.html") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(html);
      return;
    }
    response.writeHead(404);
    response.end("Not found");
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}/article.html` });
    });
  });
}

async function waitForInjectedPanel(page) {
  await page.locator("#navia-injected-host").waitFor({ state: "attached", timeout: 15000 });
  await page.locator("[data-testid='navia-ball']").waitFor({ timeout: 15000 });
}

async function assertFrameState(page, expected) {
  try {
    await page.waitForFunction(
      ({ open, mode, widthState, runtime }) => {
        const frame = document
          .querySelector("#navia-injected-host")
          ?.shadowRoot?.querySelector("[data-testid='navia-frame']");
        return (
          (!open || frame?.getAttribute("data-open") === open) &&
          (!mode || frame?.getAttribute("data-mode") === mode) &&
          (!widthState || frame?.getAttribute("data-width-state") === widthState) &&
          (!runtime || frame?.getAttribute("data-runtime") === runtime)
        );
      },
      expected,
      { timeout: 10000 }
    );
  } catch (error) {
    const actual = await getFrameState(page);
    throw new Error(`Frame state mismatch. expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)} error=${error.message}`);
  }
}

async function getFrameState(page) {
  return page.evaluate(() => {
    const frame = document
      .querySelector("#navia-injected-host")
      ?.shadowRoot?.querySelector("[data-testid='navia-frame']");
    return {
      open: frame?.getAttribute("data-open"),
      mode: frame?.getAttribute("data-mode"),
      widthState: frame?.getAttribute("data-width-state"),
      runtime: frame?.getAttribute("data-runtime"),
      width: frame instanceof HTMLElement ? frame.style.getPropertyValue("--navia-width") : null,
      viewport: window.innerWidth
    };
  });
}

async function screenshot(page, state, viewport, evidence) {
  const filename = `v1.1-${viewport}-${state}.png`;
  const filePath = path.join(screenshotRoot, filename);
  await page.screenshot({ path: filePath, fullPage: false });
  evidence.push({ state, viewport, file: filePath });
}

async function resizePanel(page, targetMouseX) {
  const resize = page.locator("[data-testid='navia-resize-handle']");
  const box = await resize.boundingBox();
  if (!box) throw new Error("Resize handle is not visible.");
  await page.mouse.move(box.x + 2, box.y + 120);
  await page.mouse.down();
  await page.mouse.move(targetMouseX, box.y + 120, { steps: 16 });
  await page.mouse.up();
  await wait(250);
}

async function main() {
  if (headless) {
    throw new Error("Visual E2E requires headed Chromium because MV3 unpacked extension is not stable in headless mode.");
  }
  fs.mkdirSync(screenshotRoot, { recursive: true });

  let runtimeProcess = null;
  if (!(await isRuntimeOnline())) {
    runtimeProcess = startRuntime();
    if (!(await waitForRuntime())) throw new Error("Runtime did not become healthy on 127.0.0.1:17861.");
  }

  const { server, url } = await startFixtureServer();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "navia-visual-profile-"));
  let context = null;
  const evidence = [];

  try {
    logStep(`launching Chromium with extension ${extensionRoot}`);
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      viewport: { width: 1280, height: 900 },
      ignoreDefaultArgs: ["--disable-extensions"],
      args: [
        "--disable-features=DisableLoadExtensionCommandLineSwitch",
        "--enable-unsafe-extension-debugging",
        `--disable-extensions-except=${extensionRoot}`,
        `--load-extension=${extensionRoot}`
      ]
    });
    context.setDefaultTimeout(20000);
    const page = await context.newPage();
    await page.goto(url);
    await waitForInjectedPanel(page);

    logStep("capturing floating default");
    await assertFrameState(page, { open: "false" });
    await screenshot(page, "floating-default", "1280x900", evidence);

    logStep("capturing floating hover");
    const ball = page.locator("[data-testid='navia-ball']");
    const strip = page.locator("[data-testid='navia-hover-strip']");
    await ball.hover();
    await strip.waitFor({ timeout: 5000 });
    await wait(250);
    await screenshot(page, "floating-hover", "1280x900", evidence);

    logStep("capturing panel 440 push");
    await strip.click();
    await assertFrameState(page, { open: "true", mode: "push", widthState: "narrow" });
    await page.locator("[data-testid='navia-status']").getByText(/已提交页面|Runtime online/).waitFor({ timeout: 15000 });
    await page.locator("[data-testid='navia-chat-notice']").waitFor({ timeout: 10000 });
    await screenshot(page, "panel-440-push", "1280x900", evidence);

    logStep("capturing panel 50vw push");
    await resizePanel(page, 650);
    await assertFrameState(page, { open: "true", mode: "push", widthState: "half" });
    await screenshot(page, "panel-50vw-push", "1280x900", evidence);

    logStep("capturing panel overlay");
    await resizePanel(page, 610);
    await assertFrameState(page, { open: "true", mode: "overlay", widthState: "overlay" });
    await screenshot(page, "panel-overlay", "1280x900", evidence);

    logStep("capturing mobile overlay");
    await page.setViewportSize({ width: 390, height: 844 });
    await assertFrameState(page, { open: "true", mode: "overlay", widthState: "mobile" });
    await screenshot(page, "mobile-overlay", "390x844", evidence);
    await page.setViewportSize({ width: 1280, height: 900 });

    logStep("capturing runtime offline");
    if (runtimeProcess) {
      runtimeProcess.kill("SIGTERM");
      runtimeProcess = null;
      const started = Date.now();
      while (Date.now() - started < 10000 && (await isRuntimeOnline())) {
        await wait(250);
      }
      await page.locator("[data-testid='navia-reconnect']").click();
      await assertFrameState(page, { runtime: "offline" });
    }
    await screenshot(page, "runtime-offline", "1280x900", evidence);

    const report = {
      status: "passed",
      generatedAt: new Date().toISOString(),
      browserVersion: context.browser()?.version() ?? "unknown",
      extensionRoot,
      fixturePath,
      runtimeUrl,
      screenshots: evidence,
      reviewSummary:
        "Manual review required: compare floating states to user Image #1/#2 and panel states to PRD hard constraints. Mindmap visual is deferred."
    };
    fs.writeFileSync(path.join(screenshotRoot, "v1.1-visual-e2e-report.json"), JSON.stringify(report, null, 2));
    fs.writeFileSync(
      path.join(screenshotRoot, "v1.1-visual-review.md"),
      [
        "# V1.1 Visual E2E Review",
        "",
        `Generated at: ${report.generatedAt}`,
        `Browser: ${report.browserVersion}`,
        `Fixture: ${fixturePath}`,
        "",
        "| State | Viewport | Screenshot | Review basis | Result |",
        "|---|---|---|---|---|",
        ...evidence.map((item) => {
          const basis =
            item.state === "floating-default"
              ? "User Image #2"
              : item.state === "floating-hover"
                ? "User Image #1"
                : item.state === "runtime-offline"
                  ? "Independent design"
                  : "PRD hard constraint";
          return `| ${item.state} | ${item.viewport} | ${path.basename(item.file)} | ${basis} | Pending manual review |`;
        }),
        "",
        "Mindmap / Mermaid artifact visual implementation is deferred and is not reviewed here.",
        ""
      ].join("\n")
    );

    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (context) await context.close();
    server.close();
    if (runtimeProcess) runtimeProcess.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
