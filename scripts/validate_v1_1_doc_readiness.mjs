#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const baselineDir = path.join(
  root,
  "docs/navia_v1_project_docs/design/v1.1-figma-baseline"
);
const manifestPath = path.join(baselineDir, "capture-manifest.json");
const requiredDocs = [
  "docs/navia_v1_project_docs/design/v1.1-figma-baseline/capture-matrix.md",
  "docs/navia_v1_project_docs/design/v1.1-figma-baseline/manual-capture-runbook.md",
  "docs/navia_v1_project_docs/stage-gates/v1.1-a-visual-baseline-freeze.md",
  "docs/navia_v1_project_docs/stage-gates/v1.1-b-ui-structure-token-refactor.md",
  "docs/navia_v1_project_docs/stage-gates/v1.1-c-high-fidelity-states.md",
  "docs/navia_v1_project_docs/stage-gates/v1.1-d-visual-e2e-regression.md",
  "docs/navia_v1_project_docs/stage-gates/v1.1-e-exit-review.md",
  "docs/navia_v1_project_docs/design/v1.1-frontend-fidelity-implementation-spec.md",
  "docs/navia_v1_project_docs/04-acceptance-plan.md",
  "docs/navia_v1_project_docs/05-codex-alignment-checklist.md",
];

function relExists(relativePath) {
  return existsSync(path.join(root, relativePath));
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

const missingDocs = requiredDocs.filter((file) => !relExists(file));
const manifestExists = existsSync(manifestPath);
const result = {
  checkedAt: new Date().toISOString(),
  status: "no-go",
  canStartV11B: false,
  manifestExists,
  missingDocs,
  missingFiles: [],
  blockingStates: [],
  partialCaptures: [],
  rejectedCaptures: [],
  goForImplementation: false,
  reasons: [],
};

if (!manifestExists) {
  result.reasons.push("capture-manifest.json is missing.");
} else {
  const manifest = readJson(manifestPath);
  result.goForImplementation = Boolean(
    manifest.readinessGate?.goForImplementation
  );
  result.blockingStates = (manifest.requiredStates || [])
    .filter((state) => state.blocking && state.status !== "accepted")
    .map((state) => state.state);
  result.partialCaptures = (manifest.captures || [])
    .filter((capture) => capture.status === "accepted_partial")
    .map((capture) => capture.state);
  result.rejectedCaptures = (manifest.captures || [])
    .filter((capture) => capture.status === "rejected")
    .map((capture) => capture.state);

  for (const capture of manifest.captures || []) {
    for (const key of ["sourceFile", "reviewedFile"]) {
      if (capture[key] && !existsSync(path.join(baselineDir, capture[key]))) {
        result.missingFiles.push(`${key}:${capture[key]}`);
      }
    }
  }

  if (result.blockingStates.length > 0) {
    result.reasons.push("Required state matrix is incomplete.");
  }
  if (!result.goForImplementation) {
    result.reasons.push("Manifest readinessGate.goForImplementation is false.");
  }
}

if (missingDocs.length > 0) {
  result.reasons.push("Required V1.1 documentation files are missing.");
}
if (result.missingFiles.length > 0) {
  result.reasons.push("Manifest references files that do not exist.");
}

if (
  result.manifestExists &&
  result.missingDocs.length === 0 &&
  result.missingFiles.length === 0 &&
  result.blockingStates.length === 0 &&
  result.goForImplementation
) {
  result.status = "go";
  result.canStartV11B = true;
  result.reasons = ["V1.1 documentation is ready for V1.1-B implementation."];
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.canStartV11B ? 0 : 1);
