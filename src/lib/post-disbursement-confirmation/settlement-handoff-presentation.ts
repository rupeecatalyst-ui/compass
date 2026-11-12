/**
 * Screen labels for an existing settlement handoff.
 * Outcome remains Deal lifecycle WON. The Accounting Case id is the linked case.
 * This does not decide eligibility, invoicing, or confirmation.
 */
import {
  FULL_DISBURSEMENT_SUB_STAGE,
  PARTIAL_DISBURSEMENT_SUB_STAGES,
  POST_DISBURSEMENT_CONFIRMATION_STAGE,
  POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES,
} from "@/constants/post-disbursement-confirmation";

export const ACCOUNTING_HANDOFF_EXPLANATION =
  "An Accounting Case is created or linked at Initiate Settlement. Lender confirmation stays Confirmation Pending until Confirmation Received. Raise Invoice stays unavailable until Confirmation Received and the existing invoice requirements are met.";

const PARTIAL = new Set<string>(PARTIAL_DISBURSEMENT_SUB_STAGES);

export function isWonLifecycle(lifecycleStatus: string | null | undefined): boolean {
  return String(lifecycleStatus ?? "").trim().toLowerCase() === "won";
}

/** Persistent lender-card status after a successful handoff. */
export function settlementHandoffStatusLabel(input: {
  lifecycleStatus?: string | null;
  caseSubStage?: string | null;
}): string | null {
  if (!isWonLifecycle(input.lifecycleStatus)) return null;
  const sub = String(input.caseSubStage ?? "").trim();
  const confirmation =
    sub === POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.received
      ? "Confirmation Received"
      : "Confirmation Pending";
  return `Settlement Handed Off · WON · ${confirmation}`;
}

/** Compact My Deals distinction for a transferred WON Deal. */
export function myDealsWonStatusLabel(input: {
  lifecycleStatus?: string | null;
  subStage?: string | null;
}): string | null {
  if (!isWonLifecycle(input.lifecycleStatus)) return null;
  const sub = String(input.subStage ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (sub === POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.received) {
    return "WON · Confirmation Received";
  }
  return "WON · Confirmation Pending";
}

export function lenderSettlementActions(input: {
  caseStage?: string | null;
  caseSubStage?: string | null;
  lifecycleStatus?: string | null;
  accountingCaseId?: string | null;
}): {
  showInitiateSettlement: boolean;
  partialDisbursement: boolean;
  showFullyDisbursedHint: boolean;
  showConfirmationReceived: boolean;
  statusLabel: string | null;
  accountingCaseId: string | null;
} {
  const stage = String(input.caseStage ?? "").trim();
  const sub = String(input.caseSubStage ?? "").trim();
  const won = isWonLifecycle(input.lifecycleStatus);
  const partial = stage === "disbursed" && PARTIAL.has(sub);
  const fullyDisbursed = stage === "disbursed" && sub === FULL_DISBURSEMENT_SUB_STAGE;
  const confirmationPending =
    stage === POST_DISBURSEMENT_CONFIRMATION_STAGE &&
    sub === POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.pending;
  const caseId = String(input.accountingCaseId ?? "").trim() || null;
  return {
    showInitiateSettlement: !won && !partial && (fullyDisbursed || confirmationPending),
    partialDisbursement: partial,
    showFullyDisbursedHint: stage === "disbursed" && !fullyDisbursed && !partial,
    showConfirmationReceived: confirmationPending,
    statusLabel: settlementHandoffStatusLabel({
      lifecycleStatus: input.lifecycleStatus,
      caseSubStage: sub,
    }),
    accountingCaseId: caseId,
  };
}
