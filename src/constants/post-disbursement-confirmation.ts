export const POST_DISBURSEMENT_CONFIRMATION_STAGE =
  "post_disbursement_confirmation" as const;

export const POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES = {
  pending: "confirmation_pending",
  received: "confirmation_received",
} as const;

/**
 * Historical schedule clock only. It is not a prerequisite for
 * Initiate Settlement. A fully disbursed Deal can hand off immediately.
 */
export const POST_DISBURSEMENT_CONFIRMATION_DELAY_HOURS = 72;

export const FULL_DISBURSEMENT_SUB_STAGE = "fully_disbursed" as const;

export const PARTIAL_DISBURSEMENT_SUB_STAGES = [
  "first_tranche",
  "final_tranche",
] as const;

/** Accounting Case source for operational handoff. Not lender confirmation. */
export const SETTLEMENT_HANDOFF_SOURCE = "settlement_handoff" as const;

export const POST_DISBURSEMENT_EVENT_SOURCE =
  "post_disbursement_confirmation" as const;

/** Kanban status treatment — Confirmation Pending only. */
export const LENDER_CONFIRMATION_PENDING_KANBAN_LABEL =
  "LENDER CONFIRMATION PENDING" as const;

export const PDC_LENDER_CONFIRMATION_TASK = {
  autoRuleId: "obtain-lender-disbursement-confirmation",
  title: "Obtain Lender Disbursement Confirmation",
  requiredAction:
    "Obtain and record lender confirmation of the post-disbursement details.",
  priority: "high" as const,
  /** Same-day due (ETE dueInDays = 0). */
  dueInDays: 0,
} as const;

export function postDisbursementPendingEventId(dealId: string): string {
  return `deal:${dealId}:confirmation_pending`;
}

export function postDisbursementReceivedEventId(dealId: string): string {
  return `deal:${dealId}:confirmation_received`;
}

export function postDisbursementAccountingCreatedEventId(dealId: string): string {
  return `deal:${dealId}:accounting_case_created`;
}

export function postDisbursementSettlementHandoffEventId(dealId: string): string {
  return `deal:${dealId}:settlement_handoff`;
}

export function postDisbursementTaskCreatedEventId(dealId: string): string {
  return `deal:${dealId}:pdc_task_created`;
}

/** Deal-scoped task idempotency key for EnterpriseDealTask.payload. */
export function postDisbursementTaskIdempotencyKey(dealId: string): string {
  return `pdc_lender_confirmation:${dealId}`;
}

export function isPostDisbursementConfirmationPending(input: {
  caseStage?: string | null;
  caseSubStage?: string | null;
  grossStage?: string | null;
  subStage?: string | null;
}): boolean {
  const stage = (input.caseStage ?? input.grossStage ?? "").trim();
  const sub = (input.caseSubStage ?? input.subStage ?? "").trim();
  return (
    stage === POST_DISBURSEMENT_CONFIRMATION_STAGE &&
    sub === POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.pending
  );
}
