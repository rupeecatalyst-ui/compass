/**
 * CO-UX-006 Part 5 — Opportunity-centric Visual Analytics derive (single SSOT).
 * Values always use Opportunity.requestedAmount — never sum of lender pipelines.
 */

import {
  FRESH_LOGIN_DEAL_STAGES,
  opportunityBusinessSourceLabel,
} from "@/constants/opportunity-business-source";
import { displayOpportunityRequirementStageLabel } from "@/lib/lead-opportunity-journey/opportunity-field-display";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import type {
  DashboardAgeBucket,
  DashboardAgeBucketId,
  DashboardDisbursementPeriod,
  DashboardNamedSlice,
  DashboardPerformanceInsight,
  DashboardTrendPoint,
  DashboardTrendRangeId,
  DashboardVisualAnalyticsSnapshot,
} from "@/types/dashboard-visual-analytics";

const CHART_PALETTE = [
  "#0f766e",
  "#0284c7",
  "#c4a35a",
  "#7c3aed",
  "#e11d48",
  "#059669",
  "#ea580c",
  "#4f46e5",
  "#0891b2",
  "#be123c",
  "#65a30d",
  "#db2777",
];

const DISBURSED_STAGES = new Set([
  "disbursed",
  "disbursement",
  "partially_disbursed",
  "fully_disbursed",
]);

const AGE_BUCKETS: ReadonlyArray<{ id: DashboardAgeBucketId; label: string; min: number; max: number }> = [
  { id: "0_7", label: "0–7 Days", min: 0, max: 7 },
  { id: "8_15", label: "8–15 Days", min: 8, max: 15 },
  { id: "16_30", label: "16–30 Days", min: 16, max: 30 },
  { id: "31_60", label: "31–60 Days", min: 31, max: 60 },
  { id: "60_plus", label: "60+ Days", min: 61, max: Number.POSITIVE_INFINITY },
];

function opportunityValue(opp: EnterpriseOpportunityApiRecord): number {
  const n = opp.requestedAmount;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function isActiveOpportunity(opp: EnterpriseOpportunityApiRecord): boolean {
  const status = (opp.lifecycleStatus || "").toLowerCase();
  if (status === "won" || status === "lost" || status === "cancelled" || status === "archived") {
    return false;
  }
  return true;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function indianFinancialYearStart(asOf: Date): Date {
  const y = asOf.getFullYear();
  const april = new Date(y, 3, 1);
  return asOf >= april ? april : new Date(y - 1, 3, 1);
}

function daysBetween(fromIso: string | null | undefined, asOf: Date): number {
  if (!fromIso) return 0;
  const t = Date.parse(fromIso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((asOf.getTime() - t) / (1000 * 60 * 60 * 24)));
}

function ageBucketId(days: number): DashboardAgeBucketId {
  for (const b of AGE_BUCKETS) {
    if (days >= b.min && days <= b.max) return b.id;
  }
  return "60_plus";
}

function lenderLabel(deal: EnterpriseDealApiRecord): string {
  const name = deal.primaryCounterpartyName?.trim();
  if (name) return name;
  if (deal.lenderId?.trim()) return deal.lenderId.trim();
  return "Unassigned Lender";
}

function isLoginStage(stage: string | null | undefined): boolean {
  const s = (stage || "").toLowerCase();
  return (FRESH_LOGIN_DEAL_STAGES as readonly string[]).includes(s);
}

function isDisbursedStage(stage: string | null | undefined): boolean {
  return DISBURSED_STAGES.has((stage || "").toLowerCase());
}

function groupSlices(
  rows: Array<{ key: string; label: string; value: number }>,
): DashboardNamedSlice[] {
  const map = new Map<string, { label: string; count: number; value: number }>();
  for (const row of rows) {
    const cur = map.get(row.key) ?? { label: row.label, count: 0, value: 0 };
    cur.count += 1;
    cur.value += row.value;
    map.set(row.key, cur);
  }
  return [...map.entries()]
    .map(([key, v], i) => ({
      key,
      label: v.label,
      count: v.count,
      value: v.value,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
}

function rangeStart(range: DashboardTrendRangeId, asOf: Date): Date {
  if (range === "fy") return indianFinancialYearStart(asOf);
  const days = range === "30d" ? 30 : 90;
  const start = startOfDay(asOf);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function buildMonthlyTrend(
  opportunities: EnterpriseOpportunityApiRecord[],
  deals: EnterpriseDealApiRecord[],
  range: DashboardTrendRangeId,
  asOf: Date,
): DashboardTrendPoint[] {
  const start = rangeStart(range, asOf);
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
  while (cursor <= endMonth) {
    keys.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const created = new Map<string, number>();
  const logins = new Map<string, Set<string>>();
  const disbursed = new Map<string, Set<string>>();
  for (const k of keys) {
    created.set(k, 0);
    logins.set(k, new Set());
    disbursed.set(k, new Set());
  }

  for (const opp of opportunities) {
    if (!opp.createdAt) continue;
    const d = new Date(opp.createdAt);
    if (Number.isNaN(d.getTime()) || d < start) continue;
    const k = monthKey(d);
    if (created.has(k)) created.set(k, (created.get(k) ?? 0) + 1);
  }

  for (const deal of deals) {
    if (!deal.opportunityId || deal.isDeleted || deal.archived) continue;
    const entered = deal.stageEnteredAt ? new Date(deal.stageEnteredAt) : null;
    if (!entered || Number.isNaN(entered.getTime()) || entered < start) continue;
    const k = monthKey(entered);
    if (!logins.has(k)) continue;
    if (isLoginStage(deal.grossStage)) logins.get(k)!.add(deal.opportunityId);
    if (isDisbursedStage(deal.grossStage)) disbursed.get(k)!.add(deal.opportunityId);
  }

  return keys.map((k) => ({
    period: monthLabel(k),
    opportunitiesCreated: created.get(k) ?? 0,
    logins: logins.get(k)?.size ?? 0,
    disbursements: disbursed.get(k)?.size ?? 0,
  }));
}

function buildDisbursements(
  opportunities: EnterpriseOpportunityApiRecord[],
  deals: EnterpriseDealApiRecord[],
  asOf: Date,
): DashboardDisbursementPeriod[] {
  const today = startOfDay(asOf);
  const week = new Date(today);
  week.setDate(week.getDate() - 6);
  const month = new Date(today.getFullYear(), today.getMonth(), 1);
  const fy = indianFinancialYearStart(asOf);

  const oppById = new Map(opportunities.map((o) => [o.id, o]));
  const buckets: Record<
    DashboardDisbursementPeriod["id"],
    { ids: Set<string>; value: number }
  > = {
    today: { ids: new Set(), value: 0 },
    week: { ids: new Set(), value: 0 },
    month: { ids: new Set(), value: 0 },
    fy: { ids: new Set(), value: 0 },
  };

  for (const deal of deals) {
    if (!deal.opportunityId || deal.isDeleted || deal.archived) continue;
    if (!isDisbursedStage(deal.grossStage)) continue;
    const entered = deal.stageEnteredAt ? new Date(deal.stageEnteredAt) : null;
    if (!entered || Number.isNaN(entered.getTime())) continue;
    const opp = oppById.get(deal.opportunityId);
    const value = opp ? opportunityValue(opp) : 0;

    const add = (id: DashboardDisbursementPeriod["id"]) => {
      if (buckets[id].ids.has(deal.opportunityId!)) return;
      buckets[id].ids.add(deal.opportunityId!);
      buckets[id].value += value;
    };

    if (entered >= fy) add("fy");
    if (entered >= month) add("month");
    if (entered >= week) add("week");
    if (entered >= today) add("today");
  }

  return [
    { id: "today", label: "Today", count: buckets.today.ids.size, value: buckets.today.value },
    { id: "week", label: "This Week", count: buckets.week.ids.size, value: buckets.week.value },
    { id: "month", label: "This Month", count: buckets.month.ids.size, value: buckets.month.value },
    { id: "fy", label: "Financial Year", count: buckets.fy.ids.size, value: buckets.fy.value },
  ];
}

function buildPerformance(
  opportunities: EnterpriseOpportunityApiRecord[],
  deals: EnterpriseDealApiRecord[],
  asOf: Date,
): DashboardPerformanceInsight[] {
  const active = opportunities.filter(isActiveOpportunity);
  const won = opportunities.filter((o) => (o.lifecycleStatus || "").toLowerCase() === "won");
  const denom = active.length + won.length;
  const conversion =
    denom === 0 ? 0 : Math.round((won.length / denom) * 1000) / 10;

  const ages = active.map((o) => daysBetween(o.createdAt, asOf));
  const avgTat =
    ages.length === 0 ? 0 : Math.round(ages.reduce((s, n) => s + n, 0) / ages.length);

  const totalValue = opportunities.reduce((s, o) => s + opportunityValue(o), 0);
  const avgTicket =
    opportunities.length === 0 ? 0 : Math.round(totalValue / opportunities.length);

  const rmMap = new Map<string, number>();
  for (const o of active) {
    const rm = o.relationshipManagerName?.trim() || "Unassigned";
    rmMap.set(rm, (rmMap.get(rm) ?? 0) + 1);
  }
  const topRm = [...rmMap.entries()].sort((a, b) => b[1] - a[1])[0];

  const loginOppIds = new Set(
    deals
      .filter((d) => !d.isDeleted && !d.archived && isLoginStage(d.grossStage) && d.opportunityId)
      .map((d) => d.opportunityId as string),
  );
  const responseProxy =
    active.length === 0
      ? 0
      : Math.round((loginOppIds.size / Math.max(active.length, 1)) * 1000) / 10;

  const inr = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);

  return [
    {
      id: "conversion",
      label: "Conversion Rate",
      valueLabel: `${conversion}%`,
      hint: "Won ÷ (Active + Won)",
    },
    {
      id: "tat",
      label: "Average TAT",
      valueLabel: `${avgTat}d`,
      hint: "Active Opportunity age",
    },
    {
      id: "ticket",
      label: "Average Ticket Size",
      valueLabel: inr(avgTicket),
      hint: "Opportunity value",
    },
    {
      id: "rm",
      label: "RM Productivity",
      valueLabel: topRm ? `${topRm[1]}` : "—",
      hint: topRm ? topRm[0] : "Active book leader",
    },
    {
      id: "response",
      label: "Login Penetration",
      valueLabel: `${responseProxy}%`,
      hint: "Active Opps with Login Deal",
    },
  ];
}

export type DeriveDashboardVisualAnalyticsInput = {
  opportunities: EnterpriseOpportunityApiRecord[];
  deals: EnterpriseDealApiRecord[];
  taskBuckets: {
    dueToday: number;
    completed: number;
    overdue: number;
    pending: number;
  };
  trendRange?: DashboardTrendRangeId;
  asOf?: Date;
};

export function deriveDashboardVisualAnalytics(
  input: DeriveDashboardVisualAnalyticsInput,
): DashboardVisualAnalyticsSnapshot {
  const asOf = input.asOf ?? new Date();
  const trendRange = input.trendRange ?? "90d";
  const opportunities = input.opportunities;
  const deals = input.deals;
  const active = opportunities.filter(isActiveOpportunity);

  const sourceMix = groupSlices(
    opportunities.map((o) => {
      const code = o.sourceCode?.trim() || "other";
      return {
        key: code,
        label: opportunityBusinessSourceLabel(code),
        value: opportunityValue(o),
      };
    }),
  );

  const productMix = groupSlices(
    opportunities.map((o) => {
      const label = o.productLabel?.trim() || o.productCode?.trim() || "Unspecified";
      const key = o.productCode?.trim() || label;
      return { key, label, value: opportunityValue(o) };
    }),
  );

  const stageDistribution = groupSlices(
    opportunities.map((o) => {
      const key = o.requirementStage?.trim() || "unknown";
      return {
        key,
        label: displayOpportunityRequirementStageLabel(key),
        value: opportunityValue(o),
      };
    }),
  );

  const lenderOppSets = new Map<string, { label: string; ids: Set<string> }>();
  for (const deal of deals) {
    if (deal.isDeleted || deal.archived || !deal.opportunityId) continue;
    if (!active.some((o) => o.id === deal.opportunityId)) continue;
    const label = lenderLabel(deal);
    const key = deal.lenderId?.trim() || label;
    const cur = lenderOppSets.get(key) ?? { label, ids: new Set() };
    cur.ids.add(deal.opportunityId);
    lenderOppSets.set(key, cur);
  }
  const lenderDistribution: DashboardNamedSlice[] = [...lenderOppSets.entries()]
    .map(([key, v], i) => ({
      key,
      label: v.label,
      count: v.ids.size,
      value: 0,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const ageCounts = new Map<DashboardAgeBucketId, number>();
  for (const b of AGE_BUCKETS) ageCounts.set(b.id, 0);
  for (const opp of active) {
    const id = ageBucketId(daysBetween(opp.createdAt, asOf));
    ageCounts.set(id, (ageCounts.get(id) ?? 0) + 1);
  }
  const ageing: DashboardAgeBucket[] = AGE_BUCKETS.map((b) => ({
    id: b.id,
    label: b.label,
    count: ageCounts.get(b.id) ?? 0,
  }));

  const taskAnalytics: DashboardNamedSlice[] = [
    {
      key: "due_today",
      label: "Due Today",
      count: input.taskBuckets.dueToday,
      value: 0,
      color: "#0284c7",
    },
    {
      key: "completed",
      label: "Completed",
      count: input.taskBuckets.completed,
      value: 0,
      color: "#059669",
    },
    {
      key: "overdue",
      label: "Overdue",
      count: input.taskBuckets.overdue,
      value: 0,
      color: "#e11d48",
    },
    {
      key: "pending",
      label: "Pending",
      count: input.taskBuckets.pending,
      value: 0,
      color: "#c4a35a",
    },
  ];

  const opportunityValueTotal = opportunities.reduce((s, o) => s + opportunityValue(o), 0);

  return {
    asOf: asOf.toISOString(),
    definition:
      "Opportunity-centric Visual Analytics. Financial values = Opportunity.requestedAmount (never lender pipeline sums).",
    sourceMix,
    productMix,
    stageDistribution,
    monthlyTrend: buildMonthlyTrend(opportunities, deals, trendRange, asOf),
    trendRange,
    lenderDistribution,
    ageing,
    taskAnalytics,
    disbursements: buildDisbursements(opportunities, deals, asOf),
    performance: buildPerformance(opportunities, deals, asOf),
    totals: {
      opportunities: opportunities.length,
      opportunityValue: opportunityValueTotal,
      activeOpportunities: active.length,
    },
  };
}

/** Ageing bucket definitions for drill-down consumers */
export { AGE_BUCKETS };
