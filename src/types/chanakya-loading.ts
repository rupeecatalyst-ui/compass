/**
 * CO-UX-008 — Enterprise CHANAKYA Loading Experience (frozen).
 * Canonical loading contract for Catalyst One.
 */

export type ChanakyaLoadingModule =
  | "contacts"
  | "contact-strategy"
  | "opportunity"
  | "my-opportunities"
  | "deal"
  | "my-deals"
  | "loan-journey"
  | "customers"
  | "lenders"
  | "accounting"
  | "mission-control"
  | "dashboard"
  | "documents"
  | "credit"
  | "tasks"
  | "reports"
  | "administration"
  | "settings"
  | "enterprise";

export type ChanakyaLoadingSurface = "default" | "command";

export type ChanakyaLoadingDensity = "page" | "panel" | "inline";

/** Loading visibility levels (timing constitution). */
export type ChanakyaLoadingLevel = 1 | 2 | 3;

export type ChanakyaLoadingMessageCategory =
  | "critical"
  | "pending_work"
  | "business_insight"
  | "progress"
  | "productivity_tip"
  | "business_knowledge"
  | "enterprise_status"
  | "completion";

export type ChanakyaLoadingMessage = {
  id: string;
  category: ChanakyaLoadingMessageCategory;
  text: string;
  /** Lower = higher priority (1 critical … 6 knowledge). */
  priority: number;
};

/** Optional live signals — consumers pass EBI/EME/ETE-derived values; never invent formulas here. */
export type ChanakyaLoadingLiveSignals = {
  activeOpportunities?: number;
  opportunitiesCreatedToday?: number;
  pipelineValueInr?: number;
  dealsNeedingLenderFollowUp?: number;
  overdueDocumentRequests?: number;
  overdueTasks?: number;
  tasksDueToday?: number;
  topLenderByPipeline?: string | null;
  enterpriseHealthLabel?: string | null;
  overnightMetricsOk?: boolean;
  workflowErrors?: number;
  criticalAlerts?: string[];
  pendingWorkLines?: string[];
};

export type ChanakyaLoadingSessionPhase =
  | "hidden"
  | "preparing"
  | "rotating"
  | "complete"
  | "done";
