/**
 * CF-CHANAKYA-006 — CHANAKYA Briefing Dashboard contracts.
 * Action-first briefing cards — every card ends with exactly one business action.
 */

export type ChanakyaBriefingCardKind =
  | "priority_actions"
  | "pending_tasks"
  | "profile_completion"
  | "opportunity_watch"
  | "lender_intelligence"
  | "business_health"
  | "risk_watch"
  | "recommendations"
  | "daily_wisdom";

/** Prompt 011 — dashboard visual priority hierarchy. */
export type ChanakyaBriefingPriority = 1 | 2 | 3;

export interface ChanakyaBriefingCard {
  id: ChanakyaBriefingCardKind;
  title: string;
  /** Personalized headline — addresses the user by name where appropriate. */
  headline: string;
  /** Context-aware body — what matters right now. */
  insight: string;
  /** Why this card is shown today. */
  reason: string;
  actionLabel: string;
  actionHref: string;
  /** 1 = Immediate Attention · 2 = Operational · 3 = Informational */
  priority: ChanakyaBriefingPriority;
}

export interface ChanakyaBriefingDashboardModel {
  firstName: string;
  greeting: string;
  tagline: string;
  generatedAt: string;
  cards: ChanakyaBriefingCard[];
}
