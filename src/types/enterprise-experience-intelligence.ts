/**
 * EEI — Enterprise Experience Intelligence (SPR-006E).
 * Captures recommendation use and business outcomes.
 * Not ML / AI — Enterprise Experience Management. Advisory only. No automatic behavioural changes.
 */

import type { EdeAdvisoryLevel } from "./enterprise-decision-engine";
import type { DkfKnowledgeCategory } from "./enterprise-decision-engine";

export type EeiRecommendationOutcome =
  | "accepted"
  | "rejected"
  | "deferred"
  | "overridden"
  | "completed"
  | "cancelled"
  | "expired";

export type EeiBusinessOutcome =
  | "loan_approved"
  | "loan_declined"
  | "customer_withdrew"
  | "documents_completed"
  | "lender_changed"
  | "opportunity_lost"
  | "opportunity_won"
  | "not_recorded";

/**
 * Descriptive business value — history only.
 * Do NOT calculate scores. Do NOT introduce analytics.
 */
export type EeiBusinessValue =
  | "faster_approval"
  | "reduced_turnaround_time"
  | "higher_approval_probability"
  | "improved_customer_experience"
  | "better_document_quality"
  | "lower_rework"
  | "better_compliance"
  | "reduced_operational_risk"
  | "improved_rm_productivity"
  | "not_recorded";

export type EeiExperienceStatus = "open" | "in_progress" | "closed";

export type EeiTimelineEventType =
  | "recommendation_issued"
  | "user_action"
  | "business_outcome"
  | "business_value"
  | "final_status"
  | "experience_recorded"
  | "experience_closed";

export interface EeiTimelineEntry {
  entryId: string;
  experienceId: string;
  eventType: EeiTimelineEventType;
  label: string;
  detail?: string;
  actorId: string;
  occurredOn: string;
}

/**
 * Permanent end-to-end value traceability answers.
 * Recommendation → User Action → Business Outcome → Business Value → Knowledge → Reasoning Profile → Decision Trace
 */
export interface EeiBusinessValueTraceability {
  recommendationIssued: string;
  userWhoActed: string | null;
  actionTaken: EeiRecommendationOutcome | null;
  businessOutcomeOccurred: EeiBusinessOutcome;
  businessValueCreated: EeiBusinessValue[];
  knowledgePackagesContributed: Array<{
    knowledgeId: string;
    name: string;
    category: DkfKnowledgeCategory;
    version: string;
  }>;
  reasoningProfileId: string | null;
  decisionTraceId: string | null;
  /** Permanent snapshot — never auto-mutates knowledge or policies. */
  establishedOn: string;
}

export interface EeiKnowledgeFeedbackRef {
  feedbackId: string;
  experienceId: string;
  knowledgePackageIds: string[];
  knowledgePackageNames: string[];
  reasoningProfileId?: string;
  recommendation: string;
  recommendationOutcome: EeiRecommendationOutcome | null;
  businessOutcome: EeiBusinessOutcome;
  businessValues: EeiBusinessValue[];
  /** Administrator may later mark refinement needed — never auto-applied. */
  refinementSuggested: boolean;
  refinementNotes?: string;
  createdOn: string;
}

export interface EeiExperienceRecord {
  experienceId: string;
  decisionId?: string;
  advisoryId?: string;
  opportunityId?: string;
  opportunityCode?: string;
  recommendation: string;
  advisoryLevel: EdeAdvisoryLevel;
  userId: string;
  timestamp: string;
  recommendationOutcome: EeiRecommendationOutcome | null;
  recommendationOutcomeHistory: Array<{
    outcome: EeiRecommendationOutcome;
    actorId: string;
    remarks?: string;
    recordedOn: string;
  }>;
  businessOutcome: EeiBusinessOutcome;
  businessOutcomeHistory: Array<{
    outcome: EeiBusinessOutcome;
    actorId: string;
    remarks?: string;
    recordedOn: string;
  }>;
  /** Descriptive business values — no scores. */
  businessValues: EeiBusinessValue[];
  businessValueHistory: Array<{
    values: EeiBusinessValue[];
    actorId: string;
    remarks?: string;
    recordedOn: string;
  }>;
  /** Permanent enterprise history linkage. */
  valueTraceability: EeiBusinessValueTraceability;
  finalStatus: EeiExperienceStatus;
  knowledgePackageIds: string[];
  knowledgePackages: Array<{
    knowledgeId: string;
    name: string;
    category: DkfKnowledgeCategory;
    version: string;
  }>;
  /** Decision / reasoning trace that produced the recommendation. */
  decisionTraceId?: string;
  reasoningTraceId?: string;
  reasoningProfileId?: string;
  knowledgeFeedbackId?: string;
  timeline: EeiTimelineEntry[];
  generatedBy: "Enterprise Experience Intelligence";
  executable: false;
  autoBehaviourChange: false;
  /** EEI never auto-modifies knowledge, profiles, weights, workflow, or policies. */
  neverAutoModifiesEnterpriseConfig: true;
  createdOn: string;
  modifiedOn: string;
  closedOn?: string;
}

export interface EeiOrchestrationConfig {
  autoCreateFromAdvisory: boolean;
  autoPublishDialogue: boolean;
  preferEcgReviewProfiles: boolean;
}

/** Administrator review architecture — no dashboards / analytics / automation. */
export interface EeiAdministratorReviewArchitecture {
  supportsFrequentlyAcceptedReview: true;
  supportsFrequentlyOverriddenReview: true;
  supportsPoorOutcomeReview: true;
  supportsStrongOutcomeReview: true;
  supportsHighBusinessValueReview: true;
  supportsWeakKnowledgePackageReview: true;
  supportsReasoningProfileRefinementReview: true;
  supportsBusinessValueTraceabilityReview: true;
  supportsExperienceReview: true;
  supportsKnowledgeImprovement: true;
  supportsRecommendationEffectiveness: true;
  supportsAdvisoryStatistics: true;
  supportsSimulateKnowledgeImprovements: true;
  supportsApproveRefinements: true;
  supportsPublishImprovements: true;
  supportsRollback: true;
  autoPublishing: false;
  neverAutoModifiesKnowledgePackages: true;
  neverAutoModifiesReasoningProfiles: true;
  neverAutoModifiesEvidenceWeighting: true;
  neverAutoModifiesWorkflow: true;
  neverAutoModifiesDecisionPolicies: true;
  ecgAdapterKeys: Array<
    | "experienceReview"
    | "knowledgeImprovement"
    | "recommendationEffectiveness"
    | "advisoryStatistics"
    | "businessValueTraceability"
  >;
  notes: string;
}

export interface EeiAuditReference {
  id: string;
  entityId: string;
  entityType: "experience" | "knowledge_feedback" | "timeline";
  eafAuditEntryId: string;
  recordedOn: string;
}

export interface EeiRegistrySnapshot {
  experiences: EeiExperienceRecord[];
  knowledgeFeedback: EeiKnowledgeFeedbackRef[];
  auditReferences: EeiAuditReference[];
}
