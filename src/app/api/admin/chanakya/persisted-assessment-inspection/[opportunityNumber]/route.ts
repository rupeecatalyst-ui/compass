/**
 * Internal administrator read of an existing CHANAKYA assessment.
 * GET only. Organization comes from the server, not the caller.
 */
import { errorResponse, fromAuthError, requireAccessToken } from "@/lib/api/auth-route-utils";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { enterpriseOpportunityRepository } from "@server/repositories/enterprise-opportunity";
import {
  inspectPersistedAssessmentForOpportunityNumber,
  isChanakyaInspectionAdministrator,
} from "@server/services/opportunity-assessment/persisted-assessment-inspection-http";
import { createOpportunityAssessmentService } from "@server/services/opportunity-assessment/runtime";

type Ctx = { params: Promise<{ opportunityNumber: string }> };

function denied(status: number, code: string, message: string) {
  return {
    status,
    body: { success: false as const, error: { code, message } },
  };
}

export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requireAccessToken(request);
    if (!isChanakyaInspectionAdministrator(actor.role)) {
      throw denied(403, "FORBIDDEN", "Only administrators can inspect persisted assessments.");
    }
    const url = new URL(request.url);
    if (url.searchParams.has("organizationId") || url.searchParams.has("organisationId")) {
      throw denied(400, "ORGANIZATION_CONTEXT_REJECTED", "Organization is taken from the server context.");
    }
    const organizationId = (await resolvePilotOrganizationId()).trim();
    if (!organizationId) {
      throw denied(403, "ORGANIZATION_CONTEXT_REQUIRED", "Organization context is required.");
    }
    const { opportunityNumber } = await context.params;
    const result = await inspectPersistedAssessmentForOpportunityNumber({
      role: actor.role,
      organizationId,
      actorUserId: actor.userId,
      opportunityNumber,
      findOpportunityByNumber: (organization, number) =>
        enterpriseOpportunityRepository.findByNumber(organization, number),
      service: createOpportunityAssessmentService({ prismaClient: prisma }),
    });
    if (result.status === 200) {
      return Response.json(result.body, { status: 200 });
    }
    return errorResponse(result.status, result.body.error.code, result.body.error.message);
  } catch (error) {
    if (typeof error === "object" && error && "status" in error && "body" in error) {
      return fromAuthError(error as { status: number; body: never });
    }
    return errorResponse(503, "ASSESSMENT_INSPECTION_FAILED", "ASSESSMENT_INSPECTION_FAILED");
  }
}
