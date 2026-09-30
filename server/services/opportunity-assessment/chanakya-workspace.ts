import { OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY } from "@/constants/opportunity-assessment-recommendation";
import type { CanonicalLenderRecommendationResult } from "@/types/canonical-lender-recommendation";
import type {
  ChanakyaRecommendationWorkspaceDto,
  ChanakyaWorkspaceState,
} from "@/types/chanakya-recommendation-workspace";
import { loadMappedCanonicalProgrammes } from "@server/services/lender-recommendation/canonical-lender-recommendation.service";
import type { CanonicalAssessmentSources } from "./canonical-snapshot";
import {
  executeFinalizedAssessmentRecommendation,
  type ExecuteFinalizedAssessmentRecommendationDependencies,
} from "./execute-recommendation";
import { mapFinalizedAssessmentFactsToCanonical } from "./map-to-canonical";
import { persistCanonicalAssessmentSnapshot } from "./persist-canonical-snapshot";
import { CHANAKYA_FACT_INPUTS } from "@/lib/opportunity-assessment/chanakya-fact-inputs";
import { collectProgrammeFactNeeds } from "./programme-fact-needs";
import { OpportunityAssessmentService } from "./opportunity-assessment.service";
import type { OpportunityAssessmentActorContext } from "./types";

function guidanceFor(
  state: ChanakyaWorkspaceState,
  failureCode: string | null,
  resultStatus: string | null,
): string {
  if (state === "INFORMATION_REQUIRED") return "Enter the missing details to get a lender recommendation.";
  if (state === "UNSUPPORTED_METHODOLOGY") {
    return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.SELF_EMPLOYED_ASSESSMENT_UNSUPPORTED;
  }
  if (state === "UNSUPPORTED_CANONICAL_FACT") {
    return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.CANONICAL_FACT_STORAGE_NOT_AVAILABLE;
  }
  if (state === "NO_PROGRAMME_INVENTORY") return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.NO_PROGRAMME_INVENTORY;
  if (state === "NO_ELIGIBLE_PROGRAMMES") return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.NO_ELIGIBLE_PROGRAMMES;
  if (state === "CONFIGURATION_BLOCKED") return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.CONFIGURATION_ERROR;
  if (failureCode && failureCode in OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY) {
    return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY[failureCode as keyof typeof OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY];
  }
  if (resultStatus === "failed") return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.RUN_FAILED;
  if (state === "INFORMATION_COMPLETE") return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.READY;
  return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.RUN_FAILED;
}

function classifyRecommendation(result: CanonicalLenderRecommendationResult): ChanakyaWorkspaceState {
  if (result.status === "ready") return "INFORMATION_COMPLETE";
  if (result.status === "configuration_error") return "CONFIGURATION_BLOCKED";
  if ((result.retrievedProgrammeCount ?? 0) === 0) return "NO_PROGRAMME_INVENTORY";
  const reasons = result.rejectedProgrammes.map((row) => row.reason);
  if (reasons.includes("ASSESSMENT_INPUT_REQUIRED")) return "INFORMATION_REQUIRED";
  if (reasons.includes("ELIGIBILITY_NOT_MET")) return "NO_ELIGIBLE_PROGRAMMES";
  if (reasons.length > 0) return "CONFIGURATION_BLOCKED";
  if ((result.evaluatedProgrammeCount ?? 0) > 0) return "NO_ELIGIBLE_PROGRAMMES";
  return "CONFIGURATION_BLOCKED";
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
  let missingFactKeys = evaluation.missingFactKeys;
  let missingLabels = evaluation.missingLabels;
  let workspaceState: ChanakyaWorkspaceState = evaluation.panel === "unsupported"
    ? "UNSUPPORTED_METHODOLOGY"
    : evaluation.panel === "information_required"
      ? "INFORMATION_REQUIRED"
      : evaluation.panel === "blocked"
        ? "CONFIGURATION_BLOCKED"
        : "INFORMATION_COMPLETE";

  if (evaluation.executable) {
    const mapped = mapFinalizedAssessmentFactsToCanonical(evaluation.facts);
    let programmes;
    try {
      programmes = await loadMappedCanonicalProgrammes(
        { organizationId: actor.organizationId, product: mapped.product },
        dependencies,
      );
    } catch {
      panel = "blocked";
      failureCode = "RUN_FAILED";
      resultStatus = "failed";
      executionAllowed = false;
      workspaceState = "CONFIGURATION_BLOCKED";
      programmes = null;
    }
    if (programmes && programmes.retrievedProgrammeCount === 0) {
      panel = "blocked";
      failureCode = "NO_PROGRAMME_INVENTORY";
      executionAllowed = true;
      recommendationExecuted = false;
      workspaceState = "NO_PROGRAMME_INVENTORY";
    } else if (programmes && programmes.viable.length === 0) {
      panel = "blocked";
      failureCode = "CONFIGURATION_ERROR";
      executionAllowed = true;
      recommendationExecuted = false;
      workspaceState = "CONFIGURATION_BLOCKED";
    } else if (programmes) {
      const needs = collectProgrammeFactNeeds(programmes.viable, mapped.customer);
      if (needs.unsupportedKeys.length > 0) {
        panel = "blocked";
        failureCode = "CANONICAL_FACT_STORAGE_NOT_AVAILABLE";
        missingFactKeys = needs.unsupportedKeys;
        missingLabels = needs.unsupportedKeys;
        executionAllowed = false;
        workspaceState = "UNSUPPORTED_CANONICAL_FACT";
      } else if (needs.askPaths.length > 0) {
        panel = "information_required";
        failureCode = null;
        missingFactKeys = needs.askPaths;
        missingLabels = needs.askPaths.map((path) => CHANAKYA_FACT_INPUTS[path]?.label ?? path);
        executionAllowed = false;
        recommendationExecuted = false;
        workspaceState = "INFORMATION_REQUIRED";
      } else {
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
            workspaceState = "CONFIGURATION_BLOCKED";
          } else if (executed.result) {
            workspaceState = classifyRecommendation(executed.result);
            if (workspaceState === "INFORMATION_REQUIRED") {
              panel = "information_required";
              missingFactKeys = (executed.result.missingInputs ?? []).map((field) =>
                field === "age" ? "borrower.ageYears" : field,
              );
              missingLabels = missingFactKeys.map((path) => (path === "borrower.ageYears" ? "Age" : path));
            } else if (workspaceState === "NO_ELIGIBLE_PROGRAMMES") {
              panel = "complete";
              resultStatus = "no_eligible_programmes";
            } else if (workspaceState === "NO_PROGRAMME_INVENTORY") {
              panel = "blocked";
              failureCode = "NO_PROGRAMME_INVENTORY";
            } else if (workspaceState === "CONFIGURATION_BLOCKED") {
              panel = "blocked";
              failureCode = executed.failureCode ?? "CONFIGURATION_ERROR";
            } else {
              panel = "complete";
            }
          } else if (executed.resultStatus === "configuration_error" || executed.resultStatus === "failed") {
            panel = "blocked";
            failureCode = executed.failureCode ?? "RUN_FAILED";
            workspaceState = "CONFIGURATION_BLOCKED";
          }
        } catch {
          panel = "blocked";
          failureCode = "RUN_FAILED";
          resultStatus = "failed";
          executionAllowed = false;
          workspaceState = "CONFIGURATION_BLOCKED";
        }
      }
    }
  }

  return {
    opportunityId: sources.opportunityId,
    assessmentId: persisted.assessmentId,
    revisionId: persisted.revisionId,
    revisionKind: evaluation.executable ? "FINALIZED" : evaluation.revisionKind,
    readinessStatus: evaluation.readinessStatus,
    failureCode,
    missingFactKeys,
    missingLabels,
    panel,
    workspaceState,
    executionAllowed,
    recommendationExecuted,
    resultStatus,
    guidance: guidanceFor(workspaceState, failureCode, resultStatus),
    result,
  };
}
