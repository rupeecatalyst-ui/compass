/**
 * CO-LW-004 — Lending Programs dashboard analytics (presentation derive).
 * Consumes live Deal pipeline + published programmes — no new metric SSOT formulas.
 */

import { LP_CHART_COLORS } from "@/constants/lending-programs-workspace";
import { LENDER_CASE_STAGE_LABELS } from "@/constants/lender-pipeline";
import type { LenderCaseStage } from "@/types/catalyst-one";
import type { DashboardNamedSlice } from "@/types/dashboard-visual-analytics";
import type { EiFunnelStage } from "@/types/executive-intelligence-platform";
import type {
  LendingProgramsLivePipeline,
  LendingProgramsSnapshot,
} from "@/types/lending-programs-workspace";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";
import { normalizeLenderCaseStage } from "@/constants/lender-pipeline";

const FUNNEL_ORDER: LenderCaseStage[] = [
  "identified",
  "prelogin",
  "logged_in_wip",
  "soft_approved",
  "final_approved",
  "closure_wip",
  "disbursed",
];

function colorAt(i: number): string {
  return LP_CHART_COLORS[i % LP_CHART_COLORS.length]!;
}

export function deriveStageDistribution(
  pipeline: LendingProgramsLivePipeline | null,
): DashboardNamedSlice[] {
  if (!pipeline?.activeDealStages.length) return [];
  return pipeline.activeDealStages
    .map((s, i) => {
      const stage = normalizeLenderCaseStage(s.stage);
      return {
        key: s.stage,
        label: LENDER_CASE_STAGE_LABELS[stage] ?? s.stage,
        count: s.count,
        value: s.count,
        color: colorAt(i),
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function derivePipelineFunnel(
  pipeline: LendingProgramsLivePipeline | null,
): EiFunnelStage[] {
  if (!pipeline || pipeline.dealCount === 0) return [];
  const byStage = new Map(
    pipeline.activeDealStages.map((s) => [
      normalizeLenderCaseStage(s.stage),
      s.count,
    ]),
  );
  let priorCount: number | null = null;
  return FUNNEL_ORDER.map((id, i) => {
    const count = byStage.get(id) ?? 0;
    const conversionFromPrior =
      priorCount != null && priorCount > 0 ? Math.round((count / priorCount) * 100) : null;
    priorCount = count;
    return {
      id,
      label: LENDER_CASE_STAGE_LABELS[id],
      count,
      value: count,
      conversionFromPrior,
      color: colorAt(i),
    };
  });
}

export function deriveApprovalRejection(
  pipeline: LendingProgramsLivePipeline | null,
): DashboardNamedSlice[] {
  if (!pipeline) return [];
  let approved = 0;
  let rejected = 0;
  let other = 0;
  for (const s of pipeline.activeDealStages) {
    const stage = normalizeLenderCaseStage(s.stage);
    if (stage === "soft_approved" || stage === "final_approved" || stage === "disbursed") {
      approved += s.count;
    } else if (stage === "lost") {
      rejected += s.count;
    } else {
      other += s.count;
    }
  }
  const slices: DashboardNamedSlice[] = [];
  if (approved > 0) {
    slices.push({
      key: "approved",
      label: "Approved path",
      count: approved,
      value: approved,
      color: "#059669",
    });
  }
  if (rejected > 0) {
    slices.push({
      key: "rejected",
      label: "Lost / Rejected",
      count: rejected,
      value: rejected,
      color: "#e11d48",
    });
  }
  if (other > 0) {
    slices.push({
      key: "in_flight",
      label: "In flight",
      count: other,
      value: other,
      color: "#0284c7",
    });
  }
  return slices;
}

export function deriveProductMixFromPrograms(
  programs: EnterpriseLenderProgramRecord[],
): DashboardNamedSlice[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const p of programs) {
    const key = (p.productCode || "unspecified").trim() || "unspecified";
    const prev = map.get(key);
    if (prev) prev.count += 1;
    else map.set(key, { label: p.productCode || "Not Specified", count: 1 });
  }
  return [...map.entries()]
    .map(([key, v], i) => ({
      key,
      label: v.label,
      count: v.count,
      value: v.count,
      color: colorAt(i),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function deriveProgrammeCoverage(
  snapshot: LendingProgramsSnapshot,
  lenderId?: string | null,
): DashboardNamedSlice[] {
  const programs = lenderId
    ? snapshot.publishedPrograms.filter((p) => p.lenderId === lenderId)
    : snapshot.publishedPrograms;
  const byLender = new Map<string, number>();
  for (const p of programs) {
    byLender.set(p.lenderId, (byLender.get(p.lenderId) ?? 0) + 1);
  }
  return [...byLender.entries()]
    .map(([id, count], i) => {
      const lender = snapshot.lenders.find((l) => l.id === id);
      const label =
        lender?.displayName || lender?.label || lender?.code || id.slice(0, 8);
      return {
        key: id,
        label,
        count,
        value: count,
        color: colorAt(i),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function deriveCityDistribution(
  snapshot: LendingProgramsSnapshot,
  lenderId?: string | null,
): DashboardNamedSlice[] {
  const lenders = lenderId
    ? snapshot.lenders.filter((l) => l.id === lenderId)
    : snapshot.lenders;
  const map = new Map<string, number>();
  for (const l of lenders) {
    const cities =
      l.coverageCities?.filter(Boolean) ??
      (l.headquartersLabel ? [l.headquartersLabel] : []);
    if (cities.length === 0) {
      map.set("Not Specified", (map.get("Not Specified") ?? 0) + 1);
      continue;
    }
    for (const city of cities.slice(0, 3)) {
      const key = city.trim() || "Not Specified";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([label, count], i) => ({
      key: label,
      label,
      count,
      value: count,
      color: colorAt(i),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function deriveAverageTatDays(
  programs: EnterpriseLenderProgramRecord[],
): number | null {
  const values = programs
    .map((p) => p.averageTatDays)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function deriveMonthlyDisbursalTrend(
  pipeline: LendingProgramsLivePipeline | null,
): Array<{ period: string; count: number }> {
  if (!pipeline) return [];
  const monthMap = new Map<string, number>();
  for (const d of pipeline.recentDealLabels) {
    const stage = (d.stage || "").toLowerCase();
    if (!stage.includes("disburs")) continue;
    const at = d.updatedAt?.slice(0, 7);
    if (!at) continue;
    monthMap.set(at, (monthMap.get(at) ?? 0) + 1);
  }
  return [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([period, count]) => ({ period, count }));
}

/** Factual relationship signals — never a fabricated Relationship Score. */
export function deriveRelationshipSignals(input: {
  teamCount: number;
  dealCount: number;
  activityCount: number;
  programmeCount: number;
}): DashboardNamedSlice[] {
  return [
    {
      key: "team",
      label: "Team contacts",
      count: input.teamCount,
      value: input.teamCount,
      color: "#0f766e",
    },
    {
      key: "deals",
      label: "Live deals",
      count: input.dealCount,
      value: input.dealCount,
      color: "#0284c7",
    },
    {
      key: "activities",
      label: "Recent activities",
      count: input.activityCount,
      value: input.activityCount,
      color: "#c4a35a",
    },
    {
      key: "programmes",
      label: "Programmes",
      count: input.programmeCount,
      value: input.programmeCount,
      color: "#7c3aed",
    },
  ];
}
