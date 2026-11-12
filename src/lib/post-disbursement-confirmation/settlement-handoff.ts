/**
 * Initiate Settlement eligibility and T+3 cron decisions.
 * Operational handoff only — not lender confirmation, invoicing, or payment.
 */
import {
  FULL_DISBURSEMENT_SUB_STAGE,
  PARTIAL_DISBURSEMENT_SUB_STAGES,
  POST_DISBURSEMENT_CONFIRMATION_STAGE,
  POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES,
} from "@/constants/post-disbursement-confirmation";

export type SettlementDealFacts = {
  grossStage?: string | null;
  subStage?: string | null;
  lifecycleStatus?: string | null;
  fulfilledAmount?: number | null;
  approvedAmount?: number | null;
  hasAccountingCase?: boolean;
};

export type SettlementEligibility = {
  eligible: boolean;
  alreadyHandedOff: boolean;
  code:
    | "ELIGIBLE"
    | "ALREADY_HANDED_OFF"
    | "PARTIAL_DISBURSEMENT"
    | "NOT_FULLY_DISBURSED"
    | "NOT_DISBURSED"
    | "CONFIRMATION_ALREADY_RECEIVED";
  message: string;
};

export type SettlementCronAction =
  | "skip_partial"
  | "skip_handed_off"
  | "skip_other_stage"
  | "already_in_confirmation"
  | "await_user_handoff";

const PARTIAL = new Set<string>(PARTIAL_DISBURSEMENT_SUB_STAGES);

function amount(value: number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function isPartialDisbursementSubStage(subStage: string | null | undefined): boolean {
  return PARTIAL.has(String(subStage ?? "").trim());
}

/**
 * Full disbursement is the Fully Disbursed sub-stage.
 * When that sub-stage was not captured, equal fulfilled and approved amounts
 * are the only other evidence. A smaller fulfilled amount stays partial.
 */
export function isFullDisbursement(input: SettlementDealFacts): boolean {
  const sub = String(input.subStage ?? "").trim();
  if (isPartialDisbursementSubStage(sub)) return false;
  if (sub === FULL_DISBURSEMENT_SUB_STAGE) return true;
  if (input.grossStage === POST_DISBURSEMENT_CONFIRMATION_STAGE) {
    const fulfilled = amount(input.fulfilledAmount);
    const approved = amount(input.approvedAmount);
    if (fulfilled != null && approved != null && fulfilled + 0.5 < approved) return false;
    return true;
  }
  if (input.grossStage !== "disbursed") return false;
  const fulfilled = amount(input.fulfilledAmount);
  const approved = amount(input.approvedAmount);
  if (fulfilled == null || approved == null || approved <= 0) return false;
  return fulfilled + 0.5 >= approved;
}

export function assessSettlementHandoff(input: SettlementDealFacts): SettlementEligibility {
  const won = String(input.lifecycleStatus ?? "").toLowerCase() === "won";
  if (input.hasAccountingCase && won) {
    return {
      eligible: false,
      alreadyHandedOff: true,
      code: "ALREADY_HANDED_OFF",
      message: "Settlement handoff is already complete. The Accounting Case is linked.",
    };
  }
  if (
    input.grossStage === POST_DISBURSEMENT_CONFIRMATION_STAGE &&
    input.subStage === POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.received
  ) {
    return {
      eligible: false,
      alreadyHandedOff: Boolean(input.hasAccountingCase),
      code: "CONFIRMATION_ALREADY_RECEIVED",
      message: input.hasAccountingCase
        ? "Lender confirmation is already recorded and the Accounting Case exists."
        : "Lender confirmation is recorded, but the Accounting Case is missing. Use Confirmation Received.",
    };
  }
  if (isPartialDisbursementSubStage(input.subStage)) {
    return {
      eligible: false,
      alreadyHandedOff: false,
      code: "PARTIAL_DISBURSEMENT",
      message: "Partial disbursement stays on the Deal. Settlement handoff waits for full disbursement.",
    };
  }
  if (!isFullDisbursement(input)) {
    return {
      eligible: false,
      alreadyHandedOff: false,
      code: input.grossStage === "disbursed" ? "NOT_FULLY_DISBURSED" : "NOT_DISBURSED",
      message:
        input.grossStage === "disbursed"
          ? "Set the disbursement sub-stage to Fully Disbursed before Initiate Settlement."
          : "Initiate Settlement is available after the Deal is fully disbursed.",
    };
  }
  return {
    eligible: true,
    alreadyHandedOff: false,
    code: "ELIGIBLE",
    message: "Fully disbursed. Initiate Settlement hands the Deal to Accounting without waiting.",
  };
}

/**
 * Any authenticated internal user may hand off an eligible Deal.
 * The route rejects a missing or partner token. This check only requires
 * the actor id that is written to the audit trail.
 * It does not allow confirmation, invoicing, or payout.
 */
export function actorMayInitiateSettlement(actorUserId: string | null | undefined): boolean {
  return String(actorUserId ?? "").trim().length > 0;
}

/**
 * The post-disbursement timer must not move a Deal into Accounting,
 * reverse WON, or touch a partial disbursement.
 */
export function decideSettlementCronAction(input: SettlementDealFacts): SettlementCronAction {
  const won = String(input.lifecycleStatus ?? "").toLowerCase() === "won";
  if (won || input.hasAccountingCase) return "skip_handed_off";
  if (isPartialDisbursementSubStage(input.subStage) && input.grossStage === "disbursed") {
    return "skip_partial";
  }
  if (input.grossStage === POST_DISBURSEMENT_CONFIRMATION_STAGE) {
    return "already_in_confirmation";
  }
  if (input.grossStage === "disbursed") return "await_user_handoff";
  return "skip_other_stage";
}
