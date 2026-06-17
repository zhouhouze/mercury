import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const extensionRoot = fs.realpathSync(path.resolve(__dirname, "../chrome-mv3-unpacked"));
const evidenceRoot = path.join(repoRoot, "docs/active/project/evidence/v1_3_evidence_card_mindmap/extension-load-diagnostics");
const browserMode = process.env.NAVIA_NATIVE_BROWSER || "chrome";

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function collectTargets(page) {
  try {
    const session = await page.context().newCDPSession(page);
    const result = await session.send("Target.getTargets");
    return result.targetInfos.map((target) => ({
      type: target.type,
      title: target.title,
      url: target.url,
      attached: target.attached
    }));
  } catch (error) {
    return [
      {
        type: "diagnostic_error",
        title: "Target.getTargets failed",
        url: error instanceof Error ? error.message : String(error),
        attached: false
      }
    ];
  }
}

async function main() {
  fs.mkdirSync(evidenceRoot, { recursive: true });
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "navia-extension-diagnostic-"));
  const report = {
    schemaVersion: "v1.3-extension-load-diagnostic.1",
    generatedAt: new Date().toISOString(),
    browserMode,
    extensionRoot,
    manifestExists: fs.existsSync(path.join(extensionRoot, "manifest.json")),
    backgroundExists: fs.existsSync(path.join(extensionRoot, "background.js")),
    serviceWorkers: [],
    targets: [],
    extensionTargets: [],
    passed: false,
    fatalIssues: []
  };

  let context = null;
  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      ...(browserMode === "chrome" ? { channel: "chrome" } : {}),
      headless: false,
      viewport: { width: 1360, height: 900 },
      ignoreDefaultArgs: ["--disable-extensions"],
      args: [
        "--no-first-run",
        "--no-default-browser-check",
        "--window-position=40,40",
        "--window-size=1360,900",
        "--disable-features=DisableLoadExtensionCommandLineSwitch",
        "--enable-unsafe-extension-debugging",
        `--disable-extensions-except=${extensionRoot}`,
        `--load-extension=${extensionRoot}`
      ]
    });
    const page = await context.newPage();
    await page.goto("about:blank");
    await wait(3000);
    try {
      await context.waitForEvent("serviceworker", { timeout: 5000 });
    } catch {
      // Keep collecting target diagnostics below.
    }
    report.serviceWorkers = context.serviceWorkers().map((worker) => worker.url());
    report.targets = await collectTargets(page);
    report.extensionTargets = report.targets.filter((target) => target.url.startsWith("chrome-extension://"));
    report.passed = report.serviceWorkers.length > 0 || report.extensionTargets.length > 0;
    if (!report.passed) {
      report.fatalIssues.push("No extension service worker or chrome-extension target was exposed after loading unpacked extension.");
    }
  } finally {
    if (context) await context.close();
  }

  writeJson(path.join(evidenceRoot, "report.json"), report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed ? 0 : 2);
}

main().catch((error) => {
  const report = {
    schemaVersion: "v1.3-extension-load-diagnostic.1",
    generatedAt: new Date().toISOString(),
    browserMode,
    extensionRoot,
    passed: false,
    fatalIssues: [error instanceof Error ? error.stack || error.message : String(error)]
  };
  writeJson(path.join(evidenceRoot, "report.json"), report);
  console.error(report.fatalIssues[0]);
  process.exit(2);
});
