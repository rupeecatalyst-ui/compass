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
    return successResponse(await enterpriseDealService.summarizeDealsByLender());
  } catch (error) {
    const mapped = mapDealRouteError(error);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(mapped.status, "LENDER_DEAL_METRICS_FAILED", "Failed to load lender Deal metrics");
  }
}
