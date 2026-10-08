/**
 * Phase B Step 1 — Operational Desk read model.
 * Grouping, filters, labels, and expand state. No scoring changes.
 */
import assert from "node:assert/strict";
import {
  applyDeskRefresh,
  cycleDeskArea,
  dealTableRows,
  deskFlex,
  deskGridLabels,
  deskFilterCatalog,
  filterDesk,
  sanitizeDeskFilters,
  systemDefaultDeskFilters,
  groupDealsByOpportunity,
  nextActionPanel,
  permittedDeskStageTargets,
  isActiveUnconvertedOpportunity,
  joinPagedItems,
  mapRegistryDealToDeskInput,
  pageCount,
  projectDeskDeals,
  type DeskDealInput,
  type DeskOpportunity,
} from "../src/lib/case-workbench/operational-desk";

const opportunities: DeskOpportunity[] = [
  {
    id: "opp-uuid-1",
    opportunityNumber: "OPP-100",
    customerName: "Asha Mehta",
    product: "Home Loan",
    stageLabel: "Requirement Captured",
    status: "requirement_captured",
    updatedAt: "2026-10-08T10:00:00.000Z",
    amountLabel: "₹1,00,00,000",
  },
  {
    id: "opp-uuid-2",
    opportunityNumber: "OPP-200",
    customerName: "Asha Mehta",
    product: "Loan Against Property",
    stageLabel: "In Progress",
    status: "in_progress",
    updatedAt: "2026-10-07T10:00:00.000Z",
    amountLabel: "₹50,00,000",
  },
  {
    id: "opp-uuid-3",
    opportunityNumber: "OPP-300",
    customerName: "Closed Case",
    product: "Home Loan",
    stageLabel: "Converted to Deal",
    status: "converted_to_deal",
    updatedAt: "2026-10-09T10:00:00.000Z",
    amountLabel: "₹10,00,000",
  },
];

const deals: DeskDealInput[] = [
  {
    id: "radar-1",
    enterpriseDealId: "deal-uuid-hdfc",
    fileId: "file-1",
    borrower: "Asha Mehta",
    lender: "HDFC Bank",
    stageLabel: "Logged In",
    product: "Home Loan",
    loanAmountLabel: "₹1,00,00,000",
    lastActivity: "2026-10-06T09:00:00.000Z",
    lastActivityLabel: "06 Oct 2026",
    opportunityId: "opp-uuid-1",
    opportunityNumber: "OPP-100",
  },
  {
    id: "radar-2",
    enterpriseDealId: "deal-uuid-sbi",
    fileId: "file-2",
    borrower: "Different Display Name",
    lender: "State Bank of India",
    stageLabel: "Sanctioned",
    grossStage: "soft_approved",
    product: "Home Loan",
    loanAmountLabel: "₹1,00,00,000",
    lastActivity: "2026-10-08T09:00:00.000Z",
    lastActivityLabel: "08 Oct 2026",
    opportunityId: "opp-uuid-1",
    opportunityNumber: "OPP-100",
  },
  {
    id: "radar-3",
    enterpriseDealId: "deal-uuid-lap",
    fileId: "file-3",
    borrower: "Asha Mehta",
    lender: "ICICI Bank",
    stageLabel: "Logged In",
    product: "Loan Against Property",
    loanAmountLabel: "₹50,00,000",
    lastActivity: "2026-10-05T09:00:00.000Z",
    lastActivityLabel: "05 Oct 2026",
    opportunityId: "opp-uuid-2",
    opportunityNumber: "OPP-200",
  },
  {
    id: "radar-4",
    enterpriseDealId: "deal-uuid-orphan",
    fileId: "file-4",
    borrower: "Asha Mehta",
    lender: "Axis Bank",
    stageLabel: "Logged In",
    product: "Home Loan",
    loanAmountLabel: "₹20,00,000",
    lastActivity: "2026-10-04T09:00:00.000Z",
    lastActivityLabel: "04 Oct 2026",
    opportunityId: null,
    opportunityNumber: null,
  },
];

assert.equal(isActiveUnconvertedOpportunity("requirement_captured"), true);
assert.equal(isActiveUnconvertedOpportunity("converted_to_deal"), false);
assert.equal(isActiveUnconvertedOpportunity("won"), false);

const projected = projectDeskDeals(deals);
const groups = groupDealsByOpportunity(projected);

assert.equal(groups.length, 3, "same customer name must not collapse different opportunities");
const homeLoan = groups.find((group) => group.relationshipKey === "opportunity:opp-uuid-1");
assert.ok(homeLoan, "parallel deals share the opportunity id");
assert.deepEqual(
  homeLoan.deals.map((deal) => deal.lenderName),
  ["State Bank of India", "HDFC Bank"],
  "newer activity stays first inside the group",
);
assert.equal(homeLoan.customerName, "Different Display Name");
assert.equal(
  groups.some((group) => group.relationshipKey === "deal:deal-uuid-orphan"),
  true,
  "a deal without an opportunity relationship stays alone",
);

const catalog = deskFilterCatalog([]);
const defaults = systemDefaultDeskFilters(catalog);
const filtered = filterDesk(opportunities, groups, { ...defaults, query: "asha" }, catalog);
assert.equal(filtered.opportunities.length, 2, "converted opportunities stay off the desk");
assert.equal(
  filtered.opportunities.some((row) => row.status === "converted_to_deal"),
  false,
);
assert.equal(filtered.groups.length, 3, "name search still keeps separate relationships");

const stageFiltered = filterDesk(
  opportunities,
  groups,
  { ...defaults, query: "", dealStages: ["soft_approved"], products: ["HOME_LOAN"] },
  catalog,
);
assert.equal(stageFiltered.groups.length, 1);
assert.equal(stageFiltered.groups[0]?.deals.length, 1);
assert.equal(stageFiltered.groups[0]?.deals[0]?.lenderName, "State Bank of India");

const labels = deskGridLabels(
  filtered.opportunities,
  groups,
);
for (const label of labels) {
  assert.equal(label.includes("OPP-"), false, label);
  assert.equal(label.includes("DEAL-"), false, label);
  assert.equal(label.includes("uuid"), false, label);
}
assert.ok(labels.includes("HDFC Bank"));
assert.ok(labels.includes("State Bank of India"));
assert.ok(labels.includes("ICICI Bank"));
assert.ok(labels.includes("Axis Bank"));

const legacy = projectDeskDeals([
  { ...deals[0], opportunityId: null },
  { ...deals[1], opportunityId: null },
]);
const legacyGroups = groupDealsByOpportunity(legacy);
assert.equal(legacyGroups.length, 1);
assert.equal(legacyGroups[0]?.relationshipKey, "opportunity-number:OPP-100");

const sameName = projectDeskDeals([
  deals[0],
  { ...deals[2], borrower: deals[0].borrower },
]);
assert.equal(groupDealsByOpportunity(sameName).length, 2, "same customer name stays split by opportunityId");

const unnamed = projectDeskDeals([
  { ...deals[3], borrower: "Asha Mehta" },
  { ...deals[3], id: "other", enterpriseDealId: "deal-uuid-other", borrower: "Asha Mehta" },
]);
assert.equal(groupDealsByOpportunity(unnamed).length, 2, "missing opportunityId does not group by name");

const loggedIn = mapRegistryDealToDeskInput({
  id: "deal-uuid-sbi",
  opportunityId: "opp-uuid-1",
  primaryContactName: "Asha Mehta",
  primaryCounterpartyName: "State Bank of India",
  grossStage: "Logged In",
  productLabel: "Home Loan",
  requestedAmount: 10000000,
  updatedAt: "2026-10-06T09:00:00.000Z",
});
const sanctioned = mapRegistryDealToDeskInput({
  id: "deal-uuid-sbi",
  opportunityId: "opp-uuid-1",
  primaryContactName: "Asha Mehta",
  primaryCounterpartyName: "State Bank of India",
  grossStage: "Sanctioned",
  productLabel: "Home Loan",
  requestedAmount: 10000000,
  updatedAt: "2026-10-08T09:00:00.000Z",
});
assert.ok(loggedIn && sanctioned);
const refreshed = applyDeskRefresh([loggedIn], { ok: true, data: [sanctioned] });
assert.equal(refreshed.error, null);
assert.equal(refreshed.data[0]?.stageLabel, "Sanctioned");
const failed = applyDeskRefresh([loggedIn], { ok: false, message: "Deal update failed." });
assert.equal(failed.data[0]?.stageLabel, "Logged In");
assert.equal(failed.error, "Deal update failed.");

assert.equal(pageCount(250, 100), 3);
const paged = joinPagedItems([
  { items: Array.from({ length: 100 }, (_, i) => i), total: 250 },
  { items: Array.from({ length: 100 }, (_, i) => i + 100), total: 250 },
  { items: Array.from({ length: 50 }, (_, i) => i + 200), total: 250 },
]);
assert.equal(paged.complete, true);
assert.equal(paged.items.length, 250);
const truncated = joinPagedItems([{ items: Array.from({ length: 100 }, (_, i) => i), total: 250 }]);
assert.equal(truncated.complete, false);

assert.equal(cycleDeskArea("split", "opportunities"), "opportunities");
assert.equal(cycleDeskArea("opportunities", "opportunities"), "split");
assert.equal(cycleDeskArea("split", "deals"), "deals");
assert.equal(cycleDeskArea("deals", "deals"), "split");

const fiveLenders = ["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank"].map(
  (lender, index) => ({
    ...deals[0],
    id: `five-${index}`,
    enterpriseDealId: `deal-five-${index}`,
    lender,
    borrower: "Asha Mehta",
    opportunityId: "opp-uuid-1",
  }),
);
const fiveGroups = groupDealsByOpportunity(projectDeskDeals(fiveLenders));
assert.equal(fiveGroups.length, 1);
const fiveRows = dealTableRows(fiveGroups);
assert.equal(fiveRows.length, 5);
assert.equal(fiveRows[0]?.customerSpan, 5);
assert.equal(fiveRows.slice(1).every((row) => row.customerSpan === 0), true);
assert.equal(new Set(fiveRows.map((row) => row.deal.id)).size, 5);

assert.deepEqual(permittedDeskStageTargets("lost"), []);
assert.equal(permittedDeskStageTargets("logged_in_wip").includes("soft_approved"), true);
assert.equal(permittedDeskStageTargets("logged_in_wip").includes("post_disbursement_confirmation"), false);
assert.equal(permittedDeskStageTargets("disbursed").length, 0);

const closedFlex = deskFlex("split", "closed");
assert.equal(closedFlex.opportunities, 0.4);
assert.equal(closedFlex.deals, 0.6);
assert.equal(closedFlex.action, 0);
const openFlex = deskFlex("split", "open");
assert.equal(openFlex.action, 0.35);
assert.ok(Math.abs(openFlex.opportunities + openFlex.deals - 0.65) < 0.001);

assert.equal(nextActionPanel("open", "collapse"), "collapsed");
assert.equal(nextActionPanel("collapsed", "expand"), "open");
assert.equal(nextActionPanel("collapsed", "close"), "closed");

const none = filterDesk(opportunities, groups, { ...defaults, opportunityStages: [] }, catalog);
assert.equal(none.opportunities.length, 0, "an empty Opportunity Stage selection is not All");
const lostHidden = filterDesk(
  opportunities,
  groups,
  { ...defaults, opportunityStages: ["lost"] },
  catalog,
);
assert.equal(lostHidden.opportunities.length, 0, "closed Opportunity stages stay off the desk");
const cleaned = sanitizeDeskFilters(
  { opportunityStages: ["dialogue", "not-a-stage"], dealStages: [], products: ["HOME_LOAN"], owners: ["missing-user"] },
  catalog,
);
assert.deepEqual(cleaned.opportunityStages, ["dialogue"]);
assert.deepEqual(cleaned.dealStages, []);
assert.deepEqual(cleaned.products, ["HOME_LOAN"]);
assert.deepEqual(cleaned.owners, []);
assert.equal(sanitizeDeskFilters(null, catalog).dealStages.includes("logged_in_wip"), true);

console.log("CO-CHANAKYA-RADAR-OPERATIONAL-DESK-STEP1 PASS");
