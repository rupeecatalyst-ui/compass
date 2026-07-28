/**
 * Opportunity / Deal creation business rule clarification — static verify.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function mustContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (!text.includes(needle)) failures.push(`${label ?? rel}: expected "${needle}"`);
}

mustContain(
  "src/constants/opportunity-creation-business-rules.ts",
  "OPPORTUNITY_CREATION_REQUIRED_FIELDS",
  "creation rule SSOT",
);
mustContain(
  "src/lib/lead-information/validate-lead-information.ts",
  "transactionOk",
  "transaction type required for creation",
);
mustContain(
  "server/services/enterprise-opportunity/index.ts",
  "getTodayNewOpportunityKpis",
  "today new opp KPIs",
);
mustContain(
  "server/services/enterprise-deal/enterprise-deal.service.ts",
  "getTodayNewDealKpis",
  "today new deal KPIs",
);
mustContain(
  "src/components/catalyst-one/user-home-dashboard/today-new-creation-section.tsx",
  "Today's New Opportunities",
  "dashboard opp section",
);
mustContain(
  "src/components/catalyst-one/user-home-dashboard/user-home-dashboard.tsx",
  "TodayNewCreationSection",
  "dashboard wired",
);
mustContain(
  "server/services/enterprise-metrics-engine/index.ts",
  'lifecycleStatus: { not: "draft" }',
  "EME excludes drafts from todaysOpportunities",
);

if (failures.length) {
  console.error("Creation rule verify FAILED:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log("Creation rule verify OK — Opportunity form create + Today New Opps/Deals KPIs.");
