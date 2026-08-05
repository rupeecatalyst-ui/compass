/**
 * CO-WP-JOURNEY-001C — smoke verify (no deploy).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [
  "src/types/enterprise-partner-opportunity-journey.ts",
  "server/services/partner-gateway/partner-opportunity-journey-config.service.ts",
  "src/app/api/partner/opportunity-journey/config/route.ts",
  "docs/co-wp-journey/CO-WP-JOURNEY-001C-ENTERPRISE-ALIGNMENT.md",
  ".cursor/rules/co-wp-journey-001c.mdc",
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

const svc = readFileSync(
  join(root, "server/services/partner-gateway/partner-opportunity-journey-config.service.ts"),
  "utf8",
);
for (const needle of [
  "OPPORTUNITY_PRIMARY_BORROWER",
  "LEAD_INFORMATION_PRODUCT_OPTIONS",
  "listEcmMasterOptions",
  "enterpriseEventsOnSubmit",
  "submissionPipeline",
]) {
  if (!svc.includes(needle)) {
    console.error(`CONFIG SERVICE missing ${needle}`);
    failed += 1;
  } else {
    console.log(`OK service:${needle}`);
  }
}

if (failed > 0) {
  console.error(`\nCO-WP-JOURNEY-001C verify FAILED (${failed})`);
  process.exit(1);
}
console.log("\nCO-WP-JOURNEY-001C verify PASSED");
