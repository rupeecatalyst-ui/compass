/**
 * CO-MC-002 — Derive precomputed Enterprise Intelligence sections.
 * Consumes EBI KPIs + Opportunity/Deal rows during nightly refresh only.
 * Never invents parallel metric formulas — groups existing EBI / registry facts.
 */

import {
  MISSION_CONTROL_ANALYTICS_REFRESH_LABEL,
  MISSION_CONTROL_EI_SECTIONS,
} from "@/constants/mission-control-enterprise-intelligence";
import { opportunityBusinessSourceLabel } from "@/constants/opportunity-business-source";
import { opportunityLifecycleLabel } from "@/constants/opportunity-lifecycle";
import type { EbiSnapshot } from "@/types/enterprise-business-intelligence";
import type {
  McEiChartCard,
  McEiNamedValue,
  McEiSection,
  MissionControlEnterpriseIntelligencePack,
} from "@/types/mission-control-enterprise-intelligence";

export type McEiOpportunityLite = {
  id: string;
  lifecycleStatus?: string | null;
  sourceCode?: string | null;
  sourceWealthPartnerId?: string | null;
  sourceContactName?: string | null;
  participationRole?: string | null;
  productLabel?: string | null;
  productCode?: string | null;
  cityLabel?: string | null;
  stateLabel?: string | null;
  requestedAmount?: number | null;
  primaryContactName?: string | null;
  companyName?: string | null;
};

export type McEiDealLite = {
  id: string;
  grossStage?: string | null;
  productLabel?: string | null;
  productCode?: string | null;
  primaryCounterpartyName?: string | null;
  lenderId?: string | null;
  requestedAmount?: number | null;
  expectedRevenue?: number | null;
  revenueReceived?: number | null;
  cityLabel?: string | null;
  stateLabel?: string | null;
  relationshipManagerName?: string | null;
  sourceCode?: string | null;
};

function formatInrCompact(n: number): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return String(Math.round(n));
  }
}

function groupSum(
  rows: Array<{ key: string; value: number }>,
  limit = 12,
): McEiNamedValue[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = r.key.trim() || "Unspecified";
    map.set(k, (map.get(k) ?? 0) + r.value);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function groupCount(keys: string[], limit = 12): McEiNamedValue[] {
  return groupSum(
    keys.map((key) => ({ key, value: 1 })),
    limit,
  );
}

function card(
  partial: Omit<McEiChartCard, "emptyLabel"> & { emptyLabel?: string },
): McEiChartCard {
  return {
    emptyLabel: "No precomputed data for this view yet.",
    ...partial,
  };
}

export function deriveMissionControlEnterpriseIntelligence(input: {
  ebi: EbiSnapshot;
  opportunities: McEiOpportunityLite[];
  deals: McEiDealLite[];
  asOf?: string;
}): MissionControlEnterpriseIntelligencePack {
  const asOf = input.asOf ?? input.ebi.asOf ?? new Date().toISOString();
  const { ebi, opportunities, deals } = input;

  const bySource = groupCount(
    opportunities.map((o) => opportunityBusinessSourceLabel(o.sourceCode)),
  );
  const wpOpps = opportunities.filter(
    (o) => (o.sourceCode || "").trim() === "wealth_partner",
  );
  const byPartner = groupCount(
    wpOpps.map((o) => o.sourceContactName || o.sourceWealthPartnerId || "Wealth Partner"),
  );
  const byRole = groupCount(
    wpOpps.map((o) => o.participationRole || "unspecified"),
  );
  const byProduct = ebi.executive.dealsByProduct.map((p) => ({
    name: p.name,
    value: p.count,
    secondary: p.value ?? 0,
  }));
  const byLender = groupCount(
    deals.map(
      (d) =>
        d.primaryCounterpartyName ||
        d.lenderId ||
        "Unassigned Lender",
    ),
  );
  const byLifecycle = groupCount(
    opportunities.map((o) =>
      opportunityLifecycleLabel(o.lifecycleStatus || "unknown"),
    ),
  );
  const byStage = ebi.executive.dealsByStage.map((s) => ({
    name: s.name,
    value: s.count,
    secondary: s.value ?? 0,
  }));
  const revenueByProduct = groupSum(
    deals.map((d) => ({
      key: d.productLabel || d.productCode || "Unknown",
      value: Number(d.expectedRevenue ?? 0) || Number(d.requestedAmount ?? 0) || 0,
    })),
  );
  const revenueWaterfall: McEiNamedValue[] = [
    { name: "Pipeline", value: ebi.executive.pipelineValue },
    { name: "Expected Revenue", value: ebi.executive.expectedRevenue },
    {
      name: "Received",
      value: deals.reduce((s, d) => s + (Number(d.revenueReceived) || 0), 0),
    },
  ];
  const byCustomer = groupCount(
    opportunities.map(
      (o) => o.primaryContactName || o.companyName || "Unspecified Customer",
    ),
  );
  const byGeo = groupCount(
    opportunities.map((o) => o.stateLabel || o.cityLabel || "Unspecified Region"),
  );
  const marketing = opportunities.filter(
    (o) =>
      (o.sourceCode || "").trim() === "marketing" ||
      (o.sourceCode || "").trim() === "digital_marketing" ||
      (o.sourceCode || "").trim() === "website_compass",
  );
  const marketingSeries = groupCount(
    marketing.map((o) => o.sourceContactName || o.sourceCode || "Marketing"),
  );

  const sectionMap: Record<string, McEiChartCard[]> = {
    executive_summary: [
      card({
        id: "exec-kpi",
        title: "Executive KPIs",
        kind: "kpi_strip",
        series: [],
        kpis: [
          {
            id: "pipeline",
            label: "Pipeline",
            value: formatInrCompact(ebi.executive.pipelineValue),
            hint: `${ebi.executive.activeDeals} Deals`,
            tone: "positive",
          },
          {
            id: "opps",
            label: "Opportunities",
            value: String(ebi.executive.activeOpportunities),
            tone: "neutral",
          },
          {
            id: "conversion",
            label: "Conversion",
            value: `${ebi.executive.conversionRatioPct}%`,
            tone: ebi.executive.conversionRatioPct >= 20 ? "positive" : "attention",
          },
          {
            id: "revenue",
            label: "Expected Revenue",
            value: formatInrCompact(ebi.executive.expectedRevenue),
            tone: "positive",
          },
          {
            id: "health",
            label: "Business Health",
            value: `${ebi.health.overallScore}/100`,
            hint: ebi.health.status,
            tone: ebi.health.status === "healthy" ? "positive" : "attention",
          },
        ],
      }),
      card({
        id: "exec-funnel",
        title: "Enterprise Pipeline Funnel",
        subtitle: "Deal stage distribution (precomputed)",
        kind: "funnel",
        series: byStage,
      }),
    ],
    business_source: [
      card({
        id: "source-donut",
        title: "Business by Source",
        kind: "donut",
        series: bySource,
      }),
      card({
        id: "source-bar",
        title: "Source Volume",
        kind: "bar",
        series: bySource,
      }),
    ],
    wealth_partner: [
      card({
        id: "wp-network",
        title: "Wealth Partner Network Contribution",
        subtitle: "Opportunity volume by partner node",
        kind: "network",
        series: byPartner,
      }),
      card({
        id: "wp-partners",
        title: "Business by Wealth Partner",
        kind: "bar",
        series: byPartner,
      }),
      card({
        id: "wp-roles",
        title: "Participation Role Mix",
        kind: "donut",
        series: byRole,
      }),
    ],
    product: [
      card({
        id: "product-treemap",
        title: "Product Mix",
        kind: "treemap",
        series: byProduct,
      }),
      card({
        id: "product-bar",
        title: "Deals by Product",
        kind: "bar",
        series: byProduct,
      }),
    ],
    lender: [
      card({
        id: "lender-bar",
        title: "Lender Negotiation Volume",
        kind: "bar",
        series: byLender,
      }),
      card({
        id: "lender-funnel",
        title: "Lender Pipeline Stages",
        kind: "funnel",
        series: byStage,
      }),
    ],
    opportunity: [
      card({
        id: "opp-lifecycle",
        title: "Opportunity Lifecycle",
        kind: "donut",
        series: byLifecycle,
      }),
      card({
        id: "opp-area",
        title: "Lifecycle Distribution",
        kind: "area",
        series: byLifecycle,
      }),
    ],
    revenue: [
      card({
        id: "rev-line",
        title: "Revenue Contribution Trend",
        subtitle: "Precomputed waterfall stages as trend series",
        kind: "line",
        series: revenueWaterfall,
      }),
      card({
        id: "rev-waterfall",
        title: "Revenue Waterfall",
        subtitle: "Pipeline → Expected → Received",
        kind: "waterfall",
        series: revenueWaterfall,
      }),
      card({
        id: "rev-product",
        title: "Expected Revenue by Product",
        kind: "bar",
        series: revenueByProduct,
      }),
    ],
    customer: [
      card({
        id: "cust-bar",
        title: "Top Customers (Opportunity Count)",
        kind: "bar",
        series: byCustomer,
      }),
    ],
    geographic: [
      card({
        id: "geo-heatmap",
        title: "Regional Opportunity Heat",
        kind: "heatmap",
        series: byGeo,
      }),
      card({
        id: "geo-bar",
        title: "Business by Region",
        kind: "bar",
        series: byGeo,
      }),
    ],
    marketing: [
      card({
        id: "mkt-donut",
        title: "Marketing-Sourced Business",
        kind: "donut",
        series: marketingSeries.length
          ? marketingSeries
          : [{ name: "No marketing-sourced Opportunities", value: 0 }],
        kpis: [
          {
            id: "mkt-count",
            label: "Marketing Opportunities",
            value: String(marketing.length),
          },
        ],
      }),
    ],
    operational: [
      card({
        id: "ops-kpi",
        title: "Operational KPIs",
        kind: "kpi_strip",
        series: [],
        kpis: [
          {
            id: "overdue",
            label: "Overdue Tasks",
            value: String(ebi.operational.overdueTasks),
            tone: ebi.operational.overdueTasks > 0 ? "attention" : "positive",
          },
          {
            id: "today",
            label: "Due Today",
            value: String(ebi.operational.tasksDueToday),
          },
          {
            id: "docs",
            label: "Docs Delayed",
            value: String(ebi.operational.dealsAwaitingDocuments),
            tone:
              ebi.operational.dealsAwaitingDocuments > 5 ? "attention" : "neutral",
          },
          {
            id: "inactive",
            label: "Inactive ≥5d",
            value: String(ebi.operational.inactiveOpportunities),
          },
        ],
      }),
      card({
        id: "ops-health",
        title: "Health Dimensions",
        kind: "bar",
        series: ebi.health.dimensions.map((d) => ({
          name: d.label,
          value: d.score,
        })),
      }),
    ],
    ai_executive: [
      card({
        id: "ai-insights",
        title: "CHANAKYA Executive Insights",
        kind: "insight_list",
        series: [],
        insights: ebi.insights.map((i) => ({
          id: i.id,
          text: i.text,
          reason: i.reason,
          tone: i.tone,
          recommendedAction: i.recommendedAction,
        })),
      }),
    ],
  };

  const sections: McEiSection[] = MISSION_CONTROL_EI_SECTIONS.map((s) => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    cards: sectionMap[s.id] ?? [],
  }));

  return {
    version: `mc-ei-${asOf.slice(0, 10)}`,
    program: "CO-MC-002",
    asOf,
    generatedAt: asOf,
    refreshScheduleLabel: MISSION_CONTROL_ANALYTICS_REFRESH_LABEL,
    sections,
    sourceModules: [
      "CO-MC-002",
      "deriveExecutiveKpis",
      "deriveOperationalKpis",
      "deriveBusinessHealthScore",
      "EnterpriseOpportunity",
      "EnterpriseDeal",
    ],
  };
}
