/**
 * CO-REFINEMENT-004 — Map certified EBI snapshot → Operations Intelligence chart DTOs.
 * Reuses EME/EBI SSOT — never duplicates deal/stage formulas.
 */

import type { EbiSnapshot } from "@/types/enterprise-business-intelligence";
import type {
  EiFunnelStage,
  EiRadarAxis,
  EiTreemapCell,
} from "@/types/executive-intelligence-platform";

const TREEMAP_FILLS = [
  "#0F766E",
  "#0369A1",
  "#B45309",
  "#4F46E5",
  "#64748B",
  "#BE123C",
  "#15803D",
];

/** Funnel stage colours — aligned with executive pipeline palette used across MC / EI. */
const FUNNEL_COLORS = [
  "#64748B",
  "#475569",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#14B8A6",
  "#22C55E",
];

function slugId(label: string, index: number): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return base || `stage_${index}`;
}

export type OperationsIntelligenceFromEbi = {
  asOf: string;
  funnel: EiFunnelStage[];
  treemap: EiTreemapCell[];
  radar: EiRadarAxis[];
  hasData: boolean;
};

export function deriveOperationsIntelligenceFromEbi(
  ebi: EbiSnapshot,
): OperationsIntelligenceFromEbi {
  const stages = ebi.executive.dealsByStage ?? [];
  const funnel: EiFunnelStage[] = stages.map((s, i) => {
    const prev = i > 0 ? stages[i - 1]!.count : null;
    return {
      id: slugId(s.name, i),
      label: s.name,
      count: s.count,
      value: s.value ?? 0,
      conversionFromPrior:
        prev != null && prev > 0 ? Math.round((s.count / prev) * 100) : null,
      color: FUNNEL_COLORS[i % FUNNEL_COLORS.length]!,
    };
  });

  const treemap: EiTreemapCell[] = (ebi.executive.dealsByProduct ?? []).map(
    (p, i) => ({
      name: p.name,
      size: Math.max(p.value ?? p.count, p.count),
      count: p.count,
      fill: TREEMAP_FILLS[i % TREEMAP_FILLS.length]!,
    }),
  );

  const radar: EiRadarAxis[] = (ebi.health.dimensions ?? []).map((d) => ({
    axis: d.label,
    value: d.score,
    fullMark: 100,
  }));

  const hasData =
    funnel.some((f) => f.count > 0) ||
    treemap.some((t) => t.count > 0) ||
    radar.some((r) => r.value > 0);

  return {
    asOf: ebi.asOf,
    funnel,
    treemap,
    radar,
    hasData,
  };
}
