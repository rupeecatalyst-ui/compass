/**
 * CO-AI-117 / Sprint AI-17 — Production Readiness Final Certification (static).
 * Certification only — no new platform features. Verifies artefacts + prior sprint pins.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustExist(rel) {
  assert.ok(existsSync(join(root, rel)), `Missing: ${rel}`);
}

const governing = [
  "docs/enterprise-ai/ENTERPRISE-AI-CONSTITUTION.md",
  "docs/enterprise-ai/ENTERPRISE-AI-GOVERNING-STANDARDS-FREEZE.md",
  "docs/sarathi/SARATHI-BIBLE-V1.md",
  "src/constants/enterprise-ai-platform/sarathi-bible.ts",
  ".cursor/rules/enterprise-ai-governing-standards.mdc",
  ".cursor/rules/enterprise-ai-platform.mdc",
];

const deliverables = [
  "docs/co-ai-117/CO-AI-117-ENTERPRISE-AI-CERTIFICATION-REPORT.md",
  "docs/co-ai-117/CO-AI-117-ARCHITECTURE-CERTIFICATION.md",
  "docs/co-ai-117/CO-AI-117-BUSINESS-CERTIFICATION.md",
  "docs/co-ai-117/CO-AI-117-SECURITY-CERTIFICATION.md",
  "docs/co-ai-117/CO-AI-117-PERFORMANCE-CERTIFICATION.md",
  "docs/co-ai-117/CO-AI-117-UAT-CHECKLIST.md",
  "docs/co-ai-117/CO-AI-117-GO-LIVE-CHECKLIST.md",
  "docs/co-ai-117/CO-AI-117-RISK-REGISTER.md",
  "docs/co-ai-117/CO-AI-117-RELEASE-NOTES.md",
  "docs/co-ai-117/CO-AI-117-KNOWN-LIMITATIONS.md",
  "docs/co-ai-117/CO-AI-117-FUTURE-ROADMAP.md",
];

const priorSprintEvidence = [
  "docs/co-ai-111/CO-AI-111-ARCHITECTURE-REPORT.md",
  "docs/co-ai-112/CO-AI-112-ARCHITECTURE-REPORT.md",
  "docs/co-ai-113/CO-AI-113-ARCHITECTURE-REPORT.md",
  "docs/co-ai-114/CO-AI-114-ARCHITECTURE-REPORT.md",
  "docs/co-ai-115/CO-AI-115-ARCHITECTURE-REPORT.md",
  "docs/co-ai-116/CO-AI-116-ARCHITECTURE-REPORT.md",
  "docs/co-ai-116/CO-AI-116-PERFORMANCE-REPORT.md",
];

for (const rel of [...governing, ...deliverables, ...priorSprintEvidence]) {
  mustExist(rel);
}

// Certification sprint must not introduce a new platform engine package
assert.ok(
  !existsSync(join(root, "src/lib/enterprise-ai-platform/production-readiness")),
  "AI-17 must not add a new production-readiness engine package",
);

const constitution = read("docs/enterprise-ai/ENTERPRISE-AI-CONSTITUTION.md");
assert.match(constitution, /FROZEN/);
assert.match(constitution, /Enterprise engines decide/i);

const bible = read("docs/sarathi/SARATHI-BIBLE-V1.md");
assert.match(bible, /I'm not trained for this subject/);
assert.match(bible, /SB-06/);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);

const cert = read("docs/co-ai-117/CO-AI-117-ENTERPRISE-AI-CERTIFICATION-REPORT.md");
assert.match(cert, /NOT a development sprint/i);
assert.match(cert, /No new features/i);
assert.match(cert, /Product Owner/i);

const release = read("docs/co-ai-117/CO-AI-117-RELEASE-NOTES.md");
assert.match(release, /1\.17\.0-ai16/);

console.log("CO-AI-117 Production Readiness Final Certification (static): PASS");
console.log("  Governing standards present · Deliverables present · No new engine package");
console.log("  Framework under certification: 1.17.0-ai16");
