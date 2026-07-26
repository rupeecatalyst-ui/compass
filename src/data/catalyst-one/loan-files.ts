import { generateLoanFiles, defaultSavedViews, LOAN_MANAGERS, LOAN_PRODUCTS, loanFilePriorityOptions, loanFileStatusOptions } from "@/data/catalyst-one/generate-loan-files";
import { isDemoSeedEnabled } from "@/lib/demo-seed";
import { normalizeLoanFile } from "@/lib/loan-validation";
import type { LoanFile } from "@/types/catalyst-one";

let cachedInitialLoanFiles: LoanFile[] | null = null;

export function getInitialLoanFiles(): LoanFile[] {
  if (!isDemoSeedEnabled()) return [];
  if (!cachedInitialLoanFiles) {
    cachedInitialLoanFiles = generateLoanFiles(100).map((f) => normalizeLoanFile(f));
  }
  return cachedInitialLoanFiles;
}

export const loanProducts = [...LOAN_PRODUCTS];
/**
 * @deprecated CO-LENDER-ARCH-001 — Do not use for selection.
 * Call `listPublishedLenderDisplayNames()` from Enterprise Lender Registry.
 */
export const loanLenders: string[] = [];
export const loanManagers = [...LOAN_MANAGERS];
export const savedViews = defaultSavedViews;
export { loanFileStatusOptions, loanFilePriorityOptions };
