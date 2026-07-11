/**
 * Enterprise Workflow Engine (EWE) — Sprint 5 Foundation.
 *
 * Business-agnostic workflow platform. No loan-specific logic.
 * Configuration-driven state machine with directed graph transitions.
 */

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export type EweDefinitionLifecycleStatus =
  | "draft"
  | "validated"
  | "approved"
  | "published"
  | "deprecated"
  | "archived";

export type EweDefinitionLifecycleAction =
  | "validate"
  | "approve"
  | "publish"
  | "deprecate"
  | "archive"
  | "revert_to_draft";

export type EweInstanceLifecycleStatus =
  | "created"
  | "running"
  | "waiting"
  | "suspended"
  | "completed"
  | "cancelled"
  | "failed";

export type EweInstanceLifecycleAction =
  | "start"
  | "wait"
  | "suspend"
  | "resume"
  | "complete"
  | "cancel"
  | "fail"
  | "terminate";

// ---------------------------------------------------------------------------
// State machine primitives
// ---------------------------------------------------------------------------

export type EweStateKind =
  | "start"
  | "intermediate"
  | "terminal"
  | "wait"
  | "parallel_fork"
  | "parallel_join";

export type EweTransitionKind =
  | "sequential"
  | "parallel"
  | "conditional"
  | "approval"
  | "event"
  | "timer"
  | "automatic"
  | "manual";

export type EweActionKind = "manual" | "automated" | "approval" | "notification" | "script";

export type EweTriggerKind = "event" | "timer" | "manual" | "signal";

export type EweAssignmentStrategy =
  | "round_robin"
  | "load_balanced"
  | "role_based"
  | "owner_based"
  | "manual"
  | "metadata_driven";

export type EweConditionOperator =
  | "equals"
  | "not_equals"
  | "in"
  | "not_in"
  | "exists"
  | "not_exists"
  | "greater_than"
  | "less_than";

export type EweParticipantType = "identity" | "role" | "team" | "queue";

export type EweSlaBreachAction = "escalate" | "notify" | "flag";

export type EweVariableDataType = "string" | "number" | "boolean" | "object" | "array";

// ---------------------------------------------------------------------------
// Workflow Definition
// ---------------------------------------------------------------------------

export interface EweWorkflowDefinition {
  id: string;
  tenantId?: string;
  workflowCode: string;
  workflowName: string;
  description: string;
  moduleRef: string;
  categoryRef: string;
  lifecycleStatus: EweDefinitionLifecycleStatus;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

// ---------------------------------------------------------------------------
// Workflow Version — immutable graph snapshot
// ---------------------------------------------------------------------------

export interface EweWorkflowStage {
  id: string;
  stageCode: string;
  stageName: string;
  description: string;
  sortOrder: number;
  enabled: boolean;
}

export interface EweWorkflowState {
  id: string;
  stateCode: string;
  stateName: string;
  stageId?: string;
  stateKind: EweStateKind;
  entryActionIds: string[];
  exitActionIds: string[];
  assignmentId?: string;
  slaId?: string;
  enabled: boolean;
}

export interface EweCondition {
  id: string;
  fieldRef: string;
  operator: EweConditionOperator;
  value?: string;
  description?: string;
}

export interface EweTransitionRule {
  id: string;
  ruleCode: string;
  label: string;
  conditions: EweCondition[];
  priority: number;
  enabled: boolean;
}

export interface EweWorkflowTransition {
  id: string;
  transitionCode: string;
  label: string;
  fromStateId: string;
  toStateId: string;
  transitionKind: EweTransitionKind;
  rules: EweTransitionRule[];
  triggerId?: string;
  actionIds: string[];
  priority: number;
  enabled: boolean;
}

export interface EweWorkflowAction {
  id: string;
  actionCode: string;
  actionName: string;
  actionKind: EweActionKind;
  handlerRef?: string;
  enabled: boolean;
}

export interface EweWorkflowTrigger {
  id: string;
  triggerCode: string;
  triggerKind: EweTriggerKind;
  eventId?: string;
  timerDurationMs?: number;
  enabled: boolean;
}

export interface EweWorkflowEvent {
  id: string;
  eventCode: string;
  eventName: string;
  payloadSchemaRef?: string;
  enabled: boolean;
}

export interface EweWorkflowVariable {
  id: string;
  variableCode: string;
  variableName: string;
  dataType: EweVariableDataType;
  defaultValue?: string;
  required: boolean;
}

export interface EweWorkflowAssignment {
  id: string;
  assignmentCode: string;
  label: string;
  strategy: EweAssignmentStrategy;
  participantIds: string[];
  queueId?: string;
  roleRef?: string;
  enabled: boolean;
}

export interface EweWorkflowQueue {
  id: string;
  queueCode: string;
  queueName: string;
  description: string;
  enabled: boolean;
}

export interface EweWorkflowParticipant {
  id: string;
  participantRef: string;
  participantType: EweParticipantType;
  enabled: boolean;
}

export interface EweWorkflowSla {
  id: string;
  slaCode: string;
  label: string;
  targetDurationMs: number;
  warningThresholdPercent: number;
  breachAction: EweSlaBreachAction;
  escalationId?: string;
  enabled: boolean;
}

export interface EweWorkflowEscalation {
  id: string;
  escalationCode: string;
  label: string;
  triggerAfterMs: number;
  escalateToRef: string;
  enabled: boolean;
}

export interface EweWorkflowVersion {
  id: string;
  definitionId: string;
  workflowCode: string;
  versionMajor: number;
  versionMinor: number;
  lifecycleStatus: EweDefinitionLifecycleStatus;
  stages: EweWorkflowStage[];
  states: EweWorkflowState[];
  transitions: EweWorkflowTransition[];
  actions: EweWorkflowAction[];
  triggers: EweWorkflowTrigger[];
  events: EweWorkflowEvent[];
  variables: EweWorkflowVariable[];
  assignments: EweWorkflowAssignment[];
  queues: EweWorkflowQueue[];
  participants: EweWorkflowParticipant[];
  slas: EweWorkflowSla[];
  escalations: EweWorkflowEscalation[];
  startStateId: string;
  terminalStateIds: string[];
  publishedOn?: string;
  publishedBy?: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

// ---------------------------------------------------------------------------
// Workflow Instance — runtime execution record
// ---------------------------------------------------------------------------

export interface EweWorkflowContext {
  instanceId: string;
  variables: Record<string, unknown>;
  metadataRef?: string;
}

export interface EweWorkflowInstance {
  id: string;
  definitionId: string;
  versionId: string;
  workflowCode: string;
  lifecycleStatus: EweInstanceLifecycleStatus;
  currentStateId: string;
  context: EweWorkflowContext;
  assignmentId?: string;
  queueId?: string;
  suspendedOn?: string;
  suspendedBy?: string;
  completedOn?: string;
  cancelledOn?: string;
  failedOn?: string;
  failureReason?: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

// ---------------------------------------------------------------------------
// Audit reference — bridge to EAF audit trail
// ---------------------------------------------------------------------------

export type EweAuditEntityType = "definition" | "version" | "instance";

export interface EweWorkflowAuditReference {
  id: string;
  entityId: string;
  entityType: EweAuditEntityType;
  eafAuditEntryId: string;
  recordedOn: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type EweValidationSeverity = "error" | "warning";

export interface EweValidationIssue {
  code: string;
  severity: EweValidationSeverity;
  message: string;
  entityRef?: string;
}

export interface EweValidationResult {
  valid: boolean;
  issues: EweValidationIssue[];
}

// ---------------------------------------------------------------------------
// Registry snapshot
// ---------------------------------------------------------------------------

export interface EweRegistrySnapshot {
  definitions: EweWorkflowDefinition[];
  versions: EweWorkflowVersion[];
  instances: EweWorkflowInstance[];
  auditReferences: EweWorkflowAuditReference[];
}
