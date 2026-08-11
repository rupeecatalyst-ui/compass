/**
 * CO-RADAR-004 — DIAGNOSTIC ONLY.
 * Compare LIVE Radar (EME compose: stub without timeline) vs CO-RADAR-003 DAL hydrate path.
 * Does NOT mutate data. Does NOT change scoring / thresholds.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";

import { serializeTimelineEvent } from "../server/services/enterprise-deal/deal-serialize.ts";
import { mapEnterpriseDealToLoanFileStub } from "../src/lib/enterprise-deal/map-deal-to-loan-file.ts";
import { listActiveRadarDealFiles } from "../src/lib/chanakya-radar/radar-deal-source.ts";
import { buildChanakyaRadarDashboard } from "../src/lib/chanakya-radar/derive-dashboard.ts";
import { classifyOperationalDeal } from "../src/lib/chanakya-radar/classify-operational-deal.ts";
import { computeEnterpriseActivityIntelligence } from "../src/lib/enterprise-activity-intelligence/index.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs", "co-radar-004");
mkdirSync(outDir, { recursive: true });

const prisma = new PrismaClient();

function dealToApi(d: Awaited<ReturnType<typeof prisma.enterpriseDeal.findMany>>[number]) {
  return {
    id: d.id,
    dealNumber: d.dealNumber,
    opportunityId: d.opportunityId,
    fileNumber: d.fileNumber,
    productLabel: d.productLabel,
    grossStage: d.grossStage,
    subStage: d.subStage,
    operationalStatus: d.operationalStatus,
    relationshipManagerName: d.relationshipManagerName,
    requestedAmount: d.requestedAmount != null ? Number(d.requestedAmount) : null,
    approvedAmount: d.approvedAmount != null ? Number(d.approvedAmount) : null,
    fulfilledAmount: d.fulfilledAmount != null ? Number(d.fulfilledAmount) : null,
    priority: d.priority,
    archived: d.archived,
    isDeleted: d.isDeleted,
    rowVersion: d.rowVersion,
    lifecycleStatus: d.lifecycleStatus,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    primaryContactName: d.primaryContactName,
    primaryContactMobile: d.primaryContactMobile,
    primaryCounterpartyName: d.primaryCounterpartyName,
    snapshot: d.snapshot,
  } as never;
}

function summarizeDashboard(dashboard: ReturnType<typeof buildChanakyaRadarDashboard>) {
  const atRisk = dashboard.kpis?.find((k) => k.id === "at_risk");
  const onTrack = dashboard.kpis?.find((k) => k.id === "on_track");
  const needsAttention = dashboard.kpis?.find((k) => k.id === "needs_attention");
  return {
    avgDealHealth: dashboard.vector?.healthScore,
    activeCount: dashboard.activeCount,
    direction: dashboard.vector?.direction,
    trend: dashboard.vector?.trend,
    atRisk: atRisk?.count ?? null,
    atRiskPct: atRisk?.percentage ?? null,
    onTrack: onTrack?.count ?? null,
    needsAttention: needsAttention?.count ?? null,
    kpiCards: dashboard.kpis?.map((k) => ({
      id: k.id,
      label: k.label,
      count: k.count,
      percentage: k.percentage,
    })),
  };
}

try {
  const deals = await prisma.enterpriseDeal.findMany({
    where: { isDeleted: false, archived: false },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });

  const dealIds = deals.map((d) => d.id);
  const timelineRows = await prisma.enterpriseDealTimelineEvent.findMany({
    where: { dealId: { in: dealIds } },
    orderBy: { occurredAt: "desc" },
  });

  const byDeal = new Map<string, typeof timelineRows>();
  for (const row of timelineRows) {
    const list = byDeal.get(row.dealId) ?? [];
    list.push(row);
    byDeal.set(row.dealId, list);
  }

  const totalTimelineAllOrgs = await prisma.enterpriseDealTimelineEvent.count();

  // --- Path B: LIVE Radar / EME compose (NO timeline) ---
  const stubsEmpty = deals.map((d) => mapEnterpriseDealToLoanFileStub(dealToApi(d)));
  const activeEmpty = listActiveRadarDealFiles(stubsEmpty);
  const radarEmpty = buildChanakyaRadarDashboard(activeEmpty);

  // --- Path A: CO-RADAR-003 DAL hydrate (WITH timeline) ---
  const stubsHydrated = deals.map((d) => {
    const events = (byDeal.get(d.id) ?? []).map(serializeTimelineEvent);
    return mapEnterpriseDealToLoanFileStub(dealToApi(d), null, events);
  });
  const activeHydrated = listActiveRadarDealFiles(stubsHydrated);
  const radarHydrated = buildChanakyaRadarDashboard(activeHydrated);

  const activeIds = new Set(activeEmpty.map((f) => f.id));
  const perDealDb = deals
    .filter((d) => activeIds.has(d.id))
    .map((d) => {
      const events = byDeal.get(d.id) ?? [];
      const latest = events[0] ?? null;
      return {
        dealId: d.id,
        dealNumber: d.dealNumber,
        customer: d.primaryCounterpartyName || d.primaryContactName || "—",
        operationalStatus: d.operationalStatus,
        timelineEventCount: events.length,
        latestTimelineEvent: latest
          ? {
              eventType: latest.eventType,
              summary: latest.summary,
              occurredAt: latest.occurredAt.toISOString(),
            }
          : null,
      };
    });

  const projectionRows = activeEmpty.map((emptyFile) => {
    const hydrated = activeHydrated.find((f) => f.id === emptyFile.id)!;
    const events = byDeal.get(emptyFile.id) ?? [];
    const emptyClass = classifyOperationalDeal(emptyFile);
    const hydratedClass = classifyOperationalDeal(hydrated);
    const emptyActivity = computeEnterpriseActivityIntelligence(emptyFile);
    const hydratedActivity = computeEnterpriseActivityIntelligence(hydrated);

    return {
      dealId: emptyFile.id,
      dealNumber: emptyFile.fileNumber || emptyFile.id,
      customer: emptyFile.customer?.name || "—",
      dbTimelineCount: events.length,
      emeProjectionTimelineLength: (emptyFile.timeline ?? []).length,
      dalProjectionTimelineLength: (hydrated?.timeline ?? []).length,
      emeTimelineEventTypes: (emptyFile.timeline ?? [])
        .slice(0, 5)
        .map((e) => e.type || e.title),
      dalTimelineEventTypes: (hydrated?.timeline ?? [])
        .slice(0, 5)
        .map((e) => e.type || e.title),
      emeLatestEvent: (emptyFile.timeline ?? [])[0]
        ? {
            title: (emptyFile.timeline ?? [])[0].title,
            at: (emptyFile.timeline ?? [])[0].timestamp,
          }
        : null,
      dalLatestEvent: (hydrated?.timeline ?? [])[0]
        ? {
            title: (hydrated.timeline ?? [])[0].title,
            at: (hydrated.timeline ?? [])[0].timestamp,
          }
        : null,
      eme: {
        activityState: emptyActivity.state,
        momentumScore: emptyActivity.momentumScore,
        health: emptyClass.dealHealthScore,
        classification: emptyClass.quadrant,
        quadrant: emptyClass.quadrant,
        reason: emptyClass.classificationReason,
      },
      dal: {
        activityState: hydratedActivity.state,
        momentumScore: hydratedActivity.momentumScore,
        health: hydratedClass.dealHealthScore,
        classification: hydratedClass.quadrant,
        quadrant: hydratedClass.quadrant,
        reason: hydratedClass.classificationReason,
      },
    };
  });

  const composeSrc = readFileSync(
    join(root, "server/services/enterprise-metrics-engine/compose-mission-control-snapshot.ts"),
    "utf8",
  );
  const dalSrc = readFileSync(join(root, "src/lib/enterprise-deal/deal-data-access.ts"), "utf8");
  const workspaceSrc = readFileSync(
    join(root, "src/components/catalyst-one/chanakya-radar/chanakya-radar-workspace.tsx"),
    "utf8",
  );

  let gitHead = "unknown";
  let gitStatusRadar003 = "unknown";
  try {
    gitHead = execSync("git rev-parse --short HEAD", { cwd: root }).toString().trim();
    gitStatusRadar003 = execSync(
      "git status --porcelain -- src/lib/enterprise-deal/enterprise-deal-activity-timeline.ts src/lib/enterprise-deal/deal-data-access.ts src/lib/enterprise-deal/map-deal-to-loan-file.ts server/services/enterprise-metrics-engine/compose-mission-control-snapshot.ts docs/co-radar-003",
      { cwd: root },
    )
      .toString()
      .trim();
  } catch {
    /* ignore */
  }

  const emeTimelineTotal = activeEmpty.reduce((n, f) => n + (f.timeline ?? []).length, 0);
  const dalTimelineTotal = activeHydrated.reduce((n, f) => n + (f.timeline ?? []).length, 0);
  const dbTimelineForActive = perDealDb.reduce((n, d) => n + d.timelineEventCount, 0);

  const healthHistogramEme = projectionRows.reduce(
    (acc, r) => {
      const h = r.eme.health;
      acc[h] = (acc[h] ?? 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  const report = {
    sprint: "CO-RADAR-004",
    diagnosticOnly: true,
    scoringUnchanged: true,
    generatedAt: new Date().toISOString(),
    gitHead,
    gitStatusRadar003Files: gitStatusRadar003,
    aggregates: {
      totalDealsLoaded: deals.length,
      totalEnterpriseDealTimelineEventRecordsInDb: totalTimelineAllOrgs,
      timelineEventsForLoadedDeals: timelineRows.length,
      activeRadarDeals: activeEmpty.length,
      dealsWithAtLeastOneTimelineEvent: perDealDb.filter((d) => d.timelineEventCount >= 1).length,
      dealsWithZeroTimelineEvents: perDealDb.filter((d) => d.timelineEventCount === 0).length,
    },
    layerCounts: {
      A_postgresTimeline: dbTimelineForActive,
      B_dalTimeline: dalTimelineTotal,
      C_radarProjectionEme: emeTimelineTotal,
      D_scoringInputEme: emeTimelineTotal,
      E_activityEngineEme: emeTimelineTotal,
      C_radarProjectionDalHydrated: dalTimelineTotal,
      D_scoringInputDalHydrated: dalTimelineTotal,
    },
    wiring: {
      liveRadarUiUsesCertifiedSnapshot: /Tier 4 Snapshot Consumer|loadCertifiedRadarSnapshot/i.test(
        workspaceSrc,
      ),
      emeComposeOneArgStubNoTimeline: /mapEnterpriseDealToLoanFileStub\(\s*d\s*\)/.test(composeSrc),
      emeComposeLoadsTimelines: /listTimelinesForDeals|enterpriseTimelineEvents/.test(composeSrc),
      dalHydratesCoRadar003:
        /CO-RADAR-003/.test(dalSrc) && /listTimelinesForDeals/.test(dalSrc),
      activityTimelineModuleExists: existsSync(
        join(root, "src/lib/enterprise-deal/enterprise-deal-activity-timeline.ts"),
      ),
      coRadar003InLiveRadarChain: false,
      reason:
        "LIVE /chanakya-radar reads EME certified snapshot composed via mapEnterpriseDealToLoanFileStub(d) with no timeline arg. CO-RADAR-003 hydrate lives only on DAL loadEnterpriseAsLoanFiles.",
    },
    liveRadarKpis_emePath: summarizeDashboard(radarEmpty),
    coRadar003Kpis_dalPath: summarizeDashboard(radarHydrated),
    healthFloor6Count_eme: projectionRows.filter((r) => r.eme.health === 6).length,
    healthFloor6Count_dal: projectionRows.filter((r) => r.dal.health === 6).length,
    healthHistogramEme,
    emptyTimelineInEmeProjection: activeEmpty.filter((f) => (f.timeline ?? []).length === 0)
      .length,
    emptyTimelineInDalProjection: activeHydrated.filter((f) => (f.timeline ?? []).length === 0)
      .length,
    perDealDb,
    projectionComparison: projectionRows,
  };

  writeFileSync(join(outDir, "CO-RADAR-004-DIAGNOSTIC.json"), JSON.stringify(report, null, 2));

  // Compact console summary
  console.log(
    JSON.stringify(
      {
        ok: true,
        sprint: "CO-RADAR-004",
        aggregates: report.aggregates,
        layerCounts: report.layerCounts,
        wiring: report.wiring,
        liveRadarKpis_emePath: report.liveRadarKpis_emePath,
        coRadar003Kpis_dalPath: report.coRadar003Kpis_dalPath,
        healthFloor6Count_eme: report.healthFloor6Count_eme,
        healthFloor6Count_dal: report.healthFloor6Count_dal,
        emptyTimelineInEmeProjection: report.emptyTimelineInEmeProjection,
        emptyTimelineInDalProjection: report.emptyTimelineInDalProjection,
        gitHead: report.gitHead,
        sampleComparison: projectionRows.slice(0, 5),
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
