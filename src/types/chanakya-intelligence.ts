/**
 * CO-MC-002 — CHANAKYA Intelligence model types.
 * Explains *why* the business is heading where Radar points.
 */

import type { ChanakyaOperationalQuadrantId } from "@/constants/chanakya-radar";
import type { TransactionActivityStateId } from "@/types/enterprise-activity-intelligence";

export type ChanakyaIntelligenceNodeTone =
  | "healthy"
  | "needs_attention"
  | "follow_up"
  | "at_risk";

export type ChanakyaIntelligenceHeatDimension =
  | "branch_product"
  | "employee_kpi"
  | "partner_product"
  | "stage_team"
  | "region_revenue";

export interface ChanakyaIntelligenceFilters {
  product: string;
  branch: string;
  team: string;
  employee: string;
  partner: string;
  stage: string;
}

export interface ChanakyaIntelligenceGalaxyNode {
  id: string;
  fileId: string;
  dealId: string;
  borrower: string;
  product: string;
  branch: string;
  team: string;
  employee: string;
  partner: string;
  stage: string;
  quadrant: ChanakyaOperationalQuadrantId;
  tone: ChanakyaIntelligenceNodeTone;
  amount: number;
  amountLabel: string;
  activityMomentumScore: number;
  activityState: TransactionActivityStateId;
  /** Normalized 0–1 placement for Galaxy canvas. */
  x: number;
  y: number;
  href: string;
}

export interface ChanakyaIntelligenceGalaxyCluster {
  key: string;
  label: string;
  count: number;
  tone: ChanakyaIntelligenceNodeTone;
  nodeIds: string[];
}

export interface ChanakyaIntelligenceRiverStage {
  id: string;
  label: string;
  volume: number;
  avgDays: number;
  dropOffPct: number;
  conversionPct: number;
  isBottleneck: boolean;
}

export interface ChanakyaIntelligenceHeatCell {
  rowKey: string;
  colKey: string;
  rowLabel: string;
  colLabel: string;
  value: number;
  intensity: number;
  tone: ChanakyaIntelligenceNodeTone;
  dealIds: string[];
}

export interface ChanakyaIntelligencePulseMetric {
  id: string;
  label: string;
  value: number | string;
  hint: string;
  tone: "success" | "warning" | "danger" | "info" | "default";
}

export interface ChanakyaIntelligenceModel {
  asOf: string;
  filters: ChanakyaIntelligenceFilters;
  filterOptions: {
    products: string[];
    branches: string[];
    teams: string[];
    employees: string[];
    partners: string[];
    stages: string[];
  };
  galaxy: {
    nodes: ChanakyaIntelligenceGalaxyNode[];
    clusters: ChanakyaIntelligenceGalaxyCluster[];
  };
  river: {
    stages: ChanakyaIntelligenceRiverStage[];
    pipelineVelocity: number;
    overallConversionPct: number;
  };
  heat: {
    dimension: ChanakyaIntelligenceHeatDimension;
    rows: string[];
    cols: string[];
    cells: ChanakyaIntelligenceHeatCell[];
  };
  pulse: {
    enterprisePulseScore: number;
    metrics: ChanakyaIntelligencePulseMetric[];
  };
  /** Extensibility — future widget payloads keyed by widget id. */
  futureSlots: Record<string, unknown>;
}
