/**
 * P1 — Deal stage synchronisation (Pipeline ↔ My Deals via Deal Registry).
 * Static verify — no data mutation.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function mustContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (!text.includes(needle)) failures.push(`${label ?? rel}: expected "${needle}"`);
}

function mustNotContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (text.includes(needle)) failures.push(`${label ?? rel}: must not include "${needle}"`);
}

const runtime = "src/lib/enterprise-deal/deal-pipeline-runtime.ts";

mustContain(
  runtime,
  "grossStageToLenderCaseStage(deal.grossStage)",
  "Pipeline reads Deal Registry grossStage",
);
mustContain(runtime, "notifyLoanFilesUpdated", "notify Registry consumers");
mustContain(
  runtime,
  "caseStage: grossStageToLenderCaseStage(current.grossStage)",
  "snapshot aligned to Registry stage",
);
mustNotContain(
  runtime,
  "If transition API rejects, still persist derived snapshot",
  "no swallowed transition advancing snapshot",
);
mustContain(
  "src/lib/enterprise-deal/deal-stage-projection.ts",
  "deal.grossStage",
  "My Deals projection uses grossStage",
);
mustContain(
  "src/lib/enterprise-deal/deal-lender-stage-map.ts",
  'return "post_disbursement_confirmation"',
  "PDC projection does not collapse to pre_login",
);

if (failures.length) {
  console.error("P1 deal stage sync verify FAILED:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log("P1 deal stage sync verify OK — Pipeline + My Deals share Deal Registry grossStage.");
