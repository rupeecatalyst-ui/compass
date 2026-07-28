/**
 * CO-PERF-001 — Enterprise Metrics Engine (server).
 * Computation layer only — entities remain SSOT. Delegates to existing derive engines.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  EME_DASHBOARD_METRIC_KEY,
  EME_KPI_STRIP_METRIC_KEY,
  EME_MISSION_CONTROL_RADAR_KEY,
  EME_MISSION_CONTROL_SCHEDULE_KEY,
  EME_MISSION_CONTROL_SNAPSHOT_KEY,
  EME_PERIOD_LATEST,
  EME_PERIOD_TODAY,
  EME_SCHEDULE_NOTE,
} from "@/constants/enterprise-metrics-engine";
import {
  defaultMissionControlScheduleConfig,
  resolveMissionControlInterval,
  type MissionControlScheduleConfig,
} from "@/constants/mission-control-snapshot";
import {
  defaultChanakyaNightModeSchedule,
  EME_CHANAKYA_NIGHT_SCHEDULE_KEY,
  type ChanakyaNightModeScheduleConfig,
} from "@/constants/chanakya-operating-model";
import { composeMissionControlExecutiveSnapshot } from "@server/services/enterprise-metrics-engine/compose-mission-control-snapshot";
import { FRESH_LOGIN_DEAL_STAGES } from "@/constants/opportunity-business-source";
import { deriveDashboardVisualAnalytics } from "@/lib/user-home-dashboard/visual-analytics/derive-dashboard-visual-analytics";
import { serializeOpportunity } from "@server/services/enterprise-opportunity/opportunity-serialize";
import { serializeDeal } from "@server/services/enterprise-deal/deal-serialize";
import type {
  EmeAdminStatus,
  EmeComputeOptions,
  EmeEventKey,
  EmeLiveMetrics,
  EmeMetricKey,
  EmeRunSummary,
  EmeRunType,
} from "@/types/enterprise-metrics-engine";
import { EME_EVENT_METRIC_MAP } from "@/types/enterprise-metrics-engine";

const DISBURSED_STAGES = [
  "disbursed",
  "disbursement",
  "partially_disbursed",
  "fully_disbursed",
  "won",
];

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function nextNightlyUtc(from = new Date()): string {
  const next = new Date(from);
  next.setUTCHours(20, 0, 0, 0);
  if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function serializeRun(row: {
  id: string;
  runType: string;
  category: string;
  status: string;
  dryRun: boolean;
  triggerSource: string;
  actorUserId: string | null;
  eventKey: string | null;
  recordsProcessed: number;
  snapshotsWritten: number;
  failures: number;
  durationMs: number | null;
  errorMessage: string | null;
  summary: unknown;
  startedAt: Date;
  completedAt: Date | null;
}): EmeRunSummary {
  return {
    id: row.id,
    runType: row.runType as EmeRunSummary["runType"],
    category: row.category as EmeRunSummary["category"],
    status: row.status as EmeRunSummary["status"],
    dryRun: row.dryRun,
    triggerSource: row.triggerSource as EmeRunSummary["triggerSource"],
    actorUserId: row.actorUserId,
    eventKey: row.eventKey,
    recordsProcessed: row.recordsProcessed,
    snapshotsWritten: row.snapshotsWritten,
    failures: row.failures,
    durationMs: row.durationMs,
    errorMessage: row.errorMessage,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    summary: (row.summary as Record<string, unknown> | null) ?? null,
  };
}

export class EnterpriseMetricsEngineService {
  private async orgId(explicit?: string) {
    if (explicit) return explicit;
    return resolvePilotOrganizationId();
  }

  async getAdminStatus(organizationId?: string): Promise<EmeAdminStatus> {
    const orgId = await this.orgId(organizationId);
    const [recent, nightlyCount, eventCount, liveCount] = await Promise.all([
      prisma.enterpriseMetricRun.findMany({
        where: { organizationId: orgId },
        orderBy: { startedAt: "desc" },
        take: 10,
      }),
      prisma.enterpriseMetricSnapshot.count({
        where: { organizationId: orgId, category: "nightly" },
      }),
      prisma.enterpriseMetricSnapshot.count({
        where: { organizationId: orgId, category: "event" },
      }),
      prisma.enterpriseMetricSnapshot.count({
        where: { organizationId: orgId, category: "live" },
      }),
    ]);

    const last = recent[0] ?? null;
    const lastOk = recent.find((r) => r.status === "succeeded" || r.status === "partial");

    let healthStatus: EmeAdminStatus["healthStatus"] = "unknown";
    if (lastOk) {
      const ageMs = Date.now() - lastOk.startedAt.getTime();
      healthStatus =
        lastOk.failures > 0 || ageMs > 36 * 60 * 60 * 1000 ? "degraded" : "healthy";
    }

    const [mcSnap, schedule, radarSnap, nightSchedule] = await Promise.all([
      this.getLatestSnapshot<{ version?: string }>(EME_MISSION_CONTROL_SNAPSHOT_KEY, {
        organizationId: orgId,
        periodKey: EME_PERIOD_LATEST,
      }),
      this.getMissionControlSchedule(orgId),
      this.getLatestSnapshot<{ version?: string; summary?: { healthScore?: number } }>(
        EME_MISSION_CONTROL_RADAR_KEY,
        { organizationId: orgId, periodKey: EME_PERIOD_LATEST },
      ),
      this.getChanakyaNightSchedule(orgId),
    ]);

    const interval = resolveMissionControlInterval(schedule.intervalId);
    const nextFromSchedule = (() => {
      if (!mcSnap?.asOf) return nextNightlyUtc();
      const next = new Date(mcSnap.asOf);
      next.setUTCHours(next.getUTCHours() + interval.hours);
      return next.toISOString();
    })();

    const nextRadarRefresh = (() => {
      const base = radarSnap?.asOf ? new Date(radarSnap.asOf) : new Date();
      const next = new Date(base);
      next.setHours(nightSchedule.hourLocal, 0, 0, 0);
      if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
      return next.toISOString();
    })();

    return {
      healthStatus,
      lastCalculationTime: lastOk?.completedAt?.toISOString() ?? lastOk?.startedAt.toISOString() ?? null,
      lastDurationMs: lastOk?.durationMs ?? null,
      lastRecordsProcessed: lastOk?.recordsProcessed ?? null,
      lastFailures: lastOk?.failures ?? null,
      lastStatus: (last?.status as EmeAdminStatus["lastStatus"]) ?? null,
      nextScheduledRun: nextFromSchedule,
      scheduleNote: EME_SCHEDULE_NOTE,
      recentRuns: recent.map(serializeRun),
      snapshotCounts: {
        nightly: nightlyCount,
        event: eventCount,
        live: liveCount,
      },
      missionControl: {
        lastSnapshotAt: mcSnap?.asOf ?? null,
        snapshotVersion: mcSnap?.payload?.version ?? null,
        scheduleIntervalId: schedule.intervalId,
        scheduleEnabled: schedule.enabled,
      },
      chanakyaRadar: {
        lastSnapshotAt: radarSnap?.asOf ?? null,
        snapshotVersion: radarSnap?.payload?.version ?? null,
        nextScheduledRefresh: nextRadarRefresh,
        nightHourLocal: nightSchedule.hourLocal,
        nightEnabled: nightSchedule.enabled,
      },
    };
  }

  async getMissionControlSchedule(organizationId?: string): Promise<MissionControlScheduleConfig> {
    const row = await this.getLatestSnapshot<MissionControlScheduleConfig>(
      EME_MISSION_CONTROL_SCHEDULE_KEY,
      { organizationId, periodKey: EME_PERIOD_LATEST },
    );
    if (row?.payload?.intervalId) return row.payload;
    return defaultMissionControlScheduleConfig();
  }

  async setMissionControlSchedule(input: {
    intervalId: string;
    enabled?: boolean;
    actorUserId?: string | null;
    organizationId?: string;
  }): Promise<MissionControlScheduleConfig> {
    const orgId = await this.orgId(input.organizationId);
    const interval = resolveMissionControlInterval(input.intervalId);
    const payload: MissionControlScheduleConfig = {
      intervalId: interval.id,
      enabled: input.enabled !== false,
      updatedAt: new Date().toISOString(),
      updatedByUserId: input.actorUserId ?? null,
      note: `Mission Control Snapshot refresh: ${interval.label}.`,
    };
    await prisma.enterpriseMetricSnapshot.upsert({
      where: {
        organizationId_metricKey_entityId_periodKey: {
          organizationId: orgId,
          metricKey: EME_MISSION_CONTROL_SCHEDULE_KEY,
          entityId: "",
          periodKey: EME_PERIOD_LATEST,
        },
      },
      create: {
        organizationId: orgId,
        metricKey: EME_MISSION_CONTROL_SCHEDULE_KEY,
        category: "nightly",
        entityId: "",
        periodKey: EME_PERIOD_LATEST,
        asOf: new Date(),
        payload: asJson(payload),
        sourceModules: ["CO-ARCH-005"],
      },
      update: {
        asOf: new Date(),
        payload: asJson(payload),
        category: "nightly",
        sourceModules: ["CO-ARCH-005"],
      },
    });
    return payload;
  }

  async getChanakyaNightSchedule(organizationId?: string): Promise<ChanakyaNightModeScheduleConfig> {
    const row = await this.getLatestSnapshot<ChanakyaNightModeScheduleConfig>(
      EME_CHANAKYA_NIGHT_SCHEDULE_KEY,
      { organizationId, periodKey: EME_PERIOD_LATEST },
    );
    if (row?.payload && typeof row.payload.hourLocal === "number") return row.payload;
    return defaultChanakyaNightModeSchedule();
  }

  async setChanakyaNightSchedule(input: {
    hourLocal: number;
    enabled?: boolean;
    actorUserId?: string | null;
    organizationId?: string;
  }): Promise<ChanakyaNightModeScheduleConfig> {
    const orgId = await this.orgId(input.organizationId);
    const hour = Math.min(23, Math.max(0, Math.floor(input.hourLocal)));
    const payload: ChanakyaNightModeScheduleConfig = {
      hourLocal: hour,
      enabled: input.enabled !== false,
      updatedAt: new Date().toISOString(),
      updatedByUserId: input.actorUserId ?? null,
      note: `CHANAKYA Night Mode intelligence hour: ${String(hour).padStart(2, "0")}:00 (local preference).`,
    };
    await prisma.enterpriseMetricSnapshot.upsert({
      where: {
        organizationId_metricKey_entityId_periodKey: {
          organizationId: orgId,
          metricKey: EME_CHANAKYA_NIGHT_SCHEDULE_KEY,
          entityId: "",
          periodKey: EME_PERIOD_LATEST,
        },
      },
      create: {
        organizationId: orgId,
        metricKey: EME_CHANAKYA_NIGHT_SCHEDULE_KEY,
        category: "nightly",
        entityId: "",
        periodKey: EME_PERIOD_LATEST,
        asOf: new Date(),
        payload: asJson(payload),
        sourceModules: ["CO-ARCH-007"],
      },
      update: {
        asOf: new Date(),
        payload: asJson(payload),
        category: "nightly",
        sourceModules: ["CO-ARCH-007"],
      },
    });
    return payload;
  }

  async getLatestSnapshot<T = unknown>(
    metricKey: string,
    options?: { organizationId?: string; entityId?: string | null; periodKey?: string },
  ): Promise<{
    metricKey: string;
    asOf: string;
    numericValue: number | null;
    score: number | null;
    band: string | null;
    payload: T;
    category: string;
  } | null> {
    const orgId = await this.orgId(options?.organizationId);
    const row = await prisma.enterpriseMetricSnapshot.findFirst({
      where: {
        organizationId: orgId,
        metricKey,
        ...(options?.entityId != null ? { entityId: options.entityId } : {}),
        ...(options?.periodKey ? { periodKey: options.periodKey } : {}),
      },
      orderBy: { asOf: "desc" },
    });
    if (!row) return null;
    return {
      metricKey: row.metricKey,
      asOf: row.asOf.toISOString(),
      numericValue: row.numericValue,
      score: row.score,
      band: row.band,
      payload: row.payload as T,
      category: row.category,
    };
  }

  /** Category C — always real-time from entity tables / ETE counts provided by caller. */
  async getLiveMetrics(input?: {
    organizationId?: string;
    pendingTasks?: number;
    overdueTasks?: number;
  }): Promise<EmeLiveMetrics> {
    const orgId = await this.orgId(input?.organizationId);
    const today = startOfDay();
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const [todaysOpportunities, loginDeals, disbursedDeals] = await Promise.all([
      prisma.enterpriseOpportunity.count({
        where: {
          organizationId: orgId,
          isDeleted: false,
          createdAt: { gte: today, lte: end },
        },
      }),
      prisma.enterpriseDeal.findMany({
        where: {
          organizationId: orgId,
          isDeleted: false,
          opportunityId: { not: null },
          grossStage: { in: [...FRESH_LOGIN_DEAL_STAGES] },
          stageEnteredAt: { gte: today, lte: end },
        },
        select: { opportunityId: true },
        distinct: ["opportunityId"],
      }),
      prisma.enterpriseDeal.findMany({
        where: {
          organizationId: orgId,
          isDeleted: false,
          opportunityId: { not: null },
          grossStage: { in: DISBURSED_STAGES },
          stageEnteredAt: { gte: today, lte: end },
        },
        select: { opportunityId: true },
        distinct: ["opportunityId"],
      }),
    ]);

    return {
      asOf: new Date().toISOString(),
      category: "live",
      todaysOpportunities,
      todaysLogins: loginDeals.length,
      todaysDisbursements: disbursedDeals.length,
      pendingTasks: input?.pendingTasks ?? 0,
      overdueTasks: input?.overdueTasks ?? 0,
      unreadNotifications: null,
      onlineUsers: null,
    };
  }

  async forceRecalculate(options: EmeComputeOptions = {}) {
    return this.runSnapshot({
      ...options,
      runType: options.dryRun ? "dry_run" : "force_recalculate",
      category: "nightly",
    });
  }

  /**
   * CO-ARCH-005 — Whether scheduled Mission Control / EME refresh should run now.
   * Admin Force Recalculate bypasses this gate.
   */
  async isMissionControlRefreshDue(organizationId?: string): Promise<{
    due: boolean;
    reason: string;
    intervalId: string;
    lastSnapshotAt: string | null;
  }> {
    const orgId = await this.orgId(organizationId);
    const schedule = await this.getMissionControlSchedule(orgId);
    if (!schedule.enabled) {
      return {
        due: false,
        reason: "schedule_disabled",
        intervalId: schedule.intervalId,
        lastSnapshotAt: null,
      };
    }
    const interval = resolveMissionControlInterval(schedule.intervalId);
    const mcSnap = await this.getLatestSnapshot<{ version?: string }>(
      EME_MISSION_CONTROL_SNAPSHOT_KEY,
      { organizationId: orgId, periodKey: EME_PERIOD_LATEST },
    );
    if (!mcSnap?.asOf) {
      return {
        due: true,
        reason: "no_snapshot",
        intervalId: interval.id,
        lastSnapshotAt: null,
      };
    }
    const ageMs = Date.now() - new Date(mcSnap.asOf).getTime();
    const dueMs = interval.hours * 60 * 60 * 1000;
    if (ageMs >= dueMs) {
      return {
        due: true,
        reason: "interval_elapsed",
        intervalId: interval.id,
        lastSnapshotAt: mcSnap.asOf,
      };
    }
    return {
      due: false,
      reason: "not_due",
      intervalId: interval.id,
      lastSnapshotAt: mcSnap.asOf,
    };
  }

  async runNightlySnapshot(options: EmeComputeOptions = {}) {
    return this.runSnapshot({
      ...options,
      runType: options.dryRun ? "dry_run" : "nightly_snapshot",
      category: "nightly",
    });
  }

  async refreshForEvent(eventKey: EmeEventKey, options: EmeComputeOptions = {}) {
    const keys = [...(EME_EVENT_METRIC_MAP[eventKey] ?? [])];
    return this.runSnapshot({
      ...options,
      runType: "event_refresh",
      category: "event",
      eventKey,
      metricKeys: options.metricKeys ?? keys,
    });
  }

  private async runSnapshot(input: EmeComputeOptions & {
    runType: EmeRunType;
    category: "nightly" | "event";
  }) {
    const orgId = await this.orgId();
    const started = Date.now();
    const dryRun = Boolean(input.dryRun);
    const run = await prisma.enterpriseMetricRun.create({
      data: {
        organizationId: orgId,
        runType: input.runType,
        category: input.category,
        status: "running",
        dryRun,
        triggerSource: input.triggerSource ?? "admin",
        actorUserId: input.actorUserId ?? null,
        eventKey: input.eventKey ?? null,
        metricKeys: input.metricKeys ? asJson(input.metricKeys) : undefined,
      },
    });

    let recordsProcessed = 0;
    let snapshotsWritten = 0;
    let failures = 0;
    const notes: string[] = [];

    try {
      const [opportunities, deals] = await Promise.all([
        prisma.enterpriseOpportunity.findMany({
          where: { organizationId: orgId, isDeleted: false },
          take: 500,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.enterpriseDeal.findMany({
          where: { organizationId: orgId, isDeleted: false, archived: false },
          take: 500,
          orderBy: { updatedAt: "desc" },
        }),
      ]);
      recordsProcessed = opportunities.length + deals.length;

      const oppApi = opportunities.map(serializeOpportunity);
      const dealApi = deals.map(serializeDeal);
      const analytics = deriveDashboardVisualAnalytics({
        opportunities: oppApi as never,
        deals: dealApi as never,
        taskBuckets: { dueToday: 0, completed: 0, overdue: 0, pending: 0 },
        trendRange: "90d",
      });

      const live = await this.getLiveMetrics({ organizationId: orgId });
      const asOf = new Date();
      const keysWanted = new Set(
        input.metricKeys?.length
          ? input.metricKeys
          : ([
              EME_DASHBOARD_METRIC_KEY,
              EME_KPI_STRIP_METRIC_KEY,
              EME_MISSION_CONTROL_SNAPSHOT_KEY,
              EME_MISSION_CONTROL_RADAR_KEY,
              "portfolio.pipeline_statistics",
              "portfolio.average_ticket_size",
              "portfolio.average_tat",
              "portfolio.conversion_ratios",
              "product.performance",
              "lender.performance",
              "rm.productivity",
            ] as EmeMetricKey[]),
      );

      const writes: Array<{
        metricKey: string;
        category: string;
        entityId?: string | null;
        periodKey: string;
        numericValue?: number | null;
        score?: number | null;
        band?: string | null;
        payload: unknown;
        sourceModules: string[];
      }> = [];

      if (keysWanted.has(EME_DASHBOARD_METRIC_KEY)) {
        writes.push({
          metricKey: EME_DASHBOARD_METRIC_KEY,
          category: input.category,
          entityId: null,
          periodKey: EME_PERIOD_LATEST,
          numericValue: analytics.totals.activeOpportunities,
          payload: analytics,
          sourceModules: [
            "deriveDashboardVisualAnalytics",
            "EnterpriseOpportunity",
            "EnterpriseDeal",
          ],
        });
      }

      if (keysWanted.has(EME_KPI_STRIP_METRIC_KEY) || keysWanted.has("live.today_logins")) {
        writes.push({
          metricKey: EME_KPI_STRIP_METRIC_KEY,
          category: input.category === "event" ? "event" : "nightly",
          entityId: null,
          periodKey: EME_PERIOD_TODAY,
          numericValue: live.todaysLogins,
          payload: live,
          sourceModules: ["EME.getLiveMetrics", "EnterpriseDeal.grossStage"],
        });
      }

      // CO-ARCH-005 — Mission Control executive snapshot (never on page load).
      if (
        keysWanted.has(EME_MISSION_CONTROL_SNAPSHOT_KEY) ||
        keysWanted.has(EME_MISSION_CONTROL_RADAR_KEY)
      ) {
        if (input.runType === "event_refresh" && !input.metricKeys?.includes(EME_MISSION_CONTROL_SNAPSHOT_KEY)) {
          /* skip MC on narrow event refresh unless explicitly requested */
        } else {
          try {
            const mc = composeMissionControlExecutiveSnapshot({
              deals: dealApi as never,
              opportunities: oppApi.map((o) => ({
                id: o.id,
                lifecycleStatus: o.lifecycleStatus,
                sourceCode: o.sourceCode,
                sourceWealthPartnerId: o.sourceWealthPartnerId,
                sourceContactName: o.sourceContactName,
                participationRole: o.participationRole,
                productLabel: o.productLabel,
                productCode: o.productCode,
                cityLabel: o.cityLabel,
                stateLabel: o.stateLabel,
                requestedAmount: o.requestedAmount ?? null,
                primaryContactName: o.primaryContactName,
                companyName: o.companyName,
              })),
            });
            if (keysWanted.has(EME_MISSION_CONTROL_SNAPSHOT_KEY) || input.runType !== "event_refresh") {
              writes.push({
                metricKey: EME_MISSION_CONTROL_SNAPSHOT_KEY,
                category: input.category,
                entityId: null,
                periodKey: EME_PERIOD_LATEST,
                numericValue: mc.ebi.health.overallScore,
                score: mc.ebi.health.overallScore,
                band: mc.ebi.health.status,
                payload: mc,
                sourceModules: mc.sourceModules,
              });
            }
            if (keysWanted.has(EME_MISSION_CONTROL_RADAR_KEY) || input.runType !== "event_refresh") {
              writes.push({
                metricKey: EME_MISSION_CONTROL_RADAR_KEY,
                category: input.category,
                entityId: null,
                periodKey: EME_PERIOD_LATEST,
                numericValue: mc.radar.summary.healthScore,
                payload: mc.radar,
                sourceModules: ["buildChanakyaRadarDashboard", "CO-ARCH-007"],
              });
            }
          } catch (err) {
            failures += 1;
            notes.push(
              `mission_control_snapshot: ${err instanceof Error ? err.message : "failed"}`,
            );
          }
        }
      }

      if (keysWanted.has("portfolio.pipeline_statistics")) {
        writes.push({
          metricKey: "portfolio.pipeline_statistics",
          category: input.category,
          entityId: null,
          periodKey: EME_PERIOD_LATEST,
          numericValue: analytics.totals.opportunities,
          payload: {
            totals: analytics.totals,
            stageDistribution: analytics.stageDistribution,
            ageing: analytics.ageing,
          },
          sourceModules: ["deriveDashboardVisualAnalytics"],
        });
      }

      if (keysWanted.has("portfolio.average_ticket_size")) {
        const ticket = analytics.performance.find((p) => p.id === "ticket");
        writes.push({
          metricKey: "portfolio.average_ticket_size",
          category: input.category,
          entityId: null,
          periodKey: EME_PERIOD_LATEST,
          numericValue:
            analytics.totals.opportunities > 0
              ? analytics.totals.opportunityValue / analytics.totals.opportunities
              : 0,
          payload: { label: ticket?.valueLabel, totals: analytics.totals },
          sourceModules: ["deriveDashboardVisualAnalytics"],
        });
      }

      if (keysWanted.has("portfolio.average_tat")) {
        const tat = analytics.performance.find((p) => p.id === "tat");
        writes.push({
          metricKey: "portfolio.average_tat",
          category: input.category,
          entityId: null,
          periodKey: EME_PERIOD_LATEST,
          numericValue: Number.parseInt(String(tat?.valueLabel ?? "0"), 10) || 0,
          payload: { label: tat?.valueLabel },
          sourceModules: ["deriveDashboardVisualAnalytics"],
        });
      }

      if (keysWanted.has("portfolio.conversion_ratios")) {
        const conv = analytics.performance.find((p) => p.id === "conversion");
        writes.push({
          metricKey: "portfolio.conversion_ratios",
          category: input.category,
          entityId: null,
          periodKey: EME_PERIOD_LATEST,
          numericValue: Number.parseFloat(String(conv?.valueLabel ?? "0")) || 0,
          payload: { label: conv?.valueLabel },
          sourceModules: ["deriveDashboardVisualAnalytics"],
        });
      }

      if (keysWanted.has("product.performance")) {
        writes.push({
          metricKey: "product.performance",
          category: input.category,
          entityId: null,
          periodKey: EME_PERIOD_LATEST,
          numericValue: analytics.productMix.length,
          payload: { productMix: analytics.productMix },
          sourceModules: ["deriveDashboardVisualAnalytics"],
        });
      }

      if (keysWanted.has("lender.performance")) {
        writes.push({
          metricKey: "lender.performance",
          category: input.category,
          entityId: null,
          periodKey: EME_PERIOD_LATEST,
          numericValue: analytics.lenderDistribution.length,
          payload: { lenderDistribution: analytics.lenderDistribution },
          sourceModules: ["deriveDashboardVisualAnalytics", "EnterpriseDeal"],
        });
      }

      if (keysWanted.has("rm.productivity")) {
        const rm = analytics.performance.find((p) => p.id === "rm");
        writes.push({
          metricKey: "rm.productivity",
          category: input.category,
          entityId: null,
          periodKey: EME_PERIOD_LATEST,
          numericValue: Number.parseInt(String(rm?.valueLabel ?? "0"), 10) || 0,
          payload: { label: rm?.valueLabel, hint: rm?.hint },
          sourceModules: ["deriveDashboardVisualAnalytics"],
        });
      }

      /** Deal health write-through (reserved columns) — stage progress proxy until full engine. */
      if (keysWanted.has("deal.health") || input.runType !== "event_refresh") {
        for (const deal of deals.slice(0, 200)) {
          const days = deal.daysInStage ?? 0;
          const score = Math.max(5, Math.min(98, 85 - Math.min(days, 60)));
          const band = score >= 70 ? "good" : score >= 45 ? "needs_attention" : "critical";
          recordsProcessed += 1;
          if (!dryRun) {
            await prisma.enterpriseDeal.update({
              where: { id: deal.id },
              data: {
                healthScore: score,
                healthBand: band,
                healthComputedAt: asOf,
                healthPayload: asJson({
                  engine: "EME",
                  version: 1,
                  basis: "daysInStage_proxy",
                  daysInStage: days,
                  grossStage: deal.grossStage,
                }),
              },
            });
          }
          writes.push({
            metricKey: "deal.health",
            category: input.category,
            entityId: deal.id,
            periodKey: EME_PERIOD_LATEST,
            score,
            band,
            numericValue: score,
            payload: { dealId: deal.id, dealNumber: deal.dealNumber, grossStage: deal.grossStage },
            sourceModules: ["EME.dealHealthProxy", "EnterpriseDeal.grossStage"],
          });
        }
        notes.push("Deal health proxy written from daysInStage (EME Phase 1).");
      }

      if (!dryRun) {
        for (const w of writes) {
          await prisma.enterpriseMetricSnapshot.upsert({
            where: {
              organizationId_metricKey_entityId_periodKey: {
                organizationId: orgId,
                metricKey: w.metricKey,
                entityId: w.entityId ?? "",
                periodKey: w.periodKey,
              },
            },
            create: {
              organizationId: orgId,
              runId: run.id,
              metricKey: w.metricKey,
              category: w.category,
              entityKind: w.entityId ? "deal" : null,
              entityId: w.entityId ?? "",
              periodKey: w.periodKey,
              asOf,
              numericValue: w.numericValue ?? null,
              score: w.score ?? null,
              band: w.band ?? null,
              payload: asJson(w.payload),
              sourceModules: asJson(w.sourceModules),
            },
            update: {
              runId: run.id,
              category: w.category,
              asOf,
              numericValue: w.numericValue ?? null,
              score: w.score ?? null,
              band: w.band ?? null,
              payload: asJson(w.payload),
              sourceModules: asJson(w.sourceModules),
              version: { increment: 1 },
            },
          });
          snapshotsWritten += 1;
        }
      } else {
        snapshotsWritten = writes.length;
        notes.push("Dry run — no snapshots persisted.");
      }

      const durationMs = Date.now() - started;
      const updated = await prisma.enterpriseMetricRun.update({
        where: { id: run.id },
        data: {
          status: failures > 0 ? "partial" : "succeeded",
          recordsProcessed,
          snapshotsWritten,
          failures,
          durationMs,
          completedAt: new Date(),
          summary: asJson({
            notes,
            metricKeys: [...keysWanted],
            opportunityCount: opportunities.length,
            dealCount: deals.length,
            dryRun,
          }),
        },
      });

      return {
        run: serializeRun(updated),
        live,
        dashboardCached: keysWanted.has(EME_DASHBOARD_METRIC_KEY),
      };
    } catch (err) {
      failures += 1;
      const message = err instanceof Error ? err.message : String(err);
      const updated = await prisma.enterpriseMetricRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          recordsProcessed,
          snapshotsWritten,
          failures,
          durationMs: Date.now() - started,
          completedAt: new Date(),
          errorMessage: message,
        },
      });
      throw Object.assign(err instanceof Error ? err : new Error(message), {
        run: serializeRun(updated),
      });
    }
  }
}

export const enterpriseMetricsEngineService = new EnterpriseMetricsEngineService();
