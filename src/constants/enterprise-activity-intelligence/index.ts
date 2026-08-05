/**
 * CO-MC-001 — Enterprise Activity Intelligence configuration (SSOT).
 * Tunable thresholds — do not hardcode in UI or parallel engines.
 */

import type {
  ActivityWaitingDependency,
  TransactionActivityStateId,
} from "@/types/enterprise-activity-intelligence";

export const TRANSACTION_ACTIVITY_STATE_LABELS: Record<
  TransactionActivityStateId,
  string
> = {
  active_today: "Active Today",
  recently_active: "Recently Active",
  healthy_waiting: "Healthy Waiting",
  needs_follow_up: "Needs Follow-up",
  at_risk: "At Risk",
};

/**
 * Acceptable freshness window (days) for "Recently Active"
 * when the deal is not in a legitimate wait state.
 */
export const ACTIVITY_RECENTLY_ACTIVE_MAX_DAYS = 2;

/**
 * Expected follow-up cadence when customer documents are pending.
 * Beyond this with no meaningful activity → Needs Follow-up (neglect).
 */
export const ACTIVITY_CUSTOMER_DOC_FOLLOW_UP_DAYS = 3;

/**
 * Default expected external TAT windows (days in current wait context).
 * Within window + no overdue/blockers → Healthy Waiting (does not reduce Radar score).
 */
export const ACTIVITY_EXPECTED_TAT_DAYS: Record<
  Exclude<ActivityWaitingDependency, "none">,
  number
> = {
  lender: 7,
  legal: 10,
  operations: 5,
  customer: 5,
  external: 7,
};

/** Momentum component weights (must sum to 1). */
export const ACTIVITY_MOMENTUM_WEIGHTS = {
  recency: 0.35,
  frequency: 0.25,
  significance: 0.2,
  timelineAdherence: 0.2,
} as const;

/**
 * Significance multipliers by meaningful-work activity id
 * (aligned with CHANAKYA_RADAR_MEANINGFUL_WORK_ACTIVITIES).
 */
export const ACTIVITY_SIGNIFICANCE_BY_ID: Record<string, number> = {
  call_completed: 0.9,
  customer_meeting: 1,
  banker_interaction: 0.95,
  note_added: 0.55,
  follow_up_completed: 0.85,
  document_uploaded: 0.8,
  document_approved: 0.95,
  workflow_stage_updated: 1,
  workflow_substage_updated: 0.9,
  task_completed: 0.85,
  communication_sent: 0.75,
  approval_completed: 1,
  ai_recommendation_accepted: 0.7,
  assignment_changed: 0.65,
  lender_pipeline_updated: 0.9,
  operational_work: 0.7,
};

/**
 * How strongly Activity Momentum adjusts Deal Health (−maxAdj … +maxAdj).
 * Healthy Waiting never applies a negative adjustment.
 */
export const ACTIVITY_HEALTH_BLEND = {
  maxAdj: 12,
  /** Momentum score at which adjustment is 0. */
  neutralScore: 55,
} as const;

/**
 * Attention-weight damping when momentum is high or Healthy Waiting.
 * Lower damp → less management-attention pull on the Operational Vector.
 */
export const ACTIVITY_ATTENTION_DAMP = {
  healthyWaiting: 0.35,
  highMomentumMinScore: 75,
  highMomentumDamp: 0.5,
  lowMomentumMaxScore: 35,
  lowMomentumBoost: 1.35,
} as const;
