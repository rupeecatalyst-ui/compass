/**
 * Salaried FOIR — programme-specific. Never invent a FOIR cap.
 *
 * Fresh:
 *   (existing monthly EMIs + proposed EMI) / eligible monthly income × 100
 *
 * Balance Transfer:
 *   (other existing EMIs + proposed new Home Loan EMI) / eligible monthly income × 100
 *   The EMI being replaced is captured for comparison but not double-counted.
 */

export type FoirCalculationInput = {
  eligibleMonthlyIncomeRupees: number | null;
  existingMonthlyEmiRupees: number;
  proposedMonthlyEmiRupees: number | null;
  /** EMI of the home loan being transferred. Excluded from post-transfer FOIR. */
  replacedHomeLoanEmiRupees?: number | null;
  isBalanceTransfer?: boolean;
  maxFoirPercent?: number | null;
};

export type FoirCalculationResult = {
  status: "calculated" | "income_unknown" | "emi_unknown";
  foirPercent: number | null;
  numeratorRupees: number | null;
  eligibleMonthlyIncomeRupees: number | null;
  withinProgrammeCap: boolean | null;
  unknownReason: string | null;
};

export function calculateSalariedFoir(input: FoirCalculationInput): FoirCalculationResult {
  if (input.eligibleMonthlyIncomeRupees == null || input.eligibleMonthlyIncomeRupees <= 0) {
    return {
      status: "income_unknown",
      foirPercent: null,
      numeratorRupees: null,
      eligibleMonthlyIncomeRupees: input.eligibleMonthlyIncomeRupees,
      withinProgrammeCap: null,
      unknownReason: "Eligible monthly income is not available.",
    };
  }
  if (input.proposedMonthlyEmiRupees == null || !Number.isFinite(input.proposedMonthlyEmiRupees)) {
    return {
      status: "emi_unknown",
      foirPercent: null,
      numeratorRupees: null,
      eligibleMonthlyIncomeRupees: input.eligibleMonthlyIncomeRupees,
      withinProgrammeCap: null,
      unknownReason: "Proposed EMI is not available for this programme.",
    };
  }

  const existing = Math.max(0, Math.round(input.existingMonthlyEmiRupees || 0));
  const replaced = input.isBalanceTransfer
    ? Math.max(0, Math.round(input.replacedHomeLoanEmiRupees || 0))
    : 0;
  const otherExisting = Math.max(0, existing - replaced);
  const proposed = Math.round(input.proposedMonthlyEmiRupees);
  const numerator = otherExisting + proposed;
  const foirPercent = (numerator / input.eligibleMonthlyIncomeRupees) * 100;
  const rounded = Math.round(foirPercent * 100) / 100;
  const cap = input.maxFoirPercent;
  const withinProgrammeCap = cap == null ? null : rounded <= cap;

  return {
    status: "calculated",
    foirPercent: rounded,
    numeratorRupees: numerator,
    eligibleMonthlyIncomeRupees: input.eligibleMonthlyIncomeRupees,
    withinProgrammeCap,
    unknownReason: null,
  };
}

export function maxEmiFromFoirCap(input: {
  eligibleMonthlyIncomeRupees: number;
  existingMonthlyEmiRupees: number;
  maxFoirPercent: number;
  replacedHomeLoanEmiRupees?: number | null;
  isBalanceTransfer?: boolean;
}): number {
  const existing = Math.max(0, Math.round(input.existingMonthlyEmiRupees || 0));
  const replaced = input.isBalanceTransfer
    ? Math.max(0, Math.round(input.replacedHomeLoanEmiRupees || 0))
    : 0;
  const otherExisting = Math.max(0, existing - replaced);
  const maxTotalObligations = (input.eligibleMonthlyIncomeRupees * input.maxFoirPercent) / 100;
  return Math.max(0, Math.floor(maxTotalObligations - otherExisting));
}
