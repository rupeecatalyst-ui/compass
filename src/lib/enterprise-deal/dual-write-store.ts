/**
 * CO-ARCH-002-W3 — Local mapping + reconcile log for dual-write (client only).
 */
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";

const MAP_KEY = "compass:deal-id-by-loan-file";
const FINGERPRINT_KEY = "compass:deal-dual-write-fingerprints";
const RECONCILE_KEY = "compass:deal-dual-write-reconcile";

export type DealIdMapEntry = {
  dealId: string;
  dealNumber: string;
  rowVersion: number;
  grossStage: string;
  archived: boolean;
  updatedAt: string;
};

export type DualWriteReconcileEntry = {
  id: string;
  at: string;
  legacyLoanFileId: string;
  operation: "create" | "update" | "transition" | "archive" | "restore" | "upsert";
  status: "failed" | "exhausted" | "conflict" | "skipped";
  attempts: number;
  message: string;
  code?: string;
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
    // quota / private mode — dual-write still proceeds without durable cache
  }
}

export function getDealIdMap(): Record<string, DealIdMapEntry> {
  return readJson(MAP_KEY, {});
}

export function rememberDealMapping(
  legacyLoanFileId: string,
  deal: Pick<
    EnterpriseDealApiRecord,
    "id" | "dealNumber" | "rowVersion" | "grossStage" | "archived"
  >,
) {
  const map = getDealIdMap();
  map[legacyLoanFileId] = {
    dealId: deal.id,
    dealNumber: deal.dealNumber,
    rowVersion: deal.rowVersion,
    grossStage: deal.grossStage,
    archived: Boolean(deal.archived),
    updatedAt: new Date().toISOString(),
  };
  writeJson(MAP_KEY, map);
}

export function getRememberedDeal(legacyLoanFileId: string): DealIdMapEntry | null {
  return getDealIdMap()[legacyLoanFileId] ?? null;
}

export function getFingerprintMap(): Record<string, string> {
  return readJson(FINGERPRINT_KEY, {});
}

export function setFingerprint(legacyLoanFileId: string, fingerprint: string) {
  const map = getFingerprintMap();
  map[legacyLoanFileId] = fingerprint;
  writeJson(FINGERPRINT_KEY, map);
}

export function appendReconcileLog(entry: Omit<DualWriteReconcileEntry, "id" | "at">) {
  const list = readJson<DualWriteReconcileEntry[]>(RECONCILE_KEY, []);
  list.unshift({
    ...entry,
    id: `dw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
  });
  writeJson(RECONCILE_KEY, list.slice(0, 200));
  if (typeof console !== "undefined") {
    console.warn("[CO-ARCH-002 dual-write]", entry.operation, entry.legacyLoanFileId, entry.message);
  }
}

export function listReconcileLog(): DualWriteReconcileEntry[] {
  return readJson(RECONCILE_KEY, []);
}

export function clearReconcileLog() {
  writeJson(RECONCILE_KEY, []);
}
