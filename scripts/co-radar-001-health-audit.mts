/**
 * CO-RADAR-001 — READ-ONLY Health Score forensic diagnostic.
 * Does not mutate deals, Radar logic, or Health Score formulas.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CHANAKYA_RADAR_CLASSIFICATION_THRESHOLDS as T } from "../src/constants/chanakya-radar.ts";
import { ACTIVITY_HEALTH_BLEND } from "../src/constants/enterprise-activity-intelligence/index.ts";
import {
  blendDealHealthWithActivityMomentum,
  computeEnterpriseActivityIntelligence,
} from "../src/lib/enterprise-activity-intelligence/index.ts";
import { classifyOperationalDeal } from "../src/lib/chanakya-radar/classify-operational-deal.ts";
import { buildChanakyaRadarDashboard } from "../src/lib/chanakya-radar/derive-dashboard.ts";
import { hydrateRadarDealFiles } from "../src/lib/chanakya-radar/radar-deal-source.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs", "co-radar-001");
mkdirSync(outDir, { recursive: true });

function lastActivityIso(file) {
  return file.timeline?.[0]?.timestamp || file.createdAt || file.loginDate || "";
}

const hydrated = await hydrateRadarDealFiles();
const files = hydrated.files ?? [];
const dashboard = buildChanakyaRadarDashboard(files);

const dealRows = files.map((file) => {
  const classified = classifyOperationalDeal(file);
  const activity = classified.activityIntelligence;
  const baseByQuadrant = T.healthScoreByQuadrant[classified.quadrant];
  const blended = blendDealHealthWithActivityMomentum(baseByQuadrant, activity);
  const timelineLen = (file.timeline ?? []).length;
  const meaningfulHits = activity.meaningfulEventCount30d;

  // Reconstruct activity component scores (already on intelligence.components)
  const components = activity.components;

  return {
    dealNumber: file.dealNumber || file.fileNumber || file.id,
    fileId: file.id,
    enterpriseDealId: file.enterpriseDealId ?? null,
    borrower: file.customerName || "",
    stage: file.stage || "",
    operationalStatus: file.status || "",
    currentScore: classified.dealHealthScore,
    previousScore: null,
    quadrant: classified.quadrant,
    classificationReason: classified.classificationReason,
    recommendation: classified.recommendation,
    activityMomentumScore: activity.momentumScore,
    activityState: activity.state,
    activityStateLabel: activity.stateLabel,
    isHealthyWaiting: activity.isHealthyWaiting,
    daysSinceMeaningfulActivity: activity.daysSinceMeaningfulActivity,
    idleDaysAnyTimeline: classified.signals.idleDays,
    daysInStage: classified.signals.daysInStage,
    pendingDocs: classified.signals.pendingDocs,
    openTasks: classified.signals.openTasks,
    overdueTasks: classified.signals.overdueTasks,
    documentCompleteness: classified.signals.documentCompleteness,
    terminalLenders: classified.signals.terminalLenders,
    activeLenders: classified.signals.activeLenders,
    onHold: classified.signals.onHold,
    delayed: classified.signals.delayed,
    atRiskFlag: classified.signals.atRiskFlag,
    timelineEventCount: timelineLen,
    meaningfulEventCount30d: meaningfulHits,
    lastActivityIso: lastActivityIso(file) || null,
    scoreBreakdown: {
      quadrantBaseAnchor: baseByQuadrant,
      activityComponents: {
        recency: components.recency,
        frequency: components.frequency,
        significance: components.significance,
        timelineAdherence: components.timelineAdherence,
      },
      activityMomentum: activity.momentumScore,
      blendAdjMax: ACTIVITY_HEALTH_BLEND.maxAdj,
      blendNeutral: ACTIVITY_HEALTH_BLEND.neutralScore,
      blendedDealHealth: blended,
      note:
        "Radar Deal Health is NOT Activity+Stage+Docs+Timeline additive. It is quadrant anchor ± activity blend.",
    },
    // Explicit "requested style" pseudo-breakdown for audit readability
    requestedStyleBreakdown: {
      activity: `${components.recency} recency / ${components.frequency} frequency / ${components.significance} significance (momentum ${activity.momentumScore}/100)`,
      stageProgress: `daysInStage=${classified.signals.daysInStage} (classification signal only — not a scored subtotal)`,
      documents: `completeness=${Math.round(classified.signals.documentCompleteness * 100)}% pending=${classified.signals.pendingDocs} (classification signal only)`,
      timeline: `idleAnyTimeline=${classified.signals.idleDays}d meaningfulIdle=${activity.daysSinceMeaningfulActivity}d (dual clocks)`,
      risk: `atRiskFlag=${classified.signals.atRiskFlag} onHold=${classified.signals.onHold} overdueTasks=${classified.signals.overdueTasks} delayed=${classified.signals.delayed} activityState=${activity.state}`,
      total: classified.dealHealthScore,
    },
  };
});

const quadrantCounts = {
  on_track: dealRows.filter((d) => d.quadrant === "on_track").length,
  follow_up_required: dealRows.filter((d) => d.quadrant === "follow_up_required").length,
  needs_attention: dealRows.filter((d) => d.quadrant === "needs_attention").length,
  at_risk: dealRows.filter((d) => d.quadrant === "at_risk").length,
};

const emptyTimeline = dealRows.filter((d) => d.timelineEventCount === 0).length;
const noMeaningful = dealRows.filter((d) => d.meaningfulEventCount30d === 0).length;
const atRiskViaActivityState = dealRows.filter(
  (d) => d.quadrant === "at_risk" && d.activityState === "at_risk",
).length;

const scores = dealRows.map((d) => d.currentScore);
const avg =
  scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

const evidence = {
  auditId: "CO-RADAR-001",
  generatedAt: new Date().toISOString(),
  nature: "read_only_forensic_diagnostic",
  dataSource: {
    consumer: "chanakya_radar",
    source: hydrated.source,
    fileCount: files.length,
  },
  portfolio: {
    activeDealCount: dealRows.length,
    averageDealHealthDisplayed: dashboard.vector.healthScore,
    averageDealHealthMeanOfRows: avg,
    quadrantCounts,
    pctAtRisk:
      dealRows.length > 0
        ? Math.round((quadrantCounts.at_risk / dealRows.length) * 1000) / 10
        : 0,
    emptyTimelineCount: emptyTimeline,
    noMeaningfulActivity30dCount: noMeaningful,
    atRiskWithActivityStateAtRisk: atRiskViaActivityState,
  },
  formulaNotes: {
    healthScoreByQuadrant: T.healthScoreByQuadrant,
    blend: ACTIVITY_HEALTH_BLEND,
    expectedFloorWhenAllAtRiskLowMomentum:
      T.healthScoreByQuadrant.at_risk - ACTIVITY_HEALTH_BLEND.maxAdj,
  },
  deals: dealRows,
};

writeFileSync(
  join(outDir, "CO-RADAR-001-DEAL-DIAGNOSTICS.json"),
  JSON.stringify(evidence, null, 2),
);

console.log(
  JSON.stringify(
    {
      ...evidence.portfolio,
      formulaFloor: evidence.formulaNotes.expectedFloorWhenAllAtRiskLowMomentum,
      sample: dealRows.slice(0, 5).map((d) => ({
        dealNumber: d.dealNumber,
        score: d.currentScore,
        quadrant: d.quadrant,
        activityState: d.activityState,
        timeline: d.timelineEventCount,
        meaningful30d: d.meaningfulEventCount30d,
        reason: d.classificationReason,
      })),
    },
    null,
    2,
  ),
);
