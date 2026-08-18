/**
 * Historical missing PDC schedule repair (read + optional write).
 * Creates pending EnterprisePostDisbursementSchedule rows only.
 * Never updates EnterpriseDeal (updatedAt / disbursedAt / stageEnteredAt stay put).
 * Never transitions stage — existing PDC cron remains the only hand-off.
 */
import { prisma } from "@server/lib/prisma";
import { ensurePendingPostDisbursementSchedule } from "@server/repositories/enterprise-deal/enterprise-deal.repository";
import {
  computePostDisbursementDueAt,
  pickEarliestDisbursedTimelineOccurredAt,
  resolveHistoricalDisbursedTransitionAt,
  type HistoricalDisbursedClockSource,
} from "@/lib/post-disbursement-confirmation/historical-disbursed-clock";

export type HistoricalPdcScheduleCandidate = {
  dealId: string;
  dealNumber: string;
  organizationId: string;
  archived: boolean;
  originalDisbursedTransitionAt: string;
  source: HistoricalDisbursedClockSource;
  dueAt: string;
  dueAtAlreadyElapsed: boolean;
  action: "would_create" | "created";
};

export type HistoricalPdcScheduleSkip = {
  dealId: string;
  dealNumber: string;
  reason: "already_has_schedule" | "unresolved_disbursed_clock";
  existingDueAt?: string | null;
  existingStatus?: string | null;
};

export type HistoricalPdcScheduleRepairPlan = {
  dryRun: boolean;
  scannedDisbursedDeals: number;
  excludedDeleted: true;
  existingSchedulesExcluded: number;
  unresolvedClock: number;
  candidates: HistoricalPdcScheduleCandidate[];
  skippedExisting: HistoricalPdcScheduleSkip[];
  skippedUnresolved: HistoricalPdcScheduleSkip[];
};

function iso(value: Date): string {
  return value.toISOString();
}

async function loadDisbursedTimelineOccurredAt(
  organizationId: string,
  dealId: string,
): Promise<Date | null> {
  const events = await prisma.enterpriseDealTimelineEvent.findMany({
    where: { organizationId, dealId, eventType: "stage_transition" },
    select: { eventType: true, occurredAt: true, payload: true, summary: true },
  });
  return pickEarliestDisbursedTimelineOccurredAt(events);
}

export async function planHistoricalPdcScheduleRepair(): Promise<HistoricalPdcScheduleRepairPlan> {
  const disbursed = await prisma.enterpriseDeal.findMany({
    where: {
      grossStage: "disbursed",
      isDeleted: false,
    },
    select: {
      id: true,
      dealNumber: true,
      organizationId: true,
      archived: true,
      grossStage: true,
      disbursedAt: true,
      stageEnteredAt: true,
    },
    orderBy: { dealNumber: "asc" },
  });

  const schedules = await prisma.enterprisePostDisbursementSchedule.findMany({
    where: { dealId: { in: disbursed.map((row) => row.id) } },
    select: { dealId: true, dueAt: true, status: true },
  });
  const scheduleByDeal = new Map(schedules.map((row) => [row.dealId, row]));

  const skippedExisting: HistoricalPdcScheduleSkip[] = [];
  const skippedUnresolved: HistoricalPdcScheduleSkip[] = [];
  const candidates: HistoricalPdcScheduleCandidate[] = [];

  for (const deal of disbursed) {
    const existing = scheduleByDeal.get(deal.id);
    if (existing) {
      skippedExisting.push({
        dealId: deal.id,
        dealNumber: deal.dealNumber,
        reason: "already_has_schedule",
        existingDueAt: iso(existing.dueAt),
        existingStatus: existing.status,
      });
      continue;
    }

    const needsTimeline = !deal.disbursedAt && !deal.stageEnteredAt;
    const timelineAt = needsTimeline
      ? await loadDisbursedTimelineOccurredAt(deal.organizationId, deal.id)
      : null;

    const clock = resolveHistoricalDisbursedTransitionAt({
      grossStage: deal.grossStage,
      disbursedAt: deal.disbursedAt,
      stageEnteredAt: deal.stageEnteredAt,
      disbursedTimelineOccurredAt: timelineAt,
    });

    if (!clock) {
      skippedUnresolved.push({
        dealId: deal.id,
        dealNumber: deal.dealNumber,
        reason: "unresolved_disbursed_clock",
      });
      continue;
    }

    const dueAt = computePostDisbursementDueAt(clock.at);
    candidates.push({
      dealId: deal.id,
      dealNumber: deal.dealNumber,
      organizationId: deal.organizationId,
      archived: deal.archived,
      originalDisbursedTransitionAt: iso(clock.at),
      source: clock.source,
      dueAt: iso(dueAt),
      dueAtAlreadyElapsed: dueAt.getTime() <= Date.now(),
      action: "would_create",
    });
  }

  return {
    dryRun: true,
    scannedDisbursedDeals: disbursed.length,
    excludedDeleted: true,
    existingSchedulesExcluded: skippedExisting.length,
    unresolvedClock: skippedUnresolved.length,
    candidates,
    skippedExisting,
    skippedUnresolved,
  };
}

export async function applyHistoricalPdcScheduleRepair(
  plan: HistoricalPdcScheduleRepairPlan,
): Promise<HistoricalPdcScheduleRepairPlan> {
  const created: HistoricalPdcScheduleCandidate[] = [];
  for (const candidate of plan.candidates) {
    await ensurePendingPostDisbursementSchedule(prisma, {
      organizationId: candidate.organizationId,
      dealId: candidate.dealId,
      dueAt: new Date(candidate.dueAt),
    });
    created.push({ ...candidate, action: "created" });
  }
  return {
    ...plan,
    dryRun: false,
    candidates: created,
  };
}
