/**
 * CO-RADAR-002 — READ-ONLY diagnostic (no formula/code fixes).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

import { CHANAKYA_RADAR_CLASSIFICATION_THRESHOLDS as T } from "../src/constants/chanakya-radar.ts";
import {
  ACTIVITY_HEALTH_BLEND,
  ACTIVITY_MOMENTUM_WEIGHTS,
} from "../src/constants/enterprise-activity-intelligence/index.ts";
import {
  blendDealHealthWithActivityMomentum,
  computeEnterpriseActivityIntelligence,
} from "../src/lib/enterprise-activity-intelligence/index.ts";
import { classifyOperationalDeal } from "../src/lib/chanakya-radar/classify-operational-deal.ts";
import { buildChanakyaRadarDashboard } from "../src/lib/chanakya-radar/derive-dashboard.ts";
import { hydrateRadarDealFiles } from "../src/lib/chanakya-radar/radar-deal-source.ts";
import { mapEnterpriseDealToLoanFileStub } from "../src/lib/enterprise-deal/map-deal-to-loan-file.ts";
import type { LoanFile } from "../src/types/catalyst-one.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs", "co-radar-002");
mkdirSync(outDir, { recursive: true });

function emptyTimelineStub(input: {
  id: string;
  dealNumber: string;
  customerName: string;
  stage?: string;
  status?: LoanFile["status"];
  daysInStage?: number;
  createdAt?: string;
}): LoanFile {
  const now = new Date().toISOString();
  return {
    id: input.id,
    enterpriseDealId: input.id,
    dealNumber: input.dealNumber,
    fileNumber: input.dealNumber,
    customerId: `cust-${input.id}`,
    customerName: input.customerName,
    customerMobile: "",
    customerEmail: "",
    city: "",
    state: "",
    employmentType: "",
    lendingType: "",
    transactionType: "",
    loanProduct: "Home Loan",
    loanAmount: 5_000_000,
    requiredAmount: 5_000_000,
    lender: "Sample Bank",
    stage: (input.stage as LoanFile["stage"]) || "logged_in",
    relationshipManager: "RM",
    priority: "medium",
    daysInStage: input.daysInStage ?? 0,
    expectedRevenue: 0,
    revenuePercent: 0,
    revenueReceived: 0,
    expectedDisbursement: now,
    loginDate: input.createdAt || now,
    expectedLoginDate: input.createdAt || now,
    sanctionAmount: 0,
    disbursementAmount: 0,
    interestRate: 0,
    tenure: 0,
    status: input.status || "on_track",
    progress: 0,
    createdAt: input.createdAt || new Date(Date.now() - 20 * 86400000).toISOString(),
    documents: [],
    tasks: [],
    timeline: [],
    internalNotes: "",
    isUrgent: false,
    isDelayed: false,
    archived: false,
  };
}

function diagnoseFile(file: LoanFile, sourceNote: string) {
  const classified = classifyOperationalDeal(file);
  const activity = classified.activityIntelligence;
  const base = T.healthScoreByQuadrant[classified.quadrant];
  const rawBlend =
    ((activity.momentumScore - ACTIVITY_HEALTH_BLEND.neutralScore) /
      (100 - ACTIVITY_HEALTH_BLEND.neutralScore)) *
    ACTIVITY_HEALTH_BLEND.maxAdj;
  const blendAdj = activity.isHealthyWaiting ? Math.max(0, rawBlend) : rawBlend;
  const finalScore = blendDealHealthWithActivityMomentum(base, activity);

  const atRiskTriggers: string[] = [];
  const s = classified.signals;
  const idleForClass = s.isHealthyWaiting ? 0 : s.idleDays;
  if (s.atRiskFlag) atRiskTriggers.push("file.status === at_risk");
  if (s.onHold) atRiskTriggers.push("lender on hold");
  if (s.terminalLenders >= T.atRisk.minTerminalLenders)
    atRiskTriggers.push(`terminalLenders>=${T.atRisk.minTerminalLenders}`);
  if (s.overdueTasks >= T.atRisk.minOverdueTasks)
    atRiskTriggers.push(`overdueTasks>=${T.atRisk.minOverdueTasks}`);
  if (s.daysInStage >= T.atRisk.criticalAgeingDays)
    atRiskTriggers.push(`daysInStage>=${T.atRisk.criticalAgeingDays}`);
  if (s.delayed && idleForClass >= T.atRisk.minIdleDays)
    atRiskTriggers.push("delayed && idle>=10");
  if (
    s.documentCompleteness < T.atRisk.maxDocumentCompleteness &&
    s.pendingDocs > 0 &&
    idleForClass >= T.atRisk.minIdleDays
  )
    atRiskTriggers.push("low doc completeness + pending + idle>=10");
  if (activity.state === "at_risk")
    atRiskTriggers.push("activity.state === at_risk");

  const bonuses: string[] = [];
  const penalties: string[] = [];
  if (activity.state === "healthy_waiting")
    bonuses.push("Healthy Waiting: momentum floor ≥72; negative blend blocked");
  if (activity.state === "active_today")
    bonuses.push("Active Today: momentum floor ≥82");
  if (activity.state === "at_risk")
    penalties.push("Activity at_risk: momentum capped ≤32");
  if (blendAdj < 0)
    penalties.push(
      `Activity blend penalty ${Math.round(blendAdj * 100) / 100} (momentum ${activity.momentumScore} vs neutral ${ACTIVITY_HEALTH_BLEND.neutralScore})`,
    );
  if (blendAdj > 0)
    bonuses.push(`Activity blend bonus +${Math.round(blendAdj * 100) / 100}`);

  const rawMomentum =
    activity.components.recency * ACTIVITY_MOMENTUM_WEIGHTS.recency +
    activity.components.frequency * ACTIVITY_MOMENTUM_WEIGHTS.frequency +
    activity.components.significance * ACTIVITY_MOMENTUM_WEIGHTS.significance +
    activity.components.timelineAdherence *
      ACTIVITY_MOMENTUM_WEIGHTS.timelineAdherence;

  return {
    sourceNote,
    dealNumber: file.dealNumber || file.fileNumber || file.id,
    fileId: file.id,
    enterpriseDealId: file.enterpriseDealId ?? null,
    borrower: file.customerName || "",
    stage: file.stage || "",
    operationalStatus: file.status || "",
    currentHealthScore: classified.dealHealthScore,
    scoreScale: "0–100",
    rawCalculation: {
      step1_quadrant: classified.quadrant,
      step2_quadrantAnchor: base,
      step3_activityMomentumRawApprox: Math.round(rawMomentum * 10) / 10,
      step4_activityMomentumAfterStateCaps: activity.momentumScore,
      step5_blendAdj: Math.round(blendAdj * 100) / 100,
      step6_final: `clamp(0..100, round(${base} + ${blendAdj.toFixed(2)})) = ${finalScore}`,
    },
    scoringComponents: {
      activityMomentum: {
        recency: activity.components.recency,
        frequency: activity.components.frequency,
        significance: activity.components.significance,
        timelineAdherence: activity.components.timelineAdherence,
        weights: ACTIVITY_MOMENTUM_WEIGHTS,
        momentumScore: activity.momentumScore,
        state: activity.state,
      },
      quadrantAnchor: base,
      note: "Stage/Docs/Timeline/Risk are classification gates — not additive Deal Health subtotals.",
      classificationSignals: {
        daysInStage: s.daysInStage,
        idleDaysAnyTimeline: s.idleDays,
        idleForClass,
        pendingDocs: s.pendingDocs,
        openTasks: s.openTasks,
        overdueTasks: s.overdueTasks,
        documentCompleteness: s.documentCompleteness,
        terminalLenders: s.terminalLenders,
        activeLenders: s.activeLenders,
        onHold: s.onHold,
        delayed: s.delayed,
        atRiskFlag: s.atRiskFlag,
        daysSinceMeaningfulActivity: activity.daysSinceMeaningfulActivity,
        timelineEventCount: (file.timeline ?? []).length,
        meaningfulEventCount30d: activity.meaningfulEventCount30d,
      },
    },
    penaltiesApplied: penalties,
    bonusesApplied: bonuses,
    finalClassification: classified.quadrant,
    classificationReason: classified.classificationReason,
    whyAtRisk:
      classified.quadrant === "at_risk"
        ? {
            triggersMatched: atRiskTriggers,
            primaryExplanation:
              activity.state === "at_risk" &&
              activity.daysSinceMeaningfulActivity >= 10
                ? `No meaningful timeline activity (daysSinceMeaningful=${activity.daysSinceMeaningfulActivity}) → Activity Intelligence state=at_risk → Decision Engine forces At Risk → health floor 6.`
                : classified.classificationReason,
          }
        : null,
    recommendation: classified.recommendation,
  };
}

const hydrated = await hydrateRadarDealFiles();
let files: LoanFile[] = hydrated.files ?? [];
const dbMeta: {
  attempted: boolean;
  dealCount: number;
  timelineEventCount: number;
  dealsWithTimelineEvents: number;
  error: string | null;
  dealSummaries: Array<{
    id: string;
    dealNumber: string;
    customerName: string | null;
    grossStage: string;
    operationalStatus: string;
    timelineEventsInDb: number;
    stubTimelineLen: number;
  }>;
} = {
  attempted: false,
  dealCount: 0,
  timelineEventCount: 0,
  dealsWithTimelineEvents: 0,
  error: null,
  dealSummaries: [],
};

const prisma = new PrismaClient();
try {
  dbMeta.attempted = true;
  const deals = await prisma.enterpriseDeal.findMany({
    where: { isDeleted: false, archived: false },
    take: 50,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      dealNumber: true,
      opportunityId: true,
      productLabel: true,
      grossStage: true,
      subStage: true,
      operationalStatus: true,
      lifecycleStatus: true,
      relationshipManagerName: true,
      requestedAmount: true,
      approvedAmount: true,
      fulfilledAmount: true,
      priority: true,
      archived: true,
      createdAt: true,
      updatedAt: true,
      daysInStage: true,
      primaryContactName: true,
      primaryContactMobile: true,
      primaryCounterpartyName: true,
      fileNumber: true,
      _count: { select: { timelineEvents: true } },
    },
  });
  dbMeta.dealCount = deals.length;
  dbMeta.timelineEventCount = deals.reduce(
    (s, d) => s + (d._count.timelineEvents ?? 0),
    0,
  );
  dbMeta.dealsWithTimelineEvents = deals.filter(
    (d) => (d._count.timelineEvents ?? 0) > 0,
  ).length;

  if (files.length === 0 && deals.length > 0) {
    files = deals.map((d) =>
      mapEnterpriseDealToLoanFileStub({
        id: d.id,
        dealNumber: d.dealNumber,
        opportunityId: d.opportunityId,
        fileNumber: d.fileNumber,
        productLabel: d.productLabel,
        grossStage: d.grossStage,
        subStage: d.subStage,
        operationalStatus: d.operationalStatus,
        relationshipManagerName: d.relationshipManagerName,
        requiredAmount:
          d.requestedAmount != null ? Number(d.requestedAmount) : null,
        approvedAmount:
          d.approvedAmount != null ? Number(d.approvedAmount) : null,
        fulfilledAmount:
          d.fulfilledAmount != null ? Number(d.fulfilledAmount) : null,
        priority: d.priority,
        archived: d.archived,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        primaryContactName: d.primaryContactName,
        primaryContactMobile: d.primaryContactMobile,
        primaryCounterpartyName: d.primaryCounterpartyName,
      } as never),
    );
  }

  for (const d of deals) {
    const stubTimeline =
      files.find((f) => f.enterpriseDealId === d.id || f.id === d.id)?.timeline
        ?.length ?? 0;
    dbMeta.dealSummaries.push({
      id: d.id,
      dealNumber: d.dealNumber,
      customerName: d.primaryContactName,
      grossStage: d.grossStage,
      operationalStatus: d.operationalStatus,
      timelineEventsInDb: d._count.timelineEvents ?? 0,
      stubTimelineLen: stubTimeline,
    });
  }
} catch (e) {
  dbMeta.error = e instanceof Error ? e.message : String(e);
} finally {
  await prisma.$disconnect();
}

const reconstructed = files.length === 0;
if (reconstructed) {
  files = Array.from({ length: 12 }, (_, i) =>
    emptyTimelineStub({
      id: `diag-stub-${i + 1}`,
      dealNumber: `OBS-DEAL-${String(i + 1).padStart(3, "0")}`,
      customerName: `Observed Active Deal ${i + 1}`,
    }),
  );
}

const dealDiagnostics = files.map((f) =>
  diagnoseFile(
    f,
    reconstructed
      ? "reconstructed_empty_timeline_stub_matching_observed_symptoms"
      : hydrated.files?.length
        ? `hydrate:${hydrated.source}`
        : "prisma_mapEnterpriseDealToLoanFileStub_timeline_always_empty",
  ),
);

const dashboard = buildChanakyaRadarDashboard(files);
const scores = dealDiagnostics.map((d) => d.currentHealthScore);
const avg =
  scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

const histogram: Record<string, number> = {};
for (const s of scores) {
  const bucket = String(s);
  histogram[bucket] = (histogram[bucket] ?? 0) + 1;
}

const quadrantCounts = {
  on_track: dealDiagnostics.filter((d) => d.finalClassification === "on_track")
    .length,
  follow_up_required: dealDiagnostics.filter(
    (d) => d.finalClassification === "follow_up_required",
  ).length,
  needs_attention: dealDiagnostics.filter(
    (d) => d.finalClassification === "needs_attention",
  ).length,
  at_risk: dealDiagnostics.filter((d) => d.finalClassification === "at_risk")
    .length,
};

const report = {
  auditId: "CO-RADAR-002",
  nature: "diagnosis_only_no_fixes",
  generatedAt: new Date().toISOString(),
  observedSymptoms: {
    avgDealHealth: 6,
    activeDeals: 12,
    atRisk: 12,
    onTrack: 0,
    followUpRequired: 0,
    needsAttention: 0,
  },
  workstationHydrate: {
    source: hydrated.source,
    fileCount: hydrated.files?.length ?? 0,
  },
  dbMeta,
  reconstructedPopulation: reconstructed,
  reconstructionNote: reconstructed
    ? "Workstation hydrate returned 0 deals and Prisma enumeration failed or was empty. Population of 12 empty-timeline stubs was reconstructed to match observed symptoms."
    : dbMeta.dealSummaries.some((d) => d.timelineEventsInDb > 0 && d.stubTimelineLen === 0)
      ? "CRITICAL: DB has EnterpriseDealTimelineEvent rows but mapEnterpriseDealToLoanFileStub projects timeline:[]. Radar Activity Intelligence never sees Deal timeline events."
      : null,
  portfolioResult: {
    activeDealCount: dealDiagnostics.length,
    averageDealHealthDisplayed: dashboard.vector.healthScore,
    averageDealHealthMeanOfRows: avg,
    quadrantCounts,
    scoreHistogram: histogram,
  },
  formula: {
    dealHealthScale: "0–100 (not 0–10)",
    averageMethod:
      "round(mean(dealHealthScore of each active Radar row)); overrides Operational Vector weighted health",
    perDeal:
      "classify → quadrant anchor → blend with Activity Momentum (±12); Healthy Waiting blocks negative blend",
    healthScoreByQuadrant: T.healthScoreByQuadrant,
    activityMomentumWeights: ACTIVITY_MOMENTUM_WEIGHTS,
    blend: ACTIVITY_HEALTH_BLEND,
    mathematicalFloorAtRiskLowMomentum:
      T.healthScoreByQuadrant.at_risk - ACTIVITY_HEALTH_BLEND.maxAdj,
    penaltiesCumulative:
      "Classification gates are OR (first At Risk match wins). Activity blend is a single additive adjustment (±12), not stacked sub-penalties on Deal Health. Momentum state caps apply before blend.",
    missingActivitiesForceZero:
      "No — missing meaningful activity does NOT force score to 0. It forces activity.state=at_risk → quadrant At Risk → floor of 6 (18−12).",
    stubTimelineAlwaysEmpty:
      "mapEnterpriseDealToLoanFileStub hardcodes timeline: [] — Deal Registry timeline events are not projected into Radar inputs.",
  },
  bankReasonablenessVerdict:
    "No. A real bank would not treat 100% of an active book as At Risk with Average Deal Health 6 as operational truth when the measurement path treats missing/unprojected meaningful activity as critical neglect. Mathematically consistent with code; unreasonable as business classification.",
  deals: dealDiagnostics,
};

writeFileSync(
  join(outDir, "CO-RADAR-002-DEAL-DIAGNOSTICS.json"),
  JSON.stringify(report, null, 2),
);

console.log(
  JSON.stringify(
    {
      reconstructed,
      hydrateCount: hydrated.files?.length ?? 0,
      dbDealCount: dbMeta.dealCount,
      dbTimelineEvents: dbMeta.timelineEventCount,
      dbError: dbMeta.error,
      portfolio: report.portfolioResult,
      floor: report.formula.mathematicalFloorAtRiskLowMomentum,
      projectionGap: report.reconstructionNote,
      firstDeal: dealDiagnostics[0]
        ? {
            deal: dealDiagnostics[0].dealNumber,
            score: dealDiagnostics[0].currentHealthScore,
            calc: dealDiagnostics[0].rawCalculation,
            why: dealDiagnostics[0].whyAtRisk,
            penalties: dealDiagnostics[0].penaltiesApplied,
            bonuses: dealDiagnostics[0].bonusesApplied,
          }
        : null,
    },
    null,
    2,
  ),
);
