/**
 * EEI defaults — SPR-006E + Business Value Traceability addendum.
 * Scaffold only; ECG publishes review profiles later.
 */

import type {
  EeiAdministratorReviewArchitecture,
  EeiBusinessValue,
  EeiOrchestrationConfig,
} from "@/types/enterprise-experience-intelligence";

export const EEI_FRAMEWORK_VERSION = "13.4.0";

export const EEI_BUSINESS_VALUES = {
  FASTER_APPROVAL: "faster_approval",
  REDUCED_TURNAROUND_TIME: "reduced_turnaround_time",
  HIGHER_APPROVAL_PROBABILITY: "higher_approval_probability",
  IMPROVED_CUSTOMER_EXPERIENCE: "improved_customer_experience",
  BETTER_DOCUMENT_QUALITY: "better_document_quality",
  LOWER_REWORK: "lower_rework",
  BETTER_COMPLIANCE: "better_compliance",
  REDUCED_OPERATIONAL_RISK: "reduced_operational_risk",
  IMPROVED_RM_PRODUCTIVITY: "improved_rm_productivity",
  NOT_RECORDED: "not_recorded",
} as const satisfies Record<string, EeiBusinessValue>;

export const DEFAULT_EEI_ORCHESTRATION_CONFIG: EeiOrchestrationConfig = {
  autoCreateFromAdvisory: true,
  autoPublishDialogue: true,
  preferEcgReviewProfiles: true,
};

export function getEeiAdministratorArchitecture(): EeiAdministratorReviewArchitecture {
  return {
    supportsFrequentlyAcceptedReview: true,
    supportsFrequentlyOverriddenReview: true,
    supportsPoorOutcomeReview: true,
    supportsStrongOutcomeReview: true,
    supportsHighBusinessValueReview: true,
    supportsWeakKnowledgePackageReview: true,
    supportsReasoningProfileRefinementReview: true,
    supportsBusinessValueTraceabilityReview: true,
    supportsExperienceReview: true,
    supportsKnowledgeImprovement: true,
    supportsRecommendationEffectiveness: true,
    supportsAdvisoryStatistics: true,
    supportsSimulateKnowledgeImprovements: true,
    supportsApproveRefinements: true,
    supportsPublishImprovements: true,
    supportsRollback: true,
    autoPublishing: false,
    neverAutoModifiesKnowledgePackages: true,
    neverAutoModifiesReasoningProfiles: true,
    neverAutoModifiesEvidenceWeighting: true,
    neverAutoModifiesWorkflow: true,
    neverAutoModifiesDecisionPolicies: true,
    ecgAdapterKeys: [
      "experienceReview",
      "knowledgeImprovement",
      "recommendationEffectiveness",
      "advisoryStatistics",
      "businessValueTraceability",
    ],
    notes:
      "Future ECG Configuration Center. Review high business value / overridden / weak knowledge / reasoning refinement — architecture only. No dashboards, analytics, or automation. Administrators publish improvements through ECG only.",
  };
}
