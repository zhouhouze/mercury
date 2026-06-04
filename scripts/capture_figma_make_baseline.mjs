#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const baselineDir = path.join(
  root,
  "docs/navia_v1_project_docs/design/v1.1-figma-baseline"
);
const outputDir = path.join(baselineDir, "current");
const reportPath = path.join(outputDir, "capture-report.json");
const chromePath =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const url =
  process.env.FIGMA_MAKE_LIVE_URL ||
  "https://www.figma.com/make/GQTyaHmZoYpsBUQCIda2QP/%E6%B5%8F%E8%A7%88%E5%99%A8%E6%8F%92%E4%BB%B6%E6%A1%86%E6%9E%B6%E5%BC%80%E5%8F%91?p=f&t=lrqXaHNloFyLsXl3-0&preview-route=%2Flive";

const viewports = [
  { name: "desktop-wide", width: 1440, height: 960 },
  { name: "desktop-main", width: 1280, height: 900 },
  { name: "compact", width: 800, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

mkdirSync(outputDir, { recursive: true });

const captures = [];

for (const viewport of viewports) {
  const filename = `figma-live-${viewport.width}x${viewport.height}.png`;
  const screenshotPath = path.join(outputDir, filename);
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--window-size=${viewport.width},${viewport.height}`,
    `--screenshot=${screenshotPath}`,
    url,
  ];
  const startedAt = new Date().toISOString();
  const result = spawnSync(chromePath, args, {
    encoding: "utf8",
    timeout: 45000,
  });

  captures.push({
    viewport,
    file: `current/${filename}`,
    startedAt,
    completedAt: new Date().toISOString(),
    status: result.status === 0 ? "captured_unreviewed" : "capture_failed",
    exitCode: result.status,
    stderr: result.stderr ? result.stderr.slice(0, 2000) : "",
    stdout: result.stdout ? result.stdout.slice(0, 2000) : "",
    reviewRequired:
      "Check whether the screenshot is the Figma Make live preview, not a login, permission, blank, or error page.",
  });
}

const report = {
  version: "v1.1-figma-make-baseline-capture",
  sourceUrl: url,
  chromePath,
  generatedAt: new Date().toISOString(),
  conclusion:
    "Screenshots are unreviewed. They cannot be used as V1.1 visual baseline until manually reviewed and moved or copied to reviewed/.",
  captures,
};

writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
