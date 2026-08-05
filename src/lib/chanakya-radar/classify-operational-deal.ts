/**
 * CO-CHANAKYA-RADAR-003 — Multi-parameter operational classification.
 * CHANAKYA Decision Engine — not a single Health Score gate.
 * Thresholds: CHANAKYA_RADAR_CLASSIFICATION_THRESHOLDS (configurable SSOT).
 *
 * CO-MC-001 — Activity Intelligence: Healthy Waiting must not reduce Radar score;
 * Activity Momentum Score blends into Deal Health.
 */

import type { LoanFile, LoanLenderExecution } from "@/types/catalyst-one";
import {
  CHANAKYA_RADAR_CLASSIFICATION_THRESHOLDS as T,
  CHANAKYA_RADAR_EXCLUDED_LENDER_STAGES,
  CHANAKYA_RADAR_EXCLUDED_PROBABILITIES,
  type ChanakyaOperationalQuadrantId,
} from "@/constants/chanakya-radar";
import { LENDER_CASE_STAGE_LABELS, normalizeLenderCaseStage } from "@/constants/lender-pipeline";
import {
  blendDealHealthWithActivityMomentum,
  computeEnterpriseActivityIntelligence,
} from "@/lib/enterprise-activity-intelligence";
import type { EnterpriseActivityIntelligence } from "@/types/enterprise-activity-intelligence";

export type DealOperationalSignals = {
  daysInStage: number;
  idleDays: number;
  pendingDocs: number;
  openTasks: number;
  overdueTasks: number;
  taskDueToday: boolean;
  documentCompleteness: number;
  terminalLenders: number;
  activeLenders: number;
  onHold: boolean;
  delayed: boolean;
  atRiskFlag: boolean;
  stageLabel: string;
  subStageLabel: string;
  /** CO-MC-001 — Activity Momentum Score (0–100). */
  activityMomentumScore: number;
  /** CO-MC-001 — Transaction activity state. */
  activityState: EnterpriseActivityIntelligence["state"];
  /** CO-MC-001 — Legitimate wait; idle must not punish classification. */
  isHealthyWaiting: boolean;
};

export type DealOperationalClassification = {
  quadrant: ChanakyaOperationalQuadrantId;
  dealHealthScore: number;
  classificationReason: string;
  recommendation: string;
  signals: DealOperationalSignals;
  /** CO-MC-001 — full Activity Intelligence payload. */
  activityIntelligence: EnterpriseActivityIntelligence;
};

function daysSince(iso?: string): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function lastActivityIso(file: LoanFile): string {
  return file.timeline?.[0]?.timestamp || file.createdAt || file.loginDate || "";
}

function activeLenders(file: LoanFile): LoanLenderExecution[] {
  return (file.lenders ?? []).filter((l) => {
    if (l.status !== "active") return false;
    if (l.caseStage && CHANAKYA_RADAR_EXCLUDED_LENDER_STAGES.has(l.caseStage)) return false;
    if (l.probability && CHANAKYA_RADAR_EXCLUDED_PROBABILITIES.has(l.probability)) return false;
    return true;
  });
}

function countTerminalLenders(file: LoanFile): number {
  return (file.lenders ?? []).filter((l) => {
    if (l.status === "closed") return true;
    if (l.caseStage === "lost" || l.caseStage === "disbursed") return true;
    if (l.probability === "rejected" || l.probability === "withdrawn") return true;
    return false;
  }).length;
}

function pendingDocCount(file: LoanFile): number {
  return (file.documents ?? []).filter(
    (d) => d.status === "pending" || d.status === "requested" || d.status === "rejected",
  ).length;
}

function documentCompleteness(file: LoanFile): number {
  const docs = file.documents ?? [];
  if (docs.length === 0) return 1;
  const done = docs.filter((d) => d.status === "verified" || d.status === "received").length;
  return done / docs.length;
}

function openTasks(file: LoanFile): number {
  return (file.tasks ?? []).filter((t) => !t.completed && t.status !== "completed").length;
}

function overdueTasks(file: LoanFile): number {
  const now = Date.now();
  return (file.tasks ?? []).filter((t) => {
    if (t.completed || t.status === "completed") return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate).getTime() < now;
  }).length;
}

function taskDueToday(file: LoanFile): boolean {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const day = today.getDate();
  return (file.tasks ?? []).some((t) => {
    if (t.completed || t.status === "completed") return false;
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d.getFullYear() === y && d.getMonth() === m && d.getDate() === day;
  });
}

function onHold(file: LoanFile): boolean {
  return (file.lenders ?? []).some((l) => l.status === "active" && l.caseStage === "hold");
}

function leadLender(file: LoanFile): LoanLenderExecution | undefined {
  const active = activeLenders(file);
  return active.find((l) => l.isPrimary) ?? active[0];
}

function stageLabels(file: LoanFile): { stageLabel: string; subStageLabel: string } {
  const lead = leadLender(file);
  if (lead?.caseStage) {
    const stage = normalizeLenderCaseStage(lead.caseStage);
    return {
      stageLabel: LENDER_CASE_STAGE_LABELS[stage] ?? String(lead.caseStage).replace(/_/g, " "),
      subStageLabel: lead.caseSubStage?.trim() || lead.holdReason?.trim() || "—",
    };
  }
  return {
    stageLabel: String(file.stage ?? "—").replace(/_/g, " "),
    subStageLabel: "—",
  };
}

export function collectDealOperationalSignals(
  file: LoanFile,
  activityOverride?: EnterpriseActivityIntelligence,
): DealOperationalSignals {
  const activity =
    activityOverride ?? computeEnterpriseActivityIntelligence(file);
  const idleDays = daysSince(lastActivityIso(file));
  const daysInStage = file.daysInStage ?? idleDays;
  const labels = stageLabels(file);
  return {
    daysInStage,
    idleDays,
    pendingDocs: pendingDocCount(file),
    openTasks: openTasks(file),
    overdueTasks: overdueTasks(file),
    taskDueToday: taskDueToday(file),
    documentCompleteness: documentCompleteness(file),
    terminalLenders: countTerminalLenders(file),
    activeLenders: activeLenders(file).length,
    onHold: onHold(file),
    delayed: Boolean(file.isDelayed) || file.status === "delayed",
    atRiskFlag: file.status === "at_risk",
    stageLabel: labels.stageLabel,
    subStageLabel: labels.subStageLabel,
    activityMomentumScore: activity.momentumScore,
    activityState: activity.state,
    isHealthyWaiting: activity.isHealthyWaiting,
  };
}

function withActivity(
  base: Omit<
    DealOperationalClassification,
    "activityIntelligence" | "dealHealthScore"
  > & { dealHealthScore: number },
  activity: EnterpriseActivityIntelligence,
): DealOperationalClassification {
  return {
    ...base,
    dealHealthScore: blendDealHealthWithActivityMomentum(
      base.dealHealthScore,
      activity,
    ),
    activityIntelligence: activity,
  };
}

/**
 * Multi-parameter Decision Engine → Operational Classification + reason.
 * CO-MC-001: idle days alone do not downgrade Healthy Waiting deals.
 */
export function classifyOperationalDeal(file: LoanFile): DealOperationalClassification {
  const activity = computeEnterpriseActivityIntelligence(file);
  const s = collectDealOperationalSignals(file, activity);
  const scores = T.healthScoreByQuadrant;
  /** Idle used for classification — zeroed when Healthy Waiting (must not reduce score). */
  const idleForClass = s.isHealthyWaiting ? 0 : s.idleDays;

  // 🔴 At Risk — real breach / blockers (Healthy Waiting never lands here via idle alone)
  if (
    s.atRiskFlag ||
    s.onHold ||
    s.terminalLenders >= T.atRisk.minTerminalLenders ||
    s.overdueTasks >= T.atRisk.minOverdueTasks ||
    s.daysInStage >= T.atRisk.criticalAgeingDays ||
    (s.delayed && idleForClass >= T.atRisk.minIdleDays) ||
    (s.documentCompleteness < T.atRisk.maxDocumentCompleteness &&
      s.pendingDocs > 0 &&
      idleForClass >= T.atRisk.minIdleDays) ||
    activity.state === "at_risk"
  ) {
    const reasons: string[] = [];
    if (s.onHold) reasons.push("Lender hold is blocking progression");
    if (s.terminalLenders >= T.atRisk.minTerminalLenders)
      reasons.push(`${s.terminalLenders} lender paths ended poorly`);
    if (s.daysInStage >= T.atRisk.criticalAgeingDays)
      reasons.push(`Critical ageing — ${s.daysInStage} days in current stage`);
    if (s.overdueTasks >= T.atRisk.minOverdueTasks)
      reasons.push(`${s.overdueTasks} overdue task(s)`);
    if (s.atRiskFlag) reasons.push("Operational status flagged At Risk");
    if (s.delayed) reasons.push("Timeline deviation detected");
    if (activity.state === "at_risk" && reasons.length === 0) {
      reasons.push("Activity Intelligence: critically delayed operational freshness");
    }
    if (reasons.length === 0) reasons.push("Multiple operational pressure signals");

    return withActivity(
      {
        quadrant: "at_risk",
        dealHealthScore: scores.at_risk,
        classificationReason: reasons[0]!,
        recommendation:
          "Escalate executive follow-up today — clear the blocker or open an alternate lender path.",
        signals: s,
      },
      activity,
    );
  }

  // Healthy Waiting → On Track (must not reduce Radar score)
  if (s.isHealthyWaiting) {
    return withActivity(
      {
        quadrant: "on_track",
        dealHealthScore: scores.on_track,
        classificationReason:
          activity.waitingReason ||
          "Healthy Waiting — within expected SLA / external dependency window",
        recommendation:
          "No chase required yet — monitor TAT and resume cadence when the dependency clears.",
        signals: s,
      },
      activity,
    );
  }

  // 🟡 Needs Attention
  if (
    s.delayed ||
    idleForClass >= T.needsAttention.minIdleDays ||
    s.daysInStage >= T.needsAttention.elevatedAgeingDays ||
    s.pendingDocs >= T.needsAttention.minPendingDocs ||
    s.openTasks >= T.needsAttention.minOpenTasks ||
    s.activeLenders === 0 ||
    (activity.state === "needs_follow_up" &&
      idleForClass >= T.needsAttention.minIdleDays)
  ) {
    const reasons: string[] = [];
    if (s.daysInStage >= T.needsAttention.elevatedAgeingDays)
      reasons.push(`Elevated stage ageing — ${s.daysInStage} days`);
    if (idleForClass >= T.needsAttention.minIdleDays)
      reasons.push(`Sparse activity for ${idleForClass} days`);
    if (s.pendingDocs >= T.needsAttention.minPendingDocs)
      reasons.push(`${s.pendingDocs} document(s) pending`);
    if (s.openTasks >= T.needsAttention.minOpenTasks)
      reasons.push(`${s.openTasks} open task(s)`);
    if (s.activeLenders === 0) reasons.push("No active lender negotiation");
    if (s.delayed) reasons.push("Process timeline slipping");
    if (activity.state === "needs_follow_up")
      reasons.push("Activity Intelligence: operational follow-up overdue");

    return withActivity(
      {
        quadrant: "needs_attention",
        dealHealthScore: scores.needs_attention,
        classificationReason: reasons[0]!,
        recommendation:
          "Re-establish execution cadence — clear documents/tasks and advance the current stage.",
        signals: s,
      },
      activity,
    );
  }

  // 🔵 Follow-up Required
  if (
    (T.followUpRequired.taskDueToday && s.taskDueToday) ||
    s.openTasks >= T.followUpRequired.minOpenTasks ||
    s.pendingDocs >= T.followUpRequired.minPendingDocs ||
    idleForClass >= T.followUpRequired.customerIdleDays ||
    activity.state === "needs_follow_up"
  ) {
    const reasons: string[] = [];
    if (s.taskDueToday) reasons.push("Task due today requires follow-up");
    if (s.openTasks >= T.followUpRequired.minOpenTasks)
      reasons.push(`${s.openTasks} open follow-up task(s)`);
    if (s.pendingDocs >= T.followUpRequired.minPendingDocs)
      reasons.push("Document collection follow-up outstanding");
    if (idleForClass >= T.followUpRequired.customerIdleDays)
      reasons.push("Customer / lender responsiveness gap");
    if (activity.state === "needs_follow_up")
      reasons.push("No meaningful activity where follow-up was expected");

    return withActivity(
      {
        quadrant: "follow_up_required",
        dealHealthScore: scores.follow_up_required,
        classificationReason: reasons[0]!,
        recommendation:
          "Complete today’s follow-ups — customer, lender, or document chase — before the deal ages further.",
        signals: s,
      },
      activity,
    );
  }

  // 🟢 On Track
  return withActivity(
    {
      quadrant: "on_track",
      dealHealthScore: scores.on_track,
      classificationReason:
        activity.state === "active_today"
          ? "Meaningful operational activity recorded today"
          : "Stage progression healthy with no critical operational blockers",
      recommendation:
        "Maintain cadence — monitor SLA and complete next planned action on schedule.",
      signals: s,
    },
    activity,
  );
}
