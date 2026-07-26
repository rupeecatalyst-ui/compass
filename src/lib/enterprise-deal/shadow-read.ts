/**
 * CO-ARCH-002-W4 — Shadow Read + mismatch telemetry (never drives UI).
 */
import {
  isDealRegistryShadowReadEnabled,
  type DealRegistryWave4Module,
} from "@/constants/enterprise-deal-registry";
import {
  enterpriseDealApiClient,
  type EnterpriseDealApiRecord,
} from "@/lib/enterprise-deal/deal-api-client";
import { mapLoanFileGrossStage } from "@/lib/enterprise-deal/map-loan-file-to-deal";
import type { LoanFile } from "@/types/catalyst-one";

const MISMATCH_KEY = "compass:deal-shadow-read-mismatches";
const METRICS_KEY = "compass:deal-shadow-read-metrics";
const MODULE_STATUS_KEY = "compass:deal-shadow-read-module-status";

/** Material discrepancy threshold — pause module migration recommendation. */
export const SHADOW_READ_MATERIAL_MISMATCH_RATE = 0.05; // 5%

export type ShadowMismatchKind =
  | "missing_on_deal"
  | "missing_on_local"
  | "field_drift"
  | "api_error";

export type ShadowMismatchEntry = {
  id: string;
  at: string;
  module: DealRegistryWave4Module;
  kind: ShadowMismatchKind;
  legacyLoanFileId?: string;
  dealId?: string;
  dealNumber?: string;
  fields?: string[];
  message: string;
};

export type ShadowReadMetrics = {
  module: DealRegistryWave4Module;
  at: string;
  localCount: number;
  dealCount: number;
  matched: number;
  missingOnDeal: number;
  missingOnLocal: number;
  fieldDrift: number;
  mismatchRate: number;
  materialDiscrepancy: boolean;
  durationMs: number;
  status: "ok" | "skipped" | "error" | "paused_recommendation";
  message?: string;
};

export type ModuleMigrationStatus = {
  module: DealRegistryWave4Module;
  shadowRead: "not_started" | "idle_flag_off" | "running" | "passed" | "paused_discrepancy";
  portRuntime: "blocked" | "ready_flag_off" | "active";
  lastMetricsAt?: string;
  lastMismatchRate?: number;
  note?: string;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function listShadowMismatches(): ShadowMismatchEntry[] {
  return readJson(MISMATCH_KEY, []);
}

export function getLatestShadowMetrics(
  module: DealRegistryWave4Module = "my_deals",
): ShadowReadMetrics | null {
  const all = readJson<Record<string, ShadowReadMetrics>>(METRICS_KEY, {});
  return all[module] ?? null;
}

export function getModuleMigrationStatus(
  module: DealRegistryWave4Module = "my_deals",
): ModuleMigrationStatus {
  const map = readJson<Record<string, ModuleMigrationStatus>>(MODULE_STATUS_KEY, {});
  return (
    map[module] ?? {
      module,
      shadowRead: "idle_flag_off",
      portRuntime: "blocked",
      note: "Default Wave 4 status — flags OFF",
    }
  );
}

function appendMismatch(entry: Omit<ShadowMismatchEntry, "id" | "at">) {
  const list = listShadowMismatches();
  list.unshift({
    ...entry,
    id: `sr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
  });
  writeJson(MISMATCH_KEY, list.slice(0, 300));
  if (typeof console !== "undefined") {
    if (process.env.NODE_ENV !== "production") {
      console.info("[CO-ARCH-002 shadow-read]", entry.kind, entry.message);
    }
  }
}

function saveMetrics(metrics: ShadowReadMetrics) {
  const all = readJson<Record<string, ShadowReadMetrics>>(METRICS_KEY, {});
  all[metrics.module] = metrics;
  writeJson(METRICS_KEY, all);
}

function saveModuleStatus(status: ModuleMigrationStatus) {
  const map = readJson<Record<string, ModuleMigrationStatus>>(MODULE_STATUS_KEY, {});
  map[status.module] = status;
  writeJson(MODULE_STATUS_KEY, map);
}

function compareFileToDeal(file: LoanFile, deal: EnterpriseDealApiRecord): string[] {
  const drifts: string[] = [];
  const expectedStage = mapLoanFileGrossStage(file);
  if (deal.grossStage !== expectedStage) drifts.push("grossStage");
  if ((deal.primaryContactName ?? "") !== (file.customerName ?? "")) {
    drifts.push("primaryContactName");
  }
  if ((deal.productLabel ?? "") !== (file.loanProduct ?? "")) {
    drifts.push("productLabel");
  }
  const localAmount = file.requiredAmount || file.loanAmount || 0;
  const dealAmount = deal.requestedAmount ?? 0;
  if (localAmount > 0 && Math.abs(localAmount - dealAmount) > 1) {
    drifts.push("requestedAmount");
  }
  return drifts;
}

let shadowInFlight = false;

/**
 * Shadow Read for My Deals — fire-and-forget.
 * Never returns data for UI. Logs mismatches + metrics only.
 */
export async function runMyDealsShadowRead(localFiles: LoanFile[]): Promise<ShadowReadMetrics | null> {
  const wave4Module: DealRegistryWave4Module = "my_deals";

  if (!isDealRegistryShadowReadEnabled()) {
    saveModuleStatus({
      module: wave4Module,
      shadowRead: "idle_flag_off",
      portRuntime: "blocked",
      note: "DEAL_REGISTRY_SHADOW_READ is OFF — no compare traffic",
    });
    return null;
  }

  if (typeof window === "undefined" || shadowInFlight) return null;
  shadowInFlight = true;
  const started = Date.now();

  try {
    saveModuleStatus({
      module: wave4Module,
      shadowRead: "running",
      portRuntime: "blocked",
      note: "Shadow Read in progress",
    });

    const localActive = localFiles.filter((f) => f.stage !== undefined && !f.archived);
    const localById = new Map(localActive.map((f) => [f.id, f]));

    const dealPage = await enterpriseDealApiClient.searchDeals({
      page: 1,
      pageSize: 100,
      archived: false,
      productFamily: "lending",
    });
    const deals = dealPage.items.filter((d) => !d.isDeleted && d.legacyLoanFileId);
    const dealByLegacy = new Map(
      deals
        .filter((d) => d.legacyLoanFileId)
        .map((d) => [d.legacyLoanFileId as string, d]),
    );

    let matched = 0;
    let missingOnDeal = 0;
    let missingOnLocal = 0;
    let fieldDrift = 0;

    for (const file of localActive) {
      const deal = dealByLegacy.get(file.id);
      if (!deal) {
        missingOnDeal += 1;
        appendMismatch({
          module: wave4Module,
          kind: "missing_on_deal",
          legacyLoanFileId: file.id,
          message: `Local LoanFile ${file.id} has no Enterprise Deal (legacyLoanFileId)`,
        });
        continue;
      }
      const drifts = compareFileToDeal(file, deal);
      if (drifts.length) {
        fieldDrift += 1;
        appendMismatch({
          module: wave4Module,
          kind: "field_drift",
          legacyLoanFileId: file.id,
          dealId: deal.id,
          dealNumber: deal.dealNumber,
          fields: drifts,
          message: `Field drift: ${drifts.join(", ")}`,
        });
      } else {
        matched += 1;
      }
    }

    for (const deal of deals) {
      const legacy = deal.legacyLoanFileId;
      if (!legacy) continue;
      if (!localById.has(legacy)) {
        missingOnLocal += 1;
        appendMismatch({
          module: wave4Module,
          kind: "missing_on_local",
          legacyLoanFileId: legacy,
          dealId: deal.id,
          dealNumber: deal.dealNumber,
          message: `Enterprise Deal ${deal.dealNumber} has no local LoanFile`,
        });
      }
    }

    const denom = Math.max(localActive.length, 1);
    const mismatchCount = missingOnDeal + fieldDrift;
    const mismatchRate = mismatchCount / denom;
    const material = mismatchRate > SHADOW_READ_MATERIAL_MISMATCH_RATE;

    const metrics: ShadowReadMetrics = {
      module: wave4Module,
      at: new Date().toISOString(),
      localCount: localActive.length,
      dealCount: deals.length,
      matched,
      missingOnDeal,
      missingOnLocal,
      fieldDrift,
      mismatchRate,
      materialDiscrepancy: material,
      durationMs: Date.now() - started,
      status: material ? "paused_recommendation" : "ok",
      message: material
        ? `Material discrepancy rate ${(mismatchRate * 100).toFixed(1)}% — pause before PORT_RUNTIME`
        : "Shadow Read completed within threshold",
    };
    saveMetrics(metrics);
    saveModuleStatus({
      module: wave4Module,
      shadowRead: material ? "paused_discrepancy" : "passed",
      portRuntime: material ? "blocked" : "ready_flag_off",
      lastMetricsAt: metrics.at,
      lastMismatchRate: mismatchRate,
      note: metrics.message,
    });
    return metrics;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Shadow Read failed";
    appendMismatch({
      module: wave4Module,
      kind: "api_error",
      message,
    });
    const metrics: ShadowReadMetrics = {
      module: wave4Module,
      at: new Date().toISOString(),
      localCount: localFiles.length,
      dealCount: 0,
      matched: 0,
      missingOnDeal: 0,
      missingOnLocal: 0,
      fieldDrift: 0,
      mismatchRate: 1,
      materialDiscrepancy: true,
      durationMs: Date.now() - started,
      status: "error",
      message,
    };
    saveMetrics(metrics);
    saveModuleStatus({
      module: wave4Module,
      shadowRead: "paused_discrepancy",
      portRuntime: "blocked",
      lastMetricsAt: metrics.at,
      note: message,
    });
    return metrics;
  } finally {
    shadowInFlight = false;
  }
}

/** Schedule shadow read without blocking UI (debounce). */
let shadowTimer: ReturnType<typeof setTimeout> | null = null;
export function queueMyDealsShadowRead(localFiles: LoanFile[]): void {
  if (!isDealRegistryShadowReadEnabled()) return;
  if (typeof window === "undefined") return;
  if (shadowTimer) clearTimeout(shadowTimer);
  shadowTimer = setTimeout(() => {
    shadowTimer = null;
    void runMyDealsShadowRead(localFiles);
  }, 500);
}
