import { generateLoanFiles, defaultSavedViews, LOAN_LENDERS, LOAN_MANAGERS, LOAN_PRODUCTS, loanFilePriorityOptions, loanFileStatusOptions } from "@/data/catalyst-one/generate-loan-files";
import { normalizeLoanFile } from "@/lib/loan-validation";
import type { LoanFile } from "@/types/catalyst-one";

let cachedInitialLoanFiles: LoanFile[] | null = null;

export function getInitialLoanFiles(): LoanFile[] {
  if (!cachedInitialLoanFiles) {
    cachedInitialLoanFiles = generateLoanFiles(100).map((f) => normalizeLoanFile(f));
  }
  return cachedInitialLoanFiles;
}

export const loanProducts = [...LOAN_PRODUCTS];
export const loanLenders = [...LOAN_LENDERS];
export const loanManagers = [...LOAN_MANAGERS];
export const savedViews = defaultSavedViews;
export { loanFileStatusOptions, loanFilePriorityOptions };
