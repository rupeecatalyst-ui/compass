/**
 * CO-MC-002 — CHANAKYA Intelligence compose layer.
 * Consumes Radar dashboard + Activity Intelligence — never reimplements formulas.
 * Additive Mission Control module — does not mutate Radar / Executive Briefing.
 */

import {
  CHANAKYA_INTELLIGENCE_HEAT_DIMENSIONS,
  CHANAKYA_INTELLIGENCE_RIVER_STAGES,
  DEFAULT_CHANAKYA_INTELLIGENCE_FILTERS,
} from "@/constants/chanakya-intelligence";
import { ROUTES } from "@/constants/routes";
import {
  buildChanakyaRadarDashboard,
  type ChanakyaRadarDealRow,
} from "@/lib/chanakya-radar/derive-dashboard";
import {
  hydrateRadarDealFiles,
  loadRadarDealFilesSync,
  listActiveRadarDealFiles,
} from "@/lib/chanakya-radar/radar-deal-source";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";
import type { LoanFile } from "@/types/catalyst-one";
import type { ChanakyaOperationalQuadrantId } from "@/constants/chanakya-radar";
import type {
  ChanakyaIntelligenceFilters,
  ChanakyaIntelligenceGalaxyNode,
  ChanakyaIntelligenceHeatCell,
  ChanakyaIntelligenceHeatDimension,
  ChanakyaIntelligenceModel,
  ChanakyaIntelligenceNodeTone,
  ChanakyaIntelligencePulseMetric,
  ChanakyaIntelligenceRiverStage,
} from "@/types/chanakya-intelligence";

function toneFromQuadrant(q: ChanakyaOperationalQuadrantId): ChanakyaIntelligenceNodeTone {
  switch (q) {
    case "on_track":
      return "healthy";
    case "needs_attention":
      return "needs_attention";
    case "follow_up_required":
      return "follow_up";
    case "at_risk":
    default:
      return "at_risk";
  }
}

function toneFromScore(score: number): ChanakyaIntelligenceNodeTone {
  if (score >= 75) return "healthy";
  if (score >= 55) return "follow_up";
  if (score >= 35) return "needs_attention";
  return "at_risk";
}

/** Deterministic pseudo-random in [0,1) from string. */
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function matchesFilter(value: string, filter: string): boolean {
  if (!filter || filter === "all") return true;
  return value === filter;
}

function riverStageId(stageLabel: string): string {
  for (const stage of CHANAKYA_INTELLIGENCE_RIVER_STAGES) {
    if (stage.match.some((re) => re.test(stageLabel))) return stage.id;
  }
  return "opportunity";
}

function applyFilters(
  rows: ChanakyaRadarDealRow[],
  filters: ChanakyaIntelligenceFilters,
): ChanakyaRadarDealRow[] {
  return rows.filter((r) => {
    const branch = r.lender || "Unassigned";
    const team = r.assignedRm || "Unassigned";
    return (
      matchesFilter(r.product || "—", filters.product) &&
      matchesFilter(branch, filters.branch) &&
      matchesFilter(team, filters.team) &&
      matchesFilter(r.assignedRm || "—", filters.employee) &&
      matchesFilter(r.lender || "—", filters.partner) &&
      matchesFilter(r.stageLabel || "—", filters.stage)
    );
  });
}

function buildGalaxy(rows: ChanakyaRadarDealRow[]) {
  const nodes: ChanakyaIntelligenceGalaxyNode[] = rows.map((r) => {
    const product = r.product || "—";
    const branch = r.lender || "Unassigned";
    const employee = r.assignedRm || "Unassigned";
    const clusterSeed = `${product}|${branch}`;
    const cx = 0.18 + hash01(`cx:${clusterSeed}`) * 0.64;
    const cy = 0.18 + hash01(`cy:${clusterSeed}`) * 0.64;
    const jitterX = (hash01(`x:${r.id}`) - 0.5) * 0.16;
    const jitterY = (hash01(`y:${r.id}`) - 0.5) * 0.16;
    return {
      id: r.id,
      fileId: r.fileId,
      dealId: r.dealId,
      borrower: r.borrower,
      product,
      branch,
      team: employee,
      employee,
      partner: r.lender || "—",
      stage: r.stageLabel,
      quadrant: r.quadrant,
      tone: toneFromQuadrant(r.quadrant),
      amount: r.loanAmount,
      amountLabel: r.loanAmountLabel,
      activityMomentumScore: r.activityMomentumScore,
      activityState: r.activityState,
      x: Math.min(0.96, Math.max(0.04, cx + jitterX)),
      y: Math.min(0.96, Math.max(0.04, cy + jitterY)),
      href: buildDealWorkspaceHref({
        dealId: r.enterpriseDealId || r.fileId,
        fileId: r.fileId,
      }) || ROUTES.MY_DEALS,
    };
  });

  const clusterMap = new Map<
    string,
    { label: string; nodeIds: string[]; tones: ChanakyaIntelligenceNodeTone[] }
  >();
  for (const n of nodes) {
    const key = `${n.product} · ${n.branch}`;
    const existing = clusterMap.get(key) ?? {
      label: key,
      nodeIds: [],
      tones: [],
    };
    existing.nodeIds.push(n.id);
    existing.tones.push(n.tone);
    clusterMap.set(key, existing);
  }

  const clusters = [...clusterMap.entries()]
    .map(([key, c]) => {
      const severity =
        c.tones.includes("at_risk")
          ? "at_risk"
          : c.tones.includes("needs_attention")
            ? "needs_attention"
            : c.tones.includes("follow_up")
              ? "follow_up"
              : "healthy";
      return {
        key,
        label: c.label,
        count: c.nodeIds.length,
        tone: severity as ChanakyaIntelligenceNodeTone,
        nodeIds: c.nodeIds,
      };
    })
    .sort((a, b) => b.count - a.count);

  return { nodes, clusters };
}

function buildRiver(rows: ChanakyaRadarDealRow[]): {
  stages: ChanakyaIntelligenceRiverStage[];
  pipelineVelocity: number;
  overallConversionPct: number;
} {
  const buckets = CHANAKYA_INTELLIGENCE_RIVER_STAGES.map((s) => ({
    id: s.id,
    label: s.label,
    rows: [] as ChanakyaRadarDealRow[],
  }));

  for (const row of rows) {
    const id = riverStageId(row.stageLabel);
    const bucket = buckets.find((b) => b.id === id) ?? buckets[1]!;
    bucket.rows.push(row);
  }

  const maxVolume = Math.max(1, ...buckets.map((b) => b.rows.length));
  const stages: ChanakyaIntelligenceRiverStage[] = buckets.map((b, idx) => {
    const volume = b.rows.length;
    const avgDays =
      volume === 0
        ? 0
        : Math.round(
            b.rows.reduce((s, r) => s + Math.max(0, r.daysInStage || r.idleDays), 0) /
              volume,
          );
    const next = buckets[idx + 1];
    const dropOffPct =
      idx >= buckets.length - 1 || volume === 0
        ? 0
        : Math.max(
            0,
            Math.round(((volume - (next?.rows.length ?? 0)) / volume) * 100),
          );
    const conversionPct =
      idx === 0
        ? 100
        : Math.round((volume / Math.max(1, buckets[0]!.rows.length || maxVolume)) * 100);
    const isBottleneck = avgDays >= 8 || dropOffPct >= 40;
    return {
      id: b.id,
      label: b.label,
      volume,
      avgDays,
      dropOffPct,
      conversionPct,
      isBottleneck,
    };
  });

  const avgDaysAll =
    rows.length === 0
      ? 0
      : rows.reduce((s, r) => s + Math.max(1, r.daysInStage || r.idleDays || 1), 0) /
        rows.length;
  const pipelineVelocity = Math.round((100 / Math.max(1, avgDaysAll)) * 10) / 10;
  const last = stages[stages.length - 1];
  const first = stages[0];
  const overallConversionPct =
    !first || first.volume === 0
      ? 0
      : Math.round(((last?.volume ?? 0) / first.volume) * 100);

  return { stages, pipelineVelocity, overallConversionPct };
}

function buildHeat(
  rows: ChanakyaRadarDealRow[],
  dimension: ChanakyaIntelligenceHeatDimension,
): ChanakyaIntelligenceModel["heat"] {
  const pair = (r: ChanakyaRadarDealRow): { rowKey: string; colKey: string } => {
    switch (dimension) {
      case "employee_kpi":
        return {
          rowKey: r.assignedRm || "Unassigned",
          colKey:
            r.activityMomentumScore >= 70
              ? "High Momentum"
              : r.activityMomentumScore >= 45
                ? "Steady"
                : "Low Momentum",
        };
      case "partner_product":
        return { rowKey: r.lender || "—", colKey: r.product || "—" };
      case "stage_team":
        return { rowKey: r.stageLabel || "—", colKey: r.assignedRm || "Unassigned" };
      case "region_revenue":
        return {
          rowKey: r.lender || "Region/Branch",
          colKey:
            r.loanAmount >= 10_000_000
              ? "₹1Cr+"
              : r.loanAmount >= 5_000_000
                ? "₹50L–1Cr"
                : "Under ₹50L",
        };
      case "branch_product":
      default:
        return { rowKey: r.lender || "Unassigned", colKey: r.product || "—" };
    }
  };

  const cellMap = new Map<string, ChanakyaIntelligenceHeatCell>();
  for (const r of rows) {
    const { rowKey, colKey } = pair(r);
    const key = `${rowKey}||${colKey}`;
    const existing = cellMap.get(key);
    if (existing) {
      existing.value += 1;
      existing.dealIds.push(r.id);
      continue;
    }
    cellMap.set(key, {
      rowKey,
      colKey,
      rowLabel: rowKey,
      colLabel: colKey,
      value: 1,
      intensity: 0,
      tone: "healthy",
      dealIds: [r.id],
    });
  }

  const cells = [...cellMap.values()];
  const max = Math.max(1, ...cells.map((c) => c.value));
  for (const c of cells) {
    c.intensity = c.value / max;
    const score = Math.round((1 - c.intensity) * 40 + 40);
    // Higher concentration of at-risk deals → warmer tone
    const atRiskShare =
      rows.filter(
        (r) =>
          c.dealIds.includes(r.id) &&
          (r.quadrant === "at_risk" || r.quadrant === "needs_attention"),
      ).length / Math.max(1, c.value);
    c.tone =
      atRiskShare >= 0.5
        ? "at_risk"
        : atRiskShare >= 0.25
          ? "needs_attention"
          : c.intensity >= 0.7
            ? "follow_up"
            : toneFromScore(score);
  }

  return {
    dimension,
    rows: uniqueSorted(cells.map((c) => c.rowKey)).slice(0, 12),
    cols: uniqueSorted(cells.map((c) => c.colKey)).slice(0, 10),
    cells,
  };
}

function buildPulse(rows: ChanakyaRadarDealRow[]): ChanakyaIntelligenceModel["pulse"] {
  const n = Math.max(1, rows.length);
  const avgMomentum = Math.round(
    rows.reduce((s, r) => s + (r.activityMomentumScore ?? 0), 0) / n,
  );
  const activeToday = rows.filter((r) => r.workedToday).length;
  const healthyWaiting = rows.filter((r) => r.isHealthyWaiting).length;
  const needsFollowUp = rows.filter((r) => r.activityState === "needs_follow_up").length;
  const atRisk = rows.filter((r) => r.activityState === "at_risk").length;
  const docsPending = rows.filter((r) => r.pendingDocs > 0).length;
  const tasksOpen = rows.reduce((s, r) => s + r.openTasks, 0);
  const employees = new Set(rows.map((r) => r.assignedRm).filter(Boolean)).size;

  const enterprisePulseScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        avgMomentum * 0.55 +
          (activeToday / n) * 100 * 0.2 +
          (healthyWaiting / n) * 100 * 0.1 +
          Math.max(0, 100 - (needsFollowUp / n) * 100) * 0.1 +
          Math.max(0, 100 - (atRisk / n) * 100) * 0.05,
      ),
    ),
  );

  const metrics: ChanakyaIntelligencePulseMetric[] = [
    {
      id: "pulse",
      label: "Enterprise Pulse Score",
      value: enterprisePulseScore,
      hint: "Activity Intelligence · operational heartbeat",
      tone:
        enterprisePulseScore >= 70
          ? "success"
          : enterprisePulseScore >= 45
            ? "warning"
            : "danger",
    },
    {
      id: "active_users",
      label: "Active Users",
      value: employees,
      hint: "Distinct RMs on active book",
      tone: "info",
    },
    {
      id: "files_updated",
      label: "Files Updated Today",
      value: activeToday,
      hint: "Meaningful operational activity today",
      tone: "success",
    },
    {
      id: "tasks",
      label: "Open Tasks",
      value: tasksOpen,
      hint: "Open follow-ups across active Deals",
      tone: tasksOpen > n ? "warning" : "default",
    },
    {
      id: "interactions",
      label: "Customer Interactions",
      value: rows.filter((r) => r.activityState === "active_today").length,
      hint: "Active Today activity state",
      tone: "info",
    },
    {
      id: "docs",
      label: "Documents Pending",
      value: docsPending,
      hint: "Deals with outstanding documentation",
      tone: docsPending > 0 ? "warning" : "success",
    },
    {
      id: "ai",
      label: "AI Activities",
      value: rows.filter((r) => r.activityMomentumScore >= 80).length,
      hint: "High-momentum deals (AI-assisted cadence proxy)",
      tone: "info",
    },
    {
      id: "momentum",
      label: "Operational Momentum",
      value: avgMomentum,
      hint: `Healthy Waiting ${healthyWaiting} · Needs Follow-up ${needsFollowUp}`,
      tone:
        avgMomentum >= 70 ? "success" : avgMomentum >= 45 ? "warning" : "danger",
    },
  ];

  return { enterprisePulseScore, metrics };
}

export function composeChanakyaIntelligenceModel(
  files: LoanFile[],
  options?: {
    filters?: Partial<ChanakyaIntelligenceFilters>;
    heatDimension?: ChanakyaIntelligenceHeatDimension;
  },
): ChanakyaIntelligenceModel {
  const filters: ChanakyaIntelligenceFilters = {
    ...DEFAULT_CHANAKYA_INTELLIGENCE_FILTERS,
    ...options?.filters,
  };
  const heatDimension =
    options?.heatDimension ?? CHANAKYA_INTELLIGENCE_HEAT_DIMENSIONS[0]!.id;

  const dashboard = buildChanakyaRadarDashboard(listActiveRadarDealFiles(files));
  const allRows = dashboard.rows;
  const rows = applyFilters(allRows, filters);

  return {
    asOf: new Date().toISOString(),
    filters,
    filterOptions: {
      products: uniqueSorted(allRows.map((r) => r.product || "—")),
      branches: uniqueSorted(allRows.map((r) => r.lender || "Unassigned")),
      teams: uniqueSorted(allRows.map((r) => r.assignedRm || "Unassigned")),
      employees: uniqueSorted(allRows.map((r) => r.assignedRm || "—")),
      partners: uniqueSorted(allRows.map((r) => r.lender || "—")),
      stages: uniqueSorted(allRows.map((r) => r.stageLabel || "—")),
    },
    galaxy: buildGalaxy(rows),
    river: buildRiver(rows),
    heat: buildHeat(rows, heatDimension),
    pulse: buildPulse(rows),
    futureSlots: {
      "ci-dependency-intelligence": null,
      "ci-operational-weather": null,
      "ci-predictive-intelligence": null,
      "ci-ai-recommendations": null,
      "ci-forecast-engine": null,
    },
  };
}

export function composeChanakyaIntelligenceModelSync(
  options?: Parameters<typeof composeChanakyaIntelligenceModel>[1],
): ChanakyaIntelligenceModel {
  const { files } = loadRadarDealFilesSync();
  return composeChanakyaIntelligenceModel(files, options);
}

export async function loadChanakyaIntelligenceModel(
  options?: Parameters<typeof composeChanakyaIntelligenceModel>[1],
): Promise<ChanakyaIntelligenceModel> {
  const { files } = await hydrateRadarDealFiles();
  return composeChanakyaIntelligenceModel(files, options);
}

export { DEFAULT_CHANAKYA_INTELLIGENCE_FILTERS };
