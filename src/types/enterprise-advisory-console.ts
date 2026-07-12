/**
 * EAC — Enterprise Advisory Console (SPR-006D).
 * Presentation & interaction layer for EDE / ERE recommendations.
 * Advisory only — never executes business actions.
 */

import type {
  DkfKnowledgeCategory,
  EdeAdvisoryLevel,
  EdeDecisionCategory,
  EdeDecisionResponse,
  EreExplainabilityBundle,
} from "./enterprise-decision-engine";

export type EacAdvisorySource =
  | "ede"
  | "ere"
  | "mission_control"
  | "enterprise_analytics";

export type EacLifecycleState =
  | "new"
  | "viewed"
  | "accepted"
  | "deferred"
  | "overridden"
  | "completed"
  | "dismissed";

export type EacPriority = "critical" | "high" | "medium" | "low" | "informational";

export type EacRecommendationType =
  | EdeDecisionCategory
  | "mission_control"
  | "analytics_insight"
  | "general";

export interface EacOverrideRecord {
  overrideId: string;
  advisoryId: string;
  userId: string;
  timestamp: string;
  reason: string;
  businessJustification: string;
  finalOutcome: string;
}

export interface EacLifecycleEvent {
  eventId: string;
  advisoryId: string;
  fromState: EacLifecycleState | null;
  toState: EacLifecycleState;
  actorId: string;
  remarks?: string;
  occurredOn: string;
}

export interface EacChanakyaExecutivePresentation {
  advisoryId: string;
  executiveSummary: string;
  businessContext: string;
  recommendation: string;
  explanation: string;
  supportingEvidence: string[];
  suggestedNextStep: string;
  tone: "professional_business";
  generatedBy: "CHANAKYA";
  neverCommands: true;
}

export interface EacAdvisoryCard {
  advisoryId: string;
  decisionId?: string;
  opportunityId?: string;
  opportunityCode?: string;
  customerName?: string;
  productRef?: string;
  assignedRmLabel?: string;
  recommendation: string;
  confidence: number;
  advisoryLevel: EdeAdvisoryLevel;
  advisoryLevelNumber: 1 | 2 | 3 | 4 | 5;
  priority: EacPriority;
  recommendationType: EacRecommendationType;
  knowledgePackagesUsed: Array<{
    knowledgeId: string;
    name: string;
    category: DkfKnowledgeCategory;
    version: string;
  }>;
  reasoningTraceId?: string;
  generatedBy: string;
  source: EacAdvisorySource;
  status: EacLifecycleState;
  remarks?: string;
  override?: EacOverrideRecord;
  explainability?: EreExplainabilityBundle;
  reasoningSummary?: string;
  supportingEvidence: string[];
  suggestedNextSteps: string[];
  originalRecommendation: string;
  userResponse?: string;
  finalOutcome?: string;
  executable: false;
  createdOn: string;
  modifiedOn: string;
  viewedOn?: string;
  completedOn?: string;
}

export interface EacFilterCriteria {
  advisoryLevel?: EdeAdvisoryLevel | "all";
  status?: EacLifecycleState | "all";
  opportunityId?: string;
  opportunityQuery?: string;
  customerQuery?: string;
  productQuery?: string;
  rmQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  recommendationType?: EacRecommendationType | "all";
  priority?: EacPriority | "all";
  source?: EacAdvisorySource | "all";
}

export interface EacOrchestrationConfig {
  autoIngestFromEde: boolean;
  autoPublishDialogue: boolean;
  presentViaChanakya: boolean;
  preferEcgDisplayPolicies: boolean;
}

export interface EacDisplayPolicy {
  policyId: string;
  name: string;
  version: string;
  source: "ecg" | "framework_scaffold";
  showKnowledgePackages: boolean;
  showReasoningTraceId: boolean;
  showChanakyaPanel: boolean;
  notes: string;
}

export interface EacPriorityRule {
  ruleId: string;
  name: string;
  version: string;
  source: "ecg" | "framework_scaffold";
  /** Map advisory level → priority (scaffold defaults). */
  levelToPriority: Partial<Record<EdeAdvisoryLevel, EacPriority>>;
  notes: string;
}

export interface EacLifecycleRules {
  rulesId: string;
  name: string;
  version: string;
  source: "ecg" | "framework_scaffold";
  allowedTransitions: Partial<Record<EacLifecycleState, EacLifecycleState[]>>;
  notes: string;
}

export interface EacAdministratorArchitecture {
  supportsAdvisoryTemplates: true;
  supportsPriorityRules: true;
  supportsRecommendationCategories: true;
  supportsDisplayPolicies: true;
  supportsLifecycleRules: true;
  supportsRecommendationSimulation: true;
  supportsAdvisoryTemplatePreview: true;
  supportsLifecycleConfiguration: true;
  supportsImpactAnalysis: true;
  supportsVersioning: true;
  supportsRollback: true;
  ecgAdapterKeys: Array<
    | "advisoryTemplates"
    | "priorityRules"
    | "recommendationCategories"
    | "displayPolicies"
    | "lifecycleRules"
  >;
  notes: string;
}

export interface EacAuditReference {
  id: string;
  entityId: string;
  entityType: "advisory" | "lifecycle_event" | "override";
  eafAuditEntryId: string;
  recordedOn: string;
}

export interface EacRegistrySnapshot {
  advisories: EacAdvisoryCard[];
  lifecycleEvents: EacLifecycleEvent[];
  overrides: EacOverrideRecord[];
  auditReferences: EacAuditReference[];
}

/** Input to publish an advisory from EDE/ERE (or future sources). */
export type EacIngestFromEdeInput = {
  response: EdeDecisionResponse;
  actorId: string;
};
