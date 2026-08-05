/**
 * CO-LW-004 — Lending Programs Executive Dashboard UX (static gates).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const required = [
  "src/components/catalyst-one/lending-programs-workspace/lending-programs-workspace.tsx",
  "src/components/catalyst-one/lending-programs-workspace/lp-dashboard-charts.tsx",
  "src/components/catalyst-one/lending-programs-workspace/chanakya-insights-drawer.tsx",
  "src/lib/lending-programs-workspace/product-families.ts",
  "src/lib/lending-programs-workspace/dashboard-analytics.ts",
  "docs/co-lw-004/CO-LW-004-LENDING-PROGRAMS-DASHBOARD-READINESS-REPORT.md",
];
for (const rel of required) {
  assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
}

const ws = read(
  "src/components/catalyst-one/lending-programs-workspace/lending-programs-workspace.tsx",
);
assert.match(ws, /CO-LW-004/);
assert.match(ws, /CHANAKYA Insights/);
assert.match(ws, /ChanakyaInsightsDrawer/);
assert.match(ws, /LpDashboardCharts/);
assert.match(ws, /buildLpProductFamilies/);
assert.match(ws, /Lender View/);
assert.match(ws, /Product View/);
assert.ok(!/function ChanakyaRail/.test(ws), "Permanent ChanakyaRail must be removed");
assert.ok(!/Relationship Score/i.test(ws), "Must not invent Relationship Score");

const charts = read(
  "src/components/catalyst-one/lending-programs-workspace/lp-dashboard-charts.tsx",
);
assert.match(charts, /Deal Stage Distribution/);
assert.match(charts, /Pipeline Funnel/);
assert.match(charts, /Approval vs Rejection/);
assert.match(charts, /Product Mix/);
assert.match(charts, /Programme Coverage/);
assert.match(charts, /City Distribution/);
assert.match(charts, /Relationship Signals/);
assert.match(charts, /Monthly Disbursal Trend/);
assert.match(charts, /Average Turnaround/);

const families = read("src/lib/lending-programs-workspace/product-families.ts");
assert.match(families, /buildLpProductFamilies/);
assert.match(families, /LP_PRODUCT_FAMILY_DEFINITIONS/);

const consts = read("src/constants/lending-programs-workspace.ts");
assert.match(consts, /Home Loan/);
assert.match(consts, /Loan Against Property/);
assert.match(consts, /LP_PRODUCT_FAMILY_DEFINITIONS/);

const drawer = read(
  "src/components/catalyst-one/lending-programs-workspace/chanakya-insights-drawer.tsx",
);
assert.match(drawer, /Pin/);
assert.match(drawer, /LENDING_PROGRAMS_CHANAKYA_PIN_KEY/);

const page = read("src/app/(dashboard)/lenders/page.tsx");
assert.match(page, /CO-LW-004/);

console.log("CO-LW-004 verify: PASS");
