/**
 * CO-ARCH-002-W5 / CO-P0-002 / CO-ARCH-004 — Deal Data Access Layer (DAL).
 *
 * Workspace consumers MUST use this module for Deal I/O.
 *
 * CO-ARCH-004 — When Enterprise Deal Registry is operational:
 * - Registry is the ONLY Deal business write authority
 * - LoanFile-shaped objects are in-memory projections only
 * - Dual-write and Soft Go-Live localStorage are not write SSOTs
 */
import {
  isDealRegistryPortRuntimeActive,
  isDealRegistryShadowReadEnabled,
  isDealRegistryDualWriteEnabled,
  isDealRegistryPrimaryWriteEnabled,
  isDealConsumerModuleEnabled,
  isEnterpriseDealRegistryOperational,
  type DealConsumerModule,
} from "@/constants/enterprise-deal-registry";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { dualWriteLoanFileToDeal } from "@/lib/enterprise-deal/dual-write";
import {
  attachEnterpriseDealIdentity,
  attachEnterpriseOpportunityIdentity,
  DealCreatePersistenceError,
  persistNewDealToEnterpriseRegistry,
  persistNewOpportunityToEnterpriseRegistry,
  resolvePrimaryLenderRegistryId,
} from "@/lib/enterprise-deal/primary-write";
import { mapEnterpriseDealToLoanFileStub } from "@/lib/enterprise-deal/map-deal-to-loan-file";
import { persistDealProjectionToRegistry } from "@/lib/enterprise-deal/persist-deal-mutation";
import {
  peekDealProjection,
  putDealProjection,
} from "@/lib/enterprise-deal/deal-projection-cache";
import { queueMyDealsShadowRead } from "@/lib/enterprise-deal/shadow-read";
import { enterpriseOpportunityApiClient } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { loadLoanFiles, saveLoanFiles } from "@/lib/loan-files-storage";
import { notifyLoanFilesUpdated, subscribeLoanFilesUpdated } from "@/lib/loan-data-sync";
import {
  createLoanFileFromInput,
  updateLoanFileInStorage,
} from "@/lib/loan-files-utils";
import type { CreateLoanFileInput, LoanFile } from "@/types/catalyst-one";

export type DealDataSource =
  | "legacy_loan_file"
  | "enterprise_deal"
  | "enterprise_opportunity"
  | "local_fallback";

export type DealCreateResult = {
  file: LoanFile;
  enterpriseDealId: string;
  dealNumber: string;
  enterpriseOpportunityId?: string;
  opportunityNumber?: string;
  source: "enterprise_deal" | "enterprise_opportunity" | "legacy_loan_file";
};

export { DealCreatePersistenceError };
export type DealReadResult = {
  files: LoanFile[];
  source: DealDataSource;
  module: DealConsumerModule;
  error?: string;
};

/** In-memory Enterprise read cache — hydrated by loadDeals(); used by loadDealsSync when operational. */
let enterpriseDealCache: LoanFile[] | null = null;
let enterpriseDealCacheSource: DealDataSource | null = null;

export function getEnterpriseDealReadCache(): {
  files: LoanFile[] | null;
  source: DealDataSource | null;
} {
  return { files: enterpriseDealCache, source: enterpriseDealCacheSource };
}

export function clearEnterpriseDealReadCache(): void {
  enterpriseDealCache = null;
  enterpriseDealCacheSource = null;
}

/** Keep DAL cache aligned with local LoanFile after Move to Deal / pipeline sync. */
export function upsertEnterpriseDealCacheEntry(file: LoanFile): void {
  cacheCreatedDeal(file);
}

function setEnterpriseDealReadCache(files: LoanFile[], source: DealDataSource) {
  enterpriseDealCache = files;
  enterpriseDealCacheSource = source;
}

function shouldPreferEnterprise(module: DealConsumerModule): boolean {
  return isDealConsumerModuleEnabled(module) || isDealRegistryPortRuntimeActive();
}

function maybeQueueShadow(files: LoanFile[]) {
  if (isDealRegistryShadowReadEnabled()) {
    queueMyDealsShadowRead(files);
  }
}

async function loadEnterpriseAsLoanFiles(): Promise<LoanFile[]> {
  const page = await enterpriseDealApiClient.searchDeals({
    page: 1,
    pageSize: 100,
    archived: false,
    productFamily: "lending",
  });
  const local = loadLoanFiles();
  const localById = new Map(local.map((f) => [f.id, f]));
  return page.items
    .filter((d) => !d.isDeleted && !d.archived)
    .map((d) => {
      const legacyId = d.legacyLoanFileId ?? d.id;
      const localFile = localById.get(legacyId);
      return mapEnterpriseDealToLoanFileStub(d, localFile);
    });
}

/**
 * Synchronous read.
 * CO-P0-002: when Enterprise is preferred and cache is hydrated, return Enterprise SSOT.
 * Otherwise Soft Go-Live local (or pre-hydrate local until async loadDeals completes).
 */
export function loadDealsSync(module: DealConsumerModule = "loan_workspace"): DealReadResult {
  if (shouldPreferEnterprise(module) && enterpriseDealCache) {
    maybeQueueShadow(enterpriseDealCache);
    return {
      files: enterpriseDealCache,
      source: enterpriseDealCacheSource ?? "enterprise_deal",
      module,
    };
  }
  const files = loadLoanFiles();
  maybeQueueShadow(files);
  return {
    files,
    source: shouldPreferEnterprise(module) ? "local_fallback" : "legacy_loan_file",
    module,
  };
}

/**
 * Async read through DAL — hydrates Enterprise cache for subsequent sync reads.
 */
export async function loadDeals(module: DealConsumerModule): Promise<DealReadResult> {
  const legacy = {
    files: loadLoanFiles(),
    source: "legacy_loan_file" as const,
    module,
  };
  if (!shouldPreferEnterprise(module)) {
    clearEnterpriseDealReadCache();
    maybeQueueShadow(legacy.files);
    return legacy;
  }
  try {
    const files = await loadEnterpriseAsLoanFiles();
    setEnterpriseDealReadCache(files, "enterprise_deal");
    maybeQueueShadow(legacy.files);
    notifyLoanFilesUpdated();
    return { files, source: "enterprise_deal", module };
  } catch (err) {
    return {
      files: legacy.files,
      source: "local_fallback",
      module,
      error: err instanceof Error ? err.message : "Deal API read failed",
    };
  }
}

export function getDealByIdSync(
  dealOrLegacyId: string,
  module: DealConsumerModule = "loan_workspace",
): LoanFile | null {
  const { files } = loadDealsSync(module);
  return (
    files.find((f) => f.id === dealOrLegacyId) ??
    files.find((f) => f.fileNumber === dealOrLegacyId) ??
    null
  );
}

export async function getDealById(
  dealOrLegacyId: string,
  module: DealConsumerModule,
): Promise<{ file: LoanFile | null; source: DealDataSource; error?: string }> {
  const result = await loadDeals(module);
  const file =
    result.files.find((f) => f.id === dealOrLegacyId) ??
    result.files.find((f) => f.fileNumber === dealOrLegacyId) ??
    null;
  return { file, source: result.source, error: result.error };
}

export function listDealsForCustomerSync(
  customerId: string,
  module: DealConsumerModule = "customer_360",
): LoanFile[] {
  return loadDealsSync(module).files.filter(
    (f) => f.customerId === customerId && !f.archived,
  );
}

function newLegacyLoanFileId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `lf-${crypto.randomUUID()}`;
  }
  return `lf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cacheCreatedDeal(file: LoanFile) {
  putDealProjection(file);
  if (enterpriseDealCache) {
    setEnterpriseDealReadCache(
      [file, ...enterpriseDealCache.filter((f) => f.id !== file.id && f.enterpriseDealId !== file.enterpriseDealId)],
      "enterprise_deal",
    );
  } else {
    setEnterpriseDealReadCache([file], "enterprise_deal");
  }
  // CO-ARCH-004 — Do not write Deal business state to Soft Go-Live localStorage when Registry is operational.
  if (!isEnterpriseDealRegistryOperational()) {
    const existing = loadLoanFiles().filter((f) => f.id !== file.id);
    saveLoanFiles([file, ...existing]);
  }
  notifyLoanFilesUpdated();
}

/**
 * CO-P0-006 Wave 1 — Primary create.
 * When primary write is ON: Postgres insert is required; UI must await this.
 * When OFF (rollback): legacy localStorage create + optional dual-write.
 */
export async function createDealAsync(
  input: CreateLoanFileInput,
  module: DealConsumerModule,
  existingFiles?: LoanFile[],
  options?: {
    /** Use existing Opportunity Registry id — do not create a second Opportunity. */
    existingOpportunityId?: string | null;
    /** CO-ARCH-002 — Session/provider Opportunity; skip Registry re-GET when present. */
    opportunity?: EnterpriseOpportunityApiRecord | null;
  },
): Promise<DealCreateResult> {
  const existing = existingFiles ?? loadLoanFiles();
  const draft = createLoanFileFromInput(input, existing);
  const created: LoanFile = {
    ...draft,
    id: newLegacyLoanFileId(),
    ...(options?.existingOpportunityId?.trim()
      ? { enterpriseOpportunityId: options.existingOpportunityId.trim() }
      : {}),
  };

  if (!isDealRegistryPrimaryWriteEnabled()) {
    saveLoanFiles([created, ...existing.filter((f) => f.id !== created.id)]);
    if (isDealRegistryDualWriteEnabled()) {
      void dualWriteLoanFileToDeal(created).then((result) => {
        if (result.ok && result.dealId) {
          const withId = {
            ...created,
            enterpriseDealId: result.dealId,
            dealNumber: result.dealNumber,
          };
          cacheCreatedDeal(withId);
        }
      });
    }
    void module;
    return {
      file: created,
      enterpriseDealId: "",
      dealNumber: "",
      source: "legacy_loan_file",
    };
  }

  // CO-ARCH-003 / CO-ARCH-002 — Opportunity first; prefer session object then cache-first GET.
  let opportunity: EnterpriseOpportunityApiRecord;
  if (options?.opportunity?.id) {
    opportunity = options.opportunity;
  } else if (options?.existingOpportunityId?.trim()) {
    opportunity = await enterpriseOpportunityApiClient.getOpportunity(
      options.existingOpportunityId.trim(),
    );
  } else {
    opportunity = await persistNewOpportunityToEnterpriseRegistry(created);
  }
  let file = attachEnterpriseOpportunityIdentity(created, opportunity);

  const lenderId = resolvePrimaryLenderRegistryId(file);
  if (!lenderId) {
    cacheCreatedDeal(file);
    void module;
    return {
      file,
      enterpriseDealId: "",
      dealNumber: "",
      enterpriseOpportunityId: opportunity.id,
      opportunityNumber: opportunity.opportunityNumber,
      source: "enterprise_opportunity",
    };
  }

  const deal = await persistNewDealToEnterpriseRegistry(file, {
    opportunityId: opportunity.id,
    lenderId,
  });
  file = attachEnterpriseDealIdentity(file, deal);
  cacheCreatedDeal(file);
  void module;
  return {
    file,
    enterpriseDealId: deal.id,
    dealNumber: deal.dealNumber,
    enterpriseOpportunityId: opportunity.id,
    opportunityNumber: opportunity.opportunityNumber,
    source: "enterprise_deal",
  };
}

/**
 * Sync create — emergency / legacy only.
 * When primary write is ON, throws — callers must use createDealAsync.
 */
export function createDeal(
  input: CreateLoanFileInput,
  module: DealConsumerModule,
  existingFiles?: LoanFile[],
): LoanFile {
  if (isDealRegistryPrimaryWriteEnabled()) {
    throw new DealCreatePersistenceError(
      "Deal create requires createDealAsync when Enterprise Deal primary write is enabled.",
      "SYNC_CREATE_FORBIDDEN",
    );
  }
  const existing = existingFiles ?? loadLoanFiles();
  const created = createLoanFileFromInput(input, existing);
  saveLoanFiles([created, ...existing.filter((f) => f.id !== created.id)]);
  if (isDealRegistryDualWriteEnabled()) {
    void dualWriteLoanFileToDeal(created).then((result) => {
      if (result.ok && enterpriseDealCache) {
        const next = [
          created,
          ...enterpriseDealCache.filter((f) => f.id !== created.id),
        ];
        setEnterpriseDealReadCache(next, "enterprise_deal");
        notifyLoanFilesUpdated();
      }
    });
  }
  void module;
  return created;
}

function resolveDealFileForUpdate(fileId: string): LoanFile | null {
  const projected = peekDealProjection(fileId);
  if (projected) return projected;
  if (enterpriseDealCache) {
    const hit =
      enterpriseDealCache.find((f) => f.id === fileId) ||
      enterpriseDealCache.find((f) => f.enterpriseDealId === fileId);
    if (hit) return hit;
  }
  // CO-ARCH-005 — Soft Go-Live is not operational Deal SSOT.
  if (isEnterpriseDealRegistryOperational()) return null;
  const local = loadLoanFiles();
  return (
    local.find((f) => f.id === fileId) ||
    local.find((f) => f.enterpriseDealId === fileId) ||
    null
  );
}

function applyDealPatch(
  existing: LoanFile,
  patch: Partial<LoanFile>,
  timelineNote?: string,
): LoanFile {
  const timeline = timelineNote
    ? [
        {
          id: `tl-upd-${Date.now()}`,
          title: "Deal Updated",
          description: timelineNote,
          timestamp: new Date().toISOString(),
          completed: true,
        },
        ...existing.timeline,
      ]
    : existing.timeline;
  return { ...existing, ...patch, timeline };
}

function commitDealProjection(updated: LoanFile): void {
  putDealProjection(updated);
  if (enterpriseDealCache) {
    setEnterpriseDealReadCache(
      enterpriseDealCache.map((f) =>
        f.id === updated.id || f.enterpriseDealId === updated.enterpriseDealId
          ? updated
          : f,
      ),
      enterpriseDealCacheSource ?? "enterprise_deal",
    );
  } else {
    setEnterpriseDealReadCache([updated], "enterprise_deal");
  }
}

/**
 * CO-ARCH-004 — Registry-first Deal update.
 * Sync callers get an optimistic projection; Registry persist is awaited via updateDealAsync.
 */
export function updateDeal(
  fileId: string,
  patch: Partial<LoanFile>,
  timelineNote?: string,
  consumerModule: DealConsumerModule = "loan_workspace",
): LoanFile | null {
  void consumerModule;
  const keys = Object.keys(patch);
  const identityOrLenderSync =
    keys.length > 0 &&
    keys.every((k) =>
      [
        "lenders",
        "lender",
        "internalNotes",
        "enterpriseOpportunityId",
        "opportunityNumber",
        "enterpriseDealId",
        "dealNumber",
        "fileNumber",
      ].includes(k),
    );
  const lendersOnly = keys.length > 0 && keys.every((k) => k === "lenders" || k === "lender");

  if (isEnterpriseDealRegistryOperational()) {
    const existing = resolveDealFileForUpdate(fileId);
    if (!existing) {
      console.error("[CO-ARCH-004] updateDeal: no Deal projection for", fileId);
      return null;
    }
    const updated = applyDealPatch(existing, patch, timelineNote);
    commitDealProjection(updated);
    void persistDealProjectionToRegistry(updated, {
      lendersOnly,
      reason: lendersOnly ? "pipeline_lender_stage" : "deal_workspace_persist",
    }).then((result) => {
      if (!result.ok) {
        console.error("[CO-ARCH-004] Registry persist failed", result.error);
      }
    });
    // Projection refresh only — never LoanFile localStorage business write.
    if (!lendersOnly) {
      queueMicrotask(() => notifyLoanFilesUpdated());
    } else {
      queueMicrotask(() => notifyLoanFilesUpdated());
    }
    return updated;
  }

  // Soft Go-Live emergency rollback only.
  const updated = updateLoanFileInStorage(fileId, patch, timelineNote, {
    skipCompletionGate: identityOrLenderSync,
    notify: true,
    queueDualWrite: isDealRegistryDualWriteEnabled(),
  });
  if (updated && enterpriseDealCache) {
    setEnterpriseDealReadCache(
      enterpriseDealCache.map((f) => (f.id === updated.id ? updated : f)),
      enterpriseDealCacheSource ?? "enterprise_deal",
    );
  } else if (updated && shouldPreferEnterprise(consumerModule)) {
    setEnterpriseDealReadCache([updated], "enterprise_deal");
  }
  if (updated && isDealRegistryDualWriteEnabled()) {
    void dualWriteLoanFileToDeal(updated);
  }
  return updated;
}

/** CO-ARCH-004 — Await Registry success (Pipeline drag / explicit Save). */
export async function updateDealAsync(
  fileId: string,
  patch: Partial<LoanFile>,
  timelineNote?: string,
  consumerModule: DealConsumerModule = "loan_workspace",
): Promise<LoanFile | null> {
  void consumerModule;
  const keys = Object.keys(patch);
  const lendersOnly = keys.length > 0 && keys.every((k) => k === "lenders" || k === "lender");

  if (!isEnterpriseDealRegistryOperational()) {
    return updateDeal(fileId, patch, timelineNote, consumerModule);
  }

  const existing = resolveDealFileForUpdate(fileId);
  if (!existing) return null;
  const updated = applyDealPatch(existing, patch, timelineNote);
  commitDealProjection(updated);

  // CO-QA-002 — Kanban Remove on legacy Loan Workspace must soft-delete
  // sibling Enterprise Deals, not only rewrite one Deal's snapshot.lenders.
  if (lendersOnly && Array.isArray(patch.lenders)) {
    const { softDeleteRemovedPipelineDeals } = await import(
      "@/lib/enterprise-deal/deal-pipeline-runtime"
    );
    const knownDealIds = (existing.lenders ?? [])
      .map((l) => l.enterpriseDealId?.trim())
      .filter((id): id is string => Boolean(id));
    await softDeleteRemovedPipelineDeals(existing.lenders ?? [], patch.lenders, {
      knownDealIds,
      reason: "kanban_pipeline_remove",
    });
  }

  const result = await persistDealProjectionToRegistry(updated, {
    lendersOnly,
    reason: lendersOnly ? "pipeline_lender_stage" : "deal_workspace_persist",
  });
  if (!result.ok) {
    console.error("[CO-ARCH-004] updateDealAsync failed", result.error);
    return null;
  }
  queueMicrotask(() => notifyLoanFilesUpdated());
  return updated;
}

export function saveDeals(
  files: LoanFile[],
  consumerModule: DealConsumerModule = "loan_workspace",
): void {
  void consumerModule;
  // CO-ARCH-005 — Soft Go-Live write retired when Registry is operational.
  if (isEnterpriseDealRegistryOperational()) {
    console.warn("[CO-ARCH-005] saveDeals ignored — Enterprise Deal Registry is SSOT");
    return;
  }
  saveLoanFiles(files);
}

export function appendDeal(
  file: LoanFile,
  module: DealConsumerModule = "loan_workspace",
): void {
  if (isEnterpriseDealRegistryOperational()) {
    console.warn("[CO-ARCH-005] appendDeal ignored — Enterprise Deal Registry is SSOT");
    return;
  }
  const existing = loadLoanFiles().filter((f) => f.id !== file.id);
  saveDeals([file, ...existing], module);
}

export function subscribeDealsUpdated(cb: () => void): () => void {
  return subscribeLoanFilesUpdated(cb);
}

export function updateDealTasks(
  fileId: string,
  tasks: LoanFile["tasks"],
  module: DealConsumerModule = "tasks",
): LoanFile | null {
  return updateDeal(fileId, { tasks }, undefined, module);
}

export function updateDealTimeline(
  fileId: string,
  timeline: LoanFile["timeline"],
  module: DealConsumerModule = "activities",
  timelineNote?: string,
): LoanFile | null {
  return updateDeal(fileId, { timeline }, timelineNote, module);
}

/** Resolve opportunity journey loan files via DAL. */
export function resolveDealsForOpportunityContext(opts: {
  fileId?: string | null;
  opportunityId?: string | null;
  module?: DealConsumerModule;
}): LoanFile[] {
  const consumerModule = opts.module ?? "opportunity_workspace";
  const { files } = loadDealsSync(consumerModule);
  if (opts.fileId) {
    const hit = files.find((f) => f.id === opts.fileId);
    return hit ? [hit] : [];
  }
  if (opts.opportunityId) {
    return files.filter(
      (f) =>
        f.id === opts.opportunityId ||
        f.fileNumber === opts.opportunityId ||
        (f as LoanFile & { opportunityId?: string }).opportunityId === opts.opportunityId,
    );
  }
  return [];
}

/** Integrity probe for UI / gates — is Enterprise the configured operational SSOT? */
export function isDealDalEnterpriseOperational(): boolean {
  return isEnterpriseDealRegistryOperational();
}
