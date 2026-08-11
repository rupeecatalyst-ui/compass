/**
 * CO-AI-101 / Sprint AI-1 — Enterprise AI Platform foundation (static verify).
 * Asserts module presence, constitutional exports, and out-of-scope boundaries.
 * Does not call external LLMs or mutate CRM.
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
  "src/types/enterprise-ai-platform.ts",
  "src/types/enterprise-ai-platform-ports.ts",
  "src/constants/enterprise-ai-platform/index.ts",
  "src/lib/enterprise-ai-platform/index.ts",
  "src/lib/enterprise-ai-platform/composition.ts",
  "src/lib/enterprise-ai-platform/session-orchestrator.ts",
  "src/lib/enterprise-ai-platform/context-compiler.ts",
  "src/lib/enterprise-ai-platform/policy-gate.ts",
  "src/lib/enterprise-ai-platform/tool-bus.ts",
  "src/lib/enterprise-ai-platform/response-composer.ts",
  "src/lib/enterprise-ai-platform/action-proposals.ts",
  "src/lib/enterprise-ai-platform/ai-registry.ts",
  "src/lib/enterprise-ai-platform/llm-provider.ts",
  "src/lib/enterprise-ai-platform/foundation-validation.ts",
  "src/lib/enterprise-ai-platform/repositories/in-memory.ts",
  "docs/co-ai-101/CO-AI-101-ENTERPRISE-AI-PLATFORM-FOUNDATION-REPORT.md",
  ".cursor/rules/enterprise-ai-platform.mdc",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "createEaiSession",
  "compileEaiContext",
  "evaluateEaiPolicy",
  "registerEaiTool",
  "invokeEaiTool",
  "composeEaiResponse",
  "createEaiActionProposal",
  "recordEaiInteraction",
  "completeEaiLlm",
  "runEaiFoundationValidation",
  "configureEaiPorts",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const types = read("src/types/enterprise-ai-platform.ts");
assert.match(types, /EaiPersonaPackId/);
assert.match(types, /sarathi_customer/);
assert.match(types, /sarathi_wealth_partner/);
assert.match(types, /chanakya_executive/);
assert.match(types, /EaiActionProposal/);
assert.match(types, /EaiLlmProvider/);
assert.match(types, /EaiCompiledContext/);

const policy = read("src/lib/enterprise-ai-platform/policy-gate.ts");
assert.match(policy, /evaluateEaiPolicy/);
assert.match(policy, /requireActionProposal/);
assert.match(policy, /mutate/);

const proposals = read("src/lib/enterprise-ai-platform/action-proposals.ts");
assert.match(proposals, /createEaiActionProposal/);
assert.match(proposals, /execution blocked|executed_reserved/i);
assert.doesNotMatch(proposals, /prisma\.|createLead\(|createOpportunity\(/i);

const context = read("src/lib/enterprise-ai-platform/context-compiler.ts");
assert.match(context, /compileEaiContext/);
assert.match(context, /redactionNotes/);
assert.match(context, /never raw registry dumps/);

const constants = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(constants, /Raw enterprise registry rows/);
assert.match(constants, /EAI_DEFAULT_REDACTION_NOTES/);

const llm = read("src/lib/enterprise-ai-platform/llm-provider.ts");
assert.match(llm, /completeEaiLlm/);
assert.doesNotMatch(llm, /from ["']openai["']|from ["']@anthropic|from ["']@google-cloud/i);

const stub = read("src/lib/enterprise-ai-platform/repositories/in-memory.ts");
assert.match(stub, /createStubEaiLlmProvider/);
assert.match(stub, /EAI_STUB_LLM_PROVIDER_ID/);

const report = read("docs/co-ai-101/CO-AI-101-ENTERPRISE-AI-PLATFORM-FOUNDATION-REPORT.md");
assert.match(report, /Sprint:\*\* AI-1|Sprint AI-1|AI-1/);
assert.match(report, /AI-2/);
assert.match(report, /Out of scope|out of scope/);

console.log("CO-AI-101 Enterprise AI Platform foundation verify: PASS");
console.log("  Modules: Session · Context · Policy · Tool Bus · Composer · Proposals · Registry · LLM");
console.log("  No vendor LLM SDK · No CRM mutation · No SARATHI UI");
