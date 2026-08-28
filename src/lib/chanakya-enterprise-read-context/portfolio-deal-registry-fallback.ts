/**
 * CO-CHANAKYA-ENTERPRISE-PORTFOLIO-HYDRATION-048 — Prisma Deal Registry → Radar row projection.
 * Structure translation only — feeds the same 047 portfolio enrichment pipeline.
 */

import "server-only";

import type { ChanakyaRadarDealRow } from "@/lib/chanakya-radar/derive-dashboard";
import { formatINR } from "@/lib/format-currency";
import { enterpriseDealRepository } from "@server/repositories/enterprise-deal/enterprise-deal.repository";
import { isDatabaseAvailable } from "@server/lib/prisma";
import type { ChanakyaPortfolioHydrationAvailability } from "@/types/chanakya-enterprise-read-context";
import { CHANAKYA_PORTFOLIO_PAGE_MAX } from "@/types/chanakya-enterprise-read-context";

type DealListRow = Awaited<
  ReturnType<typeof enterpriseDealRepository.searchDeals>
>["items"][number];

function daysSince(iso?: string | Date | null): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function formatWhen(iso?: string | Date | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return String(iso);
  }
}

/** Map canonical EnterpriseDeal registry row → minimal Radar row for 047 enrichment. */
export function mapEnterpriseDealToRadarRow(deal: DealListRow): ChanakyaRadarDealRow {
  const amount =
    deal.requestedAmount != null
      ? Number(deal.requestedAmount)
      : deal.approvedAmount != null
        ? Number(deal.approvedAmount)
        : 0;
  const lastActivityIso =
    deal.updatedAt?.toISOString?.() ??
    deal.stageEnteredAt?.toISOString?.() ??
    deal.createdAt?.toISOString?.() ??
    "";
  const opportunityNumber = deal.opportunity?.opportunityNumber?.trim() || undefined;
  const stageLabel = String(deal.grossStage ?? "—").replace(/_/g, " ");

  return {
    id: deal.id,
    fileId: deal.legacyLoanFileId?.trim() || deal.id,
    enterpriseDealId: deal.id,
    customerId: deal.primaryContactId?.trim() || undefined,
    dealId: deal.dealNumber,
    opportunityNumber,
    borrower: deal.primaryContactName?.trim() || "—",
    product: deal.productLabel?.trim() || deal.productCode?.trim() || "—",
    loanAmount: amount,
    loanAmountLabel: amount > 0 ? formatINR(amount) : "—",
    assignedRm: deal.relationshipManagerName?.trim() || "—",
    primaryOwnerUserId: deal.primaryOwnerUserId ?? undefined,
    relationshipManagerUserId: deal.relationshipManagerUserId ?? undefined,
    quadrant: "on_track",
    quadrantLabel: "On track",
    stageLabel,
    subStageLabel: deal.subStage?.trim() || "",
    lender: deal.primaryCounterpartyName?.trim() || "—",
    lastActivity: lastActivityIso,
    lastActivityLabel: formatWhen(lastActivityIso),
    idleDays: daysSince(lastActivityIso),
    daysInStage: daysSince(deal.stageEnteredAt),
    workedToday: false,
    activityMomentumScore: 0,
    activityState: "recently_active",
    activityStateLabel: "Recently active",
    activityMomentumTrend: "stable",
    isHealthyWaiting: false,
    pendingDocs: 0,
    openTasks: 0,
    priority: deal.priority ?? "medium",
    status: deal.operationalStatus ?? "active",
    dealHealthScore: 0,
    classificationReason: "Hydrated from Enterprise Deal Registry (serverless fallback).",
    recommendation: "",
  };
}

export async function loadPortfolioDealsFromRegistry(input: {
  organizationId: string;
  limit: number;
  page: number;
}): Promise<{
  rows: ChanakyaRadarDealRow[];
  availability: ChanakyaPortfolioHydrationAvailability;
  note: string;
  pagination: {
    totalDeals: number;
    returnedCount: number;
    limit: number;
    page: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
  fallbackError?: string;
}> {
  const limit = Math.min(Math.max(input.limit, 1), CHANAKYA_PORTFOLIO_PAGE_MAX);
  const page = Math.max(1, input.page);

  if (!isDatabaseAvailable()) {
    return {
      rows: [],
      availability: "NOT_AVAILABLE",
      note: "Enterprise Deal Registry database is not available.",
      pagination: {
        totalDeals: 0,
        returnedCount: 0,
        limit,
        page,
        hasMore: false,
        nextCursor: null,
      },
    };
  }

  try {
    const result = await enterpriseDealRepository.searchDeals(input.organizationId, {
      page,
      pageSize: limit,
      archived: false,
      includeDeleted: false,
      sort: "updatedAt_desc",
      view: "summary",
    });

    const rows = result.items.map(mapEnterpriseDealToRadarRow);
    const availability: ChanakyaPortfolioHydrationAvailability =
      result.total === 0 ? "TRUE_EMPTY" : "AVAILABLE";

    return {
      rows,
      availability,
      note:
        availability === "TRUE_EMPTY"
          ? "No authorized Deals found in Enterprise Deal Registry for this organization."
          : "Portfolio hydrated from Enterprise Deal Registry (serverless Radar cache not trusted).",
      pagination: {
        totalDeals: result.total,
        returnedCount: rows.length,
        limit,
        page: result.page,
        hasMore: result.page < result.totalPages,
        nextCursor: result.page < result.totalPages ? String(result.page + 1) : null,
      },
    };
  } catch (error) {
    return {
      rows: [],
      availability: "FALLBACK_FAILURE",
      note: "Enterprise Deal Registry portfolio fallback failed — not reporting a false business zero.",
      fallbackError: error instanceof Error ? error.message : "unknown_error",
      pagination: {
        totalDeals: 0,
        returnedCount: 0,
        limit,
        page,
        hasMore: false,
        nextCursor: null,
      },
    };
  }
}
