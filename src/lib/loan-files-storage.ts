import { STORAGE_KEYS } from "@/constants/animations";
import { getInitialLoanFiles } from "@/data/catalyst-one/loan-files";
import { isDemoSeedEnabled } from "@/lib/demo-seed";
import { notifyLoanFilesUpdated } from "@/lib/loan-data-sync";
import { normalizeLoanFile } from "@/lib/loan-validation";
import type { LoanFile, SavedViewPreset } from "@/types/catalyst-one";

function migrateLoanFiles(files: LoanFile[]): LoanFile[] {
  return files.map((f) => normalizeLoanFile(f));
}

function readStoredLoanFiles(): LoanFile[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOAN_FILES_DATA);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LoanFile[];
    if (!Array.isArray(parsed)) return null;
    return migrateLoanFiles(
      parsed.filter((f) => f && typeof f.id === "string" && typeof f.customerName === "string"),
    );
  } catch {
    return null;
  }
}

/**
 * Loan files SSOT for client workspaces.
 * Production / prisma: never hydrate demo generators or sticky localStorage demo rows.
 */
export function loadLoanFiles(): LoanFile[] {
  if (!isDemoSeedEnabled()) {
    return readStoredLoanFiles() ?? [];
  }
  if (typeof window === "undefined") return migrateLoanFiles(getInitialLoanFiles());
  const stored = readStoredLoanFiles();
  if (!stored || stored.length === 0) return migrateLoanFiles(getInitialLoanFiles());
  return stored;
}

export function saveLoanFiles(files: LoanFile[]): void {
  if (typeof window === "undefined") return;
  if (!isDemoSeedEnabled() && files.length === 0) {
    localStorage.removeItem(STORAGE_KEYS.LOAN_FILES_DATA);
    notifyLoanFilesUpdated();
    return;
  }
  localStorage.setItem(STORAGE_KEYS.LOAN_FILES_DATA, JSON.stringify(files));
  notifyLoanFilesUpdated();
}

export function loadCustomSavedViews(): SavedViewPreset[] {
  if (typeof window === "undefined") return [];
  if (!isDemoSeedEnabled()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOAN_FILES_SAVED_VIEWS);
    if (!raw) return [];
    return JSON.parse(raw) as SavedViewPreset[];
  } catch {
    return [];
  }
}

export function saveCustomSavedViews(views: SavedViewPreset[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.LOAN_FILES_SAVED_VIEWS, JSON.stringify(views));
}
