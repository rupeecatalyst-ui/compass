/**
 * CO-BIZ-003 Phase 1 — Executive KPI Engine (compose only).
 * Deal counts/values from Radar Deal DAL; stages via STAGE_LABELS.
 */

import { STAGE_LABELS } from "@/constants/loan-pipeline";
import type { EbiExecutiveKpis, EbiNamedCount } from "@/types/enterprise-business-intelligence";
import type { LoanFile } from "@/types/catalyst-one";
import { amountOf, type EbiDataContext } from "./snapshot";

function groupCountValue(
  files: LoanFile[],
  keyFn: (f: LoanFile) => string,
): EbiNamedCount[] {
  const map = new Map<string, { count: number; value: number }>();
  for (const f of files) {
    const name = keyFn(f).trim() || "Unassigned";
    const cur = map.get(name) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += amountOf(f);
    map.set(name, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, count: v.count, value: v.value }))
    .sort((a, b) => b.count - a.count || b.value! - a.value!);
}

export function deriveExecutiveKpis(ctx: EbiDataContext): EbiExecutiveKpis {
  const files = ctx.files;
  const active = files.filter((f) => f.stage !== "won");
  const won = files.filter((f) => f.stage === "won");

  const opportunityIds = new Set(
    active
      .map((f) => f.opportunityNumber || "")
      .filter(Boolean),
  );

  const pipelineValue = active.reduce((s, f) => s + amountOf(f), 0);
  const expectedRevenue = active.reduce((s, f) => s + (f.expectedRevenue || 0), 0);
  const averageDealSize =
    active.length === 0
      ? 0
      : Math.round(pipelineValue / active.length);

  const avgDays =
    active.length === 0
      ? 0
      : Math.round(
          active.reduce((s, f) => s + (f.daysInStage || 0), 0) / active.length,
        );

  const conversionDenom = active.length + won.length;
  const conversionRatioPct =
    conversionDenom === 0
      ? 0
      : Math.round((won.length / conversionDenom) * 1000) / 10;

  return {
    asOf: ctx.asOf,
    activeOpportunities: opportunityIds.size || active.length,
    activeDeals: active.length,
    dealsByStage: groupCountValue(active, (f) => STAGE_LABELS[f.stage] ?? f.stage),
    dealsByProduct: groupCountValue(active, (f) => f.loanProduct || "Unknown"),
    dealsByBranch: groupCountValue(active, (f) => f.city || "Unassigned Branch"),
    dealsByRm: groupCountValue(active, (f) => f.relationshipManager || "Unassigned RM"),
    averageDealSize,
    averageProcessingDays: avgDays,
    pipelineValue,
    conversionRatioPct,
    expectedRevenue,
    sourceModules: [
      "Deal Registry (Radar DAL)",
      "Chanakya Radar Dashboard",
      "STAGE_LABELS",
    ],
  };
}
