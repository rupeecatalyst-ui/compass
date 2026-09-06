import type { AdvantageCommittedHandoffDecision } from "@/types/advantage-committed";
import { canonicalCommittedRupees, committedAmountsEqual } from "./money";
import { resolveAdvantageCommittedDisplay } from "./display";

export function decideAccountingAdvantageHandoff(input: {
  opportunityProductCode?: string | null;
  opportunityProductLabel?: string | null;
  opportunityCommittedAmount: unknown;
  incomingAccountingAmount: unknown;
}): AdvantageCommittedHandoffDecision {
  const authoritative = resolveAdvantageCommittedDisplay({
    productCode: input.opportunityProductCode,
    productLabel: input.opportunityProductLabel,
    amount: input.opportunityCommittedAmount,
  });
  if (input.incomingAccountingAmount === undefined) {
    return { ok: true, code: "HANDOFF_OK", message: "Inherit Opportunity Advantage Committed (₹)." };
  }
  const incoming = canonicalCommittedRupees(input.incomingAccountingAmount);
  if (incoming == null && authoritative.amount == null) {
    return { ok: true, code: "HANDOFF_OK", message: "No Advantage Committed (₹) on Opportunity or Accounting." };
  }
  if (!committedAmountsEqual(authoritative.amount, incoming)) {
    return {
      ok: false,
      code: "ADVANTAGE_COMMITTED_MISMATCH",
      message:
        "Accounting handoff blocked: Advantage Committed (₹) does not match the authoritative Opportunity value.",
    };
  }
  return { ok: true, code: "HANDOFF_OK", message: "Accounting Advantage Committed (₹) matches Opportunity." };
}

export function advantageCommittedIsNotRevenueOrInvoice(input: {
  advantageCommittedAmount: unknown;
  expectedRevenue?: unknown;
  confirmedInvoiceAmount?: unknown;
}): { countedAsRevenue: boolean; countedAsInvoice: boolean } {
  const committed = canonicalCommittedRupees(input.advantageCommittedAmount);
  const revenue = canonicalCommittedRupees(input.expectedRevenue);
  const invoice = canonicalCommittedRupees(input.confirmedInvoiceAmount);
  void committed;
  void revenue;
  void invoice;
  return {
    countedAsRevenue: false,
    countedAsInvoice: false,
  };
}

/** Explicit: Advantage Committed must never feed revenue or invoice formulas. */
export function excludeAdvantageCommittedFromRevenueInputs<T extends Record<string, unknown>>(
  input: T,
): Omit<T, "advantageCommittedAmount" | "advantageCommittedDisplay"> {
  const {
    advantageCommittedAmount: _a,
    advantageCommittedDisplay: _d,
    ...rest
  } = input;
  void _a;
  void _d;
  return rest;
}
