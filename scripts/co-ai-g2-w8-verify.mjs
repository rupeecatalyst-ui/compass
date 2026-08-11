/**
 * CO-AI-G2-W8 — Shadow Mode Dashboard verify + emit PO report.
 * No customer access · No Hybrid Cutover · No deploy.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

assert.equal(
  existsSync(join(root, "docs/co-ai-g2-w8/CO-AI-G2-W8-SHADOW-MODE-DASHBOARD.md")),
  true,
);
assert.equal(
  existsSync(
    join(root, "src/app/(dashboard)/admin/shadow-mode-dashboard/page.tsx"),
  ),
  true,
);
assert.equal(
  existsSync(join(root, "src/app/api/admin/shadow-mode-dashboard/route.ts")),
  true,
);

const {
  EAO_SHADOW_DASHBOARD_VERSION,
  EAO_SHADOW_DASHBOARD_FIXTURES,
  buildEaoShadowDashboardSnapshot,
  formatEaoShadowDashboardMarkdown,
} = await import(
  "../src/lib/enterprise-ai-orchestrator/shadow-dashboard/index.ts"
);

assert.equal(EAO_SHADOW_DASHBOARD_VERSION, "1.0.0-g2-w8");
assert.ok(EAO_SHADOW_DASHBOARD_FIXTURES.length >= 3);

const snapshot = buildEaoShadowDashboardSnapshot({
  title: "CO-AI-G2-W8 Shadow Mode Dashboard — Product Owner Report",
  rows: EAO_SHADOW_DASHBOARD_FIXTURES,
});

assert.equal(snapshot.customerIsolated, true);
assert.equal(snapshot.customerAccess, false);
assert.equal(snapshot.audience, "product_owner_only");
assert.equal(snapshot.rows.length, EAO_SHADOW_DASHBOARD_FIXTURES.length);

for (const row of snapshot.rows) {
  assert.ok(row.currentSarathiResponse.length > 0);
  assert.ok(row.reasoningModelResponse.length > 0);
  assert.ok(typeof row.benchmarkScore === "number");
  assert.ok(typeof row.policyScore === "number");
  assert.ok(typeof row.consultationScore === "number");
  assert.ok(typeof row.latencyMs === "number");
  assert.ok(typeof row.estimatedCostUsd === "number");
  assert.ok(row.benchmarkScore >= 0 && row.benchmarkScore <= 100);
  assert.ok(row.policyScore >= 0 && row.policyScore <= 100);
  assert.ok(row.consultationScore >= 0 && row.consultationScore <= 100);
}

assert.ok(typeof snapshot.averages.benchmarkScore === "number");
assert.ok(typeof snapshot.averages.policyScore === "number");
assert.ok(typeof snapshot.averages.consultationScore === "number");
assert.ok(typeof snapshot.averages.latencyMs === "number");
assert.ok(typeof snapshot.averages.estimatedCostUsd === "number");

const md = formatEaoShadowDashboardMarkdown(snapshot);
assert.match(md, /Current SARATHI Response/);
assert.match(md, /Reasoning Model Response/);
assert.match(md, /Gold Standard Response/);
assert.match(md, /Benchmark Score/);
assert.match(md, /Policy Score/);
assert.match(md, /Consultation Score/);
assert.match(md, /Latency/);
assert.match(md, /Estimated Cost/);
assert.match(md, /No customer access/);
assert.match(md, /product_owner_only/);

// Customer SARATHI surfaces must not import dashboard
assert.doesNotMatch(
  read("src/components/catalyst-one/sarathi/sarathi-conversation-workspace.tsx"),
  /shadow-dashboard|ShadowModeDashboard/,
);
assert.doesNotMatch(
  read("src/components/catalyst-one/sarathi/conversation-composer.tsx"),
  /shadow-dashboard|ShadowModeDashboard/,
);

// API gated to admins
const api = read("src/app/api/admin/shadow-mode-dashboard/route.ts");
assert.match(api, /requireAdministrator|SUPER_ADMIN/);
assert.match(api, /customerIsolated|product_owner|Shadow Mode Dashboard/i);

// Route present
assert.match(read("src/constants/routes.ts"), /ADMIN_SHADOW_MODE_DASHBOARD/);
assert.match(
  read("src/constants/administration-console.ts"),
  /shadow-mode-dashboard/,
);

const outDir = join(root, "docs/co-ai-g2-w8");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "CO-AI-G2-W8-SHADOW-DASHBOARD-REPORT.md"), md, "utf8");
writeFileSync(
  join(outDir, "CO-AI-G2-W8-SHADOW-DASHBOARD-REPORT.json"),
  JSON.stringify(snapshot, null, 2),
  "utf8",
);

console.log(
  `CO-AI-G2-W8 verify: PASS (rows=${snapshot.rows.length}, avgBenchmark=${snapshot.averages.benchmarkScore}, customerAccess=false)`,
);
