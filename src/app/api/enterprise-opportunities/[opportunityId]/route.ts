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

type Ctx = { params: Promise<{ opportunityId: string }> };

export async function GET(request: Request, context: Ctx) {
  try {
    enterpriseOpportunityApiGuard();
    requireAccessToken(request);
    const { opportunityId } = await context.params;
    const row = await enterpriseOpportunityService.getOpportunity(opportunityId);
    return successResponse(row);
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "OPPORTUNITY_GET_FAILED",
      mapped.body.error?.message ?? "Failed to load Opportunity",
    );
  }
}

/** ADR-018 Wave 1 — update Opportunity Registry fields (persistence only). */
export async function PATCH(request: Request, context: Ctx) {
  try {
    enterpriseOpportunityApiGuard();
    const actor = requireAccessToken(request);
    const { opportunityId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const row = await enterpriseOpportunityService.updateOpportunity(
      opportunityId,
      body,
      actor.userId,
    );
    return successResponse(row);
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    if (
      mapped.status === 401 ||
      mapped.status === 400 ||
      mapped.status === 403 ||
      mapped.status === 404 ||
      mapped.status === 409 ||
      mapped.status === 503
    ) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "OPPORTUNITY_UPDATE_FAILED",
      mapped.body.error?.message ?? "Failed to update Opportunity",
    );
  }
}

export async function DELETE(request: Request, context: Ctx) {
  try {
    enterpriseOpportunityApiGuard();
    const actor = requireAccessToken(request);
    const { opportunityId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const row = await enterpriseOpportunityService.softDelete(
      opportunityId,
      actor.userId,
      body.reason,
    );
    return successResponse(row);
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    if (
      mapped.status === 401 ||
      mapped.status === 403 ||
      mapped.status === 404 ||
      mapped.status === 409 ||
      mapped.status === 503
    ) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "OPPORTUNITY_DELETE_FAILED",
      mapped.body.error?.message ?? "Failed to delete Opportunity",
    );
  }
}
