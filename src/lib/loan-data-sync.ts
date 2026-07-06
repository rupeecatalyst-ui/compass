/** Cross-module loan file synchronization (single source of truth). */

export const LOAN_FILES_UPDATED_EVENT = "compass:loan-files-updated";

export function notifyLoanFilesUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LOAN_FILES_UPDATED_EVENT));
}

export function subscribeLoanFilesUpdated(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(LOAN_FILES_UPDATED_EVENT, listener);
  return () => window.removeEventListener(LOAN_FILES_UPDATED_EVENT, listener);
}
