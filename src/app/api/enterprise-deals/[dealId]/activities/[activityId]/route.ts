import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { enterpriseDealService } from "@server/services/enterprise-deal/enterprise-deal.service";
import { enterpriseDealApiGuard, mapDealRouteError } from "../../../_lib/route-utils";

type Ctx = { params: Promise<{ dealId: string; activityId: string }> };

/** PATCH — update activity */
export async function PATCH(request: Request, context: Ctx) {
  try {
    enterpriseDealApiGuard();
    const actor = requireAccessToken(request);
    const { dealId, activityId } = await context.params;
    const body = await request.json();
    const row = await enterpriseDealService.updateActivity(dealId, activityId, {
      title: body.title,
      status: body.status,
      activityType: body.activityType,
      dueAt: body.dueAt,
      assigneeUserId: body.assigneeUserId,
      completedAt: body.completedAt,
      payload: body.payload,
      actorUserId: actor.userId,
    });
    return successResponse(row);
  } catch (err) {
    const mapped = mapDealRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "DEAL_ACTIVITY_UPDATE_FAILED",
      mapped.body.error?.message ?? "Update failed",
    );
  }
}
