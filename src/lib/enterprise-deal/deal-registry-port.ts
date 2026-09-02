/**
 * CO-PERF-002 — My Deals Deal Registry port (progressive Phase 1 → Phase 2).
 * Enterprise Deal API is the only operational SSOT.
 */
import {
  isDealRegistryPortRuntimeActive,
  isEnterpriseDealRegistryOperational,
} from "@/constants/enterprise-deal-registry";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { mapEnterpriseDealToDealRegistryRow } from "@/lib/enterprise-deal/map-deal-to-registry-row";
import {
  overlayDealRowsWithEarLastActivity,
} from "@/lib/enterprise-activity-registry/latest-opportunity-activity";
import { listEnterpriseActivity } from "@/lib/enterprise-activity-registry/api-client";
import { listSessionEarEvents } from "@/lib/enterprise-activity-registry/session-registry";
import type { DealRegistryRow } from "@/types/deal-registry";

export type DealRegistryReadSource = "local" | "enterprise_deal" | "local_fallback";

export type DealRegistryPortResult = {
  rows: DealRegistryRow[];
  source: DealRegistryReadSource;
  error?: string;
  enterpriseSsotExpected: boolean;
  /** CO-PERF-002 */
  projection?: "summary" | "full";
};

export function resolveMyDealsDisplayRows(input: {
  previous: DealRegistryRow[] | null;
  incoming: DealRegistryRow[];
  source: DealRegistryReadSource;
  localRows: DealRegistryRow[];
}): DealRegistryRow[] {
  const { previous, incoming, source } = input;
  if (source === "enterprise_deal") {
    if (incoming.length > 0) return incoming;
    if (previous && previous.length > 0) return previous;
    return incoming;
  }
  if (source === "local_fallback") {
    if (incoming.length > 0) return incoming;
    if (previous && previous.length > 0) return previous;
    return [];
  }
  return incoming;
}

async function overlayMyDealsLastActivityFromEar(
  rows: DealRegistryRow[],
): Promise<DealRegistryRow[]> {
  try {
    const events = await listEnterpriseActivity({ limit: 200 });
    const session = listSessionEarEvents();
    return overlayDealRowsWithEarLastActivity(rows, [...session, ...events]).sort(
      (a, b) => b.lastActivity.localeCompare(a.lastActivity),
    );
  } catch {
    return overlayDealRowsWithEarLastActivity(rows, listSessionEarEvents()).sort(
      (a, b) => b.lastActivity.localeCompare(a.lastActivity),
    );
  }
}

/** @deprecated Soft Go-Live list — returns empty when Registry is operational. */
export function listDealRegistryRowsLocal(): DealRegistryPortResult {
  return {
    rows: [],
    source: isEnterpriseDealRegistryOperational() ? "enterprise_deal" : "local",
    enterpriseSsotExpected: isEnterpriseDealRegistryOperational(),
  };
}

/**
 * CO-PERF-002 Phase 1 — Immediate registry paint (summary projection).
 */
export async function loadMyDealsDealRegistryRows(): Promise<DealRegistryPortResult> {
  if (!isDealRegistryPortRuntimeActive()) {
    return {
      rows: [],
      source: "local",
      enterpriseSsotExpected: false,
      error: "Deal Registry port inactive — enable prisma persistence / Deal port flags.",
    };
  }

  try {
    const page = await enterpriseDealApiClient.searchDeals({
      page: 1,
      pageSize: 100,
      archived: false,
      productFamily: "lending",
      view: "summary",
    });
    const mapped = page.items
      .filter(
        (d) =>
          !d.isDeleted &&
          !d.archived &&
          (d.productFamily ?? "lending") === "lending",
      )
      .map(mapEnterpriseDealToDealRegistryRow);
    const rows = await overlayMyDealsLastActivityFromEar(mapped);
    return {
      rows,
      source: "enterprise_deal",
      enterpriseSsotExpected: true,
      projection: "summary",
    };
  } catch (err) {
    return {
      rows: [],
      source: "local_fallback",
      enterpriseSsotExpected: true,
      error: err instanceof Error ? err.message : "Deal API read failed",
    };
  }
}

/**
 * CO-PERF-002 Phase 2 — Background enrichment (full Deal rows for expand / chips / history).
 */
export async function enrichMyDealsDealRegistryRows(): Promise<DealRegistryPortResult> {
  if (!isDealRegistryPortRuntimeActive()) {
    return listDealRegistryRowsLocal();
  }
  try {
    const page = await enterpriseDealApiClient.searchDeals({
      page: 1,
      pageSize: 100,
      archived: false,
      productFamily: "lending",
      view: "full",
    });
    const mapped = page.items
      .filter(
        (d) =>
          !d.isDeleted &&
          !d.archived &&
          (d.productFamily ?? "lending") === "lending",
      )
      .map(mapEnterpriseDealToDealRegistryRow);
    const rows = await overlayMyDealsLastActivityFromEar(mapped);
    return {
      rows,
      source: "enterprise_deal",
      enterpriseSsotExpected: true,
      projection: "full",
    };
  } catch (err) {
    return {
      rows: [],
      source: "local_fallback",
      enterpriseSsotExpected: true,
      error: err instanceof Error ? err.message : "Deal enrich failed",
    };
  }
}

