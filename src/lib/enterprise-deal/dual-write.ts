/**
 * CO-ARCH-002-W3 / CO-ARCH-004 — Dual-write orchestration (RETIRED for operational writes).
 *
 * When Enterprise Deal Registry is operational, this module is a no-op.
 * Registry-first persist lives in persist-deal-mutation.ts / updateDeal.
 * Soft Go-Live rollback may still dual-write when Registry is not operational.
 */
import { isDealRegistryDualWriteEnabled, isEnterpriseDealRegistryOperational } from "@/constants/enterprise-deal-registry";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import {
  appendReconcileLog,
  getFingerprintMap,
  getRememberedDeal,
  rememberDealMapping,
  setFingerprint,
} from "@/lib/enterprise-deal/dual-write-store";
import {
  loanFileDealSyncFingerprint,
  mapLoanFileGrossStage,
  mapLoanFileToDealCreateBody,
  mapLoanFileToDealUpdateBody,
  mapLoanFileToOpportunityCreateBody,
  resolvePrimaryLenderRegistryId,
  validateLoanFileForDealImport,
} from "@/lib/enterprise-deal/map-loan-file-to-deal";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type { LoanFile } from "@/types/catalyst-one";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingFiles: LoanFile[] | null = null;
const inFlight = new Set<string>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(
  operation: "create" | "update" | "transition" | "archive" | "restore" | "upsert",
  legacyLoanFileId: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  let lastError: Error & { status?: number; code?: string } | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error & { status?: number; code?: string };
      // API disabled / unauthenticated — do not hammer retries
      if (lastError.status === 404 || lastError.status === 401 || lastError.status === 503) {
        appendReconcileLog({
          legacyLoanFileId,
          operation,
          status: "skipped",
          attempts: attempt,
          message: lastError.message,
          code: lastError.code,
        });
        return null;
      }
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }
  appendReconcileLog({
    legacyLoanFileId,
    operation,
    status: "exhausted",
    attempts: MAX_ATTEMPTS,
    message: lastError?.message ?? "Unknown dual-write failure",
    code: lastError?.code,
  });
  return null;
}

async function resolveDealForFile(file: LoanFile) {
  const remembered = getRememberedDeal(file.id);
  if (remembered) {
    return {
      id: remembered.dealId,
      dealNumber: remembered.dealNumber,
      rowVersion: remembered.rowVersion,
      grossStage: remembered.grossStage,
      legacyLoanFileId: file.id,
      lifecycleStatus: "active",
      archived: remembered.archived,
      isDeleted: false,
    };
  }
  const found = await enterpriseDealApiClient.searchByLegacyLoanFileId(file.id);
  if (found) {
    rememberDealMapping(file.id, found);
    return found;
  }

  const lenderId = resolvePrimaryLenderRegistryId(file);
  if (!lenderId) {
    // BI-1 / BI-3 — Opportunity only; dual-write must not invent a Deal without lender
    if (file.customerId?.trim()) {
      try {
        await enterpriseOpportunityApiClient.createOpportunity(
          mapLoanFileToOpportunityCreateBody(file),
        );
      } catch (err) {
        // Reuse existing active Opportunity for same Contact+Product (constitutional).
        const e = err as { code?: string; data?: { existingOpportunityId?: string } };
        if (e.code !== "ACTIVE_OPPORTUNITY_EXISTS") {
          /* opportunity dual-write best-effort */
        }
      }
    }
    return null;
  }

  let opportunityId = file.enterpriseOpportunityId?.trim() || "";
  if (!opportunityId) {
    try {
      const opportunity = await enterpriseOpportunityApiClient.createOpportunity(
        mapLoanFileToOpportunityCreateBody(file),
      );
      opportunityId = opportunity.id;
    } catch (err) {
      const e = err as {
        code?: string;
        data?: { existingOpportunityId?: string; existing?: { id?: string } };
      };
      if (e.code === "ACTIVE_OPPORTUNITY_EXISTS") {
        opportunityId =
          e.data?.existingOpportunityId || e.data?.existing?.id || "";
      } else {
        throw err;
      }
    }
  }

  const created = await enterpriseDealApiClient.createDeal(
    mapLoanFileToDealCreateBody(file, { opportunityId, lenderId }),
  );
  rememberDealMapping(file.id, created);
  return created;
}

/**
 * Upserts one LoanFile into Enterprise Deal Engine via API.
 * Idempotent on legacyLoanFileId. Never throws to callers.
 */
export async function dualWriteLoanFileToDeal(file: LoanFile): Promise<{
  ok: boolean;
  dealId?: string;
  dealNumber?: string;
}> {
  // CO-ARCH-004 — Dual-write retired when Registry is the sole write authority.
  if (isEnterpriseDealRegistryOperational()) {
    return { ok: true };
  }
  if (!isDealRegistryDualWriteEnabled()) {
    return { ok: false };
  }
  if (typeof window === "undefined") {
    return { ok: false };
  }
  if (inFlight.has(file.id)) {
    return { ok: false };
  }

  const validationErrors = validateLoanFileForDealImport(file).filter(
    (i) => i.severity === "error",
  );
  if (validationErrors.length > 0) {
    appendReconcileLog({
      legacyLoanFileId: file.id,
      operation: "upsert",
      status: "failed",
      attempts: 0,
      message: validationErrors.map((e) => e.message).join("; "),
      code: "VALIDATION",
    });
    return { ok: false };
  }

  inFlight.add(file.id);
  try {
    const deal = await withRetry("upsert", file.id, async () => resolveDealForFile(file));
    if (!deal) return { ok: false };

    const targetStage = mapLoanFileGrossStage(file);
    let current = deal;

    if (file.archived && !current.archived) {
      const archived = await withRetry("archive", file.id, () =>
        enterpriseDealApiClient.archiveDeal(current.id, "dual_write_archive"),
      );
      if (archived) {
        rememberDealMapping(file.id, archived);
        current = archived;
      }
    } else if (!file.archived && current.archived) {
      const restored = await withRetry("restore", file.id, () =>
        enterpriseDealApiClient.restoreDeal(current.id, "dual_write_restore"),
      );
      if (restored) {
        rememberDealMapping(file.id, restored);
        current = restored;
      }
    }

    if (current.grossStage !== targetStage) {
      const transitioned = await withRetry("transition", file.id, () =>
        enterpriseDealApiClient.transitionDeal(current.id, {
          rowVersion: current.rowVersion,
          toGrossStage: targetStage,
          toSubStage: file.stageSubStatus ?? null,
          reason: "dual_write_stage_sync",
        }),
      );
      if (transitioned) {
        rememberDealMapping(file.id, transitioned);
        current = transitioned;
      } else if (
        // conflict — refresh via create idempotent path
        true
      ) {
        const refreshed = await enterpriseDealApiClient
          .searchByLegacyLoanFileId(file.id)
          .catch(() => null);
        if (refreshed) {
          rememberDealMapping(file.id, refreshed);
          current = refreshed;
        }
      }
    }

    const updated = await withRetry("update", file.id, async () => {
      try {
        return await enterpriseDealApiClient.updateDeal(
          current.id,
          mapLoanFileToDealUpdateBody(file, current.rowVersion),
        );
      } catch (err) {
        const e = err as Error & { status?: number };
        if (e.status === 409) {
          const refreshed = await enterpriseDealApiClient.searchByLegacyLoanFileId(file.id);
          if (!refreshed) throw err;
          rememberDealMapping(file.id, refreshed);
          return enterpriseDealApiClient.updateDeal(
            refreshed.id,
            mapLoanFileToDealUpdateBody(file, refreshed.rowVersion),
          );
        }
        throw err;
      }
    });

    if (!updated) return { ok: false };
    rememberDealMapping(file.id, updated);
    setFingerprint(file.id, loanFileDealSyncFingerprint(file));
    const { putSessionDeal, bindSessionDeal } = await import("@/lib/enterprise-session");
    putSessionDeal(updated);
    bindSessionDeal(updated);
    return { ok: true, dealId: updated.id, dealNumber: updated.dealNumber };
  } catch (err) {
    appendReconcileLog({
      legacyLoanFileId: file.id,
      operation: "upsert",
      status: "failed",
      attempts: 1,
      message: err instanceof Error ? err.message : "Dual-write failed",
    });
    return { ok: false };
  } finally {
    inFlight.delete(file.id);
  }
}

/**
 * After localStorage save — sync changed LoanFiles (fingerprint diff).
 * Debounced; never blocks the UI/save path.
 */
export function queueDealDualWriteAfterLocalSave(files: LoanFile[]): void {
  // CO-ARCH-004 — no LoanFile→Registry dual-write storm when Registry is SSOT.
  if (isEnterpriseDealRegistryOperational()) return;
  if (!isDealRegistryDualWriteEnabled()) return;
  if (typeof window === "undefined") return;
  pendingFiles = files;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const batch = pendingFiles;
    pendingFiles = null;
    debounceTimer = null;
    if (!batch) return;
    void syncChangedLoanFiles(batch);
  }, 350);
}

async function syncChangedLoanFiles(files: LoanFile[]) {
  const fingerprints = getFingerprintMap();
  for (const file of files) {
    if (file.archived && fingerprints[file.id] === loanFileDealSyncFingerprint(file)) {
      continue;
    }
    const fp = loanFileDealSyncFingerprint(file);
    if (fingerprints[file.id] === fp) continue;
    await dualWriteLoanFileToDeal(file);
  }
}
