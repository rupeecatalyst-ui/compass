/**
 * CO-RADAR-004 — DIAGNOSTIC ONLY.
 * Compare live Postgres timeline counts vs EME compose path vs DAL hydrate path.
 * Does not mutate data. Does not change scoring.
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();
const require = createRequire(import.meta.url);

function isActiveRadarDeal(deal) {
  const stage = String(deal.grossStage || "").toLowerCase();
  const status = String(deal.status || "").toLowerCase();
  if (deal.isDeleted || deal.archived) return false;
  if (status === "closed" || status === "lost" || status === "cancelled") return false;
  if (stage.includes("closed") || stage.includes("disbursed") || stage.includes("lost")) return false;
  return true;
}

async function main() {
  // Dynamic import of TS via tsx-registered path when available; fall back to runtime facts only.
  let mapStub = null;
  let buildDashboard = null;
  let listActive = null;
  let mapTimeline = null;
  try {
    const mapMod = await import(
      pathToFileURL(resolve("src/lib/enterprise-deal/map-deal-to-loan-file.ts")).href
    );
    mapStub = mapMod.mapEnterpriseDealToLoanFileStub;
    const dashMod = await import(
      pathToFileURL(resolve("src/lib/chanakya-radar/derive-dashboard.ts")).href
    );
    buildDashboard = dashMod.buildChanakyaRadarDashboard;
    const srcMod = await import(
      pathToFileURL(resolve("src/lib/chanakya-radar/radar-deal-source.ts")).href
    );
    listActive = srcMod.listActiveRadarDealFiles;
    const tlMod = await import(
      pathToFileURL(resolve("src/lib/enterprise-deal/enterprise-deal-activity-timeline.ts")).href
    );
    mapTimeline = tlMod.mapEnterpriseDealActivityTimelineToLoanFileEvents;
  } catch (e) {
    console.error("TS import note:", e instanceof Error ? e.message : e);
  }

  const org =
    (await prisma.organization.findUnique({
      where: { slug: "rupee-catalyst" },
      select: { id: true },
    })) ||
    (await prisma.organization.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }));

  const deals = await prisma.enterpriseDeal.findMany({
    where: {
      organizationId: org?.id,
      isDeleted: false,
      archived: false,
    },
    take: 500,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      dealNumber: true,
      primaryCounterpartyName: true,
      primaryContactName: true,
      grossStage: true,
      status: true,
      operationalStatus: true,
      productLabel: true,
      updatedAt: true,
      createdAt: true,
      productFamily: true,
      lifecycleStatus: true,
      requestedAmount: true,
      lenderId: true,
      snapshot: true,
    },
  });

  // Prefer Radar active filter from lib if available; else local heuristic.
  let activeDeals = deals;
  // We'll refine after mapping if listActive works.

  const dealIds = deals.map((d) => d.id);
  const timelineEvents = dealIds.length
    ? await prisma.enterpriseDealTimelineEvent.findMany({
        where: { dealId: { in: dealIds }, isDeleted: false },
        orderBy: { occurredAt: "desc" },
        select: {
          id: true,
          dealId: true,
          eventType: true,
          title: true,
          summary: true,
          occurredAt: true,
          createdAt: true,
        },
      })
    : [];

  const byDeal = new Map();
  for (const ev of timelineEvents) {
    if (!byDeal.has(ev.dealId)) byDeal.set(ev.dealId, []);
    byDeal.get(ev.dealId).push(ev);
  }

  // Serialize like API shape for mapper
  function toApiEvents(rows) {
    return rows.map((e) => ({
      id: e.id,
      dealId: e.dealId,
      eventType: e.eventType,
      title: e.title,
      summary: e.summary,
      occurredAt: e.occurredAt?.toISOString?.() ?? String(e.occurredAt),
      createdAt: e.createdAt?.toISOString?.() ?? String(e.createdAt),
    }));
  }

  // Minimal deal API shape for stub
  function toDealApi(d) {
    return {
      id: d.id,
      dealNumber: d.dealNumber,
      customerName: d.customerName,
      grossStage: d.grossStage,
      status: d.status,
      operationalStatus: d.operationalStatus,
      productLabel: d.productLabel,
      lenderName: d.lenderName,
      updatedAt: d.updatedAt?.toISOString?.() ?? String(d.updatedAt),
      createdAt: d.createdAt?.toISOString?.() ?? String(d.createdAt),
      isDeleted: false,
      archived: false,
      snapshot: {},
    };
  }

  const perDeal = [];
  for (const d of deals) {
    const events = byDeal.get(d.id) ?? [];
    const latest = events[0] ?? null;
    perDeal.push({
      dealId: d.id,
      dealNumber: d.dealNumber,
      customer: d.customerName,
      operationalStatus: d.operationalStatus ?? d.status ?? d.grossStage,
      timelineEventCountDb: events.length,
      latestTimelineEvent: latest
        ? {
            eventType: latest.eventType,
            title: latest.title,
            occurredAt: latest.occurredAt,
          }
        : null,
    });
  }

  const dealsWithEvents = perDeal.filter((d) => d.timelineEventCountDb >= 1).length;
  const dealsWithZero = perDeal.filter((d) => d.timelineEventCountDb === 0).length;

  let emePath = null;
  let dalPath = null;

  if (mapStub && buildDashboard) {
    // Path B — LIVE Radar / EME: stub WITHOUT timeline
    const stubsEmpty = deals.map((d) => mapStub(toDealApi(d)));
    const filesEmpty = listActive ? listActive(stubsEmpty) : stubsEmpty.filter((f) => !f.archived);
    const radarEmpty = buildDashboard(filesEmpty);

    // Path A — CO-RADAR-003 DAL: stub WITH timeline
    const stubsHydrated = deals.map((d) =>
      mapStub(toDealApi(d), null, toApiEvents(byDeal.get(d.id) ?? [])),
    );
    const filesHydrated = listActive
      ? listActive(stubsHydrated)
      : stubsHydrated.filter((f) => !f.archived);
    const radarHydrated = buildDashboard(filesHydrated);

    const sampleEmpty = filesEmpty.slice(0, 25).map((f) => ({
      dealId: f.id,
      timelineLengthReceived: (f.timeline ?? []).length,
      timelineEventTypes: (f.timeline ?? []).slice(0, 8).map((e) => e.type || e.eventType || e.title),
      latestEvent: (f.timeline ?? [])[0]
        ? {
            title: (f.timeline ?? [])[0].title,
            at: (f.timeline ?? [])[0].timestamp || (f.timeline ?? [])[0].at,
          }
        : null,
    }));

    const sampleHydrated = filesHydrated.slice(0, 25).map((f) => ({
      dealId: f.id,
      timelineLengthReceived: (f.timeline ?? []).length,
      timelineEventTypes: (f.timeline ?? []).slice(0, 8).map((e) => e.type || e.eventType || e.title),
      latestEvent: (f.timeline ?? [])[0]
        ? {
            title: (f.timeline ?? [])[0].title,
            at: (f.timeline ?? [])[0].timestamp || (f.timeline ?? [])[0].at,
          }
        : null,
    }));

    // Attach classification from dashboard rows if present
    const rowsEmpty = radarEmpty.rows || radarEmpty.deals || [];
    const rowsHydrated = radarHydrated.rows || radarHydrated.deals || [];

    emePath = {
      label: "LIVE Radar / EME compose path (mapEnterpriseDealToLoanFileStub(deal) — NO timeline)",
      activeRadarDeals: filesEmpty.length,
      timelineLengths: {
        zero: filesEmpty.filter((f) => (f.timeline ?? []).length === 0).length,
        nonZero: filesEmpty.filter((f) => (f.timeline ?? []).length > 0).length,
        totalEventsInProjection: filesEmpty.reduce((n, f) => n + (f.timeline ?? []).length, 0),
      },
      kpis: {
        avgDealHealth: radarEmpty.avgDealHealth ?? radarEmpty.kpis?.avgDealHealth,
        atRisk: radarEmpty.atRiskCount ?? radarEmpty.kpis?.atRisk,
        onTrack: radarEmpty.onTrackCount ?? radarEmpty.kpis?.onTrack,
        needsAttention: radarEmpty.needsAttentionCount ?? radarEmpty.kpis?.needsAttention,
        operationalVector: radarEmpty.operationalVector ?? radarEmpty.vector,
        trend: radarEmpty.trend,
      },
      sampleProjection: sampleEmpty,
      sampleRows: (Array.isArray(rowsEmpty) ? rowsEmpty : []).slice(0, 15).map((r) => ({
        dealId: r.dealId || r.id || r.fileId,
        health: r.dealHealth ?? r.healthScore ?? r.health,
        classification: r.classification || r.statusLabel || r.radarStatus,
        activityState: r.activityState || r.activity || r.momentum,
        quadrant: r.quadrant,
      })),
      rawKpiKeys: Object.keys(radarEmpty || {}).slice(0, 40),
    };

    dalPath = {
      label: "CO-RADAR-003 DAL path (stub WITH timeline events)",
      activeRadarDeals: filesHydrated.length,
      timelineLengths: {
        zero: filesHydrated.filter((f) => (f.timeline ?? []).length === 0).length,
        nonZero: filesHydrated.filter((f) => (f.timeline ?? []).length > 0).length,
        totalEventsInProjection: filesHydrated.reduce(
          (n, f) => n + (f.timeline ?? []).length,
          0,
        ),
      },
      kpis: {
        avgDealHealth: radarHydrated.avgDealHealth ?? radarHydrated.kpis?.avgDealHealth,
        atRisk: radarHydrated.atRiskCount ?? radarHydrated.kpis?.atRisk,
        onTrack: radarHydrated.onTrackCount ?? radarHydrated.kpis?.onTrack,
        needsAttention:
          radarHydrated.needsAttentionCount ?? radarHydrated.kpis?.needsAttention,
        operationalVector: radarHydrated.operationalVector ?? radarHydrated.vector,
        trend: radarHydrated.trend,
      },
      sampleProjection: sampleHydrated,
      sampleRows: (Array.isArray(rowsHydrated) ? rowsHydrated : []).slice(0, 15).map((r) => ({
        dealId: r.dealId || r.id || r.fileId,
        health: r.dealHealth ?? r.healthScore ?? r.health,
        classification: r.classification || r.statusLabel || r.radarStatus,
        activityState: r.activityState || r.activity || r.momentum,
        quadrant: r.quadrant,
      })),
      rawKpiKeys: Object.keys(radarHydrated || {}).slice(0, 40),
    };

    activeDeals = listActive
      ? listActive(stubsEmpty)
      : stubsEmpty;
  }

  // Latest EME radar snapshot if present
  let latestSnapshotMeta = null;
  try {
    const snap = await prisma.enterpriseMetricsSnapshot.findFirst({
      where: {
        organizationId: org?.id,
        OR: [
          { metricKey: { contains: "radar" } },
          { snapshotKey: { contains: "radar" } },
          { key: { contains: "radar" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    // schema may differ — try flexible query
    latestSnapshotMeta = snap;
  } catch {
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, organization_id, created_at, updated_at, metric_family, snapshot_kind
         FROM enterprise_metrics_snapshots
         ORDER BY created_at DESC LIMIT 5`,
      );
      latestSnapshotMeta = rows;
    } catch (e2) {
      latestSnapshotMeta = {
        error: e2 instanceof Error ? e2.message : String(e2),
      };
    }
  }

  const composeSrc = readFileSync(
    resolve("server/services/enterprise-metrics-engine/compose-mission-control-snapshot.ts"),
    "utf8",
  );
  const dalSrc = readFileSync(resolve("src/lib/enterprise-deal/deal-data-access.ts"), "utf8");
  const workspaceSrc = readFileSync(
    resolve("src/components/catalyst-one/chanakya-radar/chanakya-radar-workspace.tsx"),
    "utf8",
  );

  const wiring = {
    emeComposePassesTimeline:
      /mapEnterpriseDealToLoanFileStub\([^)]+,[^)]+,[^)]+\)/.test(composeSrc) ||
      /listTimelinesForDeals|enterpriseTimelineEvents|timelineEvents/.test(composeSrc),
    emeComposeOneArgStub: /mapEnterpriseDealToLoanFileStub\(\s*d\s*\)/.test(composeSrc),
    dalHydratesTimeline: /CO-RADAR-003/.test(dalSrc) && /listTimelinesForDeals/.test(dalSrc),
    radarUiUsesCertifiedSnapshot:
      /loadCertifiedRadarSnapshot|Tier 4 Snapshot Consumer|never live enterprise aggregation/i.test(
        workspaceSrc,
      ),
    activityTimelineModuleExists: existsSync(
      resolve("src/lib/enterprise-deal/enterprise-deal-activity-timeline.ts"),
    ),
  };

  const dbEventCountForActive = (() => {
    const activeIds = new Set(
      (Array.isArray(activeDeals) ? activeDeals : []).map((f) => f.id || f.dealId),
    );
    if (activeIds.size === 0) {
      return {
        activeDealCount: perDeal.length,
        events: timelineEvents.length,
        withEvents: dealsWithEvents,
        withZero: dealsWithZero,
      };
    }
    const activePer = perDeal.filter((d) => activeIds.has(d.dealId));
    return {
      activeDealCount: activePer.length,
      events: activePer.reduce((n, d) => n + d.timelineEventCountDb, 0),
      withEvents: activePer.filter((d) => d.timelineEventCountDb >= 1).length,
      withZero: activePer.filter((d) => d.timelineEventCountDb === 0).length,
    };
  })();

  const report = {
    sprint: "CO-RADAR-004",
    diagnosticOnly: true,
    timestamp: new Date().toISOString(),
    organizationId: org?.id ?? null,
    aggregates: {
      totalDealsLoaded: deals.length,
      totalEnterpriseDealTimelineEventRecords: timelineEvents.length,
      dealsWithAtLeastOneTimelineEvent: dealsWithEvents,
      dealsWithZeroTimelineEvents: dealsWithZero,
      activeRadar: dbEventCountForActive,
    },
    layerCounts: {
      A_postgresTimelineEvents: timelineEvents.length,
      B_dalWouldReceive: timelineEvents.length,
      C_radarProjectionEmePath:
        emePath?.timelineLengths?.totalEventsInProjection ?? "UNABLE_TO_COMPUTE",
      D_scoringInputEmePath:
        emePath?.timelineLengths?.totalEventsInProjection ?? "UNABLE_TO_COMPUTE",
      E_activityEngineEmePath:
        emePath?.timelineLengths?.totalEventsInProjection ?? "UNABLE_TO_COMPUTE",
      C_radarProjectionDalPath:
        dalPath?.timelineLengths?.totalEventsInProjection ?? "UNABLE_TO_COMPUTE",
      D_scoringInputDalPath:
        dalPath?.timelineLengths?.totalEventsInProjection ?? "UNABLE_TO_COMPUTE",
    },
    wiring,
    liveRadarPathEvidence: {
      composeSnippetExpected:
        "mapEnterpriseDealToLoanFileStub(d) — one argument, no timeline",
      composeOneArgConfirmed: wiring.emeComposeOneArgStub,
      uiTier4SnapshotConsumer: wiring.radarUiUsesCertifiedSnapshot,
      coRadar003OnDalOnly: wiring.dalHydratesTimeline && !wiring.emeComposePassesTimeline,
    },
    emePath,
    dalPath,
    perDealSample: perDeal.slice(0, 40),
    latestSnapshotMeta,
  };

  const dir = resolve("docs/co-radar-004");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "CO-RADAR-004-DIAGNOSTIC.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
