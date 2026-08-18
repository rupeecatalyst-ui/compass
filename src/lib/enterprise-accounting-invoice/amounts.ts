/**
 * Raise Invoice money formula (frozen V1).
 * taxableValue = confirmedInvoiceAmount (before GST)
 * gstAmount = taxableValue × selected GST rate
 * invoiceTotal = taxableValue + gstAmount
 * tdsAmount = approved TDS (null → 0)
 * netReceivable = invoiceTotal − tdsAmount
 */

export function roundMoney2(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Amount must be a finite number");
  }
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateRaisedInvoiceAmounts(input: {
  taxableValue: number;
  gstRatePercent: number;
  tdsAmount: number | null | undefined;
}): {
  taxableValue: number;
  gstRatePercent: number;
  gstAmount: number;
  invoiceTotal: number;
  tdsAmount: number;
  netReceivable: number;
} {
  const taxableValue = roundMoney2(input.taxableValue);
  const gstRatePercent = input.gstRatePercent;
  if (!Number.isFinite(gstRatePercent) || gstRatePercent < 0) {
    throw new Error("GST rate must be a non-negative number");
  }
  const gstAmount = roundMoney2((taxableValue * gstRatePercent) / 100);
  const invoiceTotal = roundMoney2(taxableValue + gstAmount);
  const tdsAmount = roundMoney2(input.tdsAmount == null ? 0 : input.tdsAmount);
  if (tdsAmount < 0) {
    throw new Error("TDS amount cannot be negative");
  }
  if (tdsAmount > invoiceTotal) {
    throw new Error("TDS amount cannot exceed invoice total");
  }
  const netReceivable = roundMoney2(invoiceTotal - tdsAmount);
  return {
    taxableValue,
    gstRatePercent,
    gstAmount,
    invoiceTotal,
    tdsAmount,
    netReceivable,
  };
}
