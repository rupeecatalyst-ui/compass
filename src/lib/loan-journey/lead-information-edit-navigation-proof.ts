/**
 * Live Opportunity Creation path:
 * /credit-bench → CreditBenchWorkspace → Customer Information Modify
 * → buildLeadInformationHref(resolveOppId)
 * Routing and source reachability only. No database.
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
function read(rel: string) {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}
function between(source: string, start: string, end: string) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  return from >= 0 && to > from ? source.slice(from, to) : "";
}

const internalId = "eopp_internal_130";
const displayNumber = "OPP-2026-000130";
const href = buildLeadInformationHref(internalId);
check("href_uses_lead_information_route", href.startsWith("/lead-information?"));
check("href_uses_internal_opportunity_id", href.includes(`opportunityId=${encodeURIComponent(internalId)}`));
check("href_does_not_use_display_number", !href.includes(displayNumber));

const page = read("src/app/(dashboard)/credit-bench/page.tsx");
check("credit_bench_page_mounts_workspace", page.includes("<CreditBenchWorkspace />"));

const workspace = read("src/components/catalyst-one/credit-bench/credit-bench-workspace.tsx");
const customer = between(workspace, 'title="Customer Information"', 'title="Loan Details"');
const loan = between(workspace, 'title="Loan Details"', 'title="Financial Details"');
check("customer_information_panel_rendered", customer.includes('title="Customer Information"'));
check("customer_modify_label_stays_modify", workspace.includes('{editing ? "Done" : "Modify"}'));
check("customer_modify_uses_lead_information_builder", customer.includes("buildLeadInformationHref(resolveOppId)"));
check("customer_modify_navigates_only", customer.includes("router.push(buildLeadInformationHref(resolveOppId))"));
check(
  "missing_resolve_opp_id_fails_closed",
  customer.indexOf("if (!resolveOppId)") >= 0 &&
    customer.indexOf("if (!resolveOppId)") < customer.indexOf("router.push") &&
    customer.includes("return;"),
);
check(
  "customer_modify_does_not_create_or_write",
  !customer.includes("createOpportunity") &&
    !customer.includes("createContact") &&
    !customer.includes("registerProgressive") &&
    !customer.includes("enterpriseOpportunityApiClient") &&
    !customer.includes("ContactWorkspaceModal"),
);
check(
  "resolve_opp_id_is_enterprise_id",
  workspace.includes('searchParams.get("opportunityId")') &&
    workspace.includes("file.enterpriseOpportunityId") &&
    workspace.includes("const resolveOppId =") &&
    !workspace.includes("opportunityNumber"),
);
check("loan_details_modify_still_opens_sheet", loan.includes("setLoanDetailsOpen(true)") && workspace.includes("<ModifyLoanDetailsSheet"));
check("unmounted_stage_has_no_edit_lead_information", !read("src/components/catalyst-one/opportunity-workspace/opportunity-creation-stage.tsx").includes("Edit Lead Information"));

const lead = read("src/components/catalyst-one/lead-information/lead-information-workspace.tsx");
check(
  "lead_information_edit_mode_receives_opportunity_id",
  lead.includes('searchParams.get("opportunityId")') &&
    lead.includes("getOpportunity(opportunityId)") &&
    lead.includes("formFromOpportunity(row)") &&
    lead.includes('mode="edit"'),
);
check(
  "fcm_operational_loading_unchanged",
  lead.includes("OperationalCustomFieldsCollector") && lead.includes("applicabilityContextReady"),
);

const failed = checks.filter(([, passed]) => !passed);
console.log(`LEAD_INFORMATION_EDIT_NAVIGATION_PROOF checks=${checks.length} failed=${failed.length}`);
if (failed.length > 0) process.exit(1);
