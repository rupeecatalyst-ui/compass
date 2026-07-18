/**
 * ETE — Enterprise Task Engine (SPR-001).
 * Independent and opportunity-linked tasks with colour status and escalation.
 */

export type EteTaskType = "independent" | "opportunity";

/** UX category — Workflow (loan-linked) vs General (org work). */
export type EteTaskCategory = "workflow" | "general";

export type EteTaskColour = "blue" | "orange" | "red";

export type EteTaskPriority = "high" | "medium" | "low";

export type EteCommitmentLevel = "very_high" | "high" | "moderate" | "low" | "very_low";

export type EtePostponeReason =
  | "waiting_customer"
  | "waiting_lender"
  | "document_pending"
  | "internal_dependency"
  | "third_party"
  | "priority_changed"
  | "other";

export type EteGrossStage =
  | "Contact"
  | "Opportunity Workspace"
  | "Document Center"
  | "Credit Workbench"
  | "Loan Workspace"
  | "Lender Pipeline"
  | "Approval"
  | "Disbursement"
  | "Accounting";

export type EtePredefinedDescription =
  | "Call Customer"
  | "Follow-up Documents"
  | "Verify CIBIL"
  | "Follow-up Lender"
  | "Resolve Query"
  | "Follow-up Manager"
  | "Internal Review"
  | "Customer Meeting"
  | "Branch Visit"
  | "General"
  | "Custom";

export interface EteTaskRecurrence {
  frequency: "daily" | "weekly" | "monthly" | "none";
  interval?: number;
}

export interface EteTask {
  id: string;
  taskType: EteTaskType;
  assigneeRef: string;
  opportunityRef?: string;
  dueOn?: string;
  recurrence?: EteTaskRecurrence;
  predefinedDescription: EtePredefinedDescription;
  description?: string;
  coOwnerRefs: string[];
  reportingManagerRef?: string;
  escalated: boolean;
  escalatedOn?: string;
  colourStatus: EteTaskColour;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
  /** Enterprise Task Workspace extensions (optional — backward compatible). */
  category?: EteTaskCategory;
  priority?: EteTaskPriority;
  borrowerName?: string;
  loanProduct?: string;
  lenderName?: string;
  department?: string;
  assignedByRef?: string;
  grossStage?: EteGrossStage;
  fileId?: string;
  commitmentLevel?: EteCommitmentLevel;
  postponeReason?: EtePostponeReason;
  postponeComment?: string;
  checklist?: { id: string; label: string; done: boolean }[];
  comments?: { id: string; author: string; body: string; at: string }[];
}

export type EteValidationSeverity = "error" | "warning";

export interface EteValidationIssue {
  code: string;
  severity: EteValidationSeverity;
  message: string;
  entityRef?: string;
}

export interface EteValidationResult {
  valid: boolean;
  issues: EteValidationIssue[];
}

export interface EteAuditReference {
  id: string;
  entityId: string;
  entityType: "task" | "escalation";
  eafAuditEntryId: string;
  recordedOn: string;
}

export interface EteRegistrySnapshot {
  tasks: EteTask[];
  auditReferences: EteAuditReference[];
}
