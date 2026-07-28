/**
 * CO-UX-006 Part 5 — Dashboard Visual Analytics types (Opportunity-centric).
 */

export type DashboardNamedSlice = {
  key: string;
  label: string;
  count: number;
  value: number;
  color?: string;
};

export type DashboardTrendPoint = {
  period: string;
  opportunitiesCreated: number;
  logins: number;
  disbursements: number;
};

export type DashboardAgeBucketId =
  | "0_7"
  | "8_15"
  | "16_30"
  | "31_60"
  | "60_plus";

export type DashboardAgeBucket = {
  id: DashboardAgeBucketId;
  label: string;
  count: number;
};

export type DashboardDisbursementPeriod = {
  id: "today" | "week" | "month" | "fy";
  label: string;
  count: number;
  value: number;
};

export type DashboardPerformanceInsight = {
  id: string;
  label: string;
  valueLabel: string;
  hint?: string;
};

export type DashboardTrendRangeId = "30d" | "90d" | "fy";

export type DashboardVisualAnalyticsSnapshot = {
  asOf: string;
  definition: string;
  sourceMix: DashboardNamedSlice[];
  productMix: DashboardNamedSlice[];
  stageDistribution: DashboardNamedSlice[];
  monthlyTrend: DashboardTrendPoint[];
  trendRange: DashboardTrendRangeId;
  lenderDistribution: DashboardNamedSlice[];
  ageing: DashboardAgeBucket[];
  taskAnalytics: DashboardNamedSlice[];
  disbursements: DashboardDisbursementPeriod[];
  performance: DashboardPerformanceInsight[];
  totals: {
    opportunities: number;
    opportunityValue: number;
    activeOpportunities: number;
  };
};
