/**
 * CO-ARCH-005 — My Deals Deal Registry port.
 * Enterprise Deal API is the only operational SSOT.
 * Soft Go-Live / loadLoanFiles is not used for Deal list when Registry is operational.
 */
import {
  isDealRegistryPortRuntimeActive,
  isEnterpriseDealRegistryOperational,
} from "@/constants/enterprise-deal-registry";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { mapEnterpriseDealToDealRegistryRow } from "@/lib/enterprise-deal/map-deal-to-registry-row";
import type { DealRegistryRow } from "@/types/deal-registry";

export type DealRegistryReadSource = "local" | "enterprise_deal" | "local_fallback";

export type DealRegistryPortResult = {
  rows: DealRegistryRow[];
  source: DealRegistryReadSource;
  error?: string;
  /** True when Enterprise Deal Registry is the configured operational SSOT */
  enterpriseSsotExpected: boolean;
};

/**
 * CO-ARCH-003 / CO-ARCH-005 — Prefer enterprise rows; never invent Soft Go-Live list as SSOT.
 */
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
    // CO-ARCH-005 — do not fall back to Soft Go-Live LoanFile list when Registry is SSOT.
    return incoming;
  }
  if (source === "local_fallback") {
    if (incoming.length > 0) return incoming;
    if (previous && previous.length > 0) return previous;
    return [];
  }
  return incoming;
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
 * Async read for My Deals — Enterprise Deal API only when port runtime is active.
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
    });
    const rows = page.items
      .filter((d) => !d.isDeleted && !d.archived)
      .map(mapEnterpriseDealToDealRegistryRow)
      .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
    return {
      rows,
      source: "enterprise_deal",
      enterpriseSsotExpected: true,
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
