import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { enterpriseDealService } from "@server/services/enterprise-deal/enterprise-deal.service";
import { enterpriseDealApiGuard, mapDealRouteError } from "../../../_lib/route-utils";

type Ctx = { params: Promise<{ dealId: string; taskId: string }> };

/** PATCH — update task */
export async function PATCH(request: Request, context: Ctx) {
  try {
    enterpriseDealApiGuard();
    const actor = requireAccessToken(request);
    const { dealId, taskId } = await context.params;
    const body = await request.json();
    const row = await enterpriseDealService.updateTask(dealId, taskId, {
      title: body.title,
      status: body.status,
      priority: body.priority,
      dueAt: body.dueAt,
      assigneeUserId: body.assigneeUserId,
      slaPolicyId: body.slaPolicyId,
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
      mapped.body.error?.code ?? "DEAL_TASK_UPDATE_FAILED",
      mapped.body.error?.message ?? "Update failed",
    );
  }
}
