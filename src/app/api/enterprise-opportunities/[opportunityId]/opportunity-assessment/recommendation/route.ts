import { NextResponse } from "next/server";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
} from "@/lib/api/auth-route-utils";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { createOpportunityAssessmentService } from "@server/services/opportunity-assessment/runtime";
import {
  executeOpportunityAssessmentRecommendation,
  getOpportunityAssessmentRecommendation,
} from "@server/services/opportunity-assessment/recommendation-http";
import type { OpportunityAssessmentRecommendationExecuteBody } from "@/types/opportunity-assessment-recommendation";

type Ctx = { params: Promise<{ opportunityId: string }> };

function trustedActor(userId: string, organizationId: string) {
  return { organizationId, actorUserId: userId, channel: "C1" as const };
}

/** Stage 5C5 — finalized Opportunity Assessment → Stage 4B engine. Browser organizationId is ignored. */
export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requireAccessToken(request);
    const { opportunityId } = await context.params;
    const organizationId = await resolvePilotOrganizationId();
    const service = createOpportunityAssessmentService({ prismaClient: prisma });
    const result = await getOpportunityAssessmentRecommendation(
      service,
      trustedActor(actor.userId, organizationId),
      opportunityId,
    );
    return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
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
    const body = (await request.json().catch(() => ({}))) as OpportunityAssessmentRecommendationExecuteBody;
    const service = createOpportunityAssessmentService({ prismaClient: prisma });
    const result = await executeOpportunityAssessmentRecommendation(
      service,
      trustedActor(actor.userId, organizationId),
      opportunityId,
      body,
    );
    return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: never });
    }
    return errorResponse(503, "ASSESSMENT_PERSISTENCE_FAILURE", "ASSESSMENT_PERSISTENCE_FAILURE");
  }
}
