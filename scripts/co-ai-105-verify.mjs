/**
 * CO-AI-105 / Sprint AI-5 — Financial Decision Intelligence Foundation (static verify).
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
  "src/types/enterprise-ai-financial-decision.ts",
  "src/constants/enterprise-ai-platform/financial-decision-intelligence.ts",
  "src/lib/enterprise-ai-platform/financial-decision-intelligence/index.ts",
  "src/lib/enterprise-ai-platform/financial-decision-intelligence/decision-engine.ts",
  "src/lib/enterprise-ai-platform/financial-decision-intelligence/recommendation.ts",
  "src/lib/enterprise-ai-platform/financial-decision-intelligence/explainability.ts",
  "src/lib/enterprise-ai-platform/financial-decision-intelligence/confidence.ts",
  "src/lib/enterprise-ai-platform/financial-decision-intelligence/alternatives.ts",
  "src/lib/enterprise-ai-platform/financial-decision-intelligence/scenarios.ts",
  "src/lib/enterprise-ai-platform/financial-decision-intelligence/validation.ts",
  "src/lib/enterprise-ai-platform/financial-decision-intelligence/readiness.ts",
  "docs/co-ai-105/CO-AI-105-ARCHITECTURE-REPORT.md",
  "docs/co-ai-105/CO-AI-105-BUSINESS-CERTIFICATION-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "runEaiFinancialDecisionIntelligence",
  "buildEaiFdiRecommendations",
  "buildEaiFdiExplanation",
  "assessEaiFdiConfidence",
  "buildEaiFdiAlternatives",
  "selectEaiFdiScenarios",
  "validateEaiFdiDecisionPackage",
  "runEaiFinancialDecisionIntelligenceReadiness",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const engine = read(
  "src/lib/enterprise-ai-platform/financial-decision-intelligence/decision-engine.ts",
);
assert.match(engine, /buildEaiContextPackage/);
assert.match(engine, /evaluateEaiPolicy/);
assert.doesNotMatch(engine, /foir\s*=|calculateFoir|computeEmi|approveLoan/i);
assert.doesNotMatch(engine, /prisma\.|@prisma\/client/i);

const constants = read(
  "src/constants/enterprise-ai-platform/financial-decision-intelligence.ts",
);
assert.match(constants, /does not approve credit/i);
assert.match(constants, /EAI_FDI_SCENARIO_CATALOGUE/);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);

console.log("CO-AI-105 Financial Decision Intelligence Foundation verify: PASS");
console.log("  Engine · Recommend · Explain · Confidence · Alternatives · Scenarios · Validation");
console.log("  No calculations · No approvals · No UI · No CRM · No Workflow");
