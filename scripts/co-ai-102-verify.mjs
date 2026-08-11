/**
 * CO-AI-102 / Sprint AI-2 — Enterprise Capability Layer (static verify).
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
  "src/types/enterprise-ai-capability-layer.ts",
  "src/constants/enterprise-ai-platform/capability-layer.ts",
  "src/lib/enterprise-ai-platform/behaviour-packs.ts",
  "src/lib/enterprise-ai-platform/behaviour-pack-scaffolds.ts",
  "src/lib/enterprise-ai-platform/capability-manifest.ts",
  "src/lib/enterprise-ai-platform/permission-matrix.ts",
  "src/lib/enterprise-ai-platform/tool-categories.ts",
  "src/lib/enterprise-ai-platform/behaviour-config.ts",
  "src/lib/enterprise-ai-platform/capability-readiness.ts",
  "docs/co-ai-102/CO-AI-102-ENTERPRISE-CAPABILITY-LAYER-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "registerEaiBehaviourPack",
  "loadEaiBehaviourPack",
  "createEaiCapabilityManifest",
  "evaluateEaiCapabilityPermission",
  "listEaiToolCategories",
  "runEaiCapabilityLayerReadiness",
  "assertEaiCapabilityAllowed",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const policy = read("src/lib/enterprise-ai-platform/policy-gate.ts");
assert.match(policy, /requestedCapabilityIds/);
assert.match(policy, /evaluateEaiCapabilityPermission/);
assert.match(policy, /allowedCapabilityIds/);

const matrix = read("src/constants/enterprise-ai-platform/capability-layer.ts");
assert.match(matrix, /EAI_PLATFORM_PERMISSION_MATRIX/);
assert.match(matrix, /crm_mutation/);
assert.match(matrix, /create_opportunity/);
assert.match(matrix, /effect: "deny"/);

const scaffolds = read("src/lib/enterprise-ai-platform/behaviour-pack-scaffolds.ts");
assert.match(scaffolds, /sarathi_customer/);
assert.match(scaffolds, /sarathi_wealth_partner/);
assert.match(scaffolds, /chanakya_executive/);
assert.doesNotMatch(scaffolds, /You are SARATHI|system prompt|prompt engineering/i);

const readiness = read("src/lib/enterprise-ai-platform/capability-readiness.ts");
assert.match(readiness, /runEaiCapabilityLayerReadiness/);
assert.match(readiness, /create_opportunity must be denied/);

const report = read("docs/co-ai-102/CO-AI-102-ENTERPRISE-CAPABILITY-LAYER-REPORT.md");
assert.match(report, /AI-2/);
assert.match(report, /AI-3/);
assert.match(report, /Capability Manifest/);

console.log("CO-AI-102 Enterprise Capability Layer verify: PASS");
console.log("  Behaviour Packs · Manifest · Permissions · Tool Categories · Policy Gate");
console.log("  No UI · No voice · No CRM execution · No Mission Control changes");
