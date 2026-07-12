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
  /** Future API confidence — not calculated locally */
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
  /** Future personalization hooks */
  personalizationHints?: string[];
}

/**
 * AI-ready brief contract — UI accepts these fields without redesign.
 */
export interface ExecutiveBrief {
  title: string;
  summary: string;
  observations: string[];
  recommendations: string[];
  riskLevel: ExecutiveBriefingPriority | "none";
  confidence?: number;
  generatedAt: string;
  sourceModules: string[];
  /** Placeholder attribution until insight APIs land */
  presentedBy: "CHANAKYA";
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
}
