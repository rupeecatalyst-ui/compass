import { OpportunityAssessmentError } from "./errors";
import {
  executeFinalizedAssessmentRecommendation,
  readFinalizedAssessmentRecommendation,
  type ExecuteFinalizedAssessmentRecommendationDependencies,
} from "./execute-recommendation";
import { mapOpportunityAssessmentHttpError } from "./http";
import { OpportunityAssessmentService } from "./opportunity-assessment.service";
import type { OpportunityAssessmentActorContext } from "./types";
import type {
  OpportunityAssessmentRecommendationDto,
  OpportunityAssessmentRecommendationExecuteBody,
} from "@/types/opportunity-assessment-recommendation";

export type OpportunityAssessmentRecommendationHttpResult = {
  status: number;
  body: {
    success: boolean;
    data?: OpportunityAssessmentRecommendationDto;
    error?: { code: string; message: string };
  };
};

export async function getOpportunityAssessmentRecommendation(
  service: OpportunityAssessmentService,
  actor: OpportunityAssessmentActorContext,
  opportunityId: string,
  body: OpportunityAssessmentRecommendationExecuteBody = {},
  dependencies: ExecuteFinalizedAssessmentRecommendationDependencies = {},
): Promise<OpportunityAssessmentRecommendationHttpResult> {
  try {
    if (!opportunityId.trim()) throw new OpportunityAssessmentError("ASSESSMENT_NOT_FOUND");
    const data = await readFinalizedAssessmentRecommendation(
      service,
      actor,
      {
        opportunityId,
        assessmentId: body.assessmentId,
        currentSourceFingerprint: body.currentSourceFingerprint ?? null,
      },
      dependencies,
    );
    return { status: 200, body: { success: true, data } };
  } catch (error) {
    return mapOpportunityAssessmentHttpError(error) as OpportunityAssessmentRecommendationHttpResult;
  }
}

export async function executeOpportunityAssessmentRecommendation(
  service: OpportunityAssessmentService,
  actor: OpportunityAssessmentActorContext,
  opportunityId: string,
  body: OpportunityAssessmentRecommendationExecuteBody = {},
  dependencies: ExecuteFinalizedAssessmentRecommendationDependencies = {},
): Promise<OpportunityAssessmentRecommendationHttpResult> {
  try {
    if (!opportunityId.trim()) throw new OpportunityAssessmentError("ASSESSMENT_NOT_FOUND");
    const data = await executeFinalizedAssessmentRecommendation(
      service,
      actor,
      {
        opportunityId,
        requestId: typeof body.requestId === "string" ? body.requestId : undefined,
        assessmentId: typeof body.assessmentId === "string" ? body.assessmentId : undefined,
        asOf: typeof body.asOf === "string" ? body.asOf : undefined,
        currentSourceFingerprint: body.currentSourceFingerprint ?? null,
      },
      dependencies,
    );
    return { status: 200, body: { success: true, data } };
  } catch (error) {
    return mapOpportunityAssessmentHttpError(error) as OpportunityAssessmentRecommendationHttpResult;
  }
}
