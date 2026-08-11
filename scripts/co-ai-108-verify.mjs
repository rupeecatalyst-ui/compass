/**
 * CO-AI-108 / Sprint AI-8 — Consultation Intelligence Engine (static verify).
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
  "src/types/enterprise-ai-consultation.ts",
  "src/constants/enterprise-ai-platform/consultation-intelligence.ts",
  "src/lib/enterprise-ai-platform/consultation-intelligence/index.ts",
  "src/lib/enterprise-ai-platform/consultation-intelligence/orchestrator.ts",
  "src/lib/enterprise-ai-platform/consultation-intelligence/lifecycle.ts",
  "src/lib/enterprise-ai-platform/consultation-intelligence/state-machine.ts",
  "src/lib/enterprise-ai-platform/consultation-intelligence/summary.ts",
  "src/lib/enterprise-ai-platform/consultation-intelligence/key-facts.ts",
  "src/lib/enterprise-ai-platform/consultation-intelligence/objectives.ts",
  "src/lib/enterprise-ai-platform/consultation-intelligence/concerns.ts",
  "src/lib/enterprise-ai-platform/consultation-intelligence/confidence.ts",
  "src/lib/enterprise-ai-platform/consultation-intelligence/completion-score.ts",
  "src/lib/enterprise-ai-platform/consultation-intelligence/validation.ts",
  "src/lib/enterprise-ai-platform/consultation-intelligence/readiness.ts",
  "docs/co-ai-108/CO-AI-108-ARCHITECTURE-REPORT.md",
  "docs/co-ai-108/CO-AI-108-BUSINESS-CERTIFICATION-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "runEaiConsultationIntelligence",
  "applyEaiConsultationTransition",
  "extractEaiConsultationKeyFacts",
  "extractEaiCustomerObjectives",
  "extractEaiFinancialConcerns",
  "buildEaiConsultationSummary",
  "assessEaiConsultationConfidence",
  "scoreEaiConsultationCompletion",
  "validateEaiConsultationObject",
  "runEaiConsultationIntelligenceReadiness",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const orchestrator = read(
  "src/lib/enterprise-ai-platform/consultation-intelligence/orchestrator.ts",
);
assert.match(orchestrator, /evaluateEaiDomainBoundary/);
assert.match(orchestrator, /detectEaiMissingInformation/);
assert.match(orchestrator, /crmRecordsCreated:\s*false/);
assert.match(orchestrator, /workflowsExecuted:\s*false/);
assert.doesNotMatch(orchestrator, /createEaiActionProposal|createLead|createOpportunity/i);
assert.doesNotMatch(orchestrator, /prisma\.|@prisma\/client|sendEmail|executeWorkflow/i);

const constants = read(
  "src/constants/enterprise-ai-platform/consultation-intelligence.ts",
);
assert.match(constants, /not CRM records/i);
assert.match(constants, /1\.0\.0-ai8/);
assert.match(constants, /Action Proposals/);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);
assert.match(version, /consultation-intelligence/);

console.log("CO-AI-108 Consultation Intelligence Engine verify: PASS");
console.log("  Lifecycle · State Machine · Summary · Facts · Objectives · Concerns · Confidence · Completion");
console.log("  Consultation Objects only · No CRM · No Workflow · No UI · No Voice");
