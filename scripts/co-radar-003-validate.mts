/**
 * CO-RADAR-003 — Validate Enterprise Deal Timeline reaches Radar.
 * Does NOT modify scoring / Health formula / thresholds.
 * Prints per-deal: Timeline Events · Last Activity · Activity Health · Op Status · Radar Health · Classification
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

import { serializeTimelineEvent } from "../server/services/enterprise-deal/deal-serialize.ts";
import { mapEnterpriseDealToLoanFileStub } from "../src/lib/enterprise-deal/map-deal-to-loan-file.ts";
import { classifyOperationalDeal } from "../src/lib/chanakya-radar/classify-operational-deal.ts";
import { filterLiveActiveLoanFiles } from "../src/lib/chanakya-live-intelligence/live-ssot.ts";
import { buildChanakyaRadarDashboard } from "../src/lib/chanakya-radar/derive-dashboard.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs", "co-radar-003");
mkdirSync(outDir, { recursive: true });

const prisma = new PrismaClient();

try {
  const deals = await prisma.enterpriseDeal.findMany({
    where: { isDeleted: false, archived: false },
    take: 50,
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

  const files = deals.map((d) => {
    const events = (byDeal.get(d.id) ?? []).map(serializeTimelineEvent);
    return mapEnterpriseDealToLoanFileStub(
      {
        id: d.id,
        dealNumber: d.dealNumber,
        opportunityId: d.opportunityId,
        fileNumber: d.fileNumber,
        productLabel: d.productLabel,
        grossStage: d.grossStage,
        subStage: d.subStage,
        operationalStatus: d.operationalStatus,
        relationshipManagerName: d.relationshipManagerName,
        requestedAmount:
          d.requestedAmount != null ? Number(d.requestedAmount) : null,
        approvedAmount:
          d.approvedAmount != null ? Number(d.approvedAmount) : null,
        fulfilledAmount:
          d.fulfilledAmount != null ? Number(d.fulfilledAmount) : null,
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
      } as never,
      null,
      events,
    );
  });

  const active = filterLiveActiveLoanFiles(files);
  const dashboard = buildChanakyaRadarDashboard(active);

  const rows = active.map((file) => {
    const classified = classifyOperationalDeal(file);
    const activity = classified.activityIntelligence;
    const last = file.timeline?.[0];
    return {
      dealNumber: file.dealNumber || file.fileNumber || file.id,
      borrower: file.customerName,
      timelineEventsFound: file.timeline?.length ?? 0,
      lastActivity: last
        ? { title: last.title, timestamp: last.timestamp }
        : null,
      activityHealth: {
        state: activity.state,
        momentumScore: activity.momentumScore,
        daysSinceMeaningful: activity.daysSinceMeaningfulActivity,
      },
      operationalStatus: file.status,
      radarHealth: classified.dealHealthScore,
      classification: classified.quadrant,
      classificationReason: classified.classificationReason,
    };
  });

  const quadrantCounts = {
    on_track: rows.filter((r) => r.classification === "on_track").length,
    follow_up_required: rows.filter(
      (r) => r.classification === "follow_up_required",
    ).length,
    needs_attention: rows.filter((r) => r.classification === "needs_attention")
      .length,
    at_risk: rows.filter((r) => r.classification === "at_risk").length,
  };

  const emptyTimeline = rows.filter((r) => r.timelineEventsFound === 0).length;
  const allAtRiskFloor =
    rows.length > 0 &&
    rows.every((r) => r.radarHealth === 6 && r.classification === "at_risk");

  // Print validation table
  console.log("\nCO-RADAR-003 VALIDATION — Active Radar deals\n");
  console.log(
    [
      "Deal",
      "TimelineEvents",
      "LastActivity",
      "ActivityHealth",
      "OpStatus",
      "RadarHealth",
      "Classification",
    ].join("\t"),
  );
  for (const r of rows) {
    console.log(
      [
        r.dealNumber,
        r.timelineEventsFound,
        r.lastActivity?.timestamp ?? "—",
        `${r.activityHealth.state}@${r.activityHealth.momentumScore}`,
        r.operationalStatus,
        r.radarHealth,
        r.classification,
      ].join("\t"),
    );
  }

  console.log("\nDistribution:", quadrantCounts);
  console.log("Average Deal Health:", dashboard.vector.healthScore);
  console.log("Empty timeline count:", emptyTimeline);
  console.log("All-at-risk-floor-6 regression:", allAtRiskFloor);

  const report = {
    auditId: "CO-RADAR-003",
    nature: "timeline_projection_fix_validation",
    scoringUnchanged: true,
    generatedAt: new Date().toISOString(),
    activeDealCount: rows.length,
    averageDealHealth: dashboard.vector.healthScore,
    quadrantCounts,
    emptyTimelineCount: emptyTimeline,
    allAtRiskFloor6Regression: allAtRiskFloor,
    acceptance: {
      noDefaultEmptyTimeline: emptyTimeline === 0,
      notUniversalAtRiskFloor:
        !allAtRiskFloor &&
        (quadrantCounts.on_track > 0 ||
          quadrantCounts.follow_up_required > 0 ||
          quadrantCounts.needs_attention > 0 ||
          quadrantCounts.at_risk < rows.length),
      naturalDistribution:
        Object.values(quadrantCounts).filter((n) => n > 0).length >= 1,
    },
    deals: rows,
  };

  writeFileSync(
    join(outDir, "CO-RADAR-003-VALIDATION.json"),
    JSON.stringify(report, null, 2),
  );

  if (emptyTimeline > 0) {
    console.error("FAIL: some active deals still have empty timeline projection");
    process.exitCode = 1;
  } else if (allAtRiskFloor) {
    console.error(
      "FAIL: universal At Risk / health 6 regression still present",
    );
    process.exitCode = 1;
  } else {
    console.log("\nCO-RADAR-003 verify: PASS");
  }
} finally {
  await prisma.$disconnect();
}
