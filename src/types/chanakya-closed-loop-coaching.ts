/**
 * CF-CHANAKYA-003 — Closed Loop Business Coaching contracts.
 * Recommendations end with structured responses so Catalyst One can learn.
 */

export type ChanakyaCoachingAnswer = "yes" | "no";

export type ChanakyaCoachingQuickActionId =
  | "call_banker"
  | "whatsapp"
  | "email"
  | "remind_tomorrow"
  | "mark_followup_complete";

export type ChanakyaCoachingTriggerKind =
  | "lender_login_ack"
  | "pre_login_ready"
  | "idle_lender_followup"
  | "stage_movement";

export interface ChanakyaCoachingCelebration {
  headline: string;
  body: string;
  assessment?: string;
}

export interface ChanakyaCoachingQuickAction {
  id: ChanakyaCoachingQuickActionId;
  label: string;
}

export interface ChanakyaCoachingPrompt {
  id: string;
  /** Stable trigger family for learning aggregation. */
  triggerKind: ChanakyaCoachingTriggerKind;
  loanFileId: string;
  /** Optional lender case this prompt is about. */
  lenderCaseId?: string;
  /** CF-CHANAKYA-005 — celebrate meaningful stage movement before next recommendation. */
  celebration?: ChanakyaCoachingCelebration;
  recommendationLabel?: string;
  headlineContext: string;
  question: string;
  yesLabel?: string;
  noLabel?: string;
  quickActions: ChanakyaCoachingQuickAction[];
  /** Opaque metadata for workflow effects. */
  meta: {
    lenderName?: string;
    bankerName?: string;
    organisationName?: string;
    businessDays?: number;
    targetLoanStage?: string;
    targetLenderStage?: string;
    fromStage?: string;
    toStage?: string;
    daysElapsed?: number;
    transitionId?: string;
  };
}

export interface ChanakyaCoachingResponseRecord {
  promptId: string;
  triggerKind: ChanakyaCoachingTriggerKind;
  loanFileId: string;
  answer: ChanakyaCoachingAnswer;
  quickActionId?: ChanakyaCoachingQuickActionId;
  answeredAt: string;
  firstName?: string;
}

export interface ChanakyaCoachingLearningSnapshot {
  responses: ChanakyaCoachingResponseRecord[];
  byTrigger: Record<
    string,
    { yes: number; no: number; quickActions: Record<string, number> }
  >;
}
