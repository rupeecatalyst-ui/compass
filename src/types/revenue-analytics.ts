/**
 * CO-REFINEMENT-005 — Revenue Analytics contracts.
 * Distinguishes financially different revenue states — never merged silently.
 */

export type RevenueStateKind = "expected" | "invoiced" | "received" | "outstanding" | "pipeline";

export type RevenueAnalyticsKpi = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  state: RevenueStateKind;
};

export type RevenueNamedAmount = {
  name: string;
  invoiced: number;
  received: number;
  expected: number;
};

export type RevenuePeriodPoint = {
  period: string;
  invoiced: number;
  received: number;
};

export type RevenueWaterfallStep = {
  name: string;
  value: number;
  state: RevenueStateKind;
};

export type RevenueGstBreakdown = {
  taxableRevenue: number;
  totalGst: number;
  cgst: number;
  sgst: number;
  igst: number;
};

export type RevenueAnalyticsModel = {
  asOf: string;
  hasAccountingData: boolean;
  hasPipelineData: boolean;
  kpis: RevenueAnalyticsKpi[];
  gstBreakdown: RevenueGstBreakdown;
  waterfall: RevenueWaterfallStep[];
  byProduct: RevenueNamedAmount[];
  byLenderParty: Array<{ name: string; invoiced: number; received: number }>;
  byRm: Array<{ name: string; expected: number; dealCount: number }>;
  periodTrend: RevenuePeriodPoint[];
  disbursementVsRevenue: {
    totalDisbursed: number;
    totalInvoiced: number;
    totalReceived: number;
    caseCount: number;
  } | null;
  sources: string[];
};
