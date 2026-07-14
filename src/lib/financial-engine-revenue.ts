import type { LoanFile } from "@/types/catalyst-one";
import { getRevenueBaseAmount } from "@/lib/loan-amount-utils";
import { formatINR } from "@/lib/format-currency";

/**
 * Prompt 013 — Expected Revenue is driven by the Financial Engine.
 * Do not present calculated revenue until product, amount, lender,
 * payout rule, and commission configuration are all present.
 */
export function isExpectedRevenueReady(
  file: Pick<
    LoanFile,
    | "loanProduct"
    | "requiredAmount"
    | "loanAmount"
    | "finalLoanAmount"
    | "lender"
    | "lenders"
    | "revenuePercent"
    | "payoutConfigured"
    | "stage"
  >,
): boolean {
  const hasProduct = Boolean(file.loanProduct?.trim());
  const hasAmount = getRevenueBaseAmount(file as LoanFile) > 0;
  const hasLender =
    Boolean(file.lender?.trim()) ||
    Boolean(file.lenders?.some((c) => c.status !== "closed"));
  const hasPayoutRuleAndCommission =
    file.payoutConfigured !== false && (file.revenuePercent ?? 0) > 0;
  return hasProduct && hasAmount && hasLender && hasPayoutRuleAndCommission;
}

export function formatExpectedRevenueLabel(
  file: Pick<LoanFile, "expectedRevenue" | "loanProduct" | "requiredAmount" | "loanAmount" | "finalLoanAmount" | "lender" | "lenders" | "revenuePercent" | "payoutConfigured" | "stage">,
): string {
  if (!isExpectedRevenueReady(file)) return "Awaiting Payout Configuration";
  return formatINR(file.expectedRevenue);
}

export function formatExpectedPayoutLabel(
  file: Pick<LoanFile, "expectedRevenue" | "revenuePercent" | "loanProduct" | "requiredAmount" | "loanAmount" | "finalLoanAmount" | "lender" | "lenders" | "payoutConfigured" | "stage">,
): string {
  if (!isExpectedRevenueReady(file)) return "Not Yet Calculated";
  const payout = Math.round(file.expectedRevenue * (file.revenuePercent / 100));
  return formatINR(payout);
}

export function computeExpectedRevenueAmount(file: LoanFile): number {
  if (!isExpectedRevenueReady(file)) return 0;
  return Math.round(getRevenueBaseAmount(file) * (file.revenuePercent / 100));
}
