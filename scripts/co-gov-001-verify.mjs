/**
 * CO-GOV-001 — Static verification of governance foundation files.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const required = [
  "src/types/enterprise-governance.ts",
  "src/lib/enterprise-governance/index.ts",
  "src/lib/enterprise-governance/record.ts",
  "src/lib/enterprise-governance/rings.ts",
  "src/lib/enterprise-governance/timeline.ts",
  "src/lib/enterprise-governance/admin-governance.ts",
  "src/lib/enterprise-governance/config-versioning.ts",
  "src/lib/enterprise-governance/export.ts",
  "src/lib/enterprise-governance/compliance.ts",
  "src/lib/enterprise-governance/mirror-ops.ts",
  "src/app/api/admin/governance/route.ts",
  "src/app/api/admin/governance/export/route.ts",
  "docs/governance/CO-GOV-001-GOVERNANCE-READINESS-REPORT.md",
  "docs/governance/CO-GOV-001-COMPLIANCE-READINESS.md",
];

let failed = 0;
for (const rel of required) {
  const ok = existsSync(resolve(root, rel));
  console.log(`${ok ? "PASS" : "FAIL"}  ${rel}`);
  if (!ok) failed += 1;
}

if (failed > 0) {
  console.error(`\nCO-GOV-001 verify FAILED (${failed} missing)`);
  process.exit(1);
}
console.log("\nCO-GOV-001 verify PASS");
