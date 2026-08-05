/**
 * CO-WP-JOURNEY-003 — smoke verify (no deploy).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [
  "src/types/enterprise-partner-customer-workspace.ts",
  "src/app/api/partner/customers/route.ts",
  "src/app/api/partner/customers/[customerId]/route.ts",
  "docs/co-wp-journey/CO-WP-JOURNEY-003-CUSTOMER-WORKSPACE.md",
  ".cursor/rules/co-wp-journey-003.mdc",
];

let failed = 0;
for (const rel of checks) {
  if (!existsSync(join(root, rel))) {
    console.error(`MISSING ${rel}`);
    failed += 1;
  } else console.log(`OK ${rel}`);
}

const svc = readFileSync(
  join(root, "server/services/partner-gateway/partner-business.service.ts"),
  "utf8",
);
for (const needle of ["listCustomerDirectory", "getCustomerWorkspace"]) {
  if (!svc.includes(needle)) {
    console.error(`MISSING service:${needle}`);
    failed += 1;
  } else console.log(`OK service:${needle}`);
}

if (failed) {
  console.error(`\nCO-WP-JOURNEY-003 verify FAILED (${failed})`);
  process.exit(1);
}
console.log("\nCO-WP-JOURNEY-003 verify PASSED");
