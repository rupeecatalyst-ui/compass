import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";
import { CustomFieldValueError } from "@/lib/field-control-master/custom-field-value";
import { commitOpportunityWithCustomFields } from "@/lib/field-control-master/operational-custom-field-commit";
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
    if ("organizationId" in body || "organisationId" in body) {
      return errorResponse(400, "ORGANIZATION_CONTEXT_REJECTED", "Organization is taken from the server context.");
    }
    const customFieldValues = body.customFieldValues;
    delete body.customFieldValues;
    const row =
      customFieldValues !== undefined
        ? await commitOpportunityWithCustomFields({
            opportunityId,
            body,
            customFieldValues,
            actorUserId: actor.userId,
          })
        : await enterpriseOpportunityService.updateOpportunity(opportunityId, body, actor.userId);
    return successResponse(row);
  } catch (err) {
    if (err instanceof CustomFieldValueError) {
      return errorResponse(err.statusCode, err.code, err.message);
    }
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
