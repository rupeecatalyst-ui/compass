import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { enterpriseDealService } from "@server/services/enterprise-deal/enterprise-deal.service";
import { enterpriseDealApiGuard, mapDealRouteError } from "../../../../_lib/route-utils";

type Ctx = { params: Promise<{ dealId: string; assignmentId: string }> };

/** POST — Update counterparty pipeline stage */
export async function POST(request: Request, context: Ctx) {
  try {
    enterpriseDealApiGuard();
    const actor = requireAccessToken(request);
    const { dealId, assignmentId } = await context.params;
    const body = await request.json();
    const row = await enterpriseDealService.updateCounterpartyPipeline(dealId, assignmentId, {
      pipelineStage: String(body.pipelineStage ?? ""),
      pipelineSubStage: body.pipelineSubStage,
      applicationRef: body.applicationRef,
      decision: body.decision,
      decisionAt: body.decisionAt,
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
      mapped.body.error?.code ?? "DEAL_PIPELINE_UPDATE_FAILED",
      mapped.body.error?.message ?? "Pipeline update failed",
    );
  }
}
