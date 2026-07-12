/**
 * EAC defaults — SPR-006D. Scaffold only; ECG publishes real policies later.
 */

import type {
  EacAdministratorArchitecture,
  EacDisplayPolicy,
  EacLifecycleRules,
  EacLifecycleState,
  EacOrchestrationConfig,
  EacPriority,
  EacPriorityRule,
} from "@/types/enterprise-advisory-console";
import type { EdeAdvisoryLevel } from "@/types/enterprise-decision-engine";

export const EAC_FRAMEWORK_VERSION = "13.4.0";

export const EAC_LIFECYCLE_STATES = {
  NEW: "new",
  VIEWED: "viewed",
  ACCEPTED: "accepted",
  DEFERRED: "deferred",
  OVERRIDDEN: "overridden",
  COMPLETED: "completed",
  DISMISSED: "dismissed",
} as const satisfies Record<string, EacLifecycleState>;

export const EAC_PRIORITIES = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFORMATIONAL: "informational",
} as const satisfies Record<string, EacPriority>;

export const DEFAULT_EAC_ORCHESTRATION_CONFIG: EacOrchestrationConfig = {
  autoIngestFromEde: true,
  autoPublishDialogue: true,
  presentViaChanakya: true,
  preferEcgDisplayPolicies: true,
};

export function buildEacScaffoldPriorityRules(): EacPriorityRule {
  return {
    ruleId: "eac-priority-scaffold",
    name: "Scaffold priority mapping",
    version: "13.3.0-scaffold",
    source: "framework_scaffold",
    levelToPriority: {
      information: "informational",
      recommendation: "medium",
      warning: "high",
      escalation: "high",
      compliance_block: "critical",
    },
    notes: "ECG publishes priority rules — scaffold maps advisory levels only.",
  };
}

export function buildEacScaffoldDisplayPolicy(): EacDisplayPolicy {
  return {
    policyId: "eac-display-scaffold",
    name: "Scaffold display policy",
    version: "13.3.0-scaffold",
    source: "framework_scaffold",
    showKnowledgePackages: true,
    showReasoningTraceId: true,
    showChanakyaPanel: true,
    notes: "ECG publishes display policies later.",
  };
}

export function buildEacScaffoldLifecycleRules(): EacLifecycleRules {
  const terminal: EacLifecycleState[] = [];
  return {
    rulesId: "eac-lifecycle-scaffold",
    name: "Scaffold lifecycle transitions",
    version: "13.3.0-scaffold",
    source: "framework_scaffold",
    allowedTransitions: {
      new: ["viewed", "accepted", "deferred", "overridden", "dismissed"],
      viewed: ["accepted", "deferred", "overridden", "completed", "dismissed"],
      accepted: ["completed", "deferred", "overridden"],
      deferred: ["viewed", "accepted", "overridden", "dismissed", "completed"],
      overridden: ["completed", "dismissed"],
      completed: terminal,
      dismissed: terminal,
    },
    notes: "ECG may replace lifecycle rules. No auto-execution on any transition.",
  };
}

export function mapEacPriorityFromLevel(
  level: EdeAdvisoryLevel,
  rules = buildEacScaffoldPriorityRules(),
): EacPriority {
  return rules.levelToPriority[level] ?? "medium";
}

export function getEacAdministratorArchitecture(): EacAdministratorArchitecture {
  return {
    supportsAdvisoryTemplates: true,
    supportsPriorityRules: true,
    supportsRecommendationCategories: true,
    supportsDisplayPolicies: true,
    supportsLifecycleRules: true,
    supportsRecommendationSimulation: true,
    supportsAdvisoryTemplatePreview: true,
    supportsLifecycleConfiguration: true,
    supportsImpactAnalysis: true,
    supportsVersioning: true,
    supportsRollback: true,
    ecgAdapterKeys: [
      "advisoryTemplates",
      "priorityRules",
      "recommendationCategories",
      "displayPolicies",
      "lifecycleRules",
    ],
    notes:
      "Future ECG Configuration Center. Simulation / preview / versioning / rollback / impact analysis are architecture-only.",
  };
}
