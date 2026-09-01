/**
 * Commercial entitlement calculations for Accounting Case capture.
 * Basis is Amount Disbursed × Payout % (never silently swapped with Final Loan Amount).
 */

import { roundMoney2 } from "@/lib/enterprise-accounting-invoice/amounts";

export const ACCOUNTING_COMMERCIAL_PAYOUT_BASIS = "amount_disbursed" as const;

export type AccountingCommercialCaptureInput = {
  finalLoanAmount: number | null;
  amountDisbursed: number | null;
  payoutPercent: number | null;
};

export type AccountingCommercialCaptureResult = {
  finalLoanAmount: number;
  amountDisbursed: number;
  pendingLoanAmount: number;
  payoutPercent: number;
  payoutCommission: number;
  payoutBasis: typeof ACCOUNTING_COMMERCIAL_PAYOUT_BASIS;
  payoutBasisLabel: string;
  taxableValue: number;
};

export function calculatePendingLoanAmount(
  finalLoanAmount: number,
  amountDisbursed: number,
): number {
  const final = roundMoney2(finalLoanAmount);
  const disbursed = roundMoney2(amountDisbursed);
  if (disbursed > final) {
    throw Object.assign(
      new Error(
        `Amount Disbursed (${disbursed}) cannot exceed Final Loan Amount (${final}). Pending Loan Amount cannot be negative.`,
      ),
      { statusCode: 400, code: "DISBURSED_EXCEEDS_FINAL" },
    );
  }
  return roundMoney2(final - disbursed);
}

/**
 * Payout / Commission = Amount Disbursed × Payout % / 100
 * Taxable value for invoice defaults to the calculated payout (commercial entitlement).
 */
export function calculateAccountingCommercialCapture(
  input: AccountingCommercialCaptureInput,
): AccountingCommercialCaptureResult {
  if (input.finalLoanAmount == null || !Number.isFinite(input.finalLoanAmount) || input.finalLoanAmount < 0) {
    throw Object.assign(new Error("Final Loan Amount is required and cannot be negative"), {
      statusCode: 400,
      code: "FINAL_LOAN_AMOUNT_REQUIRED",
    });
  }
  if (
    input.amountDisbursed == null ||
    !Number.isFinite(input.amountDisbursed) ||
    input.amountDisbursed < 0
  ) {
    throw Object.assign(new Error("Amount Disbursed is required and cannot be negative"), {
      statusCode: 400,
      code: "AMOUNT_DISBURSED_REQUIRED",
    });
  }
  if (
    input.payoutPercent == null ||
    !Number.isFinite(input.payoutPercent) ||
    input.payoutPercent < 0
  ) {
    throw Object.assign(new Error("Payout % is required and cannot be negative"), {
      statusCode: 400,
      code: "PAYOUT_PERCENT_REQUIRED",
    });
  }

  const finalLoanAmount = roundMoney2(input.finalLoanAmount);
  const amountDisbursed = roundMoney2(input.amountDisbursed);
  const payoutPercent = input.payoutPercent;
  const pendingLoanAmount = calculatePendingLoanAmount(finalLoanAmount, amountDisbursed);
  const payoutCommission = roundMoney2((amountDisbursed * payoutPercent) / 100);

  return {
    finalLoanAmount,
    amountDisbursed,
    pendingLoanAmount,
    payoutPercent,
    payoutCommission,
    payoutBasis: ACCOUNTING_COMMERCIAL_PAYOUT_BASIS,
    payoutBasisLabel: "Amount Disbursed × Payout %",
    taxableValue: payoutCommission,
  };
}

export function calculateAmountPendingToInvoice(input: {
  eligibleCommercialAmount: number;
  previouslyInvoicedTaxableTotal: number;
}): { amountPendingToInvoice: number; amountAlreadyInvoiced: number } {
  const eligible = roundMoney2(input.eligibleCommercialAmount);
  const invoiced = roundMoney2(input.previouslyInvoicedTaxableTotal);
  if (invoiced < 0) {
    throw new Error("Previously invoiced amount cannot be negative");
  }
  const pending = roundMoney2(eligible - invoiced);
  return {
    amountAlreadyInvoiced: invoiced,
    amountPendingToInvoice: pending < 0 ? 0 : pending,
  };
}
