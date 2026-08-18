/**
 * CO-WP-JOURNEY-001D — smoke verify (no deploy).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [
  "src/types/enterprise-partner-opportunity-journey.ts",
  "server/services/partner-gateway/partner-opportunity-journey-config.service.ts",
  "docs/co-wp-journey/CO-WP-JOURNEY-001D-DYNAMIC-SECTIONS.md",
  ".cursor/rules/co-wp-journey-001d.mdc",
];

let failed = 0;
for (const rel of checks) {
  const p = join(root, rel);
  if (!existsSync(p)) {
    console.error(`MISSING ${rel}`);
    failed += 1;
  } else {
    console.log(`OK ${rel}`);
  }
}

const types = readFileSync(
  join(root, "src/types/enterprise-partner-opportunity-journey.ts"),
  "utf8",
);
const svc = readFileSync(
  join(root, "server/services/partner-gateway/partner-opportunity-journey-config.service.ts"),
  "utf8",
);
const catalog = readFileSync(
  join(root, "src/constants/enterprise-initial-data-collection/catalog.ts"),
  "utf8",
);
const docs = readFileSync(
  join(root, "docs/co-wp-journey/CO-WP-JOURNEY-001D-DYNAMIC-SECTIONS.md"),
  "utf8",
);

for (const [label, hay, needle] of [
  ["types", types, "PartnerJourneySectionDef"],
  ["types", types, "detailSections"],
  ["service", svc, "detailSections"],
  ["service", svc, "getEnterpriseIdcCatalog"],
  ["catalog", catalog, "Employment Information"],
  ["catalog", catalog, "Loan Requirement"],
  ["catalog", catalog, "credit_profile"],
  ["catalog", catalog, "approxCibilScore"],
  ["docs", docs, "CO-WP-JOURNEY-001D"],
]) {
  if (!hay.includes(needle)) {
    console.error(`MISSING ${label}:${needle}`);
    failed += 1;
  } else {
    console.log(`OK ${label}:${needle}`);
  }
}

if (failed > 0) {
  console.error(`\nCO-WP-JOURNEY-001D verify FAILED (${failed})`);
  process.exit(1);
}
console.log("\nCO-WP-JOURNEY-001D verify PASSED");
