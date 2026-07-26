import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { enterpriseDealService } from "@server/services/enterprise-deal/enterprise-deal.service";
import { enterpriseDealApiGuard, mapDealRouteError } from "../../_lib/route-utils";

type Ctx = { params: Promise<{ dealId: string }> };

/**
 * GET — Deal Health placeholder (ARB A3 reserved fields).
 * PATCH — rejected with 501 until a certified health engine is authorized.
 */
export async function GET(request: Request, context: Ctx) {
  try {
    enterpriseDealApiGuard();
    requireAccessToken(request);
    const { dealId } = await context.params;
    const health = await enterpriseDealService.getDealHealth(dealId);
    return successResponse(health);
  } catch (err) {
    const mapped = mapDealRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(mapped.status, "DEAL_HEALTH_FAILED", mapped.body.error?.message ?? "Health read failed");
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    enterpriseDealApiGuard();
    requireAccessToken(request);
    const { dealId } = await context.params;
    await enterpriseDealService.updateDealHealthPlaceholder(dealId);
    return successResponse(null);
  } catch (err) {
    const mapped = mapDealRouteError(err);
    if (
      mapped.status === 401 ||
      mapped.status === 404 ||
      mapped.status === 501 ||
      mapped.status === 503
    ) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(mapped.status, "DEAL_HEALTH_WRITE_FAILED", mapped.body.error?.message ?? "Not implemented");
  }
}
