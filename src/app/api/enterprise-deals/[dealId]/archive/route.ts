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

/** POST — Archive Deal */
export async function POST(request: Request, context: Ctx) {
  try {
    enterpriseDealApiGuard();
    const actor = requireAccessToken(request);
    const { dealId } = await context.params;
    let reason: string | null = null;
    try {
      const body = await request.json();
      reason = body?.reason ? String(body.reason) : null;
    } catch {
      reason = null;
    }
    const updated = await enterpriseDealService.archiveDeal(dealId, actor.userId, reason);
    return successResponse(updated);
  } catch (err) {
    const mapped = mapDealRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 409 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(mapped.status, "DEAL_ARCHIVE_FAILED", mapped.body.error?.message ?? "Archive failed");
  }
}
