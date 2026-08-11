/**
 * CO-AI-112 / Sprint AI-12 — Wealth Partner Behaviour Pack (static verify).
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
  "src/types/enterprise-ai-wealth-partner-behaviour.ts",
  "src/constants/enterprise-ai-platform/wealth-partner-behaviour.ts",
  "src/constants/enterprise-ai-platform/partner-tone-library.ts",
  "src/lib/enterprise-ai-platform/wealth-partner-behaviour/index.ts",
  "src/lib/enterprise-ai-platform/wealth-partner-behaviour/activate.ts",
  "src/lib/enterprise-ai-platform/wealth-partner-behaviour/readiness.ts",
  "src/app/(dashboard)/sarathi/wealth-partner/page.tsx",
  "docs/co-ai-112/CO-AI-112-ARCHITECTURE-REPORT.md",
  "docs/co-ai-112/CO-AI-112-BUSINESS-CERTIFICATION-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "activateEaiWealthPartnerBehaviourPack",
  "buildEaiWealthPartnerBehaviourPack",
  "runEaiWealthPartnerBehaviourReadiness",
  "resolveEaiToneAudience",
  "getEaiWealthPartnerCapabilityThemes",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const activate = read(
  "src/lib/enterprise-ai-platform/wealth-partner-behaviour/activate.ts",
);
assert.match(activate, /lifecycle:\s*[\"']active[\"']/);
assert.match(activate, /advisory_reserved/);
assert.match(activate, /formal/);
assert.doesNotMatch(activate, /prisma\.|@prisma\/client|createLead|executeWorkflow/i);

const partnerTone = read("src/constants/enterprise-ai-platform/partner-tone-library.ts");
assert.match(partnerTone, /BT opportunity identified/);
assert.doesNotMatch(partnerTone, /Buying a home matters|Let's explore your options|Let's reduce your borrowing cost/i);

const composer = read("src/lib/enterprise-ai-platform/response-composer.ts");
assert.match(composer, /resolveEaiToneAudience/);
assert.match(composer, /resolveEaiToneMessage\(toneCategory,\s*audience(?:,\s*[\"']en[\"'])?\)/);

const constants = read("src/constants/enterprise-ai-platform/wealth-partner-behaviour.ts");
assert.match(constants, /1\.0\.0-ai12/);
assert.match(constants, /customer_analysis/);
assert.match(constants, /partner_advisory/);
assert.match(constants, /not a separate AI/i);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);
assert.match(version, /wealth-partner-behaviour/);

const routes = read("src/constants/routes.ts");
assert.match(routes, /SARATHI_WEALTH_PARTNER:\s*[\"']\/sarathi\/wealth-partner[\"']/);

console.log("CO-AI-112 Wealth Partner Behaviour Pack verify: PASS");
console.log("  Pack activation · Capability themes · Partner tone · No customer tone · Platform reuse");
console.log("  No second AI · No Voice · No CRM/Workflow execution");
