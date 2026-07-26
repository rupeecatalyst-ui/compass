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
} from "../../_lib/route-utils";

type Ctx = { params: Promise<{ opportunityId: string }> };

/** List lender Deals for an Opportunity (1 → N). */
export async function GET(request: Request, context: Ctx) {
  try {
    enterpriseOpportunityApiGuard();
    requireAccessToken(request);
    const { opportunityId } = await context.params;
    const deals = await enterpriseOpportunityService.listDealsForOpportunity(opportunityId);
    return successResponse({ items: deals, total: deals.length });
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "OPPORTUNITY_DEALS_FAILED",
      mapped.body.error?.message ?? "Failed to list Deals for Opportunity",
    );
  }
}
