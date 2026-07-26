/**
 * CO-BIZ-003 — Static verify of BI foundation files.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const required = [
  "src/types/enterprise-business-intelligence.ts",
  "src/lib/enterprise-business-intelligence/index.ts",
  "src/lib/enterprise-business-intelligence/compose.ts",
  "src/lib/enterprise-business-intelligence/executive-kpis.ts",
  "src/lib/enterprise-business-intelligence/operational-kpis.ts",
  "src/lib/enterprise-business-intelligence/team-performance.ts",
  "src/lib/enterprise-business-intelligence/business-health.ts",
  "src/lib/enterprise-business-intelligence/chanakya-insights.ts",
  "src/lib/enterprise-business-intelligence/providers.ts",
  "src/lib/enterprise-business-intelligence/reports.ts",
  "src/app/api/admin/business-intelligence/route.ts",
  "docs/co-biz-003/CO-BIZ-003-BI-READINESS-REPORT.md",
  ".cursor/rules/enterprise-business-intelligence.mdc",
];

let failed = 0;
for (const rel of required) {
  const ok = existsSync(resolve(root, rel));
  console.log(`${ok ? "PASS" : "FAIL"}  ${rel}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`\nCO-BIZ-003 verify FAILED (${failed})`);
  process.exit(1);
}
console.log("\nCO-BIZ-003 verify PASS");
