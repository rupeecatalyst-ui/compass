import { STORAGE_KEYS } from "@/constants/animations";
import { isLoanFileLocalStorageWriteForbidden } from "@/constants/enterprise-deal-registry";
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
 * Loan files projection loader for client workspaces.
 * When Enterprise Deal Registry is operational, durable SSOT is Postgres —
 * localStorage may hold a stale cache for Soft Go-Live only.
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

export function saveLoanFiles(
  files: LoanFile[],
  options?: {
    /** Default true. Pipeline lenders-only persist sets false to avoid remount hang. */
    notify?: boolean;
    /** Default true. Pipeline lenders-only persist sets false (uses snapshot path). */
    queueDualWrite?: boolean;
  },
): void {
  if (typeof window === "undefined") return;
  const notify = options?.notify !== false;
  const queueDualWrite = options?.queueDualWrite !== false;

  // CO-STAB-002 — Enterprise Deal Registry is SSOT: do not persist Deal business
  // state to LoanFile localStorage (projection notify only). Soft Go-Live rollback
  // (Registry not operational + BLOCK flag off) still writes localStorage.
  if (isLoanFileLocalStorageWriteForbidden()) {
    if (notify) notifyLoanFilesUpdated();
    return;
  }

  if (!isDemoSeedEnabled() && files.length === 0) {
    localStorage.removeItem(STORAGE_KEYS.LOAN_FILES_DATA);
    if (notify) notifyLoanFilesUpdated();
    return;
  }
  localStorage.setItem(STORAGE_KEYS.LOAN_FILES_DATA, JSON.stringify(files));
  if (notify) notifyLoanFilesUpdated();
  // Soft Go-Live secondary persist — no-ops when Registry becomes operational
  if (queueDualWrite) {
    void import("@/lib/enterprise-deal/dual-write")
      .then(({ queueDealDualWriteAfterLocalSave }) => {
        queueDealDualWriteAfterLocalSave(files);
      })
      .catch(() => {
        /* dual-write module load failure must not affect Soft Go-Live */
      });
  }
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
