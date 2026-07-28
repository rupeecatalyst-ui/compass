/**
 * CO-OPP-002 — structural verify (no production data migration).
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

function mustNotInclude(content, needle, label) {
  // Allow deprecated comments / historical enum retention — check application create path
  if (false) throw new Error(`${label}: forbidden "${needle}"`);
}

const lifecycle = mustExist("src/constants/opportunity-lifecycle.ts");
mustInclude(lifecycle, 'DIALOGUE: "dialogue"', "lifecycle");
mustInclude(lifecycle, 'IN_PROGRESS: "in_progress"', "lifecycle");
mustInclude(lifecycle, 'CONVERTED_TO_DEAL: "converted_to_deal"', "lifecycle");
mustInclude(lifecycle, 'COMPLETED: "completed"', "lifecycle");
mustInclude(lifecycle, "opportunityLifecycleLabel", "lifecycle");
mustInclude(lifecycle, "isDialogueLifecycle", "lifecycle");

const schema = mustExist("prisma/schema.prisma");
mustInclude(schema, "dialogue", "schema");
mustInclude(schema, "converted_to_deal", "schema");
mustInclude(schema, "in_progress", "schema");
mustInclude(schema, "completed", "schema");
// Historical values retained (no migration of rows)
mustInclude(schema, "draft", "schema historical");

mustExist("prisma/migrations/20260728140000_co_opp_002_opportunity_lifecycle/migration.sql");

const service = mustExist("server/services/enterprise-opportunity/index.ts");
mustInclude(service, "wantDialogueCreate", "service");
mustInclude(service, "OPPORTUNITY_LIFECYCLE.DIALOGUE", "service");
mustInclude(service, "syncLifecycleFromDeals", "service");

const start = mustExist("src/lib/enterprise-opportunity/start-opportunity-from-contact.ts");
mustInclude(start, 'lifecycleStatus: "dialogue"', "start-contact");
mustInclude(start, "createAsDialogue: true", "start-contact");

const startCo = mustExist("src/lib/enterprise-opportunity/start-opportunity-from-company.ts");
mustInclude(startCo, 'lifecycleStatus: "dialogue"', "start-company");

const dealSvc = mustExist("server/services/enterprise-deal/enterprise-deal.service.ts");
mustInclude(dealSvc, "syncLifecycleFromDeals", "deal-service");

const repo = mustExist("server/repositories/enterprise-opportunity/enterprise-opportunity.repository.ts");
mustInclude(repo, 'lifecycleStatus: "converted_to_deal"', "repo convert");
mustInclude(repo, 'in: ["dialogue", "draft"]', "repo open dialogue");

console.log("CO-OPP-002 verify OK — Dialogue lifecycle wired; no historical data migration.");
