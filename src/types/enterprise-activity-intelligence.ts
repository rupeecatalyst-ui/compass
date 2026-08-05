/**
 * CO-MC-001 — Enterprise Activity Intelligence types.
 * Operational freshness / momentum for active transactions.
 * Viewing or opening a record is never meaningful activity.
 */

export const TRANSACTION_ACTIVITY_STATE_IDS = [
  "active_today",
  "recently_active",
  "healthy_waiting",
  "needs_follow_up",
  "at_risk",
] as const;

export type TransactionActivityStateId =
  (typeof TRANSACTION_ACTIVITY_STATE_IDS)[number];

export type ActivityWaitingDependency =
  | "customer"
  | "lender"
  | "legal"
  | "operations"
  | "external"
  | "none";

export type ActivityMomentumTrend = "improving" | "stable" | "declining";

export interface MeaningfulActivityHit {
  activityId: string;
  label: string;
  occurredAt: string;
  /** Relative significance 0–1 from Enterprise Activity Intelligence config. */
  significance: number;
}

export interface EnterpriseActivityIntelligence {
  /** Activity Momentum Score 0–100 — major Radar input. */
  momentumScore: number;
  state: TransactionActivityStateId;
  stateLabel: string;
  momentumTrend: ActivityMomentumTrend;
  /** Days since last meaningful activity (view/open excluded). */
  daysSinceMeaningfulActivity: number;
  meaningfulEventCount7d: number;
  meaningfulEventCount30d: number;
  /** True when idle is legitimate (within SLA / external wait) — must not reduce Radar score. */
  isHealthyWaiting: boolean;
  waitingDependency: ActivityWaitingDependency;
  waitingReason: string;
  /** Component scores for explainability. */
  components: {
    recency: number;
    frequency: number;
    significance: number;
    timelineAdherence: number;
  };
}
