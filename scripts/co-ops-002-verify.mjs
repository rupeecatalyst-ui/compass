/**
 * CO-OPS-002 — Static verification that ops foundation files exist.
 * Does not print secrets.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const required = [
  "src/lib/ops/correlation.ts",
  "src/lib/ops/redact.ts",
  "src/lib/ops/structured-log.ts",
  "src/lib/ops/rings.ts",
  "src/lib/ops/record.ts",
  "src/lib/ops/alert-rules.ts",
  "src/lib/ops/resolve-ops-health.ts",
  "src/lib/ops/fetch-ops-health-client.ts",
  "src/app/api/admin/ops-health/route.ts",
  "docs/ops/CO-OPS-002-OPERATIONAL-RUNBOOK.md",
  "docs/ops/CO-OPS-002-OPERATIONS-READINESS-REPORT.md",
  "src/types/ops-observability.ts",
];

let failed = 0;
for (const rel of required) {
  const ok = existsSync(resolve(root, rel));
  console.log(`${ok ? "PASS" : "FAIL"}  ${rel}`);
  if (!ok) failed += 1;
}

if (failed > 0) {
  console.error(`\nCO-OPS-002 verify FAILED (${failed} missing)`);
  process.exit(1);
}
console.log("\nCO-OPS-002 verify PASS");
