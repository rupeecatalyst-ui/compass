import { NextResponse } from "next/server";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
} from "@/lib/api/auth-route-utils";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  getOpportunityAssessmentCapture,
  saveOpportunityAssessmentCapture,
  type OpportunityAssessmentSaveBody,
} from "@server/services/opportunity-assessment/http";
import { loadOpportunityAssessmentReuseSources } from "@server/services/opportunity-assessment/reuse-sources";
import { createOpportunityAssessmentService } from "@server/services/opportunity-assessment/runtime";

type Ctx = { params: Promise<{ opportunityId: string }> };

function trustedActor(userId: string, organizationId: string) {
  return { organizationId, actorUserId: userId, channel: "C1" as const };
}

export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requireAccessToken(request);
    const { opportunityId } = await context.params;
    const organizationId = await resolvePilotOrganizationId();
    const service = createOpportunityAssessmentService({ prismaClient: prisma });
    const reuseSources = await loadOpportunityAssessmentReuseSources(opportunityId);
    const result = await getOpportunityAssessmentCapture(
      service,
      trustedActor(actor.userId, organizationId),
      opportunityId,
      undefined,
      reuseSources,
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return errorResponse(503, "ASSESSMENT_PERSISTENCE_FAILURE", "ASSESSMENT_PERSISTENCE_FAILURE");
  }
}

export async function POST(request: Request, context: Ctx) {
  try {
    const actor = requireAccessToken(request);
    const { opportunityId } = await context.params;
    const organizationId = await resolvePilotOrganizationId();
    const body = (await request.json().catch(() => ({}))) as OpportunityAssessmentSaveBody;
    const service = createOpportunityAssessmentService({ prismaClient: prisma });
    const result = await saveOpportunityAssessmentCapture(
      service,
      trustedActor(actor.userId, organizationId),
      opportunityId,
      body,
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return errorResponse(503, "ASSESSMENT_PERSISTENCE_FAILURE", "ASSESSMENT_PERSISTENCE_FAILURE");
  }
}
