/**
 * CO-CHANAKYA-003B — Sync Radar / ETE / SDE attention evidence (no server-only gate).
 * Consumes existing Radar row fields and local SSOT stores only — no new formulas.
 */

import type { ChanakyaOperationalQuadrantId } from "@/constants/chanakya-radar";
import type { ChanakyaRadarDealRow } from "@/lib/chanakya-radar/derive-dashboard";
import { listTasksForEntity, columnForTask } from "@/lib/enterprise-task-engine";
import { listSdeExceptions } from "@/lib/system-driven-enterprise";
import type {
  ChanakyaAttentionDomain,
  ChanakyaAttentionEvidenceRow,
  ChanakyaAttentionReasonEvidence,
  ChanakyaFieldAvailability,
} from "@/types/chanakya-enterprise-read-context";
import { CHANAKYA_FIELD_AVAILABILITY } from "@/types/chanakya-enterprise-read-context";

type RadarRow = ChanakyaRadarDealRow;

const QUADRANT_SEVERITY_ORDER: Record<ChanakyaOperationalQuadrantId, number> = {
  at_risk: 0,
  needs_attention: 1,
  follow_up_required: 2,
  on_track: 3,
};

export function pushAttentionReason(
  reasons: ChanakyaAttentionReasonEvidence[],
  breakdown: Partial<Record<ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>>,
  reason: ChanakyaAttentionReasonEvidence,
) {
  reasons.push(reason);
  const bucket = breakdown[reason.domain] ?? [];
  bucket.push(reason);
  breakdown[reason.domain] = bucket;
}

export function earliestAttentionTimestamp(
  reasons: ChanakyaAttentionReasonEvidence[],
  fallback: string | null,
): string | null {
  const stamps = reasons
    .map((r) => r.observedAt)
    .filter((t): t is string => Boolean(t))
    .sort();
  return stamps[0] ?? fallback;
}

export function inferRecommendedNextArea(
  breakdown: Partial<Record<ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>>,
  radarRecommendation: string | null,
): string | null {
  if (radarRecommendation?.trim()) return radarRecommendation.trim();
  const priority: ChanakyaAttentionDomain[] = [
    "sla_exception",
    "post_disbursement",
    "accounting",
    "documents",
    "tasks",
    "lender_stage",
    "activity",
    "credit_readiness",
  ];
  for (const domain of priority) {
    if ((breakdown[domain]?.length ?? 0) > 0) {
      return domain;
    }
  }
  return null;
}

export function collectAttentionSources(reasons: ChanakyaAttentionReasonEvidence[]): string[] {
  return [...new Set(reasons.map((r) => r.source))].sort();
}

function appendRadarActivityReasons(
  row: RadarRow,
  reasons: ChanakyaAttentionReasonEvidence[],
  breakdown: Partial<Record<ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>>,
) {
  if (row.idleDays >= 5 && !row.isHealthyWaiting) {
    pushAttentionReason(reasons, breakdown, {
      domain: "activity",
      statement: `No meaningful activity for ${row.idleDays} day(s) (last activity: ${row.lastActivityLabel || row.lastActivity || "recorded on Radar"}).`,
      source: "chanakya_radar + enterprise_activity_intelligence",
      entityId: row.enterpriseDealId || row.id,
      observedAt: row.lastActivity || null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  } else if (
    row.activityState === "needs_follow_up" ||
    row.activityState === "at_risk" ||
    row.activityMomentumTrend === "declining"
  ) {
    pushAttentionReason(reasons, breakdown, {
      domain: "activity",
      statement: `Activity state: ${row.activityStateLabel} (${row.activityMomentumTrend} momentum).`,
      source: "enterprise_activity_intelligence",
      entityId: row.enterpriseDealId || row.id,
      observedAt: row.lastActivity || null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }
}

function appendRadarDocumentReasons(
  row: RadarRow,
  reasons: ChanakyaAttentionReasonEvidence[],
  breakdown: Partial<Record<ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>>,
) {
  if (row.pendingDocs > 0) {
    pushAttentionReason(reasons, breakdown, {
      domain: "documents",
      statement: `${row.pendingDocs} document requirement(s) remain outstanding on Radar.`,
      source: "chanakya_radar",
      entityId: row.enterpriseDealId || row.id,
      observedAt: row.lastActivity || null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }
}

function appendRadarTaskReasons(
  row: RadarRow,
  reasons: ChanakyaAttentionReasonEvidence[],
  breakdown: Partial<Record<ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>>,
) {
  if (row.openTasks > 0) {
    pushAttentionReason(reasons, breakdown, {
      domain: "tasks",
      statement: `${row.openTasks} open task(s) on Radar row.`,
      source: "chanakya_radar + enterprise_task_engine",
      entityId: row.enterpriseDealId || row.id,
      observedAt: null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }
}

function appendRadarLenderStageReasons(
  row: RadarRow,
  reasons: ChanakyaAttentionReasonEvidence[],
  breakdown: Partial<Record<ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>>,
) {
  if (row.daysInStage >= 7 && row.stageLabel) {
    pushAttentionReason(reasons, breakdown, {
      domain: "lender_stage",
      statement: `Current lender stage "${row.stageLabel}" has remained unchanged for ${row.daysInStage} day(s).`,
      source: "chanakya_radar",
      entityId: row.enterpriseDealId || row.id,
      observedAt: row.lastActivity || null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  } else if (
    /login|credit|pending|await/i.test(row.stageLabel) ||
    row.quadrant === "follow_up_required" ||
    row.quadrant === "needs_attention"
  ) {
    pushAttentionReason(reasons, breakdown, {
      domain: "lender_stage",
      statement: `Lender pipeline stage "${row.stageLabel}" indicates follow-up / lender action.`,
      source: "chanakya_radar",
      entityId: row.enterpriseDealId || row.id,
      observedAt: row.lastActivity || null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }
}

function appendRadarClassificationReason(
  row: RadarRow,
  reasons: ChanakyaAttentionReasonEvidence[],
  breakdown: Partial<Record<ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>>,
) {
  if (row.classificationReason?.trim()) {
    pushAttentionReason(reasons, breakdown, {
      domain: "credit_readiness",
      statement: row.classificationReason.trim(),
      source: "chanakya_radar_classification",
      entityId: row.enterpriseDealId || row.id,
      observedAt: row.lastActivity || null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }
  if (row.quadrant === "at_risk") {
    pushAttentionReason(reasons, breakdown, {
      domain: "credit_readiness",
      statement: `Radar operational classification: ${row.quadrantLabel || "At Risk"}.`,
      source: "chanakya_radar",
      entityId: row.enterpriseDealId || row.id,
      observedAt: row.lastActivity || null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }
}

function appendEteTaskReasons(
  row: RadarRow,
  reasons: ChanakyaAttentionReasonEvidence[],
  breakdown: Partial<Record<ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>>,
) {
  const dealId = row.enterpriseDealId || row.id;
  const tasks = listTasksForEntity({
    dealId,
    opportunityRef: row.opportunityNumber,
  }).filter((t) => t.status === "open");

  const overdue = tasks.filter((t) => columnForTask(t) === "past_due");
  if (overdue.length > 0) {
    pushAttentionReason(reasons, breakdown, {
      domain: "tasks",
      statement: `${overdue.length} overdue task(s) in Enterprise Task Engine.`,
      source: "enterprise_task_engine",
      entityId: overdue[0]?.id ?? null,
      observedAt: overdue[0]?.dueOn ?? null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }

  const dueToday = tasks.filter((t) => columnForTask(t) === "due_today");
  if (dueToday.length > 0 && overdue.length === 0) {
    pushAttentionReason(reasons, breakdown, {
      domain: "tasks",
      statement: `${dueToday.length} task(s) due today in Enterprise Task Engine.`,
      source: "enterprise_task_engine",
      entityId: dueToday[0]?.id ?? null,
      observedAt: dueToday[0]?.dueOn ?? null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }
}

function appendSdeReasons(
  row: RadarRow,
  reasons: ChanakyaAttentionReasonEvidence[],
  breakdown: Partial<Record<ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>>,
) {
  const transactionIds = [row.fileId, row.enterpriseDealId, row.id, row.dealId].filter(
    Boolean,
  ) as string[];

  const exceptions = listSdeExceptions({ openOnly: true }).filter(
    (ex) => ex.transactionId && transactionIds.includes(ex.transactionId),
  );

  for (const ex of exceptions.slice(0, 5)) {
    pushAttentionReason(reasons, breakdown, {
      domain: "sla_exception",
      statement: `${ex.title}${ex.reason ? `: ${ex.reason}` : ""}.`,
      source: "system_driven_enterprise",
      entityId: ex.id,
      observedAt: ex.recordedAt,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }
}

export function buildAttentionReasonsFromRadarRow(row: RadarRow): {
  reasons: ChanakyaAttentionReasonEvidence[];
  domainBreakdown: Partial<Record<ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>>;
} {
  const reasons: ChanakyaAttentionReasonEvidence[] = [];
  const domainBreakdown: Partial<
    Record<ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>
  > = {};

  appendRadarActivityReasons(row, reasons, domainBreakdown);
  appendRadarDocumentReasons(row, reasons, domainBreakdown);
  appendRadarTaskReasons(row, reasons, domainBreakdown);
  appendEteTaskReasons(row, reasons, domainBreakdown);
  appendRadarLenderStageReasons(row, reasons, domainBreakdown);
  appendRadarClassificationReason(row, reasons, domainBreakdown);
  appendSdeReasons(row, reasons, domainBreakdown);

  return { reasons, domainBreakdown };
}

export function mapRadarRowToAttentionEvidence(row: RadarRow): ChanakyaAttentionEvidenceRow {
  const { reasons, domainBreakdown } = buildAttentionReasonsFromRadarRow(row);
  const why = reasons.map((r) => r.statement);
  const dealId = row.enterpriseDealId || row.id;

  return {
    entityKind: "deal",
    entityId: dealId,
    opportunityId: null,
    dealId,
    entityLabel: row.borrower || null,
    opportunityNumber: row.opportunityNumber ?? null,
    dealNumber: row.dealId || null,
    stageLabel: row.stageLabel || null,
    lender: row.lender || null,
    idleDays: row.idleDays,
    pendingDocs: row.pendingDocs,
    quadrant: row.quadrant || null,
    severity: row.priority || row.quadrantLabel || row.quadrant || null,
    classification: row.quadrantLabel || row.quadrant || null,
    classificationReason: row.classificationReason || null,
    ownerLabel: row.assignedRm || null,
    primaryOwnerUserId: row.primaryOwnerUserId || null,
    relationshipManagerUserId: row.relationshipManagerUserId || null,
    assignedUserIds: row.assignedUserIds ?? null,
    daysInStage: row.daysInStage ?? row.idleDays ?? null,
    attentionSince: earliestAttentionTimestamp(reasons, row.lastActivity || null),
    recommendedNextArea: inferRecommendedNextArea(domainBreakdown, row.recommendation || null),
    why,
    sources: collectAttentionSources(reasons),
    reasons,
    domainBreakdown,
    provenance: "chanakya_radar + enterprise_business_intelligence + joined_evidence",
  };
}

export function sortAttentionRows<T extends ChanakyaAttentionEvidenceRow>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const qa = (a.quadrant as ChanakyaOperationalQuadrantId) || "on_track";
    const qb = (b.quadrant as ChanakyaOperationalQuadrantId) || "on_track";
    const sa = QUADRANT_SEVERITY_ORDER[qa] ?? 99;
    const sb = QUADRANT_SEVERITY_ORDER[qb] ?? 99;
    if (sa !== sb) return sa - sb;
    return (b.idleDays ?? 0) - (a.idleDays ?? 0);
  });
}

export function attentionExplanationStatus(
  payload: Record<string, unknown>,
): ChanakyaFieldAvailability {
  if (payload.attention === CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE) {
    return CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE;
  }
  if (Array.isArray(payload.why) && payload.why.length > 0) {
    return CHANAKYA_FIELD_AVAILABILITY.AVAILABLE;
  }
  return CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE;
}

export function radarRowMatchesDeal(
  row: RadarRow,
  dealRef: string,
  dealId?: string | null,
): boolean {
  const ref = dealRef.trim().toUpperCase();
  if (dealId && (row.enterpriseDealId === dealId || row.id === dealId)) return true;
  return (
    row.dealId.toUpperCase() === ref ||
    row.enterpriseDealId?.toUpperCase() === ref ||
    row.id.toUpperCase() === ref
  );
}

export function radarRowMatchesOpportunity(row: RadarRow, opportunityRef: string): boolean {
  const ref = opportunityRef.trim().toUpperCase();
  return (row.opportunityNumber || "").toUpperCase() === ref;
}
