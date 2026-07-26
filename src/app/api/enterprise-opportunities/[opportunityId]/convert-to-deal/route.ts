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

/** POST — Mark Opportunity converted to Deal (leaves planning-active uniqueness set). */
export async function POST(request: Request, context: Ctx) {
  try {
    enterpriseOpportunityApiGuard();
    const actor = requireAccessToken(request);
    const { opportunityId } = await context.params;
    void request;
    const row = await enterpriseOpportunityService.markConvertedToDeal(
      opportunityId,
      actor.userId,
    );
    return successResponse(row);
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    if (
      mapped.status === 401 ||
      mapped.status === 403 ||
      mapped.status === 404 ||
      mapped.status === 503
    ) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "OPPORTUNITY_CONVERT_FAILED",
      mapped.body.error?.message ?? "Failed to mark Opportunity converted",
    );
  }
}
