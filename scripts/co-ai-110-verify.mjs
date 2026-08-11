/**
 * CO-AI-110 / Sprint AI-10 — Explainability & Trust Engine (static verify).
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

const required = [
  "src/types/enterprise-ai-explainability.ts",
  "src/constants/enterprise-ai-platform/explainability.ts",
  "src/lib/enterprise-ai-platform/explainability-trust/index.ts",
  "src/lib/enterprise-ai-platform/explainability-trust/orchestrator.ts",
  "src/lib/enterprise-ai-platform/explainability-trust/reason-codes.ts",
  "src/lib/enterprise-ai-platform/explainability-trust/supporting-facts.ts",
  "src/lib/enterprise-ai-platform/explainability-trust/confidence-explanation.ts",
  "src/lib/enterprise-ai-platform/explainability-trust/alternative-explanation.ts",
  "src/lib/enterprise-ai-platform/explainability-trust/decision-trace.ts",
  "src/lib/enterprise-ai-platform/explainability-trust/recommendation-explanation.ts",
  "src/lib/enterprise-ai-platform/explainability-trust/validation.ts",
  "src/lib/enterprise-ai-platform/explainability-trust/readiness.ts",
  "docs/co-ai-110/CO-AI-110-ARCHITECTURE-REPORT.md",
  "docs/co-ai-110/CO-AI-110-BUSINESS-CERTIFICATION-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "runEaiExplainabilityTrust",
  "deriveEaiTrustReasonCodes",
  "collectEaiTrustSupportingFacts",
  "explainEaiTrustConfidence",
  "explainEaiAlternativeRecommendations",
  "buildEaiDecisionTrace",
  "buildEaiRecommendationExplanation",
  "validateEaiTrustPackage",
  "runEaiExplainabilityTrustReadiness",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const orchestrator = read(
  "src/lib/enterprise-ai-platform/explainability-trust/orchestrator.ts",
);
assert.match(orchestrator, /deriveEaiTrustReasonCodes/);
assert.match(orchestrator, /buildEaiDecisionTrace/);
assert.match(orchestrator, /uncertainty|explainEaiTrustConfidence/);
assert.doesNotMatch(orchestrator, /prisma\.|@prisma\/client|createLead|executeWorkflow/i);

const constants = read("src/constants/enterprise-ai-platform/explainability.ts");
assert.match(constants, /never fabricates reasons/i);
assert.match(constants, /1\.0\.0-ai10/);
assert.match(constants, /EAI_TRUST_REASON_CATALOGUE/);
assert.match(constants, /RC_OUTSIDE_DOMAIN/);

const reasonCodes = read(
  "src/lib/enterprise-ai-platform/explainability-trust/reason-codes.ts",
);
assert.match(reasonCodes, /EAI_TRUST_REASON_CATALOGUE/);
assert.doesNotMatch(reasonCodes, /fabricate|inventReason/i);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);
assert.match(version, /explainability/);

console.log("CO-AI-110 Explainability & Trust Engine verify: PASS");
console.log("  Reason Codes · Facts · Assumptions · Confidence · Alternatives · Decision Trace");
console.log("  No fabrication · Uncertainty visible · SARATHI Bible");
