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

/** GET — list activities · POST — Record Activity */
export async function GET(request: Request, context: Ctx) {
  try {
    enterpriseDealApiGuard();
    requireAccessToken(request);
    const { dealId } = await context.params;
    const items = await enterpriseDealService.listActivities(dealId);
    return successResponse({ items });
  } catch (err) {
    const mapped = mapDealRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(mapped.status, "DEAL_ACTIVITY_LIST_FAILED", mapped.body.error?.message ?? "List failed");
  }
}

export async function POST(request: Request, context: Ctx) {
  try {
    enterpriseDealApiGuard();
    const actor = requireAccessToken(request);
    const { dealId } = await context.params;
    const body = await request.json();
    const row = await enterpriseDealService.recordActivity(dealId, {
      title: String(body.title ?? ""),
      status: body.status,
      activityType: body.activityType,
      dueAt: body.dueAt,
      assigneeUserId: body.assigneeUserId,
      payload: body.payload,
      actorUserId: actor.userId,
    });
    return successResponse(row, 201);
  } catch (err) {
    const mapped = mapDealRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "DEAL_ACTIVITY_CREATE_FAILED",
      mapped.body.error?.message ?? "Create failed",
    );
  }
}
