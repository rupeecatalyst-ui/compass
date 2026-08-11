/**
 * CO-AI-104 DIE — Domain Intelligence & SARATHI Communication (static verify).
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
  "src/constants/enterprise-ai-platform/tone-library.ts",
  "src/lib/enterprise-ai-platform/domain-governance/domain-boundary.ts",
  "src/lib/enterprise-ai-platform/domain-governance/tone-library.ts",
  "src/lib/enterprise-ai-platform/domain-governance/micro-communication.ts",
  "docs/co-ai-104-die/CO-AI-104-DIE-ARCHITECTURE-REPORT.md",
  "docs/co-ai-104-die/CO-AI-104-DIE-BUSINESS-CERTIFICATION-REPORT.md",
  "docs/co-ai-104-die/CO-AI-104-DIE-DOMAIN-BOUNDARY-REPORT.md",
  "docs/co-ai-104-die/CO-AI-104-DIE-TONE-LIBRARY-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "evaluateEaiDomainBoundary",
  "resolveEaiToneMessage",
  "applyEaiMicroCommunication",
  "getEaiOutsideDomainRefusal",
  "assertEaiDomainAllowsKnowledge",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const constants = read("src/constants/enterprise-ai-platform/domain-governance.ts");
assert.match(constants, /EAI_OUTSIDE_DOMAIN_REFUSAL = "I'm not trained for this subject\."/);
assert.match(constants, /zone_1_core/);
assert.match(constants, /zone_2_adjacent/);
assert.match(constants, /zone_3_outside/);

const builder = read("src/lib/enterprise-ai-platform/context-intelligence/package-builder.ts");
assert.match(builder, /evaluateEaiDomainBoundary/);
assert.match(builder, /blocksKnowledge/);
assert.match(builder, /domainBoundaryBlocked/);

const composer = read("src/lib/enterprise-ai-platform/response-composer.ts");
assert.match(composer, /EAI_OUTSIDE_DOMAIN_REFUSAL/);
assert.match(composer, /applyEaiMicroCommunication/);
assert.match(composer, /resolveEaiToneMessage/);

const tone = read("src/constants/enterprise-ai-platform/tone-library.ts");
assert.match(tone, /Buying a home matters/);
assert.match(tone, /Let's reduce your borrowing cost/);
assert.match(tone, /Your analysis is ready/);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);

console.log("CO-AI-104 DIE Domain Intelligence & Communication verify: PASS");
console.log("  Domain Boundary · Zones · Tone Library · Micro Communication");
console.log("  Fixed outside refusal · Context Builder gate · No UI/Voice/Planner");
