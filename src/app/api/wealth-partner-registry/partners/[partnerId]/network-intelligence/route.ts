import {
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import type {
  WealthPartnerNetworkIntelligenceFilters,
  WealthPartnerNetworkPeriodPreset,
} from "@/types/enterprise-wealth-partner-registry";
import { buildWealthPartnerNetworkIntelligence } from "@server/services/wealth-partner-registry";
import {
  mapRouteError,
  respondMappedError,
  wealthPartnerPersistenceGuard,
} from "../../../_lib/route-utils";

function parseFilters(url: URL): WealthPartnerNetworkIntelligenceFilters {
  const periodRaw = url.searchParams.get("period") ?? "all";
  const period: WealthPartnerNetworkPeriodPreset =
    periodRaw === "month" ||
    periodRaw === "quarter" ||
    periodRaw === "financial_year" ||
    periodRaw === "all"
      ? periodRaw
      : "all";
  return {
    period,
    periodKey: url.searchParams.get("periodKey") ?? undefined,
    productCode: url.searchParams.get("productCode") ?? "all",
    branchId: url.searchParams.get("branchId") ?? "all",
    region: url.searchParams.get("region") ?? "all",
    partnerType: url.searchParams.get("partnerType") ?? "all",
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ partnerId: string }> },
) {
  const { partnerId } = await context.params;
  const endpoint = `/api/wealth-partner-registry/partners/${partnerId}/network-intelligence`;
  try {
    wealthPartnerPersistenceGuard();
    requireAccessToken(request);
    const url = new URL(request.url);
    const filters = parseFilters(url);
    console.info("[wealth-partner-registry] network-intelligence", {
      endpoint,
      partnerId,
      filters,
    });
    const data = await buildWealthPartnerNetworkIntelligence(partnerId, filters);
    return successResponse(data);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped?.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return respondMappedError(err, { endpoint, method: "GET", payload: { partnerId } });
  }
}
