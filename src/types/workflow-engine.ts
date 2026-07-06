/**
 * Workflow Engine Foundation — metadata-driven platform capability.
 * Design-time definitions only. No execution engine in this sprint.
 */

export type WorkflowLifecycleStatus =
  | "draft"
  | "validated"
  | "testing"
  | "approved"
  | "published"
  | "archived";

export type WorkflowConditionOperator =
  | "equals"
  | "not_equals"
  | "in"
  | "not_in"
  | "exists"
  | "not_exists"
  | "greater_than"
  | "less_than";

/** Metadata condition — evaluated at runtime by future execution engine. */
export interface WorkflowCondition {
  id: string;
  fieldRef: string;
  operator: WorkflowConditionOperator;
  value: string;
  description?: string;
}

export type AssignmentStrategyType =
  | "round_robin"
  | "load_balanced"
  | "role_based"
  | "owner_based"
  | "manual"
  | "metadata_driven";

export interface AssignmentStrategy {
  id: string;
  strategyType: AssignmentStrategyType;
  label: string;
  description: string;
  configRef?: string;
  enabled: boolean;
}

export type SlaBreachAction = "escalate" | "notify" | "flag";

export interface WorkflowSlaDefinition {
  id: string;
  slaCode: string;
  label: string;
  description: string;
  targetDurationHours: number;
  warningThresholdPercent: number;
  breachAction: SlaBreachAction;
}

export interface EscalationDefinition {
  id: string;
  escalationCode: string;
  label: string;
  description: string;
  triggerAfterHours: number;
  escalateToRoleRef?: string;
  escalateToOwnerRef?: string;
}

export interface WorkflowEventDefinition {
  id: string;
  eventCode: string;
  eventName: string;
  description: string;
  payloadSchemaRef?: string;
  enabled: boolean;
}

/** Reusable stage master — not loan-specific. */
export interface StageLibraryEntry {
  id: string;
  stageCode: string;
  stageName: string;
  description: string;
  category: string;
  sortOrder: number;
  enabled: boolean;
}

export interface SubStageLibraryEntry {
  id: string;
  subStageCode: string;
  subStageName: string;
  parentStageId: string;
  description: string;
  sortOrder: number;
  enabled: boolean;
}

/** Transition rule — metadata only; no runtime traversal. */
export interface WorkflowTransitionRule {
  id: string;
  transitionCode: string;
  label: string;
  fromStageId: string;
  toStageId: string;
  fromSubStageId?: string;
  toSubStageId?: string;
  entryConditions: WorkflowCondition[];
  exitConditions: WorkflowCondition[];
  eventId?: string;
  priority: number;
  enabled: boolean;
}

/**
 * Immutable workflow definition version.
 * Business transaction instances are never stored here.
 */
export interface WorkflowDefinition {
  id: string;
  workflowId: string;
  workflowCode: string;
  workflowName: string;
  description: string;
  module: string;
  category: string;
  majorVersion: number;
  minorVersion: number;
  status: WorkflowLifecycleStatus;
  stageIds: string[];
  subStageIds: string[];
  transitions: WorkflowTransitionRule[];
  eventIds: string[];
  slaId: string | null;
  escalationId: string | null;
  assignmentStrategyId: string;
  entryConditions: WorkflowCondition[];
  exitConditions: WorkflowCondition[];
  effectiveFrom?: string;
  effectiveTo?: string;
  createdBy: string;
  approvedBy?: string;
  publishedBy?: string;
  publishedDate?: string;
  lastModified: string;
  tenantId?: string;
}

export interface WorkflowRegistryEntry {
  workflowId: string;
  workflowCode: string;
  workflowName: string;
  module: string;
  category: string;
  latestVersionLabel: string;
  status: WorkflowLifecycleStatus;
  stageCount: number;
  transitionCount: number;
  lastModified: string;
}

export interface WorkflowAuditEntry {
  id: string;
  workflowId: string;
  workflowName: string;
  versionLabel: string;
  actor: string;
  action: string;
  timestamp: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}

export interface WorkflowEngineDashboardMetrics {
  totalWorkflows: number;
  publishedWorkflows: number;
  draftWorkflows: number;
  stageLibraryCount: number;
  subStageLibraryCount: number;
  transitionRulesCount: number;
  eventDefinitionsCount: number;
  slaDefinitionsCount: number;
  escalationDefinitionsCount: number;
}

export interface WorkflowValidationWarning {
  code: string;
  severity: "error" | "warning";
  message: string;
}

export type WorkflowEngineSectionId =
  | "overview"
  | "registry"
  | "stage-library"
  | "events"
  | "settings";

/** Reserved — future execution engine extension points. */
export type WorkflowEngineExtensionPoint =
  | "execution_runtime"
  | "instance_store"
  | "notification_bridge"
  | "analytics"
  | "bpm_designer"
  | "ai_orchestration";
