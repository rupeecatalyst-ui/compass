/**
 * Actual credit reconciliation — never assumes payer TDS rate.
 * Implied withholding = Invoice Total − Amount Credited − Other Adjustment
 * only when the user explicitly classifies the difference.
 */

import { roundMoney2 } from "@/lib/enterprise-accounting-invoice/amounts";

export const ACCOUNTING_WITHHOLDING_CLASSIFICATIONS = [
  "tds",
  "other_withholding",
  "other_adjustment",
  "unexplained_short_payment",
] as const;

export type AccountingWithholdingClassification =
  (typeof ACCOUNTING_WITHHOLDING_CLASSIFICATIONS)[number];

export type ActualCreditReconciliationInput = {
  invoiceTotal: number;
  amountCredited: number;
  otherAdjustment?: number | null;
  /** Required when (invoiceTotal - credited - other) > 0 — user must classify */
  classifyDifferenceAs?: AccountingWithholdingClassification | null;
  confirmWithholdingAsTds?: boolean;
};

export type ActualCreditReconciliationResult = {
  invoiceTotal: number;
  amountCredited: number;
  otherAdjustment: number;
  impliedDifference: number;
  tdsWithholdingAmount: number;
  unexplainedShortPayment: number;
  balancePending: number;
  reconciliationStatus: "fully_reconciled" | "partially_reconciled" | "unreconciled";
  source: "actual_payment_reconciliation";
  classification: AccountingWithholdingClassification | null;
};

export function reconcileActualCredit(
  input: ActualCreditReconciliationInput,
): ActualCreditReconciliationResult {
  const invoiceTotal = roundMoney2(input.invoiceTotal);
  const amountCredited = roundMoney2(input.amountCredited);
  const otherAdjustment = roundMoney2(input.otherAdjustment ?? 0);

  if (amountCredited < 0) {
    throw Object.assign(new Error("Amount Credited cannot be negative"), {
      statusCode: 400,
      code: "AMOUNT_CREDITED_NEGATIVE",
    });
  }
  if (otherAdjustment < 0) {
    throw Object.assign(new Error("Other Adjustment cannot be negative"), {
      statusCode: 400,
      code: "OTHER_ADJUSTMENT_NEGATIVE",
    });
  }
  if (amountCredited > invoiceTotal) {
    throw Object.assign(
      new Error(
        `Amount Credited (${amountCredited}) cannot exceed Invoice Total (${invoiceTotal}). Overpayment workflow is not enabled.`,
      ),
      { statusCode: 409, code: "CREDIT_EXCEEDS_INVOICE_TOTAL" },
    );
  }
  if (roundMoney2(amountCredited + otherAdjustment) > invoiceTotal) {
    throw Object.assign(
      new Error("Amount Credited + Other Adjustment cannot exceed Invoice Total"),
      { statusCode: 409, code: "RECONCILIATION_EXCEEDS_INVOICE_TOTAL" },
    );
  }

  const impliedDifference = roundMoney2(invoiceTotal - amountCredited - otherAdjustment);
  let tdsWithholdingAmount = 0;
  let unexplainedShortPayment = 0;
  let classification: AccountingWithholdingClassification | null = null;

  if (impliedDifference > 0 && input.classifyDifferenceAs) {
    const cls = input.classifyDifferenceAs;
    classification = cls;
    if (cls === "tds" || cls === "other_withholding") {
      if (cls === "tds" && input.confirmWithholdingAsTds === false) {
        throw Object.assign(new Error("TDS classification must be explicitly confirmed"), {
          statusCode: 400,
          code: "TDS_CONFIRMATION_REQUIRED",
        });
      }
      tdsWithholdingAmount = impliedDifference;
    } else if (cls === "other_adjustment") {
      throw Object.assign(
        new Error(
          "To record Other Adjustment, enter it in the Other Adjustment field rather than classifying the residual difference.",
        ),
        { statusCode: 400, code: "USE_OTHER_ADJUSTMENT_FIELD" },
      );
    } else {
      unexplainedShortPayment = impliedDifference;
    }
  }
  // If residual remains without classification, treat as partial credit (balance pending).
  // Never assume TDS rate or silently classify short payment as TDS.

  const applied = roundMoney2(amountCredited + otherAdjustment + tdsWithholdingAmount);
  const balancePending = roundMoney2(invoiceTotal - applied - unexplainedShortPayment);
  // unexplained short payment leaves balance pending
  const trueBalance = roundMoney2(
    invoiceTotal - amountCredited - otherAdjustment - tdsWithholdingAmount,
  );

  let reconciliationStatus: ActualCreditReconciliationResult["reconciliationStatus"] =
    "unreconciled";
  if (trueBalance === 0 && unexplainedShortPayment === 0) {
    reconciliationStatus = "fully_reconciled";
  } else if (amountCredited > 0 || otherAdjustment > 0 || tdsWithholdingAmount > 0) {
    reconciliationStatus = "partially_reconciled";
  }

  return {
    invoiceTotal,
    amountCredited,
    otherAdjustment,
    impliedDifference,
    tdsWithholdingAmount,
    unexplainedShortPayment,
    balancePending: trueBalance < 0 ? 0 : trueBalance,
    reconciliationStatus,
    source: "actual_payment_reconciliation",
    classification,
  };
}
