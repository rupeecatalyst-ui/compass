import type { OpportunityAssessmentRecommendationDto } from "@/types/opportunity-assessment-recommendation";

export type ChanakyaRecommendationPanelView = {
  assessmentNotReady: boolean;
  noEligibleLender: boolean;
  configurationUnavailable: boolean;
  failed: boolean;
  ready: boolean;
  guidance: string;
  programmeIds: string[];
  primaryProgrammeIds: string[];
  additionalProgrammeIds: string[];
  lenderScores: Array<null>;
  cards: NonNullable<OpportunityAssessmentRecommendationDto["result"]>["recommendations"];
};

export function projectChanakyaOpportunityRecommendationPanel(
  dto: OpportunityAssessmentRecommendationDto,
): ChanakyaRecommendationPanelView {
  return projectChanakyaRecommendationView(dto);
}

export function projectChanakyaLifeRecommendationColumn(
  dto: OpportunityAssessmentRecommendationDto,
): ChanakyaRecommendationPanelView {
  return projectChanakyaRecommendationView(dto);
}

function projectChanakyaRecommendationView(
  dto: OpportunityAssessmentRecommendationDto,
): ChanakyaRecommendationPanelView {
  const cards = dto.result?.recommendations ?? [];
  return {
    assessmentNotReady: !dto.executionAllowed,
    noEligibleLender: dto.executionAllowed && dto.resultStatus === "no_eligible_programmes",
    configurationUnavailable: dto.resultStatus === "configuration_error",
    failed: dto.resultStatus === "failed" || dto.failureCode === "RUN_FAILED",
    ready: dto.result?.status === "ready",
    guidance: dto.guidance,
    programmeIds: cards.map((card) => card.programmeId),
    primaryProgrammeIds: dto.result?.presentation?.primaryProgrammeIds ?? cards.filter((card) => card.presentationTier === "primary").map((card) => card.programmeId),
    additionalProgrammeIds: dto.result?.presentation?.additionalProgrammeIds ?? cards.filter((card) => card.presentationTier === "additional").map((card) => card.programmeId),
    lenderScores: cards.map(() => null),
    cards,
  };
}
