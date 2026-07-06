import type { LoanFile } from "@/types/catalyst-one";
import { shouldShowFinalLoanAmount } from "@/constants/loan-stage-master";

/** CRC-020 — Authoritative amount for revenue, accounting, dashboard. */
export function getRevenueBaseAmount(file: LoanFile): number {
  if (file.finalLoanAmount && file.finalLoanAmount > 0 && shouldShowFinalLoanAmount(file.stage)) {
    return file.finalLoanAmount;
  }
  return file.requiredAmount || file.loanAmount;
}

export function getPortfolioDisbursedAmount(file: LoanFile): number {
  if (file.stage === "won" && file.finalLoanAmount) return file.finalLoanAmount;
  return file.disbursementAmount || file.sanctionAmount || file.finalLoanAmount || file.loanAmount;
}
