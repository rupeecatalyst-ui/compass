/**
 * CO-UX-006 — Today's Fresh Logins KPI counts (Opportunity-centric).
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
    const data = await enterpriseOpportunityService.getFreshLoginKpis();
    return successResponse(data);
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      "FRESH_LOGIN_KPI_FAILED",
      mapped.body.error?.message ?? "Failed to load Fresh Login KPIs",
    );
  }
}
