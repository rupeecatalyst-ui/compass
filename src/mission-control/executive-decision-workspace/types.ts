/**
 * Executive Decision Workspace — contracts only.
 * UI consumes these models via providers; no origin awareness.
 */

/** Priority levels for actions and approvals */
export type PriorityLevel = "critical" | "high" | "medium" | "low";

/** Severity levels for watch / attention items */
export type SeverityLevel = "critical" | "high" | "medium" | "low" | "info";

export type ApprovalStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "rejected"
  | "deferred"
  | "expired";

export type TrendDirection = "up" | "down" | "flat" | "unknown";

export interface Trend {
  direction: TrendDirection;
  /** Placeholder display label — not a calculated KPI */
  label: string;
  /** Optional placeholder delta text e.g. "+2.4%" */
  deltaLabel?: string;
}

/** Navigation contract — UI only follows href; no business side effects */
export interface WorkspaceNavigateAction {
  label: string;
  href: string;
}

/** Inert action affordance — buttons render but do not execute workflows */
export interface WorkspacePlaceholderAction {
  label: string;
}

export interface PriorityAction {
  id: string;
  priority: PriorityLevel;
  category: string;
  title: string;
  summary: string;
  reason: string;
  recommendedAction: string;
  sourceModule: string;
  severity: SeverityLevel;
  navigateAction: WorkspaceNavigateAction;
}

export interface ExecutiveWatchItem {
  id: string;
  title: string;
  category: string;
  description: string;
  severity: SeverityLevel;
  sourceModule: string;
  lastUpdated: string;
  viewDetailsAction: WorkspaceNavigateAction;
}

export interface ExecutiveApproval {
  id: string;
  approvalTitle: string;
  approvalType: string;
  requestedBy: string;
  submittedOn: string;
  priority: PriorityLevel;
  currentStatus: ApprovalStatus;
  reviewAction: WorkspaceNavigateAction;
  approveAction: WorkspacePlaceholderAction;
  rejectAction: WorkspacePlaceholderAction;
}

export interface EnterpriseHighlight {
  id: string;
  label: string;
  value: string;
  detail?: string;
  category: string;
  trend: Trend;
}

export interface ExecutiveDecisionWorkspaceModel {
  priorityActions: PriorityAction[];
  watchList: ExecutiveWatchItem[];
  pendingApprovals: ExecutiveApproval[];
  highlights: EnterpriseHighlight[];
}

/** @deprecated Use PriorityLevel */
export type DecisionPriority = PriorityLevel;
/** @deprecated Use SeverityLevel */
export type DecisionSeverity = SeverityLevel;
/** @deprecated Use ApprovalStatus */
export type DecisionStatus = ApprovalStatus;
/** @deprecated Use ExecutiveWatchItem */
export type WatchListItem = ExecutiveWatchItem;
