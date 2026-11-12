/**
 * Deal-to-Accounting screen clarity. No database and no live records.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildAccountingCaseHref } from "../src/lib/accounting-workspace/resolve-workbench.ts";
import { classifyDealActivity } from "../src/lib/my-deals/classify-deal-activity.ts";
import {
  ACCOUNTING_HANDOFF_EXPLANATION,
  lenderSettlementActions,
  myDealsWonStatusLabel,
} from "../src/lib/post-disbursement-confirmation/settlement-handoff-presentation.ts";

const eligible = lenderSettlementActions({
  caseStage: "disbursed",
  caseSubStage: "fully_disbursed",
  lifecycleStatus: "active",
});
assert.equal(eligible.showInitiateSettlement, true);
assert.equal(eligible.statusLabel, null);
assert.equal(eligible.showConfirmationReceived, false);

for (const subStage of ["first_tranche", "final_tranche"]) {
  const partial = lenderSettlementActions({
    caseStage: "disbursed",
    caseSubStage: subStage,
    lifecycleStatus: "active",
  });
  assert.equal(partial.showInitiateSettlement, false, subStage);
  assert.equal(partial.partialDisbursement, true, subStage);
}

const handedOff = lenderSettlementActions({
  caseStage: "post_disbursement_confirmation",
  caseSubStage: "confirmation_pending",
  lifecycleStatus: "won",
  accountingCaseId: "acct-1",
});
assert.equal(handedOff.showInitiateSettlement, false);
assert.equal(
  handedOff.statusLabel,
  "Settlement Handed Off · WON · Confirmation Pending",
);
assert.equal(handedOff.showConfirmationReceived, true);
assert.equal(handedOff.accountingCaseId, "acct-1");

const confirmed = lenderSettlementActions({
  caseStage: "post_disbursement_confirmation",
  caseSubStage: "confirmation_received",
  lifecycleStatus: "won",
  accountingCaseId: "acct-1",
});
assert.equal(confirmed.showInitiateSettlement, false);
assert.equal(confirmed.showConfirmationReceived, false);
assert.equal(
  confirmed.statusLabel,
  "Settlement Handed Off · WON · Confirmation Received",
);

assert.equal(
  buildAccountingCaseHref("acct-1"),
  "/accounting?case=acct-1",
);

const activeRow = {
  id: "d1",
  enterpriseDealId: "d1",
  dealId: "DEAL-1",
  opportunityNumber: "OPP-1",
  fileNumber: "",
  borrowerName: "",
  contactNumber: "",
  product: "",
  loanAmount: 0,
  loanAmountLabel: "",
  assignedRm: "",
  assignedUsers: [],
  grossStage: "disbursed",
  lenderCaseStage: "disbursed",
  grossStageLabel: "Disbursed",
  subStage: "fully_disbursed",
  selectedLender: "",
  expectedRevenue: 0,
  expectedRevenueLabel: "",
  priority: "low",
  priorityLabel: "",
  probability: "medium",
  probabilityLabel: "",
  healthScore: 0,
  healthLabel: "",
  lastActivity: "",
  lastActivityLabel: "",
  dateCreated: "",
  dateCreatedLabel: "",
  lastModified: "",
  lastModifiedLabel: "",
  status: "on_track",
  statusLabel: "",
  city: "",
  state: "",
  source: "",
  channelPartner: "",
  creditExecutive: "",
  operationsExecutive: "",
  branch: "",
  sanctionAmount: 0,
  sanctionAmountLabel: "",
  disbursedAmount: 0,
  disbursedAmountLabel: "",
  roi: 0,
  roiLabel: "",
  tatDays: 0,
  nextFollowUp: "",
  documentsPending: 0,
  tasksPending: 0,
  riskIndicator: "Low",
  lifecycleStatus: "active",
};
assert.equal(classifyDealActivity(activeRow), "active");
assert.equal(
  classifyDealActivity({ ...activeRow, lifecycleStatus: "won" }),
  "inactive",
);
assert.equal(myDealsWonStatusLabel(activeRow), null);
assert.equal(
  myDealsWonStatusLabel({
    lifecycleStatus: "won",
    subStage: "confirmation_pending",
  }),
  "WON · Confirmation Pending",
);
assert.equal(
  myDealsWonStatusLabel({
    lifecycleStatus: "won",
    subStage: "confirmation_received",
  }),
  "WON · Confirmation Received",
);

const root = new URL("../", import.meta.url);
const pipeline = readFileSync(
  new URL("src/components/catalyst-one/execution/lender-pipeline-board.tsx", root),
  "utf8",
);
const kanban = readFileSync(
  new URL("src/components/catalyst-one/my-deals/my-deals-kanban-card.tsx", root),
  "utf8",
);
const accounting = readFileSync(
  new URL("src/components/catalyst-one/accounting/accounting-workspace.tsx", root),
  "utf8",
);
const invoice = readFileSync(
  new URL(
    "server/services/enterprise-accounting-invoice/enterprise-accounting-invoice.service.ts",
    root,
  ),
  "utf8",
);
assert.match(pipeline, /Open Accounting Case/);
assert.match(pipeline, /buildAccountingCaseHref/);
assert.match(kanban, /overflow-y-hidden/);
assert.match(kanban, /myDealsWonStatusLabel/);
assert.match(accounting, /ACCOUNTING_HANDOFF_EXPLANATION/);
assert.doesNotMatch(accounting, /after Confirmation Received/);
assert.match(ACCOUNTING_HANDOFF_EXPLANATION, /Initiate Settlement/);
assert.match(ACCOUNTING_HANDOFF_EXPLANATION, /Confirmation Pending/);
assert.match(ACCOUNTING_HANDOFF_EXPLANATION, /Raise Invoice/);
assert.ok(invoice.includes("CONFIRMATION_NOT_RECEIVED"));
assert.ok(invoice.includes("ACCOUNTING_CASE_ELIGIBLE_SUB_STAGE"));

console.log(
  JSON.stringify({
    ok: true,
    initiateOnlyWhenEligible: true,
    partialBlocked: true,
    wonStatusPersistent: true,
    initiateHiddenAfterHandoff: true,
    accountingCaseLink: "/accounting?case=acct-1",
    confirmationRemains: true,
    invoiceRuleUnchanged: true,
    activeFilterStillExcludesWon: true,
  }),
);
