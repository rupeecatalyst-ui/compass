/**
 * CHANAKYA Executive Briefing — contracts only.
 * Future: consume standardized insight APIs (no direct business queries).
 */

export type ExecutiveBriefingPriority = "critical" | "high" | "medium" | "low";

export type EnterpriseHealthStatus =
  | "normal"
  | "attention"
  | "elevated"
  | "critical"
  | "unknown";

export interface EnterpriseHealth {
  status: EnterpriseHealthStatus;
  label: string;
  confidence?: number;
  observedAt?: string;
  sourceModules?: string[];
}

export interface ExecutiveGreeting {
  salutation: string;
  userDisplayName: string;
  dateLabel: string;
  timeLabel: string;
  health: EnterpriseHealth;
  personalizationHints?: string[];
}

export interface ExecutiveBrief {
  title: string;
  summary: string;
  observations: string[];
  recommendations: string[];
  riskLevel: ExecutiveBriefingPriority | "none";
  confidence?: number;
  generatedAt: string;
  sourceModules: string[];
  presentedBy: "CHANAKYA";
  /** CO-SPRINT-094 — Today's Executive Summary pillars (mock). */
  summaryPillars?: ExecutiveSummaryPillar[];
}

export interface ExecutiveSummaryPillar {
  id: string;
  label: string;
  points: string[];
}

export type ExecutiveStatusDomain = "business" | "technical" | "people" | "risk" | "ai";

export interface ExecutiveStatusMetric {
  label: string;
  value: string;
  hint?: string;
}

export interface ExecutiveStatusCard {
  id: ExecutiveStatusDomain;
  title: string;
  subtitle: string;
  tone: "neutral" | "attention" | "positive";
  metrics: ExecutiveStatusMetric[];
}

export interface BusinessPerformanceModel {
  funnel: Array<{ stage: string; value: number }>;
  products: Array<{ name: string; value: number }>;
  lenders: Array<{ name: string; value: number }>;
  conversion: Array<{ label: string; rate: number }>;
  revenueTrend: Array<{ month: string; revenue: number }>;
}

export interface ExecutiveActionsModel {
  priorities: Array<{ id: string; title: string; urgency: string }>;
  pendingApprovals: Array<{ id: string; title: string; owner: string }>;
  criticalTasks: Array<{ id: string; title: string; due: string }>;
  meetings: Array<{ id: string; title: string; when: string }>;
  notifications: Array<{ id: string; title: string; when: string }>;
}

export type HealthIndicatorState = "healthy" | "warning";

export interface EnterpriseHealthIndicator {
  id: string;
  label: string;
  state: HealthIndicatorState;
  detail: string;
}

export interface PriorityAction {
  id: string;
  priority: ExecutiveBriefingPriority;
  title: string;
  description: string;
  reason: string;
  recommendedAction: string;
  navigateTo: string;
  navigateLabel?: string;
}

export interface EnterpriseHighlight {
  id: string;
  label: string;
  value: string;
  detail?: string;
  category:
    | "branch"
    | "relationship_manager"
    | "lender"
    | "sla"
    | "productivity"
    | "satisfaction"
    | "other";
}

export interface QuickAction {
  id: string;
  label: string;
  href: string;
  description?: string;
  icon: string;
}

export interface ExecutiveBriefingPageModel {
  greeting: ExecutiveGreeting;
  brief: ExecutiveBrief;
  priorityActions: PriorityAction[];
  highlights: EnterpriseHighlight[];
  quickActions: QuickAction[];
  statusCards: ExecutiveStatusCard[];
  businessPerformance: BusinessPerformanceModel;
  executiveActions: ExecutiveActionsModel;
  enterpriseHealth: EnterpriseHealthIndicator[];
}
