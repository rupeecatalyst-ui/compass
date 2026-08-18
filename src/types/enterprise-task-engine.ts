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
  | "post_disbursement_confirmation_pending"
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
  frequency: EteRecurrenceFrequency;
  /** Every N units (days / weeks). Default 1. */
  interval: number;
  /** Weekly — selected weekdays */
  weekdays?: EteWeekdayCode[];
  /** Monthly mode */
  monthlyMode?: EteMonthlyMode;
  /** Same-weekday monthly: First / Third / Last … */
  weekdayOrdinal?: EteWeekdayOrdinal;
  weekday?: EteWeekdayCode;
  /** Same-date monthly / quarterly / half-yearly / yearly day-of-month (1–31) */
  dayOfMonth?: number;
  end: EteRecurrenceEnd;
  /** Relative reminder before each occurrence due */
  reminderOffset?: EteReminderOffset;
}

/**
 * @deprecated Legacy stub — prefer full `EteTaskRecurrence` with `end`.
 * Kept so older in-memory rows with frequency "none" still type-check.
 */
export type EteLegacyRecurrenceFrequency = EteRecurrenceFrequency | "none";

export type EteScheduleKind = "one_time" | "recurring";

export type EteRecurrenceFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "yearly";

export type EteWeekdayCode = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type EteMonthlyMode = "same_date" | "same_weekday";

export type EteWeekdayOrdinal = "first" | "second" | "third" | "fourth" | "last";

export type EteRecurrenceEndMode = "forever" | "after_count" | "on_date";

export type EteRecurrenceEnd =
  | { mode: "forever" }
  | { mode: "after_count"; count: number }
  | { mode: "on_date"; endOn: string };

export type EteReminderOffset =
  | "none"
  | "at_due"
  | "15_minutes"
  | "1_hour"
  | "1_day";

export type EteSeriesStatus = "active" | "ended" | "cancelled";

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
  /** One-Time (default) vs Recurring series. */
  scheduleKind?: EteScheduleKind;
  recurrence?: EteTaskRecurrence;
  /** Shared id across all occurrences in a recurring series. */
  seriesId?: string;
  /** First occurrence task id (series root). */
  seriesRootTaskId?: string;
  /** 1-based occurrence index within the series. */
  occurrenceNumber?: number;
  /** Series lifecycle — set on open/root occurrences. */
  seriesStatus?: EteSeriesStatus;
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
