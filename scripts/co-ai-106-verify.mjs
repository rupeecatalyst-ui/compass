/**
 * CO-AI-106 / Sprint AI-6 — Knowledge & Advisory Reasoning Engine (static verify).
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
  "src/types/enterprise-ai-advisory-reasoning.ts",
  "src/constants/enterprise-ai-platform/advisory-reasoning.ts",
  "src/lib/enterprise-ai-platform/advisory-reasoning/index.ts",
  "src/lib/enterprise-ai-platform/advisory-reasoning/orchestrator.ts",
  "src/lib/enterprise-ai-platform/advisory-reasoning/knowledge-reasoning.ts",
  "src/lib/enterprise-ai-platform/advisory-reasoning/loan-advisory.ts",
  "src/lib/enterprise-ai-platform/advisory-reasoning/product-explanation.ts",
  "src/lib/enterprise-ai-platform/advisory-reasoning/comparison.ts",
  "src/lib/enterprise-ai-platform/advisory-reasoning/benefit-tradeoff.ts",
  "src/lib/enterprise-ai-platform/advisory-reasoning/educational.ts",
  "src/lib/enterprise-ai-platform/advisory-reasoning/customer-guidance.ts",
  "src/lib/enterprise-ai-platform/advisory-reasoning/journey-guidance.ts",
  "src/lib/enterprise-ai-platform/advisory-reasoning/compose-advice.ts",
  "src/lib/enterprise-ai-platform/advisory-reasoning/validation.ts",
  "src/lib/enterprise-ai-platform/advisory-reasoning/readiness.ts",
  "docs/co-ai-106/CO-AI-106-ARCHITECTURE-REPORT.md",
  "docs/co-ai-106/CO-AI-106-BUSINESS-CERTIFICATION-REPORT.md",
  "docs/co-ai-106/CO-AI-106-KNOWLEDGE-ENGINE-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "runEaiAdvisoryReasoning",
  "reasonEaiKnowledgeAdvice",
  "reasonEaiLoanAdvisory",
  "reasonEaiProductExplanation",
  "reasonEaiComparison",
  "reasonEaiBenefitTradeoff",
  "reasonEaiEducationalResponse",
  "reasonEaiCustomerGuidance",
  "reasonEaiJourneyGuidance",
  "composeEaiAdvisoryFacingText",
  "validateEaiAdvisoryReasoningResult",
  "runEaiAdvisoryReasoningReadiness",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const orchestrator = read(
  "src/lib/enterprise-ai-platform/advisory-reasoning/orchestrator.ts",
);
assert.match(orchestrator, /evaluateEaiDomainBoundary/);
assert.match(orchestrator, /applyEaiMicroCommunication|composeEaiAdvisoryFacingText/);
assert.match(orchestrator, /runEaiFinancialDecisionIntelligence/);
assert.match(orchestrator, /EAI_OUTSIDE_DOMAIN_REFUSAL|I'm not trained for this subject/);
assert.doesNotMatch(orchestrator, /foir\s*=|calculateFoir|computeEmi|approveLoan/i);
assert.doesNotMatch(orchestrator, /prisma\.|@prisma\/client/i);

const constants = read("src/constants/enterprise-ai-platform/advisory-reasoning.ts");
assert.match(constants, /does not approve credit/i);
assert.match(constants, /1\.0\.0-ai6/);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);
assert.match(version, /advisory-reasoning/);

console.log("CO-AI-106 Knowledge & Advisory Reasoning Engine verify: PASS");
console.log("  Knowledge · Loan · Product · Compare · Trade-off · Education · Guidance · Journey");
console.log("  Domain Boundary · Tone · Micro Communication · No calculations · No UI");
