/**
 * CO-MC-001 — Enterprise Activity Intelligence Engine.
 *
 * Computes operational freshness, Healthy Waiting vs Neglect, and Activity Momentum Score.
 * Consumed by CHANAKYA Radar Decision Engine — never reimplemented in UI.
 * Viewing / opening a record is never meaningful activity.
 */

import {
  ACTIVITY_ATTENTION_DAMP,
  ACTIVITY_CUSTOMER_DOC_FOLLOW_UP_DAYS,
  ACTIVITY_EXPECTED_TAT_DAYS,
  ACTIVITY_HEALTH_BLEND,
  ACTIVITY_MOMENTUM_WEIGHTS,
  ACTIVITY_RECENTLY_ACTIVE_MAX_DAYS,
  ACTIVITY_SIGNIFICANCE_BY_ID,
  TRANSACTION_ACTIVITY_STATE_LABELS,
} from "@/constants/enterprise-activity-intelligence";
import {
  hasMeaningfulWorkToday,
  matchMeaningfulWorkActivity,
} from "@/lib/chanakya-radar/daily-work";
import type { LoanFile, LoanLenderExecution } from "@/types/catalyst-one";
import type {
  ActivityMomentumTrend,
  ActivityWaitingDependency,
  EnterpriseActivityIntelligence,
  MeaningfulActivityHit,
  TransactionActivityStateId,
} from "@/types/enterprise-activity-intelligence";

function daysSince(iso?: string): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

function activeLenders(file: LoanFile): LoanLenderExecution[] {
  return (file.lenders ?? []).filter((l) => l.status === "active");
}

function leadLender(file: LoanFile): LoanLenderExecution | undefined {
  const active = activeLenders(file);
  return active.find((l) => l.isPrimary) ?? active[0];
}

function pendingDocCount(file: LoanFile): number {
  return (file.documents ?? []).filter(
    (d) => d.status === "pending" || d.status === "requested" || d.status === "rejected",
  ).length;
}

function overdueTaskCount(file: LoanFile): number {
  const now = Date.now();
  return (file.tasks ?? []).filter((t) => {
    if (t.completed || t.status === "completed") return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate).getTime() < now;
  }).length;
}

/**
 * Collect meaningful timeline hits (excludes view/open via matchMeaningfulWorkActivity).
 */
export function listMeaningfulActivityHits(file: LoanFile): MeaningfulActivityHit[] {
  const hits: MeaningfulActivityHit[] = [];
  for (const event of file.timeline ?? []) {
    const matched = matchMeaningfulWorkActivity(event);
    if (!matched) continue;
    hits.push({
      activityId: matched.id,
      label: matched.label,
      occurredAt: event.timestamp,
      significance: ACTIVITY_SIGNIFICANCE_BY_ID[matched.id] ?? 0.6,
    });
  }
  return hits.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

/**
 * Infer who the transaction is legitimately waiting on (external dependency).
 */
export function resolveActivityWaitingDependency(
  file: LoanFile,
): { dependency: ActivityWaitingDependency; reason: string } {
  const lead = leadLender(file);
  const pendingDocs = pendingDocCount(file);
  const stage = String(lead?.caseStage ?? file.stage ?? "").toLowerCase();
  const hold = (file.lenders ?? []).some(
    (l) => l.status === "active" && l.caseStage === "hold",
  );

  if (hold) {
    return {
      dependency: "lender",
      reason: "Lender hold — awaiting bank release within SLA",
    };
  }

  if (
    stage.includes("closure") ||
    stage.includes("legal") ||
    file.stage === "closure_wip"
  ) {
    return {
      dependency: "legal",
      reason: "Awaiting legal / closure dependency",
    };
  }

  if (
    stage.includes("soft_approved") ||
    stage.includes("logged_in") ||
    stage.includes("credit") ||
    stage.includes("login") ||
    file.stage === "logged_in" ||
    file.stage === "credit_wip"
  ) {
    return {
      dependency: "lender",
      reason: "Awaiting lender / bank TAT",
    };
  }

  if (stage.includes("final_approved") || file.stage === "final_approved") {
    return {
      dependency: "operations",
      reason: "Awaiting operations / disbursement prep",
    };
  }

  if (pendingDocs > 0) {
    return {
      dependency: "customer",
      reason: "Awaiting customer documents",
    };
  }

  if (lead && activeLenders(file).length > 0) {
    return {
      dependency: "lender",
      reason: "Awaiting lender progression",
    };
  }

  return { dependency: "none", reason: "" };
}

function recencyScore(daysSinceMeaningful: number): number {
  if (daysSinceMeaningful <= 0) return 100;
  if (daysSinceMeaningful === 1) return 88;
  if (daysSinceMeaningful === 2) return 76;
  if (daysSinceMeaningful <= 4) return 58;
  if (daysSinceMeaningful <= 7) return 40;
  if (daysSinceMeaningful <= 14) return 22;
  return 8;
}

function frequencyScore(count7d: number, count30d: number): number {
  const weekly = Math.min(100, count7d * 22);
  const monthly = Math.min(40, count30d * 4);
  return clamp(Math.round(weekly * 0.75 + monthly * 0.25));
}

function significanceScore(hits7d: MeaningfulActivityHit[]): number {
  if (hits7d.length === 0) return 18;
  const avg =
    hits7d.reduce((s, h) => s + h.significance, 0) / Math.max(1, hits7d.length);
  const volumeBoost = Math.min(25, hits7d.length * 6);
  return clamp(Math.round(avg * 75 + volumeBoost));
}

function timelineAdherenceScore(input: {
  daysSinceMeaningful: number;
  isHealthyWaiting: boolean;
  expectedTat: number;
  overdueTasks: number;
  delayed: boolean;
  atRisk: boolean;
}): number {
  if (input.atRisk || input.overdueTasks > 0) return 15;
  if (input.delayed) return 28;
  if (input.isHealthyWaiting) {
    // Reward being inside expected wait window
    const ratio = input.daysSinceMeaningful / Math.max(1, input.expectedTat);
    if (ratio <= 0.6) return 92;
    if (ratio <= 1) return 84;
    return 70;
  }
  if (input.daysSinceMeaningful <= ACTIVITY_RECENTLY_ACTIVE_MAX_DAYS) return 80;
  if (input.daysSinceMeaningful <= 5) return 55;
  return 30;
}

function resolveState(input: {
  activeToday: boolean;
  daysSinceMeaningful: number;
  isHealthyWaiting: boolean;
  overdueTasks: number;
  delayed: boolean;
  atRiskFlag: boolean;
  onHold: boolean;
  pendingDocs: number;
  customerNeglect: boolean;
}): TransactionActivityStateId {
  if (
    input.atRiskFlag ||
    input.onHold ||
    input.overdueTasks >= 2 ||
    (input.delayed && input.daysSinceMeaningful >= 10)
  ) {
    return "at_risk";
  }

  if (input.activeToday) return "active_today";

  if (input.isHealthyWaiting) return "healthy_waiting";

  if (
    input.customerNeglect ||
    (input.pendingDocs > 0 &&
      input.daysSinceMeaningful >= ACTIVITY_CUSTOMER_DOC_FOLLOW_UP_DAYS) ||
    (input.daysSinceMeaningful > ACTIVITY_RECENTLY_ACTIVE_MAX_DAYS &&
      !input.isHealthyWaiting)
  ) {
    if (
      input.daysSinceMeaningful >= 7 ||
      input.overdueTasks > 0 ||
      input.delayed
    ) {
      return input.daysSinceMeaningful >= 10 || input.overdueTasks >= 2
        ? "at_risk"
        : "needs_follow_up";
    }
    return "needs_follow_up";
  }

  if (input.daysSinceMeaningful <= ACTIVITY_RECENTLY_ACTIVE_MAX_DAYS) {
    return "recently_active";
  }

  return "needs_follow_up";
}

function trendFromScore(
  score: number,
  state: TransactionActivityStateId,
): ActivityMomentumTrend {
  if (state === "at_risk" || score < 40) return "declining";
  if (state === "active_today" || score >= 70) return "improving";
  return "stable";
}

/**
 * Primary SSOT — Activity Intelligence for one active transaction.
 */
export function computeEnterpriseActivityIntelligence(
  file: LoanFile,
): EnterpriseActivityIntelligence {
  const hits = listMeaningfulActivityHits(file);
  const lastMeaningfulIso = hits[0]?.occurredAt;
  const daysSinceMeaningful = daysSince(lastMeaningfulIso);
  const now = Date.now();
  const hits7d = hits.filter(
    (h) => now - new Date(h.occurredAt).getTime() <= 7 * 86400000,
  );
  const hits30d = hits.filter(
    (h) => now - new Date(h.occurredAt).getTime() <= 30 * 86400000,
  );

  const activeToday = hasMeaningfulWorkToday(file);
  const pendingDocs = pendingDocCount(file);
  const overdueTasks = overdueTaskCount(file);
  const delayed = Boolean(file.isDelayed) || file.status === "delayed";
  const atRiskFlag = file.status === "at_risk";
  const onHold = (file.lenders ?? []).some(
    (l) => l.status === "active" && l.caseStage === "hold",
  );

  const waiting = resolveActivityWaitingDependency(file);
  const expectedTat =
    waiting.dependency === "none"
      ? 0
      : ACTIVITY_EXPECTED_TAT_DAYS[waiting.dependency];

  /**
   * Healthy Waiting = legitimate external wait, still inside expected TAT,
   * and not overdue / critically delayed. Idle alone must not punish.
   */
  const withinTat =
    waiting.dependency !== "none" &&
    expectedTat > 0 &&
    daysSinceMeaningful <= expectedTat;

  const customerNeglect =
    waiting.dependency === "customer" &&
    pendingDocs > 0 &&
    daysSinceMeaningful >= ACTIVITY_CUSTOMER_DOC_FOLLOW_UP_DAYS;

  const isHealthyWaiting =
    withinTat &&
    !customerNeglect &&
    !atRiskFlag &&
    overdueTasks === 0 &&
    !(delayed && daysSinceMeaningful > expectedTat);

  const state = resolveState({
    activeToday,
    daysSinceMeaningful: activeToday ? 0 : daysSinceMeaningful,
    isHealthyWaiting,
    overdueTasks,
    delayed,
    atRiskFlag,
    onHold,
    pendingDocs,
    customerNeglect,
  });

  const components = {
    recency: recencyScore(activeToday ? 0 : daysSinceMeaningful),
    frequency: frequencyScore(hits7d.length, hits30d.length),
    significance: significanceScore(hits7d),
    timelineAdherence: timelineAdherenceScore({
      daysSinceMeaningful: activeToday ? 0 : daysSinceMeaningful,
      isHealthyWaiting,
      expectedTat,
      overdueTasks,
      delayed,
      atRisk: state === "at_risk",
    }),
  };

  let momentumScore = Math.round(
    components.recency * ACTIVITY_MOMENTUM_WEIGHTS.recency +
      components.frequency * ACTIVITY_MOMENTUM_WEIGHTS.frequency +
      components.significance * ACTIVITY_MOMENTUM_WEIGHTS.significance +
      components.timelineAdherence * ACTIVITY_MOMENTUM_WEIGHTS.timelineAdherence,
  );

  // Healthy Waiting: protect / reward — never let pure wait collapse momentum.
  if (state === "healthy_waiting") {
    momentumScore = Math.max(momentumScore, 72);
  }
  if (state === "active_today") {
    momentumScore = Math.max(momentumScore, 82);
  }
  if (state === "at_risk") {
    momentumScore = Math.min(momentumScore, 32);
  }

  momentumScore = clamp(momentumScore);

  return {
    momentumScore,
    state,
    stateLabel: TRANSACTION_ACTIVITY_STATE_LABELS[state],
    momentumTrend: trendFromScore(momentumScore, state),
    daysSinceMeaningfulActivity: activeToday ? 0 : daysSinceMeaningful,
    meaningfulEventCount7d: hits7d.length,
    meaningfulEventCount30d: hits30d.length,
    isHealthyWaiting: state === "healthy_waiting",
    waitingDependency: waiting.dependency,
    waitingReason: waiting.reason,
    components,
  };
}

/**
 * Blend Activity Momentum into Deal Health.
 * Healthy Waiting never applies a negative adjustment.
 */
export function blendDealHealthWithActivityMomentum(
  baseHealth: number,
  intelligence: EnterpriseActivityIntelligence,
): number {
  const delta =
    ((intelligence.momentumScore - ACTIVITY_HEALTH_BLEND.neutralScore) /
      (100 - ACTIVITY_HEALTH_BLEND.neutralScore)) *
    ACTIVITY_HEALTH_BLEND.maxAdj;

  let adj = delta;
  if (intelligence.isHealthyWaiting) {
    adj = Math.max(0, adj);
  }
  return clamp(Math.round(baseHealth + adj));
}

/**
 * Attention-weight multiplier for Operational Vector (management attention).
 */
export function activityAttentionMultiplier(
  intelligence: Pick<
    EnterpriseActivityIntelligence,
    "isHealthyWaiting" | "momentumScore"
  >,
): number {
  if (intelligence.isHealthyWaiting) return ACTIVITY_ATTENTION_DAMP.healthyWaiting;
  if (intelligence.momentumScore >= ACTIVITY_ATTENTION_DAMP.highMomentumMinScore) {
    return ACTIVITY_ATTENTION_DAMP.highMomentumDamp;
  }
  if (intelligence.momentumScore <= ACTIVITY_ATTENTION_DAMP.lowMomentumMaxScore) {
    return ACTIVITY_ATTENTION_DAMP.lowMomentumBoost;
  }
  return 1;
}
