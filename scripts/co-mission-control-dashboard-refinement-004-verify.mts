/**
 * CO-REFINEMENT-004 — Mission Control Enterprise Dashboard integration verify.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { deriveOperationsIntelligenceFromEbi } from "../src/lib/mission-control-enterprise-intelligence/derive-operations-from-ebi.ts";
import type { EbiSnapshot } from "../src/types/enterprise-business-intelligence.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  const abs = join(root, rel);
  assert.ok(existsSync(abs), `Missing: ${rel}`);
  return readFileSync(abs, "utf8");
}

function mustContain(rel: string, needle: string, label?: string) {
  assert.ok(read(rel).includes(needle), `${label ?? rel}: expected "${needle}"`);
}

mustContain(
  "src/mission-control/feature-registry/registry.ts",
  'route: "/mission-control/enterprise-intelligence"',
  "MC Enterprise Intelligence route",
);
assert.ok(
  !read("src/mission-control/feature-registry/registry.ts").includes(
    'id: "mc-enterprise-intelligence",\n    displayName: "Enterprise Intelligence",\n    route: "/reports"',
  ),
  "mc-enterprise-intelligence must not route to /reports",
);

mustContain(
  "src/app/(mission-control)/mission-control/enterprise-intelligence/page.tsx",
  "EnterpriseIntelligencePage",
);
mustContain(
  "src/app/(dashboard)/reports/page.tsx",
  "MISSION_CONTROL_ENTERPRISE_INTELLIGENCE",
  "/reports redirects to MC",
);
mustContain(
  "src/mission-control/enterprise-intelligence/EnterpriseIntelligencePlatform.tsx",
  "McAnalyticsExpandCard",
);
mustContain(
  "src/mission-control/enterprise-intelligence/EnterpriseIntelligencePlatform.tsx",
  "flex flex-col gap-4",
  "one card per row",
);
mustContain(
  "src/components/catalyst-one/operations-intelligence/operations-intelligence-workspace.tsx",
  "loadMissionControlCertifiedSnapshot",
);
mustContain(
  "src/components/catalyst-one/operations-intelligence/operations-intelligence-workspace.tsx",
  "McAnalyticsExpandCard",
);
mustContain(
  "src/components/catalyst-one/operations-intelligence/operations-intelligence-workspace.tsx",
  "flex flex-col gap-4",
);
mustContain(
  "src/mission-control/executive-decision-workspace/providers.ts",
  "loadMissionControlCertifiedSnapshot",
);
mustContain(
  "src/components/catalyst-one/executive-intelligence/executive-intelligence-workspace.tsx",
  "flex flex-col gap-6",
  "EI workspace single column",
);

const sampleEbi: EbiSnapshot = {
  asOf: new Date().toISOString(),
  executive: {
    asOf: new Date().toISOString(),
    activeOpportunities: 2,
    activeDeals: 5,
    dealsByStage: [
      { name: "Logged In – WIP", count: 3, value: 3000000 },
      { name: "Final Approved", count: 2, value: 5000000 },
    ],
    dealsByProduct: [{ name: "Home Loan", count: 4, value: 4000000 }],
    dealsByBranch: [],
    dealsByRm: [{ name: "Amit Sharma", count: 2, value: 2000000 }],
    averageDealSize: 1000000,
    averageProcessingDays: 12,
    pipelineValue: 8000000,
    conversionRatioPct: 40,
    expectedRevenue: 120000,
    sourceModules: ["test"],
  },
  operational: {
    asOf: new Date().toISOString(),
    tasksDueToday: 1,
    overdueTasks: 2,
    averageTaskCompletionHours: null,
    inactiveOpportunities: 0,
    dealsAwaitingDocuments: 1,
    dealsAwaitingLenderAction: 0,
    documentCollectionProgressPct: 55,
    completedTasksToday: 0,
    sourceModules: ["test"],
  },
  team: { asOf: new Date().toISOString(), members: [], sourceModules: ["test"] },
  health: {
    asOf: new Date().toISOString(),
    overallScore: 72,
    status: "healthy",
    dimensions: [{ id: "exec", label: "Execution", score: 70, status: "healthy", detail: "ok" }],
    summary: "ok",
    sourceModules: ["test"],
  },
  insights: [],
};

const ops = deriveOperationsIntelligenceFromEbi(sampleEbi);
assert.equal(ops.hasData, true);
assert.equal(ops.funnel.length, 2);
assert.equal(ops.treemap[0]?.name, "Home Loan");
assert.equal(ops.radar[0]?.axis, "Execution");

console.log("CO-REFINEMENT-004 verify OK — MC shell · one-per-row · expand · EBI SSOT.");
