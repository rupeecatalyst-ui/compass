/**
 * CO-BIZ-003 Phase 5 — Business Health Score (compose dimensions; no parallel Radar math).
 * Pipeline Health uses Radar Operational Vector healthScore (SSOT).
 */

import type {
  EbiBusinessHealthScore,
  EbiDimensionStatus,
  EbiExecutiveKpis,
  EbiHealthDimension,
  EbiOperationalKpis,
  EbiTeamPerformance,
} from "@/types/enterprise-business-intelligence";
import type { EbiDataContext } from "./snapshot";

function statusFromScore(score: number): EbiDimensionStatus {
  if (score >= 75) return "healthy";
  if (score >= 50) return "watch";
  return "impaired";
}

export function deriveBusinessHealthScore(input: {
  ctx: EbiDataContext;
  executive: EbiExecutiveKpis;
  operational: EbiOperationalKpis;
  team: EbiTeamPerformance;
}): EbiBusinessHealthScore {
  const { ctx, executive, operational, team } = input;
  const vectorScore = Math.round(ctx.radar.vector.healthScore);

  const active = Math.max(1, executive.activeDeals);
  const inactivePct = (operational.inactiveOpportunities / active) * 100;
  /** CO-MC-001 — prefer mean Activity Momentum from Radar rows when present. */
  const momentumRows = ctx.radar.rows;
  const avgMomentum =
    momentumRows.length > 0
      ? Math.round(
          momentumRows.reduce((s, r) => s + (r.activityMomentumScore ?? 0), 0) /
            momentumRows.length,
        )
      : null;
  const customerActivity =
    avgMomentum != null
      ? Math.max(0, Math.min(100, avgMomentum))
      : Math.max(0, Math.min(100, Math.round(100 - inactivePct)));

  const taskHealth = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          Math.min(60, operational.overdueTasks * 4) -
          Math.min(30, operational.tasksDueToday * 2),
      ),
    ),
  );

  const executionHealth = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          Math.min(40, operational.dealsAwaitingLenderAction * 2) -
          Math.min(30, operational.dealsAwaitingDocuments * 2),
      ),
    ),
  );

  const documentProgress = operational.documentCollectionProgressPct;
  const conversionPerformance = Math.max(
    0,
    Math.min(100, Math.round(executive.conversionRatioPct * 2)),
  );

  const dimensions: EbiHealthDimension[] = [
    {
      id: "pipeline",
      label: "Pipeline Health",
      score: vectorScore,
      status: statusFromScore(vectorScore),
      detail: `Operational Vector ${ctx.radar.vector.direction} · concern ${ctx.radar.hoverSummary.largestConcern}`,
    },
    {
      id: "execution",
      label: "Execution Health",
      score: executionHealth,
      status: statusFromScore(executionHealth),
      detail: `${operational.dealsAwaitingLenderAction} awaiting lender · ${operational.dealsAwaitingDocuments} awaiting documents`,
    },
    {
      id: "tasks",
      label: "Task Health",
      score: taskHealth,
      status: statusFromScore(taskHealth),
      detail: `${operational.overdueTasks} overdue · ${operational.tasksDueToday} due today (ETE)`,
    },
    {
      id: "customer",
      label: "Customer Activity",
      score: customerActivity,
      status: statusFromScore(customerActivity),
      detail:
        avgMomentum != null
          ? `Activity Momentum ${avgMomentum} · ${operational.inactiveOpportunities} neglect (≥5d, excl. Healthy Waiting)`
          : `${operational.inactiveOpportunities} inactive ≥5 days`,
    },
    {
      id: "documents",
      label: "Document Progress",
      score: documentProgress,
      status: statusFromScore(documentProgress),
      detail: `Collection progress ~${documentProgress}%`,
    },
    {
      id: "conversion",
      label: "Conversion Performance",
      score: conversionPerformance,
      status: statusFromScore(conversionPerformance),
      detail: `Won share of book ${executive.conversionRatioPct}%`,
    },
  ];

  const weights: Record<string, number> = {
    pipeline: 0.25,
    execution: 0.2,
    tasks: 0.15,
    customer: 0.1,
    documents: 0.15,
    conversion: 0.15,
  };
  const overallScore = Math.round(
    dimensions.reduce((s, d) => s + d.score * (weights[d.id] ?? 0), 0),
  );

  const top = team.members[0];
  const summary =
    overallScore >= 75
      ? `Business health is solid${top ? ` — ${top.name} leads turnaround efficiency` : ""}.`
      : overallScore >= 50
        ? "Business health needs attention — review overdue tasks and inactive opportunities."
        : "Business health is impaired — prioritise at-risk pipeline and document delays.";

  return {
    asOf: ctx.asOf,
    overallScore,
    status: statusFromScore(overallScore),
    dimensions,
    summary,
    sourceModules: [
      "Chanakya Operational Vector",
      "Enterprise Task Engine",
      "Radar Deal rows",
    ],
  };
}
