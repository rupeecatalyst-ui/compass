#!/usr/bin/env node
/**
 * CO-QA-002 — static gate: Kanban remove must soft-delete Enterprise Deals.
 * Engineering gate only — does NOT satisfy CO-QA-001 Business Certification.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function mustContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (!text.includes(needle)) failures.push(`${label ?? rel}: expected "${needle}"`);
}

function mustNotContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (text.includes(needle)) failures.push(`${label ?? rel}: must not contain "${needle}"`);
}

mustContain(
  "src/lib/enterprise-deal/deal-pipeline-runtime.ts",
  "removeLenderPipelineDeal",
  "explicit removeLenderPipelineDeal",
);
mustContain(
  "src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx",
  "onRemoveDeal",
  "host wires onRemoveDeal",
);
mustContain(
  "src/components/catalyst-one/execution/lender-pipeline-board.tsx",
  "onRemoveDeal",
  "board prefers onRemoveDeal",
);
mustContain(
  "docs/co-qa-002/CO-QA-002-MEHRROSH-BAT-FAILURE-RCA.md",
  "Mehernosh Dastoor",
  "Mehrrosh RCA",
);

if (failures.length) {
  console.error("CO-QA-002 verify FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("CO-QA-002 verify PASS (engineering gate only — run CO-QA-002-E2E-001 on live app).");
