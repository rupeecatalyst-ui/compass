/**
 * EOLE domain types — Enterprise Opportunity Lifecycle Engine (Sprint 13).
 */

// ---------------------------------------------------------------------------
// Lifecycle & status
// ---------------------------------------------------------------------------

export type EoleOpportunityLifecycleStatus =
  | "new"
  | "documents_pending"
  | "processing"
  | "lender_review"
  | "approved"
  | "partially_disbursed"
  | "fully_disbursed"
  | "rejected"
  | "cancelled"
  | "expired"
  | "archived"
  | "on_hold";

export type EoleBusinessModel = "secured_lending" | "unsecured_lending";

export type EoleOwnerType = "source_owner" | "relationship_manager" | "partner" | "internal_team";

export type EoleExecutorRole = "primary_executor" | "secondary_executor" | "lender_coordinator" | "document_coordinator";

export type EolePipelineStatus = "active" | "completed" | "failed" | "withdrawn";

export type EoleLenderPipelineOutcome = "pending" | "approved" | "rejected" | "disbursed" | "withdrawn";

export type EoleHoldStatus = "active" | "resumed" | "expired" | "closed";

export type EoleAgingSeverity = "none" | "reminder" | "escalation" | "manager_notification" | "mission_control";

export type EoleTimelineEventType =
  | "created"
  | "assignment"
  | "executor_changed"
  | "stage_changed"
  | "sub_stage_changed"
  | "hold"
  | "resume"
  | "approval"
  | "rejection"
  | "disbursement"
  | "closure"
  | "lender_pipeline_added"
  | "aging_alert";

export type EoleAuditEntityType =
  | "opportunity"
  | "owner"
  | "executor"
  | "assignment"
  | "pipeline"
  | "lender_reference"
  | "hold"
  | "lifecycle"
  | "aging";

// ---------------------------------------------------------------------------
// Core opportunity
// ---------------------------------------------------------------------------

export interface EoleOpportunity {
  id: string;
  enterpriseOpportunityId: string;
  opportunityCode: string;
  customerRef: string;
  productRef: string;
  financialRequirementId: string;
  organizationRef?: string;
  partnerRef?: string;
  strategy: EoleBusinessModel;
  lifecycleStatus: EoleOpportunityLifecycleStatus;
  stageCode: string;
  subStageCode?: string;
  pipelineId?: string;
  transactionRef?: string;
  minimumDocumentsSubmitted: boolean;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
  closedOn?: string;
}

export interface EoleOpportunityProfile {
  id: string;
  opportunityId: string;
  profileCode: string;
  summary: string;
  businessCaseRef?: string;
  policyRef?: string;
  ruleRef?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface EoleOpportunityRequirement {
  id: string;
  opportunityId: string;
  requirementCode: string;
  requirementType: string;
  description: string;
  mandatory: boolean;
  satisfied: boolean;
  documentRef?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Ownership & execution
// ---------------------------------------------------------------------------

export interface EoleOpportunityOwner {
  id: string;
  opportunityId: string;
  ownerRef: string;
  ownerType: EoleOwnerType;
  isSourceOwner: boolean;
  immutable: boolean;
  enabled: boolean;
  assignedBy: string;
  assignedOn: string;
}

export interface EoleOpportunityExecutor {
  id: string;
  opportunityId: string;
  executorRef: string;
  executorRole: EoleExecutorRole;
  active: boolean;
  assignedBy: string;
  assignedOn: string;
  unassignedOn?: string;
}

export interface EoleOpportunityAssignment {
  id: string;
  opportunityId: string;
  assigneeRef: string;
  assigneeType: "owner" | "executor";
  assignmentCode: string;
  parentAssignmentId?: string;
  enabled: boolean;
  assignedBy: string;
  assignedOn: string;
}

// ---------------------------------------------------------------------------
// Engine references
// ---------------------------------------------------------------------------

export interface EoleOpportunityCustomerReference {
  id: string;
  opportunityId: string;
  customerRef: string;
  identityRef?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EoleOpportunityPartnerReference {
  id: string;
  opportunityId: string;
  partnerRef: string;
  relationshipRef?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EoleOpportunityOrganizationReference {
  id: string;
  opportunityId: string;
  organizationRef: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EoleOpportunityProductReference {
  id: string;
  opportunityId: string;
  productRef: string;
  productLibraryRef?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EoleOpportunityFinancialRequirement {
  id: string;
  opportunityId: string;
  requirementCode: string;
  amount: number;
  currencyCode: string;
  purpose: string;
  fulfillmentModel: EoleBusinessModel;
  fulfilledAmount: number;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

// ---------------------------------------------------------------------------
// Lifecycle, pipeline & lender strategy
// ---------------------------------------------------------------------------

export interface EoleOpportunityLifecycle {
  id: string;
  opportunityId: string;
  fromStatus: EoleOpportunityLifecycleStatus;
  toStatus: EoleOpportunityLifecycleStatus;
  action: string;
  actorId: string;
  transitionedOn: string;
  remarks?: string;
}

export interface EoleOpportunityStage {
  id: string;
  stageCode: string;
  stageName: string;
  lifecycleStatus: EoleOpportunityLifecycleStatus;
  sortOrder: number;
  terminal: boolean;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EoleOpportunitySubStage {
  id: string;
  stageCode: string;
  subStageCode: string;
  subStageName: string;
  sortOrder: number;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EoleOpportunityPipeline {
  id: string;
  opportunityId: string;
  pipelineCode: string;
  status: EolePipelineStatus;
  currentStageCode: string;
  currentSubStageCode?: string;
  startedOn: string;
  completedOn?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EoleOpportunityPipelineSnapshot {
  id: string;
  pipelineId: string;
  opportunityId: string;
  stageCode: string;
  subStageCode?: string;
  lifecycleStatus: EoleOpportunityLifecycleStatus;
  capturedOn: string;
  capturedBy: string;
}

export interface EoleOpportunityLenderReference {
  id: string;
  opportunityId: string;
  pipelineId: string;
  lenderRef: string;
  workflowRef?: string;
  documentRefs: string[];
  outcome: EoleLenderPipelineOutcome;
  independent: boolean;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface EoleOpportunityStrategy {
  id: string;
  opportunityId: string;
  strategyCode: string;
  businessModel: EoleBusinessModel;
  maxSuccessfulDisbursements: number;
  allowMultipleLenderPipelines: boolean;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Hold, aging & SLA
// ---------------------------------------------------------------------------

export interface EoleOpportunityHold {
  id: string;
  opportunityId: string;
  holdCode: string;
  holdReason: string;
  holdDate: string;
  expectedResumeDate?: string;
  reviewDate?: string;
  holdDurationDays: number;
  maxHoldPeriodDays: number;
  status: EoleHoldStatus;
  recommendClosure: boolean;
  createdBy: string;
  createdOn: string;
  resumedOn?: string;
}

export interface EoleOpportunityAgingPolicy {
  id: string;
  policyCode: string;
  stageCode: string;
  maxDays: number;
  reminderDays: number;
  escalationDays: number;
  managerNotificationDays: number;
  missionControlNotificationDays: number;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EoleOpportunityAging {
  id: string;
  opportunityId: string;
  stageCode: string;
  daysInStage: number;
  severity: EoleAgingSeverity;
  policyCode: string;
  computedOn: string;
}

export interface EoleOpportunitySla {
  id: string;
  opportunityId: string;
  slaCode: string;
  stageCode: string;
  targetDays: number;
  breached: boolean;
  dueOn: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Timeline & audit
// ---------------------------------------------------------------------------

export interface EoleOpportunityTimelineEntry {
  id: string;
  opportunityId: string;
  eventType: EoleTimelineEventType;
  title: string;
  description: string;
  actorId: string;
  occurredOn: string;
  metadata?: Record<string, unknown>;
}

export interface EoleOpportunityAuditReference {
  id: string;
  entityId: string;
  entityType: EoleAuditEntityType;
  eafAuditEntryId: string;
  recordedOn: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type EoleValidationSeverity = "error" | "warning";

export interface EoleValidationIssue {
  code: string;
  severity: EoleValidationSeverity;
  message: string;
  entityRef?: string;
}

export interface EoleValidationResult {
  valid: boolean;
  issues: EoleValidationIssue[];
}

// ---------------------------------------------------------------------------
// Registry snapshot
// ---------------------------------------------------------------------------

export interface EoleRegistrySnapshot {
  opportunities: EoleOpportunity[];
  profiles: EoleOpportunityProfile[];
  requirements: EoleOpportunityRequirement[];
  owners: EoleOpportunityOwner[];
  executors: EoleOpportunityExecutor[];
  assignments: EoleOpportunityAssignment[];
  customerReferences: EoleOpportunityCustomerReference[];
  partnerReferences: EoleOpportunityPartnerReference[];
  organizationReferences: EoleOpportunityOrganizationReference[];
  productReferences: EoleOpportunityProductReference[];
  financialRequirements: EoleOpportunityFinancialRequirement[];
  lifecycles: EoleOpportunityLifecycle[];
  stages: EoleOpportunityStage[];
  subStages: EoleOpportunitySubStage[];
  pipelines: EoleOpportunityPipeline[];
  pipelineSnapshots: EoleOpportunityPipelineSnapshot[];
  lenderReferences: EoleOpportunityLenderReference[];
  strategies: EoleOpportunityStrategy[];
  holds: EoleOpportunityHold[];
  agingPolicies: EoleOpportunityAgingPolicy[];
  agings: EoleOpportunityAging[];
  slas: EoleOpportunitySla[];
  timelineEntries: EoleOpportunityTimelineEntry[];
  auditReferences: EoleOpportunityAuditReference[];
}
