/**
 * CO-AI-107 / Sprint AI-7 — Planner & Next Best Action Engine (static verify).
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
  "src/types/enterprise-ai-planner.ts",
  "src/constants/enterprise-ai-platform/planner.ts",
  "src/lib/enterprise-ai-platform/planner/index.ts",
  "src/lib/enterprise-ai-platform/planner/orchestrator.ts",
  "src/lib/enterprise-ai-platform/planner/missing-information.ts",
  "src/lib/enterprise-ai-platform/planner/question-selection.ts",
  "src/lib/enterprise-ai-platform/planner/conversation-planner.ts",
  "src/lib/enterprise-ai-platform/planner/next-best-action.ts",
  "src/lib/enterprise-ai-platform/planner/action-proposal-generator.ts",
  "src/lib/enterprise-ai-platform/planner/recommendation-sequencing.ts",
  "src/lib/enterprise-ai-platform/planner/follow-up-planning.ts",
  "src/lib/enterprise-ai-platform/planner/validation.ts",
  "src/lib/enterprise-ai-platform/planner/readiness.ts",
  "docs/co-ai-107/CO-AI-107-ARCHITECTURE-REPORT.md",
  "docs/co-ai-107/CO-AI-107-BUSINESS-CERTIFICATION-REPORT.md",
  "docs/co-ai-107/CO-AI-107-PLANNER-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "runEaiPlanner",
  "detectEaiMissingInformation",
  "selectEaiPlannerQuestions",
  "planEaiConversation",
  "deriveEaiNextBestActions",
  "generateEaiPlannerActionProposals",
  "sequenceEaiPlannerRecommendations",
  "planEaiFollowUps",
  "validateEaiPlannerPlan",
  "runEaiPlannerReadiness",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const orchestrator = read("src/lib/enterprise-ai-platform/planner/orchestrator.ts");
assert.match(orchestrator, /evaluateEaiDomainBoundary/);
assert.match(orchestrator, /detectEaiMissingInformation/);
assert.match(orchestrator, /generateEaiPlannerActionProposals/);
assert.match(orchestrator, /createEaiActionProposal|generateEaiPlannerActionProposals/);
assert.doesNotMatch(orchestrator, /sendEmail|executeWorkflow|prisma\.|@prisma\/client/i);
assert.doesNotMatch(orchestrator, /createLead\(|createOpportunity\(/i);

const generator = read(
  "src/lib/enterprise-ai-platform/planner/action-proposal-generator.ts",
);
assert.match(generator, /createEaiActionProposal/);
assert.match(generator, /EAI_PLANNER_ALLOWED_PROPOSAL_KINDS/);
assert.doesNotMatch(generator, /create_lead|create_opportunity/);

const constants = read("src/constants/enterprise-ai-platform/planner.ts");
assert.match(constants, /does not execute CRM/i);
assert.match(constants, /1\.0\.0-ai7/);
assert.match(constants, /request_documents/);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);
assert.match(version, /planner/);

console.log("CO-AI-107 Planner & Next Best Action Engine verify: PASS");
console.log("  Missing Info · Questions · NBA · Proposals · Sequencing · Follow-up · Validation");
console.log("  Proposals only · No CRM · No Workflow · No UI · No Voice");
