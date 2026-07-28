/**
 * CO-OPP-003 — structural verify.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function mustExist(rel) {
  const p = resolve(root, rel);
  if (!existsSync(p)) throw new Error(`Missing: ${rel}`);
  return readFileSync(p, "utf8");
}

function mustInclude(content, needle, label) {
  if (!content.includes(needle)) throw new Error(`${label}: missing "${needle}"`);
}

const sources = mustExist("src/constants/opportunity-business-source.ts");
mustInclude(sources, 'code: "wealth_partner"', "sources");
mustInclude(sources, 'code: "no_cost_referral"', "sources");
mustInclude(sources, "OPPORTUNITY_PARTICIPATION_ROLES", "sources");
mustInclude(sources, "BUSINESS_SOURCE_REPORTING_DIMENSIONS", "sources");

mustExist("src/lib/enterprise-commercial-participation/index.ts");
mustExist(
  "prisma/migrations/20260728200000_co_opp_003_business_source_commercial/migration.sql",
);

const schema = mustExist("prisma/schema.prisma");
mustInclude(schema, "sourceWealthPartnerId", "schema");
mustInclude(schema, "participationRole", "schema");
mustInclude(schema, "commercialReferralSharePercent", "schema");

const lead = mustExist(
  "src/components/catalyst-one/lead-information/lead-information-workspace.tsx",
);
mustInclude(lead, "OPPORTUNITY_PARTICIPATION_ROLES", "lead");
mustInclude(lead, "Referrer Name", "lead");

const wp = mustExist(
  "src/components/catalyst-one/wealth-partner-registry/wealth-partner-workspace.tsx",
);
mustInclude(wp, "Commercial Profile", "wp");
mustInclude(wp, "Referral Revenue Share", "wp");

console.log("CO-OPP-003 verify OK — Business Source & Commercial Participation.");
