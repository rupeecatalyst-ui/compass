/**
 * Existing Opportunity → Opportunity Creation → Edit Lead Information.
 * Routing only. No database.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildLeadInformationHref } from "./adr-018-routing";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const checks: Array<[string, boolean]> = [];
function check(name: string, passed: boolean) {
  checks.push([name, passed]);
  if (!passed) console.error(`FAIL ${name}`);
}

const internalId = "eopp_internal_130";
const displayNumber = "OPP-2026-000130";
const href = buildLeadInformationHref(internalId);

check("href_uses_lead_information_route", href.startsWith("/lead-information?"));
check("href_uses_internal_opportunity_id", href.includes(`opportunityId=${encodeURIComponent(internalId)}`));
check("href_does_not_use_display_number", !href.includes(displayNumber));

const stage = readFileSync(
  path.join(repoRoot, "src/components/catalyst-one/opportunity-workspace/opportunity-creation-stage.tsx"),
  "utf8",
);
check("creation_stage_labels_edit_lead_information", stage.includes(">Edit Lead Information<"));
check("creation_stage_uses_route_builder", stage.includes("buildLeadInformationHref(opp.id)"));
check("creation_stage_does_not_link_display_number", !stage.includes("buildLeadInformationHref(opp.opportunityNumber)"));
check("creation_stage_does_not_create_opportunity", !stage.includes("createOpportunity"));
check("creation_stage_does_not_create_contact", !stage.includes("registerProgressive") && !stage.includes("createContact"));

const lead = readFileSync(
  path.join(repoRoot, "src/components/catalyst-one/lead-information/lead-information-workspace.tsx"),
  "utf8",
);
check(
  "lead_information_receives_same_opportunity_id",
  lead.includes('searchParams.get("opportunityId")') && lead.includes("getOpportunity(opportunityId)"),
);
check(
  "lead_information_edit_loads_existing_record",
  lead.includes("formFromOpportunity(row)") && !lead.includes("createOpportunity("),
);

const failed = checks.filter(([, passed]) => !passed);
console.log(`LEAD_INFORMATION_EDIT_NAVIGATION_PROOF checks=${checks.length} failed=${failed.length}`);
if (failed.length > 0) process.exit(1);
