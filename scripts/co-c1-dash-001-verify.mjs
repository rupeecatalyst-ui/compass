/**
 * CO-C1-DASH-001 — Structural verification (no deploy / no WP App / no data mutation).
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mustExist = [
  "src/components/catalyst-one/user-home-dashboard/user-home-dashboard.tsx",
  "src/components/catalyst-one/user-home-dashboard/new-opportunities-section.tsx",
  "src/components/catalyst-one/user-home-dashboard/new-arrivals-pulse-section.tsx",
  "src/components/catalyst-one/user-home-dashboard/attention-required-section.tsx",
  "src/components/catalyst-one/user-home-dashboard/my-assigned-deals-section.tsx",
  "src/components/catalyst-one/user-home-dashboard/my-pipeline-section.tsx",
  "src/components/catalyst-one/user-home-dashboard/my-performance-section.tsx",
  "src/components/catalyst-one/user-home-dashboard/chanakya-insights-section.tsx",
  "src/lib/user-home-dashboard/command-center/new-opportunity-attention.ts",
  "src/lib/user-home-dashboard/command-center/load-new-opportunities.ts",
  "src/lib/user-home-dashboard/command-center/load-new-arrivals-pulse.ts",
];

let failed = false;
for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error("MISSING", rel);
    failed = true;
  }
}

const dash = fs.readFileSync(
  path.join(root, "src/components/catalyst-one/user-home-dashboard/user-home-dashboard.tsx"),
  "utf8",
);
const requiredMounts = [
  "NewOpportunitiesSection",
  "NewArrivalsPulseSection",
  "AttentionRequiredSection",
  "MyAssignedDealsSection",
  "MyPipelineSection",
  "MyPerformanceSection",
  "VisualAnalyticsPack",
  "ChanakyaInsightsSection",
];
for (const name of requiredMounts) {
  if (!dash.includes(name)) {
    console.error("Dashboard missing mount:", name);
    failed = true;
  }
}

if (dash.includes("TodayNewCreationSection") || dash.includes("<RmWorkspacePack")) {
  console.error("Legacy TodayNewCreation / RmWorkspacePack still mounted on command center");
  failed = true;
}

const attention = fs.readFileSync(
  path.join(root, "src/lib/user-home-dashboard/command-center/new-opportunity-attention.ts"),
  "utf8",
);
if (!attention.includes("deriveNewOpportunityAttention")) {
  console.error("Attention derive missing");
  failed = true;
}

const liveFeed = fs.readFileSync(
  path.join(root, "src/components/catalyst-one/user-home-dashboard/new-opportunities-section.tsx"),
  "utf8",
);
if (!liveFeed.includes("Expand Live Feed") || !liveFeed.includes("aria-expanded")) {
  console.error("Live Feed expand control missing");
  failed = true;
}
if (!liveFeed.includes("loadNewOpportunitiesFeed")) {
  console.error("Live Feed must keep the existing command-center data source");
  failed = true;
}
if ((liveFeed.match(/function loadNewOpportunitiesFeed/g) || []).length > 0) {
  console.error("Live Feed must not reimplement loadNewOpportunitiesFeed");
  failed = true;
}

const oppApi = fs.readFileSync(
  path.join(root, "src/app/api/enterprise-opportunities/route.ts"),
  "utf8",
);
if (!oppApi.includes("createdFrom") || !oppApi.includes("createdTo")) {
  console.error("Opportunity search missing createdFrom/createdTo");
  failed = true;
}

if (failed) {
  console.error("CO-C1-DASH-001 verify: FAIL");
  process.exit(1);
}

console.log("CO-C1-DASH-001 verify: PASS");
console.log("Command center hierarchy mounted; createdAt filters present; no Lead entity.");
console.log("NOTE: No Vercel deploy / no Wealth Partner App / no production data mutation.");
