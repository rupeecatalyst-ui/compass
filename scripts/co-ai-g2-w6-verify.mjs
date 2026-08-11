/**
 * CO-AI-G2-W6 — Policy Validation Harness verify + emit reports.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

assert.equal(
  existsSync(join(root, "docs/co-ai-g2-w6/CO-AI-G2-W6-POLICY-VALIDATION-HARNESS.md")),
  true,
);

const {
  EAO_POLICY_VALIDATION_VERSION,
  EAO_POLICY_VALIDATION_DIMENSION_IDS,
  EAO_POLICY_VALIDATION_FIXTURES,
  validateEaoShadowPolicy,
  buildEaoPolicyValidationSuite,
  formatEaoPolicyValidationSuiteMarkdown,
  clearEaoPolicyValidationReports,
  saveEaoPolicyValidationReport,
  countEaoPolicyValidationReports,
} = await import("../src/lib/enterprise-ai-orchestrator/policy-validation/index.ts");

assert.equal(EAO_POLICY_VALIDATION_VERSION, "1.0.0-g2-w6");
assert.equal(EAO_POLICY_VALIDATION_DIMENSION_IDS.length, 6);
assert.equal(EAO_POLICY_VALIDATION_FIXTURES.length, 3);

const safe = validateEaoShadowPolicy(EAO_POLICY_VALIDATION_FIXTURES[0]);
const unsafeEmi = validateEaoShadowPolicy(EAO_POLICY_VALIDATION_FIXTURES[1]);
const unsafeKyc = validateEaoShadowPolicy(EAO_POLICY_VALIDATION_FIXTURES[2]);

assert.equal(safe.responseUnmodified, true);
assert.equal(safe.customerIsolated, true);
assert.equal(safe.evaluatedFacingText, EAO_POLICY_VALIDATION_FIXTURES[0].shadowFacingText);
assert.ok(safe.passed);
assert.ok(!unsafeEmi.passed);
assert.ok(!unsafeKyc.passed);
assert.ok(safe.overallScore > unsafeEmi.overallScore);

// Must not mutate input text reference content
const original = EAO_POLICY_VALIDATION_FIXTURES[1].shadowFacingText;
validateEaoShadowPolicy(EAO_POLICY_VALIDATION_FIXTURES[1]);
assert.equal(EAO_POLICY_VALIDATION_FIXTURES[1].shadowFacingText, original);

const suite = buildEaoPolicyValidationSuite({
  title: "CO-AI-G2-W6 Policy Validation — Shadow Response Suite",
  items: EAO_POLICY_VALIDATION_FIXTURES,
});
assert.equal(suite.responseUnmodified, true);
assert.equal(suite.customerIsolated, true);
assert.equal(suite.passCount, 1);
assert.equal(suite.failCount, 2);

clearEaoPolicyValidationReports();
for (const r of suite.reports) saveEaoPolicyValidationReport(r);
assert.equal(countEaoPolicyValidationReports(), 3);

// Pipeline hooks validation but must not assign to facingText
const pipeline = read("src/lib/enterprise-ai-orchestrator/shadow/pipeline.ts");
assert.match(pipeline, /validateEaoShadowPolicy/);
assert.match(pipeline, /does not modify response/);
assert.doesNotMatch(pipeline, /response\.facingText\s*=/);

assert.doesNotMatch(
  read("src/components/catalyst-one/sarathi/sarathi-conversation-workspace.tsx"),
  /validateEaoShadowPolicy|policy-validation/,
);

const outDir = join(root, "docs/co-ai-g2-w6");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "CO-AI-G2-W6-POLICY-VALIDATION-REPORT.md"),
  formatEaoPolicyValidationSuiteMarkdown(suite),
  "utf8",
);
writeFileSync(
  join(outDir, "CO-AI-G2-W6-POLICY-VALIDATION-REPORT.json"),
  JSON.stringify(suite, null, 2),
  "utf8",
);

console.log(
  `CO-AI-G2-W6 verify: PASS (safe=${safe.overallScore}, unsafeEmi=${unsafeEmi.overallScore}, pass=${suite.passCount}, fail=${suite.failCount})`,
);
