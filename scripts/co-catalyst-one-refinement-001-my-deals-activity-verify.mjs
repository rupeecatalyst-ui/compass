/**
 * CO-CATALYST-ONE-REFINEMENT-001 — My Deals Active / Inactive classification verifier.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyDealActivity,
  countDealsByActivity,
  matchesDealActivityFilter,
} from "../src/lib/my-deals/classify-deal-activity.ts";
import { filterDealRegistryRows } from "../src/lib/my-deals/deal-registry.ts";
import { groupDealRowsByOpportunity } from "../src/lib/my-deals/group-opportunities.ts";
import {
  EMPTY_DEAL_REGISTRY_FILTERS,
} from "../src/types/deal-registry.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  const abs = join(root, rel);
  assert.ok(existsSync(abs), `Missing: ${rel}`);
  return readFileSync(abs, "utf8");
}

function mustContain(rel, needle) {
  assert.ok(read(rel).includes(needle), `${rel}: expected "${needle}"`);
}

function row(partial) {
  return {
    id: partial.id,
    dealId: partial.dealId ?? `DEAL-${partial.id}`,
    opportunityNumber: partial.opportunityNumber ?? "OPP-2026-000001",
    opportunityId: partial.opportunityId ?? "opp-1",
    fileNumber: partial.fileNumber ?? "LF-1",
    borrowerName: partial.borrowerName ?? "Test Borrower",
    contactNumber: "—",
    product: partial.product ?? "Home Loan",
    loanAmount: partial.loanAmount ?? 1_000_000,
    loanAmountLabel: "₹10,00,000",
    assignedRm: "RM",
    assignedUsers: [],
    grossStage: partial.grossStage ?? "pre_login",
    lenderCaseStage: partial.lenderCaseStage,
    grossStageLabel: partial.grossStageLabel ?? partial.lenderCaseStage,
    subStage: "—",
    selectedLender: partial.selectedLender ?? "HDFC Bank",
    expectedRevenue: 0,
    expectedRevenueLabel: "₹0",
    priority: "medium",
    lastActivity: "2026-08-28T00:00:00.000Z",
    lastActivityLabel: "—",
    dateCreated: "2026-08-01T00:00:00.000Z",
    dateCreatedLabel: "—",
    lastModified: "2026-08-28T00:00:00.000Z",
    lastModifiedLabel: "—",
    status: partial.status ?? "on_track",
    statusLabel: partial.statusLabel ?? "on track",
    city: "—",
    state: "—",
    source: "—",
    channelPartner: "—",
    creditExecutive: "—",
    operationsExecutive: "—",
    branch: "—",
    sanctionAmount: 0,
    sanctionAmountLabel: "₹0",
    disbursedAmount: 0,
    disbursedAmountLabel: "₹0",
    roi: 0,
    roiLabel: "—",
    tatDays: 0,
    nextFollowUp: "—",
    documentsPending: 0,
    tasksPending: 0,
    riskIndicator: "Low",
    ...partial,
  };
}

// CASE 1–5, 6–9 — stage classification
assert.equal(classifyDealActivity(row({ id: "1", lenderCaseStage: "prelogin" })), "active");
assert.equal(
  classifyDealActivity(row({ id: "2", lenderCaseStage: "logged_in_wip" })),
  "active",
);
assert.equal(
  classifyDealActivity(row({ id: "3", lenderCaseStage: "soft_approved" })),
  "active",
);
assert.equal(
  classifyDealActivity(row({ id: "4", lenderCaseStage: "final_approved" })),
  "active",
);
assert.equal(
  classifyDealActivity(row({ id: "5", lenderCaseStage: "closure_wip" })),
  "active",
);
assert.equal(classifyDealActivity(row({ id: "6", lenderCaseStage: "hold" })), "inactive");
assert.equal(classifyDealActivity(row({ id: "7", lenderCaseStage: "lost" })), "inactive");
assert.equal(
  classifyDealActivity(
    row({ id: "8", lenderCaseStage: "logged_in_wip", status: "rejected" }),
  ),
  "inactive",
);
assert.equal(
  classifyDealActivity(
    row({ id: "9", lenderCaseStage: "post_disbursement_confirmation" }),
  ),
  "inactive",
);
assert.equal(
  classifyDealActivity(row({ id: "9b", lenderCaseStage: "disbursed" })),
  "active",
);
assert.equal(
  classifyDealActivity(row({ id: "9c", lenderCaseStage: "disbursed", status: "completed" })),
  "inactive",
);

// CASE 10 — mixed opportunity
const mixedRows = [
  row({
    id: "10a",
    lenderCaseStage: "logged_in_wip",
    selectedLender: "HDFC Bank",
    opportunityId: "opp-mixed",
  }),
  row({
    id: "10b",
    lenderCaseStage: "lost",
    selectedLender: "Axis Bank",
    opportunityId: "opp-mixed",
  }),
];
const activeMixed = filterDealRegistryRows(mixedRows, {
  ...EMPTY_DEAL_REGISTRY_FILTERS,
  activity: "active",
});
assert.equal(activeMixed.length, 1);
assert.equal(activeMixed[0]?.selectedLender, "HDFC Bank");
const activeGroups = groupDealRowsByOpportunity(activeMixed);
assert.equal(activeGroups.length, 1);
assert.equal(activeGroups[0]?.deals.length, 1);

// CASE 11 — all inactive opportunity hidden from active view
const allInactive = [
  row({ id: "11a", lenderCaseStage: "hold", opportunityId: "opp-inactive" }),
  row({ id: "11b", lenderCaseStage: "lost", opportunityId: "opp-inactive" }),
];
const activeAllInactive = filterDealRegistryRows(allInactive, {
  ...EMPTY_DEAL_REGISTRY_FILTERS,
  activity: "active",
});
assert.equal(activeAllInactive.length, 0);
assert.equal(groupDealRowsByOpportunity(activeAllInactive).length, 0);

// CASE 12 — inactive view
const inactiveView = filterDealRegistryRows(mixedRows, {
  ...EMPTY_DEAL_REGISTRY_FILTERS,
  activity: "inactive",
});
assert.equal(inactiveView.length, 1);
assert.equal(inactiveView[0]?.selectedLender, "Axis Bank");

// CASE 13 — all deals
const allView = filterDealRegistryRows(mixedRows, {
  ...EMPTY_DEAL_REGISTRY_FILTERS,
  activity: "all",
});
assert.equal(allView.length, 2);

// CASE 14 — activity + deal stage compose
const stageRows = [
  row({ id: "14a", lenderCaseStage: "soft_approved", opportunityId: "opp-stage" }),
  row({ id: "14b", lenderCaseStage: "hold", opportunityId: "opp-stage" }),
];
const composed = filterDealRegistryRows(stageRows, {
  ...EMPTY_DEAL_REGISTRY_FILTERS,
  activity: "active",
  grossStage: "soft_approved",
});
assert.equal(composed.length, 1);
assert.equal(composed[0]?.lenderCaseStage, "soft_approved");

// CASE 15 — search within activity universe
const searchRows = [
  row({
    id: "15a",
    lenderCaseStage: "logged_in_wip",
    borrowerName: "Pioneer Corp",
    opportunityId: "opp-search",
  }),
  row({
    id: "15b",
    lenderCaseStage: "lost",
    borrowerName: "Pioneer Corp",
    opportunityId: "opp-search",
  }),
];
const searchActive = filterDealRegistryRows(searchRows, {
  ...EMPTY_DEAL_REGISTRY_FILTERS,
  activity: "active",
  search: "Pioneer",
});
assert.equal(searchActive.length, 1);
assert.equal(searchActive[0]?.lenderCaseStage, "logged_in_wip");

// CASE 16–17 — KPI counts
const kpiRows = [
  row({ id: "k1", lenderCaseStage: "logged_in_wip", opportunityId: "opp-a" }),
  row({ id: "k2", lenderCaseStage: "lost", opportunityId: "opp-a" }),
  row({ id: "k3", lenderCaseStage: "hold", opportunityId: "opp-b" }),
];
const kpiFiltered = filterDealRegistryRows(kpiRows, {
  ...EMPTY_DEAL_REGISTRY_FILTERS,
  activity: "active",
});
assert.equal(countDealsByActivity(kpiFiltered, "active"), kpiFiltered.length);
assert.equal(groupDealRowsByOpportunity(kpiFiltered).length, 1);

// UI / SSOT wiring
mustContain("src/lib/my-deals/classify-deal-activity.ts", "classifyDealActivity");
mustContain("src/types/deal-registry.ts", 'activity: "active"');
mustContain(
  "src/components/catalyst-one/my-deals/deal-lender-journey-board.tsx",
  'aria-label="Activity"',
);
mustContain(
  "src/components/catalyst-one/my-deals/deal-lender-journey-board.tsx",
  "countDealsByActivity",
);

console.log("CO-CATALYST-ONE-REFINEMENT-001 VERIFY PASSED");
