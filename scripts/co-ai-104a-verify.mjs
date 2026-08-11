/**
 * CO-AI-104A / Sprint AI-4A — Domain Boundary & Knowledge Governance (static verify).
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
  "src/types/enterprise-ai-domain-governance.ts",
  "src/constants/enterprise-ai-platform/domain-governance.ts",
  "src/lib/enterprise-ai-platform/domain-governance/index.ts",
  "src/lib/enterprise-ai-platform/domain-governance/domain-boundary.ts",
  "src/lib/enterprise-ai-platform/domain-governance/intent-classifier.ts",
  "src/lib/enterprise-ai-platform/domain-governance/safe-refusal.ts",
  "src/lib/enterprise-ai-platform/domain-governance/knowledge-governance.ts",
  "src/lib/enterprise-ai-platform/domain-governance/readiness.ts",
  "docs/co-ai-104a/CO-AI-104A-ARCHITECTURE-REPORT.md",
  "docs/co-ai-104a/CO-AI-104A-BUSINESS-CERTIFICATION-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "evaluateEaiDomainBoundary",
  "classifyEaiSarathiIntent",
  "buildEaiSafeRefusal",
  "registerEaiKnowledgeSource",
  "runEaiDomainGovernanceReadiness",
  "assertEaiLlmReasoningAllowed",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const policy = read("src/lib/enterprise-ai-platform/policy-gate.ts");
assert.match(policy, /evaluateEaiDomainBoundary/);
assert.match(policy, /Domain Boundary/);
assert.match(policy, /assertEaiLlmReasoningAllowed/);

const llm = read("src/lib/enterprise-ai-platform/llm-provider.ts");
assert.match(llm, /assertEaiLlmReasoningAllowed/);
assert.match(llm, /finishReason: "blocked"/);
assert.doesNotMatch(llm, /You are SARATHI|system prompt/i);

const constants = read("src/constants/enterprise-ai-platform/domain-governance.ts");
assert.match(constants, /zone_1_core/);
assert.match(constants, /zone_2_adjacent/);
assert.match(constants, /zone_3_outside/);
assert.match(constants, /Balance Transfer|home_loan|FOIR|CIBIL/i);
assert.match(constants, /politics|cricket|programming|recipes/i);
assert.match(constants, /I'm not trained for this subject/);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);
assert.match(version, /1\.3\.0-domain-intelligence/);

console.log("CO-AI-104A Domain Boundary & Knowledge Governance verify: PASS");
console.log("  Zones · Intent · Refusal · Knowledge sources · Policy Gate pre-LLM");
console.log("  No UI · No Voice · No Planner · No CRM · No prompt engineering");
