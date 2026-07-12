/**
 * EWOE — Enterprise Workflow Orchestration Engine (SPR-004).
 * Orchestration layer above EOLE / EDIE / ETE / ENCE / LIFE.
 * Does not replace EOLE stages — references existing stage codes.
 */

export type EwoeWorkflowInstanceStatus =
  | "draft"
  | "active"
  | "waiting"
  | "completed"
  | "cancelled"
  | "failed";

export type EwoeEventType =
  | "stage_changed"
  | "sub_stage_changed"
  | "document_uploaded"
  | "task_completed"
  | "lender_selected"
  | "approval_received"
  | "disbursement"
  | "activity_completed"
  | "trigger_executed"
  | "workflow_started"
  | "workflow_completed";

export type EwoeEngineTriggerTarget = "edie" | "ete" | "ence" | "life" | "eole";

export type EwoeCompletionConditionType =
  | "manual"
  | "documents_verified"
  | "tasks_complete"
  | "lender_selected"
  | "event"
  | "all_activities";

export type EwoeActivityType =
  | "document"
  | "task"
  | "communication"
  | "lender"
  | "review"
  | "approval"
  | "system";

export type EwoeVisualizationStatus = "completed" | "current" | "pending" | "upcoming";

/** Configurable matching dimensions — ECG-ready. */
export interface EwoeWorkflowScope {
  productRef: string;
  customerType: string;
  employmentType: string;
  constitution: string;
  lenderRef?: string;
  opportunityType: string;
}

export interface EwoeCompletionCondition {
  id: string;
  type: EwoeCompletionConditionType;
  description: string;
  /** Optional threshold / event code for future ECG rules. */
  config?: Record<string, unknown>;
  required: boolean;
}

export interface EwoeEngineTrigger {
  id: string;
  target: EwoeEngineTriggerTarget;
  action: string;
  description: string;
  enabled: boolean;
  payload?: Record<string, unknown>;
}

export interface EwoeWorkflowActivityDef {
  id: string;
  activityCode: string;
  title: string;
  activityType: EwoeActivityType;
  required: boolean;
  sortOrder: number;
  trigger?: EwoeEngineTrigger;
}

export interface EwoeWorkflowSubStageDef {
  id: string;
  subStageCode: string;
  subStageName: string;
  sortOrder: number;
  activities: EwoeWorkflowActivityDef[];
  completionConditions: EwoeCompletionCondition[];
  nextSubStageCode?: string;
  triggers: EwoeEngineTrigger[];
}

export interface EwoeWorkflowStageDef {
  id: string;
  /** EOLE stage code — do not invent parallel taxonomies. */
  stageCode: string;
  stageName: string;
  sortOrder: number;
  subStages: EwoeWorkflowSubStageDef[];
  activities: EwoeWorkflowActivityDef[];
  completionConditions: EwoeCompletionCondition[];
  nextStageCode?: string;
  triggers: EwoeEngineTrigger[];
}

export interface EwoeWorkflowDefinition {
  id: string;
  definitionCode: string;
  name: string;
  version: number;
  scope: EwoeWorkflowScope;
  stages: EwoeWorkflowStageDef[];
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface EwoeWorkflowInstance {
  id: string;
  opportunityId: string;
  definitionId: string;
  definitionCode: string;
  definitionVersion: number;
  status: EwoeWorkflowInstanceStatus;
  currentStageCode: string;
  currentSubStageCode?: string;
  progressRatio: number;
  startedBy: string;
  startedOn: string;
  completedOn?: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface EwoeWorkflowTransition {
  id: string;
  instanceId: string;
  opportunityId: string;
  previousStageCode: string;
  currentStageCode: string;
  previousSubStageCode?: string;
  currentSubStageCode?: string;
  reason: string;
  actorId: string;
  definitionVersion: number;
  occurredOn: string;
}

export interface EwoeWorkflowEvent {
  id: string;
  opportunityId: string;
  instanceId?: string;
  eventType: EwoeEventType;
  title: string;
  description: string;
  actorId: string;
  payload?: Record<string, unknown>;
  occurredOn: string;
}

export interface EwoeAuditReference {
  id: string;
  entityId: string;
  entityType: "definition" | "instance" | "transition" | "event";
  eafAuditEntryId: string;
  recordedOn: string;
}

export interface EwoeVisualizationNode {
  stageCode: string;
  stageName: string;
  status: EwoeVisualizationStatus;
  sortOrder: number;
  subStages: Array<{
    subStageCode: string;
    subStageName: string;
    status: EwoeVisualizationStatus;
  }>;
}

export interface EwoeVisualizationSnapshot {
  opportunityId: string;
  instanceId?: string;
  definitionCode?: string;
  definitionVersion?: number;
  currentStageCode?: string;
  currentSubStageCode?: string;
  progressRatio: number;
  nodes: EwoeVisualizationNode[];
  recentTransitions: EwoeWorkflowTransition[];
}

export type EwoeValidationSeverity = "error" | "warning";

export interface EwoeValidationIssue {
  code: string;
  severity: EwoeValidationSeverity;
  message: string;
  entityRef?: string;
}

export interface EwoeValidationResult {
  valid: boolean;
  issues: EwoeValidationIssue[];
}

/** ECG-ready runtime config (architecture only — no admin UI). */
export interface EwoeOrchestrationConfig {
  autoPublishDialogue: boolean;
  autoExecuteTriggers: boolean;
  contributeToIntelligence: boolean;
  /** Soft weight when blending workflow progress into stageProgressRatio. */
  intelligenceBlendWeight: number;
}

export interface EwoeRegistrySnapshot {
  definitions: EwoeWorkflowDefinition[];
  instances: EwoeWorkflowInstance[];
  transitions: EwoeWorkflowTransition[];
  events: EwoeWorkflowEvent[];
  auditReferences: EwoeAuditReference[];
}
