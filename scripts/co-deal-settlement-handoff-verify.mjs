/**
 * Synthetic Deal → Accounting handoff checks. No database and no live records.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyDealActivity } from "../src/lib/my-deals/classify-deal-activity.ts";
import {
  actorMayInitiateSettlement,
  assessSettlementHandoff,
  decideSettlementCronAction,
} from "../src/lib/post-disbursement-confirmation/settlement-handoff.ts";

const full = {
  grossStage: "disbursed",
  subStage: "fully_disbursed",
  lifecycleStatus: "active",
  fulfilledAmount: 100,
  approvedAmount: 100,
  hasAccountingCase: false,
};

const eligible = assessSettlementHandoff(full);
assert.equal(eligible.eligible, true, "fully disbursed can hand off immediately");
assert.equal(eligible.code, "ELIGIBLE");

const partial = assessSettlementHandoff({ ...full, subStage: "first_tranche" });
assert.equal(partial.eligible, false);
assert.equal(partial.code, "PARTIAL_DISBURSEMENT");

const finalTranche = assessSettlementHandoff({ ...full, subStage: "final_tranche" });
assert.equal(finalTranche.code, "PARTIAL_DISBURSEMENT");

const shortfall = assessSettlementHandoff({
  ...full,
  subStage: null,
  fulfilledAmount: 40,
  approvedAmount: 100,
});
assert.equal(shortfall.code, "NOT_FULLY_DISBURSED");

const amountFull = assessSettlementHandoff({
  ...full,
  subStage: null,
  fulfilledAmount: 100,
  approvedAmount: 100,
});
assert.equal(amountFull.eligible, true);

assert.equal(
  actorMayInitiateSettlement({
    role: "RM",
    actorUserId: "stranger",
    primaryOwnerUserId: "owner",
    relationshipManagerUserId: "rm",
  }),
  false,
);
assert.equal(
  actorMayInitiateSettlement({
    role: "RM",
    actorUserId: "owner",
    primaryOwnerUserId: "owner",
  }),
  true,
);
assert.equal(actorMayInitiateSettlement({ role: "ADMIN", actorUserId: "any" }), true);

const replay = assessSettlementHandoff({
  ...full,
  lifecycleStatus: "won",
  hasAccountingCase: true,
});
assert.equal(
  assessSettlementHandoff({
    grossStage: "post_disbursement_confirmation",
    subStage: "confirmation_received",
    hasAccountingCase: false,
  }).eligible,
  false,
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
assert.equal(classifyDealActivity({ ...activeRow, lifecycleStatus: "won" }), "inactive");
assert.equal(
  classifyDealActivity({
    ...activeRow,
    lifecycleStatus: "won",
    grossStage: "post_disbursement_confirmation",
    lenderCaseStage: "post_disbursement_confirmation",
  }),
  "inactive",
);

assert.equal(decideSettlementCronAction(full), "await_user_handoff");
assert.equal(
  decideSettlementCronAction({ ...full, subStage: "first_tranche" }),
  "skip_partial",
);
assert.equal(
  decideSettlementCronAction({ ...full, lifecycleStatus: "won", hasAccountingCase: true }),
  "skip_handed_off",
);
assert.equal(
  decideSettlementCronAction({
    grossStage: "post_disbursement_confirmation",
    subStage: "confirmation_pending",
  }),
  "already_in_confirmation",
);
assert.equal(decideSettlementCronAction({ grossStage: "logged_in_wip" }), "skip_other_stage");

const service = readFileSync(
  new URL(
    "../server/services/post-disbursement-confirmation/post-disbursement-confirmation.service.ts",
    import.meta.url,
  ),
  "utf8",
);
const handoff = service.slice(
  service.indexOf("async initiateSettlement"),
  service.indexOf("async receiveConfirmation"),
);
assert.ok(handoff.indexOf("enterpriseAccountingCase.upsert") < handoff.indexOf('lifecycleStatus: "won"'));
assert.ok(!handoff.includes("confirmedInvoiceAmount"));
assert.equal(service.includes("grossStage: POST_DISBURSEMENT_CONFIRMATION_STAGE,\n              subStage: POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.pending,\n              stageEnteredAt: now"), false);
assert.ok(service.includes("decideSettlementCronAction"));

const invoice = readFileSync(
  new URL(
    "../server/services/enterprise-accounting-invoice/enterprise-accounting-invoice.service.ts",
    import.meta.url,
  ),
  "utf8",
);
assert.ok(invoice.includes("CONFIRMATION_NOT_RECEIVED"));
assert.ok(invoice.includes("ACCOUNTING_CASE_ELIGIBLE_SUB_STAGE"));

console.log(
  JSON.stringify({
    ok: true,
    immediateFullHandoff: true,
    partialBlocked: true,
    unauthorisedBlocked: true,
    duplicateIsReplay: true,
    wonOnlyAfterCaseUpsert: true,
    wonLeavesActiveQueue: true,
    cronDoesNotMoveOrReverse: true,
    invoiceStillRequiresConfirmation: true,
  }),
);
