/**
 * CO-CHANAKYA-ENTERPRISE-PORTFOLIO-HYDRATION-048 — Portfolio source resolver.
 * Prefer trusted EBI/Radar; fall back to async Enterprise Deal Registry when serverless cache is empty.
 */

import "server-only";

import { loadEbiDataContext } from "@/lib/enterprise-business-intelligence/snapshot";
import type { ChanakyaRadarDealRow } from "@/lib/chanakya-radar/derive-dashboard";
import type {
  ChanakyaPortfolioHydrationAvailability,
  ChanakyaPortfolioHydrationMeta,
} from "@/types/chanakya-enterprise-read-context";
import { CHANAKYA_PORTFOLIO_PAGE_MAX } from "@/types/chanakya-enterprise-read-context";
import { loadPortfolioDealsFromRegistry } from "./portfolio-deal-registry-fallback";

export type PortfolioRadarResolution = {
  rows: ChanakyaRadarDealRow[];
  hydration: ChanakyaPortfolioHydrationMeta;
};

export async function resolvePortfolioRadarRows(input: {
  organizationId: string;
  limit: number;
  page?: number;
}): Promise<PortfolioRadarResolution> {
  const limit = Math.min(Math.max(input.limit, 1), CHANAKYA_PORTFOLIO_PAGE_MAX);
  const page = Math.max(1, input.page ?? 1);
  const ctx = loadEbiDataContext();
  const radarRows = ctx.radar.rows;

  if (ctx.isLiveTrusted) {
    const totalDeals = radarRows.length;
    const start = (page - 1) * limit;
    const slice = radarRows.slice(start, start + limit);
    const availability: ChanakyaPortfolioHydrationAvailability =
      totalDeals === 0 ? "TRUE_EMPTY" : "AVAILABLE";

    return {
      rows: slice,
      hydration: {
        source: "ebi_radar",
        isLiveTrusted: true,
        availability,
        note:
          availability === "TRUE_EMPTY"
            ? "Trusted Radar book is empty for this organization."
            : undefined,
        pagination: {
          totalDeals,
          returnedCount: slice.length,
          limit,
          page,
          hasMore: start + limit < totalDeals,
          nextCursor: start + limit < totalDeals ? String(page + 1) : null,
        },
      },
    };
  }

  const fallback = await loadPortfolioDealsFromRegistry({
    organizationId: input.organizationId,
    limit,
    page,
  });

  return {
    rows: fallback.rows,
    hydration: {
      source: "enterprise_deal_registry",
      isLiveTrusted: false,
      availability: fallback.availability,
      note: fallback.note,
      fallbackError: fallback.fallbackError,
      pagination: fallback.pagination,
    },
  };
}
