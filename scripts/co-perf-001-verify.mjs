/**
 * CO-PERF-001 — Static verify for Enterprise Metrics Engine artefacts.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const required = [
  "server/services/enterprise-metrics-engine/index.ts",
  "src/types/enterprise-metrics-engine.ts",
  "src/constants/enterprise-metrics-engine.ts",
  "src/app/api/admin/enterprise-metrics/route.ts",
  "src/app/api/enterprise-metrics/dashboard/route.ts",
  "src/app/api/cron/enterprise-metrics/route.ts",
  "server/services/enterprise-metrics-engine/deal-health-persist.ts",
  "src/app/(dashboard)/admin/enterprise-metrics/page.tsx",
  "src/lib/enterprise-deal/deal-stage-projection.ts",
  "prisma/migrations/20260722160000_co_perf_001_enterprise_metrics_engine/migration.sql",
  "docs/co-perf-001/CO-PERF-001-EME-READINESS-REPORT.md",
];

let ok = true;
for (const rel of required) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) {
    console.error(`MISSING: ${rel}`);
    ok = false;
  } else {
    console.log(`OK: ${rel}`);
  }
}

if (!ok) process.exit(1);
console.log("CO-PERF-001 verify: PASS");
