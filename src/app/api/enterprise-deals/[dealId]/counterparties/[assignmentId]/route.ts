import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { enterpriseDealService } from "@server/services/enterprise-deal/enterprise-deal.service";
import { enterpriseDealApiGuard, mapDealRouteError } from "../../../_lib/route-utils";

type Ctx = { params: Promise<{ dealId: string; assignmentId: string }> };

/** PATCH — update counterparty · DELETE — remove counterparty */
export async function PATCH(request: Request, context: Ctx) {
  try {
    enterpriseDealApiGuard();
    const actor = requireAccessToken(request);
    const { dealId, assignmentId } = await context.params;
    const body = await request.json();
    const row = await enterpriseDealService.updateCounterparty(dealId, assignmentId, {
      programId: body.programId,
      isPrimary: body.isPrimary,
      pipelineStage: body.pipelineStage,
      pipelineSubStage: body.pipelineSubStage,
      applicationRef: body.applicationRef,
      decision: body.decision,
      decisionAt: body.decisionAt,
      extension: body.extension,
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
      mapped.body.error?.code ?? "DEAL_COUNTERPARTY_UPDATE_FAILED",
      mapped.body.error?.message ?? "Update failed",
    );
  }
}

export async function DELETE(request: Request, context: Ctx) {
  try {
    enterpriseDealApiGuard();
    const actor = requireAccessToken(request);
    const { dealId, assignmentId } = await context.params;
    let reason: string | null = null;
    try {
      const body = await request.json();
      reason = body?.reason ? String(body.reason) : null;
    } catch {
      reason = null;
    }
    const row = await enterpriseDealService.removeCounterparty(
      dealId,
      assignmentId,
      actor.userId,
      reason,
    );
    return successResponse(row);
  } catch (err) {
    const mapped = mapDealRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "DEAL_COUNTERPARTY_REMOVE_FAILED",
      mapped.body.error?.message ?? "Remove failed",
    );
  }
}
