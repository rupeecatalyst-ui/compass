/**
 * ETE — Enterprise Task Engine (SPR-001).
 * Independent and opportunity-linked tasks with colour status and escalation.
 */

export type EteTaskType = "independent" | "opportunity";

export type EteTaskColour = "blue" | "orange" | "red";

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
