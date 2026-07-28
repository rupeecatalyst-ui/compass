/**
 * Today's New Opportunities KPI — created today, by Business Source (non-draft).
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";
import {
  enterpriseOpportunityApiGuard,
  mapOpportunityRouteError,
} from "../_lib/route-utils";

export async function GET(request: Request) {
  try {
    enterpriseOpportunityApiGuard();
    requireAccessToken(request);
    const data = await enterpriseOpportunityService.getTodayNewOpportunityKpis();
    return successResponse(data);
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      "TODAY_NEW_OPPORTUNITY_KPI_FAILED",
      mapped.body.error?.message ?? "Failed to load Today's New Opportunities",
    );
  }
}
