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

/** GET — Deal Timeline (append-only; read-only API) */
export async function GET(request: Request, context: Ctx) {
  try {
    enterpriseDealApiGuard();
    requireAccessToken(request);
    const { dealId } = await context.params;
    const take = Number(new URL(request.url).searchParams.get("take") ?? 50);
    const events = await enterpriseDealService.listTimeline(dealId, take);
    return successResponse({ items: events });
  } catch (err) {
    const mapped = mapDealRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(mapped.status, "DEAL_TIMELINE_FAILED", mapped.body.error?.message ?? "Timeline failed");
  }
}
