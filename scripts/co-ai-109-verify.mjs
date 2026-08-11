/**
 * CO-AI-109 / Sprint AI-9 — Lead Intelligence & Action Proposal Engine (static verify).
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
  "src/types/enterprise-ai-lead-intelligence.ts",
  "src/constants/enterprise-ai-platform/lead-intelligence.ts",
  "src/lib/enterprise-ai-platform/lead-intelligence/index.ts",
  "src/lib/enterprise-ai-platform/lead-intelligence/orchestrator.ts",
  "src/lib/enterprise-ai-platform/lead-intelligence/lead-readiness.ts",
  "src/lib/enterprise-ai-platform/lead-intelligence/opportunity-readiness.ts",
  "src/lib/enterprise-ai-platform/lead-intelligence/document-readiness.ts",
  "src/lib/enterprise-ai-platform/lead-intelligence/customer-readiness.ts",
  "src/lib/enterprise-ai-platform/lead-intelligence/partner-recommendation.ts",
  "src/lib/enterprise-ai-platform/lead-intelligence/next-best-action.ts",
  "src/lib/enterprise-ai-platform/lead-intelligence/proposal-ranking.ts",
  "src/lib/enterprise-ai-platform/lead-intelligence/proposal-emitter.ts",
  "src/lib/enterprise-ai-platform/lead-intelligence/priority-scoring.ts",
  "src/lib/enterprise-ai-platform/lead-intelligence/confidence.ts",
  "src/lib/enterprise-ai-platform/lead-intelligence/validation.ts",
  "src/lib/enterprise-ai-platform/lead-intelligence/readiness.ts",
  "docs/co-ai-109/CO-AI-109-ARCHITECTURE-REPORT.md",
  "docs/co-ai-109/CO-AI-109-BUSINESS-CERTIFICATION-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "runEaiLeadIntelligence",
  "assessEaiLeadReadiness",
  "assessEaiOpportunityReadiness",
  "assessEaiDocumentReadiness",
  "assessEaiCustomerReadiness",
  "recommendEaiPartner",
  "deriveEaiLeadIntelligenceNba",
  "rankEaiActionProposals",
  "emitEaiLeadIntelligenceProposals",
  "scoreEaiLeadIntelligencePriority",
  "assessEaiLeadIntelligenceConfidence",
  "validateEaiLeadIntelligenceResult",
  "runEaiLeadIntelligenceReadiness",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const orchestrator = read("src/lib/enterprise-ai-platform/lead-intelligence/orchestrator.ts");
assert.match(orchestrator, /runEaiConsultationIntelligence|consultation/);
assert.match(orchestrator, /createEaiActionProposal|emitEaiLeadIntelligenceProposals/);
assert.match(orchestrator, /leadsCreated:\s*false/);
assert.match(orchestrator, /opportunitiesCreated:\s*false/);
assert.match(orchestrator, /workflowsTriggered:\s*false/);
assert.doesNotMatch(orchestrator, /prisma\.|@prisma\/client|sendEmail|executeWorkflow/i);

const emitter = read("src/lib/enterprise-ai-platform/lead-intelligence/proposal-emitter.ts");
assert.match(emitter, /createEaiActionProposal/);
assert.match(emitter, /execution:\s*[\"']forbidden[\"']/);
assert.match(emitter, /requiresHumanApproval:\s*true/);

const constants = read("src/constants/enterprise-ai-platform/lead-intelligence.ts");
assert.match(constants, /never creates leads/i);
assert.match(constants, /1\.0\.0-ai9/);
assert.match(constants, /create_lead/);
assert.match(constants, /create_opportunity/);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);
assert.match(version, /lead-intelligence/);

console.log("CO-AI-109 Lead Intelligence & Action Proposal Engine verify: PASS");
console.log("  Lead · Opportunity · Document · Customer · Partner · NBA · Ranking · Priority · Confidence");
console.log("  Proposals only · No CRM create · No Workflow · No UI");
