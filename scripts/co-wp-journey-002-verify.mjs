/**
 * CO-WP-JOURNEY-002 — smoke verify (no deploy).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [
  "src/types/enterprise-partner-business.ts",
  "docs/co-wp-journey/CO-WP-JOURNEY-002-OPPORTUNITY-WORKSPACE.md",
  ".cursor/rules/co-wp-journey-002.mdc",
  ".cursor/rules/co-wp-journey-001-frozen.mdc",
];

let failed = 0;
for (const rel of checks) {
  if (!existsSync(join(root, rel))) {
    console.error(`MISSING ${rel}`);
    failed += 1;
  } else console.log(`OK ${rel}`);
}

const types = readFileSync(join(root, "src/types/enterprise-partner-business.ts"), "utf8");
const svc = readFileSync(
  join(root, "server/services/partner-gateway/partner-business.service.ts"),
  "utf8",
);

for (const [label, hay, needle] of [
  ["types", types, "PartnerNextBestActionDto"],
  ["types", types, "participants?"],
  ["types", types, "nextBestAction?"],
  ["service", svc, "applyWorkspaceProjection"],
  ["service", svc, "nextBestAction"],
]) {
  if (!hay.includes(needle)) {
    console.error(`MISSING ${label}:${needle}`);
    failed += 1;
  } else console.log(`OK ${label}:${needle}`);
}

if (failed) {
  console.error(`\nCO-WP-JOURNEY-002 verify FAILED (${failed})`);
  process.exit(1);
}
console.log("\nCO-WP-JOURNEY-002 verify PASSED");
