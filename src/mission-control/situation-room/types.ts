/**
 * Executive Situation Room — contracts only.
 * Placeholder awareness models; no KPIs or live probes.
 */

export type SituationHealthStatus = "healthy" | "warning" | "critical" | "unknown";

export type SituationSeverity = "critical" | "high" | "medium" | "low" | "info";

export type SituationTrendDirection = "up" | "down" | "flat" | "unknown";

export interface SituationTrend {
  direction: SituationTrendDirection;
  label: string;
  deltaLabel?: string;
}

export interface SituationNavigateAction {
  label: string;
  href: string;
}

export interface SituationPlaceholderAction {
  label: string;
}

export interface CommandSummaryModel {
  title: string;
  postureLabel: string;
  summary: string;
  asOf: string;
  sourceModules: readonly string[];
}

export interface EnterpriseHealthIndicator {
  id: string;
  label: string;
  status: SituationHealthStatus;
  detail?: string;
}

export interface OperationalDomain {
  id: string;
  title: string;
  status: SituationHealthStatus;
  severity: SituationSeverity;
  summary: string;
  trend: SituationTrend;
  viewDetailsAction: SituationNavigateAction;
}

export interface CriticalAlert {
  id: string;
  title: string;
  severity: SituationSeverity;
  category: string;
  recommendedAction: string;
  sourceModule: string;
  acknowledgeAction: SituationPlaceholderAction;
  escalateAction: SituationPlaceholderAction;
}

export interface ActivityFeedItem {
  id: string;
  timestamp: string;
  category: string;
  title: string;
  description: string;
  sourceModule: string;
  severity: SituationSeverity;
}

export interface QuickNavItem {
  id: string;
  label: string;
  href: string;
  description?: string;
}

export interface SituationRoomModel {
  commandSummary: CommandSummaryModel;
  healthIndicators: EnterpriseHealthIndicator[];
  domains: OperationalDomain[];
  criticalAlerts: CriticalAlert[];
  activity: ActivityFeedItem[];
  quickNav: QuickNavItem[];
}
