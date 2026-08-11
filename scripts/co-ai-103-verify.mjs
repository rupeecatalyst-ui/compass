/**
 * CO-AI-103 / Sprint AI-3 — Context Intelligence Engine (static verify).
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
  "src/types/enterprise-ai-context-intelligence.ts",
  "src/constants/enterprise-ai-platform/context-intelligence.ts",
  "src/lib/enterprise-ai-platform/context-intelligence/index.ts",
  "src/lib/enterprise-ai-platform/context-intelligence/package-builder.ts",
  "src/lib/enterprise-ai-platform/context-intelligence/providers.ts",
  "src/lib/enterprise-ai-platform/context-intelligence/prioritisation.ts",
  "src/lib/enterprise-ai-platform/context-intelligence/sanitisation.ts",
  "src/lib/enterprise-ai-platform/context-intelligence/budget.ts",
  "src/lib/enterprise-ai-platform/context-intelligence/conversation-memory.ts",
  "src/lib/enterprise-ai-platform/context-intelligence/package-validator.ts",
  "src/lib/enterprise-ai-platform/context-intelligence/readiness.ts",
  "docs/co-ai-103/CO-AI-103-CONTEXT-INTELLIGENCE-ENGINE-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "buildEaiContextPackage",
  "validateEaiContextPackage",
  "prioritiseEaiContextDomains",
  "registerEaiContextProvider",
  "runEaiContextIntelligenceReadiness",
  "compileEaiContextFromPackage",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const builder = read("src/lib/enterprise-ai-platform/context-intelligence/package-builder.ts");
assert.match(builder, /buildEaiContextPackage/);
assert.doesNotMatch(builder, /completeEaiLlm|openai|anthropic/i);

const prioritisation = read(
  "src/lib/enterprise-ai-platform/context-intelligence/prioritisation.ts",
);
assert.match(prioritisation, /prioritiseEaiContextDomains/);

const constants = read("src/constants/enterprise-ai-platform/context-intelligence.ts");
assert.match(constants, /exclude: \["customer", "loan"/);
assert.match(constants, /maxApproximateChars/);
assert.match(constants, /balance transfer|emi_affordability/i);

const compiler = read("src/lib/enterprise-ai-platform/context-compiler.ts");
assert.match(compiler, /compileEaiContextFromPackage/);
assert.match(compiler, /ONLY module allowed to \*prepare\*/);

const providers = read("src/lib/enterprise-ai-platform/context-intelligence/providers.ts");
assert.match(providers, /implemented: false/);
assert.doesNotMatch(providers, /prisma\.|loadLoanFiles|createOpportunity/i);

const report = read("docs/co-ai-103/CO-AI-103-CONTEXT-INTELLIGENCE-ENGINE-REPORT.md");
assert.match(report, /AI-4/);
assert.match(report, /SARATHI Customer/);
assert.match(report, /Context Package/);

console.log("CO-AI-103 Context Intelligence Engine verify: PASS");
console.log("  Builder · Providers · Package · Budget · Sanitisation · Validator");
console.log("  No UI · No Planner · No registry connectors · No LLM calls");
