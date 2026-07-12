/**
 * Enterprise Alert Center — contracts only.
 * Placeholder alerts; no channel delivery or KPI engine.
 */

export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";

export type AlertCategory =
  | "critical"
  | "warning"
  | "information"
  | "success"
  | "security"
  | "compliance"
  | "workflow"
  | "customer"
  | "partner"
  | "finance"
  | "technology"
  | "infrastructure"
  | "ai"
  | "system";

export type AlertStatus =
  | "open"
  | "acknowledged"
  | "investigating"
  | "resolved"
  | "dismissed";

export interface AlertNavigateAction {
  label: string;
  href?: string;
}

export interface AlertPlaceholderAction {
  label: string;
}

export interface EnterpriseAlert {
  id: string;
  title: string;
  summary: string;
  description: string;
  category: AlertCategory;
  severity: AlertSeverity;
  sourceModule: string;
  generatedAt: string;
  status: AlertStatus;
  acknowledged: boolean;
  recommendedAction: string;
  viewDetails: AlertNavigateAction;
  /** Optional inert dismiss affordance */
  dismissAction?: AlertPlaceholderAction;
}

export interface AlertSummaryBucket {
  id: string;
  label: string;
  count: number;
  severity?: AlertSeverity;
  category?: AlertCategory;
}

export interface AlertSummary {
  total: number;
  open: number;
  critical: number;
  acknowledged: number;
  unacknowledged: number;
  buckets: AlertSummaryBucket[];
  asOf: string;
}

/** Placeholder statistics for Defender-style density — not computed KPIs */
export interface AlertStatistics {
  bySeverity: readonly { severity: AlertSeverity; count: number }[];
  byCategory: readonly { category: AlertCategory; count: number }[];
  byStatus: readonly { status: AlertStatus; count: number }[];
  byModule: readonly { module: string; count: number }[];
  asOf: string;
}

export interface AlertFilter {
  severity?: AlertSeverity | "all";
  category?: AlertCategory | "all";
  /** Source module */
  module?: string | "all";
  status?: AlertStatus | "all";
  /** Inclusive start date (yyyy-mm-dd) */
  dateFrom?: string | "all";
  /** Inclusive end date (yyyy-mm-dd) */
  dateTo?: string | "all";
  /** @deprecated Prefer dateFrom / dateTo */
  date?: string | "all";
  search?: string;
  /** true = acknowledged only, false = unacknowledged only, all = both */
  acknowledged?: boolean | "all";
}

export interface AlertCenterModel {
  summary: AlertSummary;
  statistics: AlertStatistics;
  alerts: EnterpriseAlert[];
  filter: AlertFilter;
  modules: string[];
  quickActions: AlertNavigateAction[];
}

export const ALERT_CATEGORIES: readonly AlertCategory[] = [
  "critical",
  "warning",
  "information",
  "success",
  "security",
  "compliance",
  "workflow",
  "customer",
  "partner",
  "finance",
  "technology",
  "infrastructure",
  "ai",
  "system",
] as const;

export const ALERT_SEVERITIES: readonly AlertSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
] as const;

export const ALERT_STATUSES: readonly AlertStatus[] = [
  "open",
  "acknowledged",
  "investigating",
  "resolved",
  "dismissed",
] as const;
