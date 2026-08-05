/**
 * CO-SPRINT-100 — CHANAKYA Radar Operational Intelligence dashboard model.
 */

import type { LoanFile, LoanLenderExecution } from "@/types/catalyst-one";
import {
  CHANAKYA_RADAR_QUADRANTS,
  type ChanakyaOperationalQuadrantId,
  type ChanakyaRadarActionTabId,
} from "@/constants/chanakya-radar";
import {
  LENDER_CASE_STAGE_LABELS,
  normalizeLenderCaseStage,
} from "@/constants/lender-pipeline";
import { opportunityNumberForFile } from "@/lib/enterprise-credit-workspace";
import { formatINR } from "@/lib/format-currency";
import {
  classifyDealHealth,
  listActiveRadarLenders,
} from "./derive-radar";
import { classifyOperationalDeal } from "./classify-operational-deal";
import {
  computeOperationalVector,
  quadrantLabel,
  type OperationalVectorResult,
} from "./operational-vector";
import { hasMeaningfulWorkToday } from "./daily-work";
import { activityAttentionMultiplier } from "@/lib/enterprise-activity-intelligence";
import type { TransactionActivityStateId } from "@/types/enterprise-activity-intelligence";

export interface ChanakyaRadarDealRow {
  /** Stable Radar identity — prefer Enterprise Deal UUID (one blip per Deal). */
  id: string;
  /** Legacy LoanFile / workspace bridge id. */
  fileId: string;
  /** Enterprise Deal Registry UUID when available (multi-Deal identity). */
  enterpriseDealId?: string;
  /** Customer / Contact id — same customer may own multiple Deal rows. */
  customerId?: string;
  /** Display Deal ref (DEAL-… preferred; OPP-… legacy fallback). */
  dealId: string;
  /** Parent Opportunity ref when known (not the Radar SSOT). */
  opportunityNumber?: string;
  borrower: string;
  product: string;
  loanAmount: number;
  loanAmountLabel: string;
  assignedRm: string;
  quadrant: ChanakyaOperationalQuadrantId;
  quadrantLabel: string;
  stageLabel: string;
  /** Current sub-stage / hold reason when available. */
  subStageLabel: string;
  lender: string;
  lastActivity: string;
  lastActivityLabel: string;
  idleDays: number;
  daysInStage: number;
  /** CO-SPRINT-108 — Daily Work ✓ (meaningful Operational Work today). Independent of Business Status. */
  workedToday: boolean;
  /**
   * CO-MC-001 — Activity Momentum Score (0–100).
   * Feeds Operational Vector trend / attention; not a separate dial UI.
   */
  activityMomentumScore: number;
  /** CO-MC-001 — Transaction Activity State. */
  activityState: TransactionActivityStateId;
  activityStateLabel: string;
  activityMomentumTrend: "improving" | "stable" | "declining";
  /** CO-MC-001 — Legitimate wait; must not reduce Radar score. */
  isHealthyWaiting: boolean;
  pendingDocs: number;
  openTasks: number;
  priority: string;
  status: string;
  /** CO-CHANAKYA-RADAR-003 — per-deal health (feeds Average Deal Health). */
  dealHealthScore: number;
  /** Why CHANAKYA placed this Deal in its operational classification. */
  classificationReason: string;
  /** Next best action from Decision Engine. */
  recommendation: string;
}

export interface ChanakyaRadarKpiCard {
  id: ChanakyaOperationalQuadrantId;
  label: string;
  count: number;
  percentage: number;
  dailyMovement: number;
  tone: string;
}

export interface ChanakyaRadarIntelligenceItem {
  id: string;
  label: string;
  value: number | string;
  hint: string;
  tone?: "default" | "warning" | "danger" | "success" | "info";
}

export interface ChanakyaRadarDashboardModel {
  rows: ChanakyaRadarDealRow[];
  vector: OperationalVectorResult;
  kpis: ChanakyaRadarKpiCard[];
  intelligence: ChanakyaRadarIntelligenceItem[];
  activeCount: number;
  hoverSummary: {
    healthScore: number;
    direction: string;
    largestConcern: string;
    dominantCategory: string;
    totalActive: number;
  };
}

function daysSince(iso?: string): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function lastActivityIso(file: LoanFile): string {
  return file.timeline?.[0]?.timestamp || file.createdAt || file.loginDate || "";
}

function formatWhen(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function pendingDocCount(file: LoanFile): number {
  return (file.documents ?? []).filter(
    (d) => d.status === "pending" || d.status === "requested" || d.status === "rejected",
  ).length;
}

function openTaskCount(file: LoanFile): number {
  return (file.tasks ?? []).filter((t) => !t.completed && t.status !== "completed").length;
}

function isActivityToday(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
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

/**
 * Map legacy Deal Health buckets → four operational quadrants.
 * Prefer classifyOperationalDeal for new paths (CO-CHANAKYA-RADAR-003).
 */
export function mapHealthToQuadrant(
  health: ReturnType<typeof classifyDealHealth>["health"],
  file: LoanFile,
): ChanakyaOperationalQuadrantId | null {
  // Multi-parameter engine is SSOT for Radar classification.
  if (health === "completed") return null;
  return classifyOperationalDeal(file).quadrant;
}

function dealWeight(file: LoanFile, quadrant: ChanakyaOperationalQuadrantId): number {
  const amount = file.requiredAmount || file.loanAmount || 0;
  const sizeFactor = Math.min(3, 1 + amount / 50_000_000);
  const idle = daysSince(lastActivityIso(file));
  const pressure =
    (pendingDocCount(file) > 0 ? 0.35 : 0) +
    (openTaskCount(file) > 0 ? 0.35 : 0) +
    (idle >= 7 ? 0.5 : idle >= 3 ? 0.25 : 0) +
    (file.priority === "urgent" || file.priority === "high" ? 0.4 : 0);

  const quadrantBoost =
    quadrant === "at_risk"
      ? 1.6
      : quadrant === "needs_attention"
        ? 1.25
        : quadrant === "follow_up_required"
          ? 1.15
          : 1;

  return Math.max(0.2, sizeFactor * quadrantBoost * (1 + pressure));
}

/**
 * CO-SPRINT-107 — Management-attention weight for Operational Vector bearing.
 * Emphasises ageing, SLA pressure, pending actions, value, and urgency;
 * dampens work completed today and On Track files.
 */
function attentionImpactWeight(
  file: LoanFile,
  quadrant: ChanakyaOperationalQuadrantId,
  daysInStage: number,
  workedToday: boolean,
  activityMultiplier = 1,
): number {
  const base = dealWeight(file, quadrant);
  const days = Math.max(daysInStage, daysSince(lastActivityIso(file)), 0);
  const slaBoost = days >= 31 ? 2.1 : days >= 16 ? 1.7 : days >= 8 ? 1.35 : days >= 4 ? 1.15 : 1;
  const actionBoost =
    1 +
    (pendingDocCount(file) > 0 ? 0.25 : 0) +
    (openTaskCount(file) > 0 ? 0.25 : 0) +
    (file.isDelayed ? 0.35 : 0);
  const quadrantPull =
    quadrant === "at_risk"
      ? 2.4
      : quadrant === "needs_attention"
        ? 1.9
        : quadrant === "follow_up_required"
          ? 1.55
          : 0.12;
  const workedDamp = workedToday ? 0.45 : 1;
  return Math.max(
    0.05,
    base * slaBoost * actionBoost * quadrantPull * workedDamp * activityMultiplier,
  );
}

function momentumOf(
  file: LoanFile,
  activityTrend?: "improving" | "stable" | "declining",
): "improving" | "stable" | "declining" {
  // CO-MC-001 — Activity Momentum Trend is SSOT when available.
  if (activityTrend) return activityTrend;
  const idle = daysSince(lastActivityIso(file));
  if (isActivityToday(lastActivityIso(file)) || idle <= 1) return "improving";
  if (idle >= 7 || file.isDelayed || file.status === "at_risk") return "declining";
  return "stable";
}

function resolveRadarDealLender(file: LoanFile): LoanLenderExecution | undefined {
  const active = listActiveRadarLenders(file);
  const dealId = file.enterpriseDealId?.trim();
  if (dealId) {
    const matched = active.find(
      (l) =>
        l.enterpriseDealId === dealId ||
        l.id === dealId ||
        (l.lenderRegistryId && file.lender && l.lender === file.lender),
    );
    if (matched) return matched;
  }
  return active.find((l) => l.isPrimary) ?? active[0];
}

function radarDealStageLabel(
  file: LoanFile,
  lead: LoanLenderExecution | undefined,
): string {
  if (lead?.caseStage) {
    const stage = normalizeLenderCaseStage(lead.caseStage);
    return LENDER_CASE_STAGE_LABELS[stage] ?? String(lead.caseStage).replace(/_/g, " ");
  }
  return String(file.stage ?? "—").replace(/_/g, " ");
}

export function mapLoanFileToRadarDealRow(file: LoanFile): ChanakyaRadarDealRow | null {
  if (!file?.id || file.archived) return null;
  if (file.stage === "won" || file.status === "completed") return null;
  const classified = classifyOperationalDeal(file);
  const quadrant = classified.quadrant;

  const last = lastActivityIso(file);
  const idle = classified.signals.idleDays;
  const amount = file.requiredAmount || file.loanAmount || 0;
  /** CO-UX-022 — One Radar card = one Enterprise Deal → that Deal’s lender only. */
  const lead = resolveRadarDealLender(file);
  const enterpriseDealId = file.enterpriseDealId?.trim() || undefined;
  const opportunityNumber =
    file.opportunityNumber?.trim() || opportunityNumberForFile(file);
  const dealDisplay =
    file.dealNumber?.trim() || opportunityNumber;

  return {
    id: enterpriseDealId || file.id,
    fileId: file.id,
    enterpriseDealId,
    customerId: file.customerId?.trim() || undefined,
    dealId: dealDisplay,
    opportunityNumber,
    borrower: file.customerName,
    product: file.loanProduct || "—",
    loanAmount: amount,
    loanAmountLabel: formatINR(amount),
    assignedRm: file.relationshipManager || "—",
    quadrant,
    quadrantLabel: quadrantLabel(quadrant),
    stageLabel: classified.signals.stageLabel || radarDealStageLabel(file, lead),
    subStageLabel: classified.signals.subStageLabel,
    lender: lead?.lender || file.lender || "—",
    lastActivity: last,
    lastActivityLabel: formatWhen(last),
    idleDays: idle,
    daysInStage: classified.signals.daysInStage,
    workedToday: hasMeaningfulWorkToday(file),
    activityMomentumScore: classified.activityIntelligence.momentumScore,
    activityState: classified.activityIntelligence.state,
    activityStateLabel: classified.activityIntelligence.stateLabel,
    activityMomentumTrend: classified.activityIntelligence.momentumTrend,
    isHealthyWaiting: classified.activityIntelligence.isHealthyWaiting,
    pendingDocs: classified.signals.pendingDocs,
    openTasks: classified.signals.openTasks,
    priority: file.priority,
    status: file.status,
    dealHealthScore: classified.dealHealthScore,
    classificationReason: classified.classificationReason,
    recommendation: classified.recommendation,
  };
}

export function buildChanakyaRadarDashboard(files: LoanFile[]): ChanakyaRadarDashboardModel {
  const rows = files
    .map(mapLoanFileToRadarDealRow)
    .filter((r): r is ChanakyaRadarDealRow => Boolean(r));

  const fileById = new Map(files.map((f) => [f.id, f]));

  const vectorInputs = rows.map((row) => {
    const file = fileById.get(row.fileId)!;
    return {
      quadrant: row.quadrant,
      weight: dealWeight(file, row.quadrant),
      attentionWeight: attentionImpactWeight(
        file,
        row.quadrant,
        row.daysInStage,
        row.workedToday,
        activityAttentionMultiplier({
          isHealthyWaiting: row.isHealthyWaiting,
          momentumScore: row.activityMomentumScore,
        }),
      ),
      momentum: momentumOf(file, row.activityMomentumTrend),
    };
  });

  const vectorBase = computeOperationalVector(vectorInputs);
  /** CO-CHANAKYA-RADAR-003 — Average Deal Health = mean of active-deal health scores only. */
  const avgDealHealth =
    rows.length > 0
      ? Math.round(
          rows.reduce((sum, row) => sum + row.dealHealthScore, 0) / rows.length,
        )
      : 100;
  const vector: OperationalVectorResult = {
    ...vectorBase,
    healthScore: Math.min(100, Math.max(0, avgDealHealth)),
  };
  const total = rows.length || 1;

  const kpis: ChanakyaRadarKpiCard[] = CHANAKYA_RADAR_QUADRANTS.map((q) => {
    const inQ = rows.filter((r) => r.quadrant === q.id);
    const movedToday = inQ.filter((r) => r.workedToday).length;
    // Net daily movement: activity today minus neglected stalled (Healthy Waiting excluded)
    const stalled = inQ.filter((r) => r.idleDays >= 5 && !r.isHealthyWaiting).length;
    const dailyMovement = movedToday - Math.min(stalled, movedToday + 2);
    return {
      id: q.id,
      label: q.label,
      count: inQ.length,
      percentage: Math.round((inQ.length / total) * 100),
      dailyMovement,
      tone: q.tone,
    };
  });

  const movedTodayCount = rows.filter((r) => r.workedToday).length;
  const avgMomentum =
    rows.length > 0
      ? Math.round(
          rows.reduce((s, r) => s + r.activityMomentumScore, 0) / rows.length,
        )
      : 100;
  const healthyWaitingCount = rows.filter((r) => r.isHealthyWaiting).length;
  const needsFollowUpCount = rows.filter(
    (r) => r.activityState === "needs_follow_up",
  ).length;
  const approvalsPending = rows.filter(
    (r) =>
      r.stageLabel.includes("soft approved") ||
      r.stageLabel.includes("credit") ||
      /soft_approved|credit_wip/.test(fileById.get(r.fileId)?.stage ?? ""),
  ).length;
  const docsPending = rows.filter((r) => r.pendingDocs > 0).length;
  // CO-MC-001 — stalled = neglect, not Healthy Waiting
  const stalled = rows.filter(
    (r) => r.idleDays >= 7 && !r.isHealthyWaiting,
  ).length;
  const highValueCutoff =
    [...rows].sort((a, b) => b.loanAmount - a.loanAmount)[Math.max(0, Math.floor(rows.length * 0.25))]
      ?.loanAmount ?? 0;
  const highValue = rows.filter((r) => r.loanAmount >= Math.max(highValueCutoff, 5_000_000)).length;
  const critical = rows.filter((r) => r.quadrant === "at_risk").length;
  const workload = rows.reduce((s, r) => s + r.openTasks, 0);
  const approvalsReceived = files.filter((f) => {
    if (!isActivityToday(lastActivityIso(f))) return false;
    return f.stage === "soft_approved" || f.stage === "final_approved" || f.stage === "won";
  }).length;

  const intelligence: ChanakyaRadarIntelligenceItem[] = [
    {
      id: "activity_momentum",
      label: "Activity Momentum",
      value: avgMomentum,
      hint: `Healthy Waiting ${healthyWaitingCount} · Needs Follow-up ${needsFollowUpCount}`,
      tone:
        avgMomentum >= 70 ? "success" : avgMomentum >= 45 ? "warning" : "danger",
    },
    {
      id: "moved",
      label: "Files moved today",
      value: movedTodayCount,
      hint: "Meaningful operational activity today",
      tone: "success",
    },
    {
      id: "approvals_in",
      label: "Approvals received",
      value: approvalsReceived,
      hint: "Stage advanced to approval today",
      tone: "success",
    },
    {
      id: "approvals_out",
      label: "Approvals pending",
      value: approvalsPending,
      hint: "Awaiting credit / soft approval path",
      tone: "warning",
    },
    {
      id: "docs",
      label: "Documents pending",
      value: docsPending,
      hint: "Files with outstanding documentation",
      tone: "warning",
    },
    {
      id: "stalled",
      label: "Files stalled",
      value: stalled,
      hint: "No meaningful activity ≥ 7 days",
      tone: "danger",
    },
    {
      id: "high_value",
      label: "High value opportunities",
      value: highValue,
      hint: "Top-quartile / ₹50L+ book",
      tone: "info",
    },
    {
      id: "critical",
      label: "Critical escalations",
      value: critical,
      hint: "At-risk operational quadrant",
      tone: "danger",
    },
    {
      id: "workload",
      label: "Today's workload",
      value: workload,
      hint: "Open tasks across scoped portfolio",
      tone: "default",
    },
  ];

  return {
    rows,
    vector,
    kpis,
    intelligence,
    activeCount: rows.length,
    hoverSummary: {
      healthScore: vector.healthScore,
      direction: vector.direction,
      largestConcern: quadrantLabel(vector.largestConcern),
      dominantCategory: quadrantLabel(vector.dominantQuadrant),
      totalActive: rows.length,
    },
  };
}

export function filterRowsByQuadrant(
  rows: ChanakyaRadarDealRow[],
  quadrant: ChanakyaOperationalQuadrantId | null,
): ChanakyaRadarDealRow[] {
  if (!quadrant) return rows;
  return rows.filter((r) => r.quadrant === quadrant);
}

export function filterRowsByActionTab(
  rows: ChanakyaRadarDealRow[],
  tab: ChanakyaRadarActionTabId,
  files: LoanFile[],
): ChanakyaRadarDealRow[] {
  const fileById = new Map(files.map((f) => [f.id, f]));
  const amounts = [...rows].map((r) => r.loanAmount).sort((a, b) => b - a);
  const hvCut = amounts[Math.max(0, Math.floor(amounts.length * 0.25))] ?? 5_000_000;

  switch (tab) {
    case "at_risk":
      return rows.filter((r) => r.quadrant === "at_risk");
    case "high_value":
      return rows
        .filter((r) => r.loanAmount >= Math.max(hvCut, 5_000_000))
        .sort((a, b) => b.loanAmount - a.loanAmount);
    case "follow_up_today":
      return rows.filter((r) => {
        const f = fileById.get(r.fileId);
        return Boolean(f && (taskDueToday(f) || r.idleDays <= 1 || r.quadrant === "follow_up_required"));
      });
    case "stalled":
      return rows.filter((r) => r.idleDays >= 7).sort((a, b) => b.idleDays - a.idleDays);
    case "approval_pending":
      return rows.filter((r) => {
        const stage = fileById.get(r.fileId)?.stage;
        return stage === "soft_approved" || stage === "credit_wip" || stage === "logged_in";
      });
    case "document_pending":
      return rows.filter((r) => r.pendingDocs > 0).sort((a, b) => b.pendingDocs - a.pendingDocs);
    default:
      return rows;
  }
}
