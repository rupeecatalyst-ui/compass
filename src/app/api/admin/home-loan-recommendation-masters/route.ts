import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  createUnapprovedDraftMasters,
  listHlRecommendationMasters,
  simulateHomeLoanRecommendation,
  transitionHlMaster,
} from "@server/services/home-loan-recommendation/hl-recommendation-masters.service";
import type { CustomerAssessmentInput } from "@/lib/home-loan-recommendation/assisted-offer";

const WRITE_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    if (!WRITE_ROLES.has(actor.role)) {
      return errorResponse(403, "FORBIDDEN", "Administrator access is required.");
    }
    const organizationId = await resolvePilotOrganizationId();
    const data = await listHlRecommendationMasters(organizationId);
    return successResponse(data);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(400, "HL_MASTERS_LIST_FAILED", err instanceof Error ? err.message : "Unable to list masters.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    if (!WRITE_ROLES.has(actor.role)) {
      return errorResponse(403, "FORBIDDEN", "Administrator access is required.");
    }
    const organizationId = await resolvePilotOrganizationId();
    const body = (await request.json().catch(() => ({}))) as {
      intent?: string;
      kind?: "weights" | "cibil" | "ltv";
      id?: string;
      action?: "submit_review" | "approve" | "reject" | "activate";
      comment?: string;
      customer?: CustomerAssessmentInput;
    };
    if (body.intent === "create_unapproved_drafts") {
      const data = await createUnapprovedDraftMasters({
        organizationId,
        makerUserId: actor.userId,
      });
      return successResponse(data);
    }
    if (body.intent === "simulate") {
      if (!body.customer) {
        return errorResponse(400, "CUSTOMER_REQUIRED", "Simulation requires a customer assessment payload.");
      }
      return successResponse(simulateHomeLoanRecommendation(body.customer));
    }
    if (body.intent === "transition" && body.kind && body.id && body.action) {
      const data = await transitionHlMaster({
        organizationId,
        kind: body.kind,
        id: body.id,
        action: body.action,
        actorUserId: actor.userId,
        comment: body.comment,
      });
      return successResponse(data);
    }
    return errorResponse(400, "UNKNOWN_INTENT", "Unsupported master action.");
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(400, "HL_MASTERS_WRITE_FAILED", err instanceof Error ? err.message : "Unable to update masters.");
  }
}
