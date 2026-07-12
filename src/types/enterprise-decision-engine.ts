/**
 * EDE — Enterprise Decision Engine (SPR-006A refined).
 * Observe → Analyse → Recommend → Explain → Record.
 * Enabler never blocker (except advisory level Compliance Block).
 * Never a workflow engine. Never replaces human decision making.
 */

/** Decision categories (independent evaluations). */
export type EdeDecisionCategory =
  | "opportunity_assessment"
  | "lender_recommendation"
  | "document_readiness"
  | "task_assessment"
  | "workflow_assessment"
  | "risk_observation"
  | "customer_readiness";

/** @deprecated Use EdeDecisionCategory — retained for early SPR-006A callers. */
export type EdeDecisionType = EdeDecisionCategory;

export type EdeTriggerSource =
  | "decision_console"
  | "opportunity_workspace"
  | "manual"
  | "system"
  | "chanakya"
  | "api";

export type EdeConfidenceBand = "low" | "moderate" | "high";

export type EdeRecommendationCategory =
  | "informational"
  | "operational"
  | "attention"
  | "escalation"
  | "compliance";

/**
 * Advisory levels — only Level 5 may prevent progression.
 * Levels 1–4 remain purely advisory (empowerment principle).
 */
export type EdeAdvisoryLevel =
  | "information"
  | "recommendation"
  | "warning"
  | "escalation"
  | "compliance_block";

export type EdeUserAction =
  | "pending"
  | "acknowledged"
  | "accepted"
  | "deferred"
  | "overridden"
  | "closed";

export type EdeFinalOutcome =
  | "open"
  | "followed"
  | "overridden"
  | "superseded"
  | "closed";

export interface EdeSupportingFactor {
  code: string;
  label: string;
  value: string;
  weightHint?: "low" | "medium" | "high";
}

// ---------------------------------------------------------------------------
// SPR-006B — Decision Knowledge Framework (DKF)
// ---------------------------------------------------------------------------

export type DkfKnowledgeKind =
  | "policy"
  | "rule"
  | "guideline"
  | "best_practice"
  | "compliance_requirement"
  | "risk_observation"
  | "advisory_template";

export type DkfKnowledgeCategory =
  | "lending_policy"
  | "internal_policy"
  | "product_guidance"
  | "customer_guidance"
  | "document_guidance"
  | "workflow_guidance"
  | "compliance"
  | "risk";

export type DkfPackageStatus = "draft" | "published" | "archived" | "expired";

export type DkfKnowledgeSource = "ecg" | "framework_scaffold" | "import";

/** Context match predicates — architecture only; no product/lender business rules. */
export interface DkfContextMatchCriteria {
  decisionCategories?: EdeDecisionCategory[];
  requireStagePresent?: boolean;
  requireDocumentsPresent?: boolean;
  requireTasksPresent?: boolean;
  requireLifePresent?: boolean;
  requireWorkflowPresent?: boolean;
  requireHealthPresent?: boolean;
  minDocumentCompletionPct?: number;
  maxDaysSinceActivity?: number;
}

export interface DkfKnowledgePackage {
  knowledgeId: string;
  name: string;
  kind: DkfKnowledgeKind;
  category: DkfKnowledgeCategory;
  version: string;
  status: DkfPackageStatus;
  description: string;
  source: DkfKnowledgeSource;
  effectiveDate: string;
  expiryDate?: string;
  match: DkfContextMatchCriteria;
  advisoryTemplate: string;
  nextStepTemplate?: string;
  enabled: boolean;
  createdOn: string;
  modifiedOn: string;
}

export interface DkfPackageEvaluationResult {
  knowledgeId: string;
  name: string;
  category: DkfKnowledgeCategory;
  kind: DkfKnowledgeKind;
  version: string;
  matched: boolean;
  matchScore: number;
  matchNotes: string[];
  advisorySnippet?: string;
}

export interface DkfEvidenceBundle {
  evidenceUsed: string[];
  missingInformation: string[];
  positiveFactors: string[];
  riskFactors: string[];
  unknownFactors: string[];
}

export interface DkfKnowledgeEvaluationTrace {
  applicablePackages: DkfPackageEvaluationResult[];
  matchedPackages: DkfPackageEvaluationResult[];
  evidence: DkfEvidenceBundle;
  knowledgeSource: "ecg" | "framework_scaffold" | "mixed" | "none";
  evaluatedOn: string;
}

// ---------------------------------------------------------------------------
// SPR-006C — Enterprise Reasoning Engine (ERE)
// Transparent, explainable reasoning — not AI / ML.
// ---------------------------------------------------------------------------

export type EreConflictResolutionMethod =
  | "weighted_majority"
  | "prefer_higher_reliability"
  | "prefer_compliance_category"
  | "prefer_risk_observation"
  | "surface_unresolved";

export type EreReasoningChainStageId =
  | "decision_request"
  | "context_collection"
  | "knowledge_matching"
  | "evidence_collection"
  | "evidence_weighting"
  | "conflict_resolution"
  | "reasoning"
  | "recommendation"
  | "explanation"
  | "dialogue_history";

export type EreEvidencePolarity = "positive" | "risk" | "neutral" | "missing" | "unknown";

/**
 * ECG-ready dimension scores — architecture only.
 * Do not hardcode business policy weights in engine callers; multipliers come from ECG profiles.
 */
export interface EreEvidenceWeightDimensions {
  importance: number;
  reliability: number;
  freshness: number;
  completeness: number;
  /** Source trust 0–1 (ECG may map sources). */
  source: number;
  /** Administrator-configured priority (ECG / AX) — scaffold default neutral. */
  administratorPriority: number;
}

export interface EreWeightedEvidenceItem {
  evidenceId: string;
  label: string;
  polarity: EreEvidencePolarity;
  sourceKnowledgeIds: string[];
  sourceLabel: string;
  dimensions: EreEvidenceWeightDimensions;
  /** Composite from profile formula — inspectable, not a black box. */
  compositeScore: number;
  usedInRecommendation: boolean;
  ignored: boolean;
  ignoreReason?: string;
}

/** ECG-ready weighting profile — framework scaffold until ECG publishes. */
export interface EreEvidenceWeightProfile {
  profileId: string;
  name: string;
  version: string;
  source: "ecg" | "framework_scaffold";
  /** Dimension multipliers — ECG configures; scaffold uses equal neutrals. */
  dimensionMultipliers: EreEvidenceWeightDimensions;
  notes: string;
}

export interface EreConflictResolutionProfile {
  profileId: string;
  name: string;
  version: string;
  source: "ecg" | "framework_scaffold";
  primaryMethod: EreConflictResolutionMethod;
  fallbackMethod: EreConflictResolutionMethod;
  /** Alias for ECG admin UX — same as primaryMethod. */
  resolutionStrategy: EreConflictResolutionMethod;
  notes: string;
}

/** ECG-ready explainability templates — no hardcoded admin copy in engine. */
export interface EreExplainabilityTemplate {
  templateId: string;
  name: string;
  version: string;
  source: "ecg" | "framework_scaffold";
  whatPrefix: string;
  whyPrefix: string;
  nextStepPrefix: string;
  notes: string;
}

export interface EreReasoningProfile {
  profileId: string;
  name: string;
  version: string;
  source: "ecg" | "framework_scaffold";
  evidenceWeighting: EreEvidenceWeightProfile;
  conflictResolution: EreConflictResolutionProfile;
  explainabilityTemplate: EreExplainabilityTemplate;
  notes: string;
}

/**
 * Administrator Experience (AX) readiness — architecture only.
 * Future ECG Configuration Center capabilities; no UI in SPR-006C.
 */
export interface EreAdministratorArchitecture {
  supportsReasoningProfiles: true;
  supportsEvidenceWeightConfiguration: true;
  supportsConflictResolutionStrategy: true;
  supportsExplainabilityTemplates: true;
  supportsSimulation: true;
  supportsVersioning: true;
  supportsRollback: true;
  supportsImpactAnalysis: true;
  ecgAdapterKeys: Array<
    | "reasoningProfile"
    | "evidenceWeighting"
    | "conflictResolution"
    | "explainabilityTemplates"
  >;
  notes: string;
}

export interface EreConflictRecord {
  conflictId: string;
  conflictingKnowledge: Array<{ knowledgeId: string; name: string; claim: string }>;
  /** Strategy applied (ECG-configurable). */
  resolutionStrategy: EreConflictResolutionMethod;
  /** @deprecated Prefer resolutionStrategy — retained for earlier callers. */
  resolutionMethod: EreConflictResolutionMethod;
  winningKnowledge: Array<{ knowledgeId: string; name: string }>;
  winningEvidenceIds: string[];
  winningClaim: string;
  resolutionExplanation: string;
  /** @deprecated Prefer resolutionExplanation. */
  reason: string;
  unresolved: boolean;
}

export interface EreReasoningChainStage {
  stageId: EreReasoningChainStageId;
  label: string;
  status: "completed" | "skipped" | "pending";
  summary: string;
  detail?: Record<string, unknown>;
  completedOn: string;
}

/** Full explainability answers required by SPR-006C. */
export interface EreExplainabilityBundle {
  whatRecommended: string;
  why: string;
  knowledgeEvaluated: string[];
  strongestEvidence: string[];
  highestImpactEvidence: string[];
  weakestEvidence: string[];
  assumptions: string[];
  missingInformation: string[];
  /** What should the user do next? */
  suggestedNextStep: string;
}

export interface EreReasoningTrace {
  traceId: string;
  decisionId: string;
  requestId: string;
  generatedBy: "Enterprise Reasoning Engine";
  knowledgePackagesEvaluated: Array<{
    knowledgeId: string;
    name: string;
    category: DkfKnowledgeCategory;
    version: string;
  }>;
  /** Alias of knowledgePackagesEvaluated for Dialogue / console. */
  knowledgeUsed: Array<{
    knowledgeId: string;
    name: string;
    category: DkfKnowledgeCategory;
    version: string;
  }>;
  supportingEvidence: EreWeightedEvidenceItem[];
  evidenceUsed: EreWeightedEvidenceItem[];
  evidenceIgnored: EreWeightedEvidenceItem[];
  missingEvidence: string[];
  conflicts: EreConflictRecord[];
  finalRecommendation: string;
  finalReasoningPath: string[];
  chain: EreReasoningChainStage[];
  explainability: EreExplainabilityBundle;
  reasoningProfileId: string;
  reasoningProfileSource: "ecg" | "framework_scaffold";
  createdOn: string;
}

/** Collected context only — no evaluation embedded. */
export interface EdeDecisionContext {
  opportunityId?: string;
  opportunityCode?: string;
  customerName?: string;
  customerRef?: string;
  contactRoles?: string[];
  productRef?: string;
  stageCode?: string;
  subStageCode?: string;
  documentRequiredCount?: number;
  documentUploadedCount?: number;
  documentVerifiedCount?: number;
  openTaskCount?: number;
  overdueTaskCount?: number;
  completedTaskCount?: number;
  pulseLabel?: string;
  pulseIntensity?: number;
  healthScore?: number;
  healthBand?: string;
  lifeLenderName?: string;
  lifeRecommended?: boolean;
  lifeSuccessProbability?: number;
  workflowStatus?: string;
  workflowProgressRatio?: number;
  workflowDefinitionCode?: string;
  communicationEventCount?: number;
  daysSinceLastActivity?: number;
  assignedRmLabel?: string;
  dialogueSummary?: string;
  communicationSummary?: string;
  collectedOn: string;
  extras?: Record<string, unknown>;
}

export type EdeContextCollectionInput = Omit<EdeDecisionContext, "collectedOn"> & {
  collectedOn?: string;
};

/**
 * Standard Decision Request.
 * Decision ID is assigned at request creation and carried through the response.
 */
export interface EdeDecisionRequest {
  /** Decision ID (stable across request → response → history). */
  decisionId: string;
  /** Alias of decisionId for store keying. */
  id: string;
  opportunityId?: string;
  decisionCategory: EdeDecisionCategory;
  /** @deprecated Use decisionCategory. */
  decisionType: EdeDecisionCategory;
  context?: EdeDecisionContext;
  contextInput?: EdeContextCollectionInput;
  triggerSource: EdeTriggerSource;
  requestedBy: string;
  reason?: string;
  timestamp: string;
  /** @deprecated Use timestamp. */
  requestedOn: string;
}

export interface EdeDecisionResponse {
  decisionId: string;
  requestId: string;
  decisionCategory: EdeDecisionCategory;
  /** @deprecated Use decisionCategory. */
  decisionType: EdeDecisionCategory;
  summary: string;
  recommendation: string;
  recommendationCategory: EdeRecommendationCategory;
  confidence: number;
  confidenceBand: EdeConfidenceBand;
  explanation: string;
  supportingFactors: EdeSupportingFactor[];
  suggestedNextSteps: string[];
  advisoryLevel: EdeAdvisoryLevel;
  advisoryLevelNumber: 1 | 2 | 3 | 4 | 5;
  /**
   * Only true for Compliance Block (Level 5).
   * Levels 1–4 never block — empowerment principle.
   */
  mayBlockProgression: boolean;
  /** Always false — EDE never executes workflows or actions. */
  executable: false;
  generatedBy: "Enterprise Decision Engine";
  actorId: string;
  opportunityId?: string;
  contextSnapshot: EdeDecisionContext;
  profileSource: "ecg" | "framework_default";
  /** SPR-006B — knowledge packages used in this decision. */
  knowledgeUsed: Array<{
    knowledgeId: string;
    name: string;
    category: DkfKnowledgeCategory;
    version: string;
  }>;
  evidence: DkfEvidenceBundle;
  knowledgeTrace?: DkfKnowledgeEvaluationTrace;
  /** SPR-006C — Enterprise Reasoning Engine artefacts. */
  reasoningTraceId?: string;
  reasoningTrace?: EreReasoningTrace;
  reasoningChain?: EreReasoningChainStage[];
  explainability?: EreExplainabilityBundle;
  timestamp: string;
}

export interface EdeDecisionHistoryEntry {
  id: string;
  decisionId: string;
  requestId: string;
  decisionCategory: EdeDecisionCategory;
  /** @deprecated Use decisionCategory. */
  decisionType: EdeDecisionCategory;
  actorId: string;
  opportunityId?: string;
  contextSummary: string;
  context?: EdeDecisionContext;
  recommendation: string;
  confidence: number;
  explanation: string;
  advisoryLevel: EdeAdvisoryLevel;
  userAction: EdeUserAction;
  overrideReason?: string;
  finalOutcome: EdeFinalOutcome;
  occurredOn: string;
  modifiedOn: string;
}

export interface EdeAuditReference {
  id: string;
  entityId: string;
  entityType: "request" | "response" | "history" | "knowledge_package" | "reasoning_trace";
  eafAuditEntryId: string;
  recordedOn: string;
}

/** ECG-ready evaluation profile — no product/lender/workflow business rules in engine code. */
export interface EdeEvaluationProfile {
  decisionCategory: EdeDecisionCategory;
  /** @deprecated Use decisionCategory. */
  decisionType?: EdeDecisionCategory;
  summaryTemplate: string;
  recommendationTemplate: string;
  explanationTemplate: string;
  nextStepTemplates: string[];
  confidenceFactors: {
    healthWeight: number;
    documentWeight: number;
    taskWeight: number;
    workflowWeight: number;
    activityWeight: number;
    lenderWeight: number;
  };
  basConfidence: number;
}

export interface EdeOrchestrationConfig {
  autoPublishDialogue: boolean;
  presentViaChanakya: boolean;
  preferEcgProfiles: boolean;
  /** Prefer ECG-published knowledge packages when available. */
  preferEcgKnowledge: boolean;
  /** Prefer ECG-published reasoning / weighting / conflict profiles. */
  preferEcgReasoningProfiles: boolean;
}

export interface EdeChanakyaPresentation {
  decisionId: string;
  headline: string;
  message: string;
  confidence: number;
  advisoryLevel: EdeAdvisoryLevel;
  nextSteps: string[];
  knowledgeNames: string[];
  severity: "info" | "advisory" | "attention";
  generatedBy: "CHANAKYA";
  sourceEngine: "EDE";
  tone: "professional_business";
}

export interface EdeRegistrySnapshot {
  requests: EdeDecisionRequest[];
  responses: EdeDecisionResponse[];
  history: EdeDecisionHistoryEntry[];
  knowledgePackages: DkfKnowledgePackage[];
  reasoningTraces: EreReasoningTrace[];
  auditReferences: EdeAuditReference[];
}
