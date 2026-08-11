/**
 * CO-RADAR-003 — Batch Enterprise Deal Timeline for Radar / DAL hydrate.
 * GET /api/enterprise-deals/timelines?dealIds=id1,id2&takePerDeal=50
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { enterpriseDealService } from "@server/services/enterprise-deal/enterprise-deal.service";
import { enterpriseDealApiGuard, mapDealRouteError } from "../_lib/route-utils";

export async function GET(request: Request) {
  try {
    enterpriseDealApiGuard();
    requireAccessToken(request);
    const url = new URL(request.url);
    const raw = url.searchParams.get("dealIds") ?? "";
    const dealIds = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 100);
    const takePerDeal = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("takePerDeal") ?? 50)),
    );
    if (dealIds.length === 0) {
      return successResponse({ byDealId: {} });
    }
    const byDealId = await enterpriseDealService.listTimelinesForDeals(
      dealIds,
      takePerDeal,
    );
    return successResponse({ byDealId });
  } catch (err) {
    const mapped = mapDealRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      "DEAL_TIMELINES_FAILED",
      mapped.body.error?.message ?? "Batch timeline failed",
    );
  }
}
