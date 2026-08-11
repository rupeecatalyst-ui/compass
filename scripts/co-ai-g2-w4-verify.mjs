/**
 * CO-AI-G2-W4 — Triple Comparison Engine verify + emit internal report.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

assert.equal(
  existsSync(join(root, "docs/co-ai-g2-w4/CO-AI-G2-W4-TRIPLE-COMPARISON.md")),
  true,
);

const {
  EAO_TRIPLE_COMPARISON_VERSION,
  runEaoTripleComparison,
  buildEaoTripleComparisonSuite,
  formatEaoTripleSuiteMarkdown,
  clearEaoTripleComparisons,
  saveEaoTripleComparison,
  countEaoTripleComparisons,
} = await import("../src/lib/enterprise-ai-orchestrator/triple-comparison/index.ts");

assert.equal(EAO_TRIPLE_COMPARISON_VERSION, "1.0.0-g2-w4");

const samples = [
  {
    customerUtterance: "How fast can I get a business loan?",
    liveFacingText:
      "With complete documents, some business loan cases can move quite quickly, although timelines depend on the lender and your profile. Is your business a proprietorship, partnership, or private limited?",
    modelFacingText:
      "That's a fair question. Timelines and fit depend on your profile and documents — I won't invent numbers, but I can guide what typically matters next.",
    productPath: "business_loan",
  },
  {
    customerUtterance: "I want to buy my first home — a ready flat in Pune.",
    liveFacingText:
      "I'd be glad to help with your first home purchase in Pune. Before we go deeper, are you salaried or self-employed?",
    modelFacingText:
      "Thank you for sharing that. To advise accurately, it helps to know which loan type you're exploring and roughly how much funding you need.",
    productPath: "home_loan",
  },
  {
    customerUtterance: "I want a home loan balance transfer to reduce my EMI.",
    liveFacingText:
      "Let's explore your options. Share whatever feels useful next.",
    modelFacingText:
      "Balance transfer can help when your current rate or EMI is no longer competitive. Which bank is your current home loan with?",
    productPath: "balance_transfer",
  },
];

clearEaoTripleComparisons();
const suite = buildEaoTripleComparisonSuite({
  title: "CO-AI-G2-W4 Triple Comparison — Internal Evaluation Suite",
  comparisons: samples,
});

assert.equal(suite.customerIsolated, true);
assert.equal(suite.comparisons.length, 3);

for (const c of suite.comparisons) {
  assert.equal(c.customerIsolated, true);
  assert.equal(c.arms.length, 3);
  assert.ok(typeof c.score === "number");
  assert.ok(typeof c.deviation === "number");
  assert.ok(c.recommendation.length > 10);
  assert.ok(Array.isArray(c.strengths));
  assert.ok(Array.isArray(c.weaknesses));
  const ids = c.arms.map((a) => a.armId).sort();
  assert.deepEqual(ids, ["gold_standard", "live_sarathi", "reasoning_model"].sort());
  for (const arm of c.arms) {
    assert.ok(Array.isArray(arm.strengths));
    assert.ok(Array.isArray(arm.weaknesses));
    assert.ok(typeof arm.score === "number");
    assert.ok(typeof arm.deviationFromGold === "number");
    assert.ok(arm.recommendation.length > 5);
  }
  saveEaoTripleComparison(c);
}

assert.equal(countEaoTripleComparisons(), 3);

// Weak live BT sample should show higher deviation / weaknesses on live
const weak = suite.comparisons.find((c) =>
  /balance transfer/i.test(c.customerUtterance),
);
assert.ok(weak);
const live = weak.arms.find((a) => a.armId === "live_sarathi");
const model = weak.arms.find((a) => a.armId === "reasoning_model");
assert.ok(live && model);
assert.ok(
  model.score > live.score,
  "model should beat generic live on BT sample",
);

// UI must not import triple comparison
assert.doesNotMatch(
  read("src/components/catalyst-one/sarathi/sarathi-conversation-workspace.tsx"),
  /triple-comparison|runEaoTripleComparison/,
);
assert.doesNotMatch(
  read("src/components/catalyst-one/sarathi/conversation-composer.tsx"),
  /triple-comparison|runEaoTripleComparison/,
);

// Facing path must not assign triple to customer text
const turn = read(
  "src/lib/enterprise-ai-platform/conversation-experience/turn-orchestrator.ts",
);
assert.doesNotMatch(turn, /runEaoTripleComparison|facingText\s*=\s*.*triple/i);

const outDir = join(root, "docs/co-ai-g2-w4");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "CO-AI-G2-W4-TRIPLE-COMPARISON-REPORT.md"),
  formatEaoTripleSuiteMarkdown(suite),
  "utf8",
);
writeFileSync(
  join(outDir, "CO-AI-G2-W4-TRIPLE-COMPARISON-REPORT.json"),
  JSON.stringify(suite, null, 2),
  "utf8",
);

// Direct API smoke
const one = runEaoTripleComparison(samples[0]);
assert.equal(one.customerIsolated, true);

console.log(
  `CO-AI-G2-W4 verify: PASS (suiteScore=${suite.suiteScore}, deviation=${suite.suiteDeviation})`,
);
