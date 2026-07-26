/**
 * ETE — Enterprise Task Engine (SPR-001 + CO-BIZ-001).
 * Business-driven, entity-bound tasks with colour status and escalation.
 */

export type EteTaskType = "independent" | "opportunity";

/** UX category — Workflow (loan-linked) vs General (org work). */
export type EteTaskCategory = "workflow" | "general";

export type EteTaskColour = "blue" | "orange" | "red";

export type EteTaskPriority = "critical" | "high" | "medium" | "low";

export type EteTaskStatus = "open" | "completed" | "cancelled";

/** CO-BIZ-001 — business work taxonomy (not generic to-dos). */
export type EteWorkType =
  | "Follow-up"
  | "Customer Call"
  | "Lender Call"
  | "Document Collection"
  | "Verification"
  | "Approval"
  | "Internal Review"
  | "Compliance"
  | "Accounting"
  | "Reminder"
  | "Custom";

/** CO-BIZ-001 — tasks must belong to an enterprise entity. */
export type EteEntityKind =
  | "Customer"
  | "Opportunity"
  | "EnterpriseDeal"
  | "Document"
  | "Lender"
  | "Workflow";

export type EteBusinessEvent =
  | "customer_created"
  | "opportunity_created"
  | "deal_created"
  | "deal_login"
  | "soft_approval"
  | "final_approval"
  | "disbursed"
  | "document_uploaded"
  | "lender_assigned";

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

export interface EteEntityReference {
  kind: EteEntityKind;
  id: string;
  label?: string;
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
  /** BAT #27 — optional Contact / Deal links (enterprise object graph). */
  contactId?: string;
  dealId?: string;
  /** Optional reminder timestamp (ISO). */
  reminderAt?: string;
  /** Chanakya Enterprise Execution Supervisor monitoring until Complete. */
  chanakyaMonitoring?: boolean;
  commitmentLevel?: EteCommitmentLevel;
  postponeReason?: EtePostponeReason;
  postponeComment?: string;
  checklist?: { id: string; label: string; done: boolean }[];
  comments?: { id: string; author: string; body: string; at: string }[];
  /** CO-BIZ-001 — work management extensions */
  title?: string;
  workType?: EteWorkType;
  status?: EteTaskStatus;
  entityKind?: EteEntityKind;
  entityId?: string;
  entityLabel?: string;
  documentId?: string;
  lenderId?: string;
  completionNotes?: string;
  completedAt?: string;
  completedBy?: string;
  /** Idempotency key for auto-generated tasks */
  autoRuleId?: string;
  systemGenerated?: boolean;
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

export type EteMyWorkBucket =
  | "overdue"
  | "due_today"
  | "upcoming"
  | "completed"
  | "assigned_by_me"
  | "assigned_to_me";

export interface EteMyWorkView {
  userRef: string;
  asOf: string;
  overdue: EteTask[];
  dueToday: EteTask[];
  upcoming: EteTask[];
  completed: EteTask[];
  assignedByMe: EteTask[];
  assignedToMe: EteTask[];
  counts: Record<EteMyWorkBucket, number>;
}

export interface EteWorkloadInsight {
  id: string;
  text: string;
  tone: "danger" | "warning" | "info" | "success";
}

export interface EteOperationalReport {
  asOf: string;
  completedToday: number;
  overdueOpen: number;
  averageCompletionHours: number | null;
  byAssignee: { assigneeRef: string; open: number; completed: number; overdue: number }[];
  byStage: { stage: string; open: number; overdue: number }[];
  byWorkType: { workType: string; open: number; completed: number }[];
}
