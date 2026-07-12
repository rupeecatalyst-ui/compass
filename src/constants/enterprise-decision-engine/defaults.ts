/**
 * EDE defaults — ECG-ready profiles (framework placeholders, not business policy).
 * No product eligibility, lender policies, or workflow rules.
 */

import type {
  DkfKnowledgeCategory,
  DkfKnowledgeKind,
  DkfKnowledgePackage,
  EdeAdvisoryLevel,
  EdeDecisionCategory,
  EdeEvaluationProfile,
  EdeOrchestrationConfig,
  EreAdministratorArchitecture,
  EreReasoningProfile,
} from "@/types/enterprise-decision-engine";

export const EDE_FRAMEWORK_VERSION = "13.4.0";

export const EDE_DECISION_CATEGORIES = {
  OPPORTUNITY_ASSESSMENT: "opportunity_assessment",
  LENDER_RECOMMENDATION: "lender_recommendation",
  DOCUMENT_READINESS: "document_readiness",
  TASK_ASSESSMENT: "task_assessment",
  WORKFLOW_ASSESSMENT: "workflow_assessment",
  RISK_OBSERVATION: "risk_observation",
  CUSTOMER_READINESS: "customer_readiness",
} as const satisfies Record<string, EdeDecisionCategory>;

/** @deprecated Use EDE_DECISION_CATEGORIES. */
export const EDE_DECISION_TYPES = {
  EVALUATE_OPPORTUNITY: "opportunity_assessment",
  EVALUATE_LENDER: "lender_recommendation",
  EVALUATE_DOCUMENT_READINESS: "document_readiness",
  EVALUATE_TASK_HEALTH: "task_assessment",
  EVALUATE_WORKFLOW: "workflow_assessment",
} as const satisfies Record<string, EdeDecisionCategory>;

export const EDE_ADVISORY_LEVELS: Record<
  EdeAdvisoryLevel,
  { level: 1 | 2 | 3 | 4 | 5; label: string; mayBlockProgression: boolean }
> = {
  information: { level: 1, label: "Information", mayBlockProgression: false },
  recommendation: { level: 2, label: "Recommendation", mayBlockProgression: false },
  warning: { level: 3, label: "Warning", mayBlockProgression: false },
  escalation: { level: 4, label: "Escalation", mayBlockProgression: false },
  compliance_block: { level: 5, label: "Compliance Block", mayBlockProgression: true },
};

export const DEFAULT_EDE_ORCHESTRATION_CONFIG: EdeOrchestrationConfig = {
  autoPublishDialogue: true,
  presentViaChanakya: true,
  preferEcgProfiles: true,
  preferEcgKnowledge: true,
  preferEcgReasoningProfiles: true,
};

/**
 * SPR-006C — ERE scaffold profiles.
 * Equal/neutral multipliers only — not business weights. ECG publishes real profiles later.
 */
export function buildEreFrameworkScaffoldReasoningProfile(): EreReasoningProfile {
  return {
    profileId: "ere-scaffold-default",
    name: "ERE framework scaffold reasoning profile",
    version: "13.2.0-scaffold",
    source: "framework_scaffold",
    evidenceWeighting: {
      profileId: "ere-weight-scaffold",
      name: "Neutral evidence weighting scaffold",
      version: "13.2.0-scaffold",
      source: "framework_scaffold",
      dimensionMultipliers: {
        importance: 1,
        reliability: 1,
        freshness: 1,
        completeness: 1,
        source: 1,
        administratorPriority: 1,
      },
      notes:
        "Architecture placeholder. Equal multipliers including administratorPriority — ECG / AX publish real weights.",
    },
    conflictResolution: {
      profileId: "ere-conflict-scaffold",
      name: "Transparent conflict resolution scaffold",
      version: "13.2.0-scaffold",
      source: "framework_scaffold",
      primaryMethod: "weighted_majority",
      fallbackMethod: "surface_unresolved",
      resolutionStrategy: "weighted_majority",
      notes:
        "Architecture placeholder. Never silently drops conflicts. ECG may replace strategy.",
    },
    explainabilityTemplate: {
      templateId: "ere-explain-scaffold",
      name: "Neutral explainability template scaffold",
      version: "13.2.0-scaffold",
      source: "framework_scaffold",
      whatPrefix: "What is being recommended",
      whyPrefix: "Why",
      nextStepPrefix: "What you should do next",
      notes: "ECG publishes explainability templates — scaffold prefixes only.",
    },
    notes: "Scaffold only — not enterprise policy. Prefer ECG via preferEcgReasoningProfiles.",
  };
}

/** AX readiness contract — architecture only; no configuration UI in SPR-006C. */
export function getEreAdministratorArchitecture(): EreAdministratorArchitecture {
  return {
    supportsReasoningProfiles: true,
    supportsEvidenceWeightConfiguration: true,
    supportsConflictResolutionStrategy: true,
    supportsExplainabilityTemplates: true,
    supportsSimulation: true,
    supportsVersioning: true,
    supportsRollback: true,
    supportsImpactAnalysis: true,
    ecgAdapterKeys: [
      "reasoningProfile",
      "evidenceWeighting",
      "conflictResolution",
      "explainabilityTemplates",
    ],
    notes:
      "Future ECG Configuration Center. Simulation / versioning / rollback / impact analysis are adapter-ready only.",
  };
}

export const DEFAULT_EDE_EVALUATION_PROFILES: EdeEvaluationProfile[] = [
  {
    decisionCategory: "opportunity_assessment",
    summaryTemplate: "Opportunity assessment for {opportunityCode}.",
    recommendationTemplate:
      "Consider focusing on {focusArea}. This is advisory guidance only — you remain in control.",
    explanationTemplate:
      "We considered health {healthScore} ({healthBand}), pulse {pulseLabel}, stage {stageCode}, document verification {docPct}%, open tasks {openTasks}, and overdue tasks {overdueTasks}.",
    nextStepTemplates: [
      "Review the supporting factors below with your RM.",
      "Decide whether to act on {focusArea} or continue current plan.",
    ],
    confidenceFactors: {
      healthWeight: 0.35,
      documentWeight: 0.2,
      taskWeight: 0.2,
      workflowWeight: 0.15,
      activityWeight: 0.1,
      lenderWeight: 0,
    },
    basConfidence: 55,
  },
  {
    decisionCategory: "lender_recommendation",
    summaryTemplate: "Lender observation for {opportunityCode}.",
    recommendationTemplate:
      "{lenderLine} Review LIFE shortlist before committing. EDE does not select lenders.",
    explanationTemplate:
      "We considered LIFE signal {lifeLender} (recommended={lifeRecommended}), success hint {lifeSuccess}%, and stage {stageCode}. No lender policy was applied.",
    nextStepTemplates: [
      "Open LIFE and confirm executor fit for this opportunity.",
      "Record your lender choice when ready — EDE will not decide for you.",
    ],
    confidenceFactors: {
      healthWeight: 0.15,
      documentWeight: 0.1,
      taskWeight: 0.1,
      workflowWeight: 0.15,
      activityWeight: 0.1,
      lenderWeight: 0.4,
    },
    basConfidence: 50,
  },
  {
    decisionCategory: "document_readiness",
    summaryTemplate: "Document readiness for {opportunityCode}.",
    recommendationTemplate:
      "Document pack is {docPct}% verified. {docAdvice} EDE does not upload or verify documents.",
    explanationTemplate:
      "We considered required {docRequired}, uploaded {docUploaded}, verified {docVerified}, at stage {stageCode}.",
    nextStepTemplates: [
      "Open Documents and address pending items if needed.",
      "Re-run Document Readiness after verification updates.",
    ],
    confidenceFactors: {
      healthWeight: 0.1,
      documentWeight: 0.6,
      taskWeight: 0.1,
      workflowWeight: 0.1,
      activityWeight: 0.1,
      lenderWeight: 0,
    },
    basConfidence: 50,
  },
  {
    decisionCategory: "task_assessment",
    summaryTemplate: "Task assessment for {opportunityCode}.",
    recommendationTemplate:
      "{taskAdvice} Users remain responsible for completing or escalating tasks.",
    explanationTemplate:
      "We considered open {openTasks}, overdue {overdueTasks}, completed {completedTasks}, and pulse {pulseLabel}.",
    nextStepTemplates: [
      "Review overdue items in the Task Engine if any.",
      "Acknowledge or defer this advisory in Decision History.",
    ],
    confidenceFactors: {
      healthWeight: 0.15,
      documentWeight: 0.1,
      taskWeight: 0.55,
      workflowWeight: 0.1,
      activityWeight: 0.1,
      lenderWeight: 0,
    },
    basConfidence: 50,
  },
  {
    decisionCategory: "workflow_assessment",
    summaryTemplate: "Workflow assessment for {opportunityCode}.",
    recommendationTemplate:
      "Workflow progress is {workflowProgress}% ({workflowStatus}). {workflowAdvice} EDE does not advance stages.",
    explanationTemplate:
      "We considered definition {workflowCode}, stage {stageCode}/{subStage}, and progress {workflowProgress}%. No workflow rules were executed.",
    nextStepTemplates: [
      "Review EWOE visualization for pending completion conditions.",
      "Advance stage only when you are ready — not via EDE.",
    ],
    confidenceFactors: {
      healthWeight: 0.15,
      documentWeight: 0.15,
      taskWeight: 0.15,
      workflowWeight: 0.4,
      activityWeight: 0.15,
      lenderWeight: 0,
    },
    basConfidence: 50,
  },
  {
    decisionCategory: "risk_observation",
    summaryTemplate: "Risk observation for {opportunityCode}.",
    recommendationTemplate:
      "Observational note only: {focusArea} warrants awareness. This is not a risk score or credit decision.",
    explanationTemplate:
      "We observed health {healthScore}, overdue tasks {overdueTasks}, inactivity {daysInactive} day(s), and pulse {pulseLabel}. No predictive risk model was applied.",
    nextStepTemplates: [
      "Treat this as situational awareness for the RM.",
      "Escalate operationally only if your process requires it — EDE does not escalate automatically.",
    ],
    confidenceFactors: {
      healthWeight: 0.3,
      documentWeight: 0.15,
      taskWeight: 0.25,
      workflowWeight: 0.1,
      activityWeight: 0.2,
      lenderWeight: 0,
    },
    basConfidence: 45,
  },
  {
    decisionCategory: "customer_readiness",
    summaryTemplate: "Customer readiness observation for {opportunityCode}.",
    recommendationTemplate:
      "Customer engagement signal: {customerAdvice} EDE does not score customers.",
    explanationTemplate:
      "We considered customer {customerName}, inactivity {daysInactive} day(s), communication events {commCount}, and dialogue note “{dialogueSummary}”. No customer scoring model was applied.",
    nextStepTemplates: [
      "Confirm preferred contact channel with the customer if engagement is quiet.",
      "Update Dialogue with outreach outcome when available.",
    ],
    confidenceFactors: {
      healthWeight: 0.15,
      documentWeight: 0.1,
      taskWeight: 0.1,
      workflowWeight: 0.1,
      activityWeight: 0.55,
      lenderWeight: 0,
    },
    basConfidence: 50,
  },
];

// ---------------------------------------------------------------------------
// SPR-006B — DKF scaffold catalogue (architecture only — not business knowledge)
// ECG will publish real packages; these are structural placeholders.
// ---------------------------------------------------------------------------

export const DKF_KNOWLEDGE_KINDS = {
  POLICY: "policy",
  RULE: "rule",
  GUIDELINE: "guideline",
  BEST_PRACTICE: "best_practice",
  COMPLIANCE_REQUIREMENT: "compliance_requirement",
  RISK_OBSERVATION: "risk_observation",
  ADVISORY_TEMPLATE: "advisory_template",
} as const satisfies Record<string, DkfKnowledgeKind>;

export const DKF_KNOWLEDGE_CATEGORIES = {
  LENDING_POLICY: "lending_policy",
  INTERNAL_POLICY: "internal_policy",
  PRODUCT_GUIDANCE: "product_guidance",
  CUSTOMER_GUIDANCE: "customer_guidance",
  DOCUMENT_GUIDANCE: "document_guidance",
  WORKFLOW_GUIDANCE: "workflow_guidance",
  COMPLIANCE: "compliance",
  RISK: "risk",
} as const satisfies Record<string, DkfKnowledgeCategory>;

/** Scaffold packages — placeholders for ECG publication. Not lender/product eligibility rules. */
export function buildDkfFrameworkScaffoldPackages(
  now = new Date().toISOString(),
): Omit<DkfKnowledgePackage, "knowledgeId" | "createdOn" | "modifiedOn">[] {
  return [
    {
      name: "Document completeness guidance scaffold",
      kind: "guideline",
      category: "document_guidance",
      version: "13.1.0-scaffold",
      status: "published",
      description:
        "Framework scaffold for document readiness advisories. Replace via ECG — not a document policy.",
      source: "framework_scaffold",
      effectiveDate: now.slice(0, 10),
      match: {
        decisionCategories: ["document_readiness", "opportunity_assessment"],
        requireDocumentsPresent: true,
      },
      advisoryTemplate:
        "Document context is available. Review verification gaps before proceeding — advisory only.",
      nextStepTemplate: "Open Documents and confirm pending items with the RM.",
      enabled: true,
    },
    {
      name: "Task posture guidance scaffold",
      kind: "best_practice",
      category: "internal_policy",
      version: "13.1.0-scaffold",
      status: "published",
      description: "Framework scaffold for task assessment advisories. Not an SLA rule engine.",
      source: "framework_scaffold",
      effectiveDate: now.slice(0, 10),
      match: {
        decisionCategories: ["task_assessment", "opportunity_assessment", "risk_observation"],
        requireTasksPresent: true,
      },
      advisoryTemplate:
        "Task context was considered. Address overdue items if present — EDE does not create tasks.",
      nextStepTemplate: "Review open and overdue tasks in the Task Engine.",
      enabled: true,
    },
    {
      name: "Workflow progression guidance scaffold",
      kind: "advisory_template",
      category: "workflow_guidance",
      version: "13.1.0-scaffold",
      status: "published",
      description: "Framework scaffold for workflow assessment. Does not modify stages.",
      source: "framework_scaffold",
      effectiveDate: now.slice(0, 10),
      match: {
        decisionCategories: ["workflow_assessment", "opportunity_assessment"],
        requireWorkflowPresent: true,
        requireStagePresent: true,
      },
      advisoryTemplate:
        "Workflow context is present. Confirm completion conditions before any stage advance.",
      nextStepTemplate: "Review EWOE visualization; advance only when you choose to.",
      enabled: true,
    },
    {
      name: "Customer engagement guidance scaffold",
      kind: "guideline",
      category: "customer_guidance",
      version: "13.1.0-scaffold",
      status: "published",
      description: "Framework scaffold for customer readiness. Not a customer score.",
      source: "framework_scaffold",
      effectiveDate: now.slice(0, 10),
      match: {
        decisionCategories: ["customer_readiness", "opportunity_assessment"],
        maxDaysSinceActivity: 30,
      },
      advisoryTemplate:
        "Customer engagement signals were reviewed. Quiet periods may warrant outreach — advisory only.",
      nextStepTemplate: "Update Dialogue after any customer contact.",
      enabled: true,
    },
    {
      name: "LIFE lender observation scaffold",
      kind: "advisory_template",
      category: "product_guidance",
      version: "13.1.0-scaffold",
      status: "published",
      description: "Framework scaffold for lender observations. Not a lending policy.",
      source: "framework_scaffold",
      effectiveDate: now.slice(0, 10),
      match: {
        decisionCategories: ["lender_recommendation", "opportunity_assessment"],
        requireLifePresent: true,
      },
      advisoryTemplate:
        "LIFE lender signal is available in context. Confirm fit manually — EDE does not select lenders.",
      nextStepTemplate: "Open LIFE and validate executor selection.",
      enabled: true,
    },
    {
      name: "Health & pulse observation scaffold",
      kind: "risk_observation",
      category: "risk",
      version: "13.1.0-scaffold",
      status: "published",
      description: "Framework scaffold for health/pulse observations. Not a risk score.",
      source: "framework_scaffold",
      effectiveDate: now.slice(0, 10),
      match: {
        decisionCategories: ["risk_observation", "opportunity_assessment"],
        requireHealthPresent: true,
      },
      advisoryTemplate:
        "Health and pulse signals were considered as situational awareness — not a credit decision.",
      nextStepTemplate: "Discuss health posture with the RM if attention is warranted.",
      enabled: true,
    },
    {
      name: "Compliance awareness scaffold",
      kind: "compliance_requirement",
      category: "compliance",
      version: "13.1.0-scaffold",
      status: "draft",
      description:
        "Architecture placeholder for compliance packages. ECG publishes real requirements later.",
      source: "framework_scaffold",
      effectiveDate: now.slice(0, 10),
      match: {
        decisionCategories: ["opportunity_assessment", "document_readiness", "risk_observation"],
      },
      advisoryTemplate:
        "Compliance packages are not yet published from ECG. No compliance block is asserted by scaffold.",
      nextStepTemplate: "Await ECG-published compliance knowledge before Level 5 advisories.",
      enabled: true,
    },
  ];
}
