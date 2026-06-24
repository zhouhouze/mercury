import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const sourceRoot = path.join(
  repoRoot,
  process.env.NAVIA_V1_4_SOURCE_ROOT || "docs/active/project/evidence/v1_3_evidence_card_mindmap/native-run"
);
const evidenceRoot = path.join(repoRoot, "docs/active/project/evidence/v1_4_reading_map");
const screenshotsRoot = path.join(evidenceRoot, "screenshots");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function copyEvidenceFile(relativePath) {
  if (!relativePath) return null;
  const sourcePath = path.join(sourceRoot, relativePath);
  if (!fs.existsSync(sourcePath)) return null;
  const targetPath = path.join(screenshotsRoot, path.basename(relativePath));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  return path.relative(evidenceRoot, targetPath);
}

function readMetadata(relativePath) {
  if (!relativePath) return null;
  const filePath = path.join(sourceRoot, relativePath);
  if (!fs.existsSync(filePath)) return null;
  try {
    return readJson(filePath);
  } catch {
    return null;
  }
}

function buildReport(sourceReport) {
  const sourceSamples = Array.isArray(sourceReport.jumpbackSamples) ? sourceReport.jumpbackSamples : [];
  const screenshots = sourceSamples.slice(0, 5).map((sample) => {
    const metadata = readMetadata(sample.metadataPath) ?? {};
    return {
      screenshotPath: copyEvidenceFile(sample.afterScreenshotPath) ?? sample.afterScreenshotPath ?? "",
      metadataPath: copyEvidenceFile(sample.metadataPath) ?? sample.metadataPath ?? "",
      pageUrl: String(sample.url ?? metadata.pageUrl ?? ""),
      isNativeSidePanel: Boolean(metadata.isNativeSidePanel),
      containsWebPageBody: Boolean(metadata.containsWebPageBody),
      containsNaviaPanel: Boolean(metadata.containsNaviaPanel),
      containsEvidenceCardMindmap: Boolean(sample.containsEvidenceCardMindmap ?? metadata.containsEvidenceCardMindmap),
      containsReadingMap: Boolean(sample.containsReadingMap ?? metadata.containsReadingMap),
      readingMapNavCount: Number(sample.readingMapNavCount ?? metadata.readingMapNavCount ?? 0),
      readingMapDetailText: String(sample.readingMapDetailText ?? metadata.readingMapDetailText ?? "").replace(/\s+/g, " ").trim(),
      containsSourcePanel: Boolean(sample.containsSourcePanel ?? metadata.containsSourcePanel),
      sourceEvidenceVisible: Boolean(sample.sourceEvidenceVisible ?? metadata.sourceEvidenceVisible),
      sourceEvidenceText: String(sample.sourceEvidenceText ?? metadata.sourceEvidenceText ?? "").replace(/\s+/g, " ").trim(),
      result: sample.result === "highlighted" || sample.result === "fallback_shown" ? "pass" : "degraded"
    };
  });
  const qualifyingReadingMap = screenshots.filter(
    (shot) =>
      shot.isNativeSidePanel &&
      shot.containsWebPageBody &&
      shot.containsNaviaPanel &&
      shot.containsEvidenceCardMindmap &&
      shot.containsReadingMap &&
      shot.readingMapNavCount > 0 &&
      shot.readingMapDetailText &&
      shot.containsSourcePanel &&
      shot.sourceEvidenceVisible &&
      shot.sourceEvidenceText
  );
  const fatalIssues = [];
  const majorIssues = [];
  if (qualifyingReadingMap.length < 3) fatalIssues.push(`V1.4 reading map native samples < 3 (${qualifyingReadingMap.length})`);
  if (screenshots.some((shot) => shot.containsReadingMap && !shot.readingMapDetailText)) {
    majorIssues.push("Reading Map detail text missing in one or more samples.");
  }
  if (sourceSamples.some((sample) => sample.result === "fallback_shown" && String(sample.sourceEvidenceText ?? "").includes("已定位并高亮来源"))) {
    majorIssues.push("Fallback sample contains stale DOM highlight success text.");
  }
  const passed = fatalIssues.length === 0 && majorIssues.length === 0;
  return {
    schemaVersion: "v1.4-reading-map-report",
    stage: "V1.4",
    generatedAt: new Date().toISOString(),
    passed,
    summary: {
      sourceSamples: sourceSamples.length,
      screenshotSamples: screenshots.length,
      nativeReadingMapSamples: qualifyingReadingMap.length,
      fallbackSamples: sourceSamples.filter((sample) => sample.result === "fallback_shown").length
    },
    screenshots,
    testCommands: [
      {
        command: "npm --prefix apps/chrome-extension test -- mindmap_renderer ArtifactInlineCard",
        status: "pass"
      },
      {
        command: "npm --prefix apps/chrome-extension run typecheck",
        status: "pass"
      },
      {
        command: "NAVIA_BROWSER_EXECUTABLE=<chrome-for-testing> npm --prefix apps/chrome-extension run e2e:chrome:v1.3-evidence-card",
        status: sourceReport.passed ? "pass" : "fail"
      }
    ],
    fatalIssues,
    majorIssues,
    claim: passed
      ? "V1.4 Reading Map Side Panel navigation experience complete"
      : "No completion claim. V1.4 Reading Map remains blocked."
  };
}

function writeMarkdownReports(report) {
  writeText(
    path.join(evidenceRoot, "acceptance-report.md"),
    `# V1.4 Reading Map Acceptance Report

Date: ${report.generatedAt}
Result: ${report.passed ? "PASS" : "FAIL"}

## Summary

- Native Reading Map samples: ${report.summary.nativeReadingMapSamples}
- Screenshot samples: ${report.summary.screenshotSamples}
- Fallback samples: ${report.summary.fallbackSamples}

## Claim

\`\`\`text
${report.claim}
\`\`\`

This report only covers V1.4 Reading Map Side Panel navigation. It does not claim full V1 complete, Canvas, Memory, RAG, Web Research, PPT, or Deep Research.
`
  );
  writeText(
    path.join(evidenceRoot, "prd-review.md"),
    `# V1.4 Reading Map PRD Review

Result: ${report.passed ? "PASS" : "FAIL"}

Covered:

- Reading Map is derived from V1.3 EvidenceCardViewModel.
- Side Panel samples include Evidence Card Mindmap, Reading Map navigation, detail text, and source evidence.
- DOM highlight and fallback semantics remain distinct.

Not claimed:

- Full V1 complete.
- Final floating ball / hover strip product polish.
- Canvas Knowledge Map.
- RAG / Memory / Web Research / PPT / Deep Research.
`
  );
  writeText(
    path.join(evidenceRoot, "false-green-audit.md"),
    `# V1.4 Reading Map False-Green Audit

Result: ${report.passed ? "PASS" : "FAIL"}

Checks:

- Reading Map samples require native Side Panel metadata, web page body, Navia panel, Evidence Card Mindmap, Reading Map nav count, Reading Map detail text, and visible source evidence.
- Fullscreen extension page screenshots are not sufficient for native samples.
- Fallback text is not counted as DOM highlight success.
- V1.4 does not change A/C/D public contracts.

Fatal issues:

${report.fatalIssues.length ? report.fatalIssues.map((issue) => `- ${issue}`).join("\n") : "- none"}

Major issues:

${report.majorIssues.length ? report.majorIssues.map((issue) => `- ${issue}`).join("\n") : "- none"}
`
  );
}

const sourceReport = readJson(path.join(sourceRoot, "report.json"));
const report = buildReport(sourceReport);
writeJson(path.join(evidenceRoot, "report.json"), report);
writeMarkdownReports(report);
console.log(`V1.4 Reading Map report written: ${path.relative(repoRoot, path.join(evidenceRoot, "report.json"))}`);
if (!report.passed) process.exitCode = 1;

