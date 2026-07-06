import { STORAGE_KEYS } from "@/constants/animations";
import { getInitialLoanFiles } from "@/data/catalyst-one/loan-files";
import { notifyLoanFilesUpdated } from "@/lib/loan-data-sync";
import { normalizeLoanFile } from "@/lib/loan-validation";
import type { LoanFile, SavedViewPreset } from "@/types/catalyst-one";

function migrateLoanFiles(files: LoanFile[]): LoanFile[] {
  return files.map((f) => normalizeLoanFile(f));
}

export function loadLoanFiles(): LoanFile[] {
  if (typeof window === "undefined") return migrateLoanFiles(getInitialLoanFiles());
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOAN_FILES_DATA);
    if (!raw) return migrateLoanFiles(getInitialLoanFiles());
    const parsed = JSON.parse(raw) as LoanFile[];
    if (!Array.isArray(parsed) || parsed.length === 0) return migrateLoanFiles(getInitialLoanFiles());
    return migrateLoanFiles(
      parsed.filter((f) => f && typeof f.id === "string" && typeof f.customerName === "string"),
    );
  } catch {
    return migrateLoanFiles(getInitialLoanFiles());
  }
}

export function saveLoanFiles(files: LoanFile[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.LOAN_FILES_DATA, JSON.stringify(files));
  notifyLoanFilesUpdated();
}

export function loadCustomSavedViews(): SavedViewPreset[] {
  if (typeof window === "undefined") return [];
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
