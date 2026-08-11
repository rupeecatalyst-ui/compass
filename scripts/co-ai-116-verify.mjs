/**
 * CO-AI-116 / Sprint AI-16 — Enterprise AI Validation & Performance (static verify).
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
  "src/types/enterprise-ai-validation-performance.ts",
  "src/constants/enterprise-ai-platform/validation-performance.ts",
  "src/lib/enterprise-ai-platform/validation-performance/index.ts",
  "src/lib/enterprise-ai-platform/validation-performance/readiness.ts",
  "src/lib/enterprise-ai-platform/validation-performance/report.ts",
  "src/lib/enterprise-ai-platform/validation-performance/domain-policy-suites.ts",
  "src/lib/enterprise-ai-platform/validation-performance/tool-context-behaviour-suites.ts",
  "src/lib/enterprise-ai-platform/validation-performance/security-recovery-suites.ts",
  "src/lib/enterprise-ai-platform/validation-performance/performance-suites.ts",
  "docs/co-ai-116/CO-AI-116-ARCHITECTURE-REPORT.md",
  "docs/co-ai-116/CO-AI-116-PERFORMANCE-REPORT.md",
  "docs/co-ai-116/CO-AI-116-BUSINESS-CERTIFICATION-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "runEaiValidationPerformanceSuite",
  "runEaiValidationPerformanceReadiness",
  "buildEaiPerformanceReport",
  "analyzeEaiLatency",
  "runEaiLoadTestingSuite",
  "runEaiPromptInjectionValidationSuite",
  "runEaiDomainBoundaryValidationSuite",
  "runEaiPolicyGateValidationSuite",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const constants = read("src/constants/enterprise-ai-platform/validation-performance.ts");
assert.match(constants, /1\.0\.0-ai16/);
assert.match(constants, /prompt.?injection/i);
assert.match(constants, /EAI_VALIDATION_TURN_LATENCY_BUDGET_MS/);

const readiness = read("src/lib/enterprise-ai-platform/validation-performance/readiness.ts");
assert.match(readiness, /runEaiDomainBoundaryValidationSuite/);
assert.match(readiness, /runEaiPolicyGateValidationSuite/);
assert.match(readiness, /runEaiPromptInjectionValidationSuite/);
assert.match(readiness, /analyzeEaiLatency/);
assert.match(readiness, /runEaiLoadTestingSuite/);
assert.doesNotMatch(readiness, /prisma\.|@prisma\/client|createLead|executeWorkflow|automaticOnlineLearning:\s*true/i);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);
assert.match(version, /validation-performance/);

console.log("CO-AI-116 Enterprise AI Validation & Performance verify: PASS");
console.log("  Performance · Latency · Token · Context · Load · Recovery");
console.log("  Security · Prompt Injection · Domain · Policy · Tool Bus · Behaviour");
