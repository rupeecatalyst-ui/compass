import { OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY } from "@/constants/opportunity-assessment-recommendation";
import type { ChanakyaRecommendationWorkspaceDto } from "@/types/chanakya-recommendation-workspace";
import type { CanonicalAssessmentSources } from "./canonical-snapshot";
import {
  executeFinalizedAssessmentRecommendation,
  type ExecuteFinalizedAssessmentRecommendationDependencies,
} from "./execute-recommendation";
import { persistCanonicalAssessmentSnapshot } from "./persist-canonical-snapshot";
import { OpportunityAssessmentService } from "./opportunity-assessment.service";
import type { OpportunityAssessmentActorContext } from "./types";

function guidanceFor(panel: ChanakyaRecommendationWorkspaceDto["panel"], failureCode: string | null, resultStatus: string | null): string {
  if (panel === "information_required") return "Enter the missing details to get a lender recommendation.";
  if (panel === "unsupported" && failureCode && failureCode in OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY) {
    return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY[failureCode as keyof typeof OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY];
  }
  if (failureCode === "SELF_EMPLOYED_INCOME_METHODOLOGY_UNSUPPORTED") {
    return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.SELF_EMPLOYED_ASSESSMENT_UNSUPPORTED;
  }
  if (resultStatus === "no_eligible_programmes") return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.NO_ELIGIBLE_PROGRAMMES;
  if (resultStatus === "configuration_error") return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.CONFIGURATION_ERROR;
  if (resultStatus === "failed") return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.RUN_FAILED;
  if (panel === "blocked" && failureCode && failureCode in OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY) {
    return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY[failureCode as keyof typeof OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY];
  }
  if (panel === "complete") return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.READY;
  return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.RUN_FAILED;
}

export async function projectChanakyaRecommendationWorkspace(
  service: OpportunityAssessmentService,
  actor: OpportunityAssessmentActorContext,
  sources: CanonicalAssessmentSources,
  dependencies: ExecuteFinalizedAssessmentRecommendationDependencies = {},
): Promise<ChanakyaRecommendationWorkspaceDto> {
  const persisted = await persistCanonicalAssessmentSnapshot(service, actor, sources);
  const evaluation = persisted.evaluation;
  let panel = evaluation.panel;
  let failureCode = evaluation.failureCode;
  let result = null;
  let resultStatus: string | null = null;
  let recommendationExecuted = false;
  let executionAllowed = evaluation.executable;

  if (evaluation.executable) {
    try {
      const executed = await executeFinalizedAssessmentRecommendation(
        service,
        actor,
        {
          opportunityId: sources.opportunityId,
          assessmentId: persisted.assessmentId,
          persist: true,
        },
        dependencies,
      );
      executionAllowed = executed.executionAllowed;
      recommendationExecuted = executed.recommendationExecuted;
      result = executed.result;
      resultStatus = executed.resultStatus;
      if (!executed.executionAllowed) {
        panel = "blocked";
        failureCode = executed.failureCode ?? failureCode;
      } else if (executed.resultStatus === "configuration_error" || executed.resultStatus === "failed") {
        panel = "blocked";
        failureCode = executed.failureCode ?? "RUN_FAILED";
      }
    } catch {
      panel = "blocked";
      failureCode = "RUN_FAILED";
      resultStatus = "failed";
      executionAllowed = false;
    }
  }

  return {
    opportunityId: sources.opportunityId,
    assessmentId: persisted.assessmentId,
    revisionId: persisted.revisionId,
    revisionKind: evaluation.executable ? "FINALIZED" : evaluation.revisionKind,
    readinessStatus: evaluation.readinessStatus,
    failureCode,
    missingFactKeys: evaluation.missingFactKeys,
    missingLabels: evaluation.missingLabels,
    panel,
    executionAllowed,
    recommendationExecuted,
    resultStatus,
    guidance: guidanceFor(panel, failureCode, resultStatus),
    result,
  };
}
