/**
 * Derive Executive Intelligence story from live loan files.
 * Visualization per chapter follows EI_VISUALIZATION_RULES (never random).
 */

import { ROUTES } from "@/constants/routes";
import { PIPELINE_STAGE_MASTER, STAGE_LABELS } from "@/constants/loan-pipeline";
import { formatINRCompact } from "@/lib/format-currency";
import type { LoanFile, PipelineStage } from "@/types/catalyst-one";
import type {
  EiBulletTarget,
  EiBubblePoint,
  EiCalendarDay,
  EiExecutiveStory,
  EiForecastPoint,
  EiFunnelStage,
  EiGauge,
  EiGeoRegion,
  EiPulseMetric,
  EiRadarAxis,
  EiSankeyModel,
  EiScatterPoint,
  EiStoryChapter,
  EiTimelineEvent,
  EiTreemapCell,
  EiTrendPoint,
  EiWaterfallStep,
} from "@/types/executive-intelligence-platform";

const ACTIVE_STAGES = PIPELINE_STAGE_MASTER.filter((s) => s.id !== "won");
const TREEMAP_FILLS = ["#0F766E", "#0369A1", "#B45309", "#4F46E5", "#64748B", "#BE123C", "#15803D"];

function sumAmount(files: LoanFile[]): number {
  return files.reduce((s, f) => s + (f.requiredAmount || f.loanAmount || 0), 0);
}

function sumRevenue(files: LoanFile[]): number {
  return files.reduce((s, f) => s + (f.expectedRevenue || 0), 0);
}

function buildPulse(files: LoanFile[]): EiPulseMetric[] {
  const pipeline = sumAmount(files);
  const revenue = sumRevenue(files);
  const urgent = files.filter((f) => f.priority === "urgent" || f.isUrgent).length;
  const delayed = files.filter((f) => f.isDelayed).length;
  return [
    {
      id: "pipeline",
      label: "Active Pipeline",
      value: formatINRCompact(pipeline),
      deltaLabel: `${files.length} files`,
      deltaTone: "up",
      insight: "Total book under management",
      href: ROUTES.CHANAKYA_RADAR,
    },
    {
      id: "revenue",
      label: "Expected Revenue",
      value: formatINRCompact(revenue),
      deltaLabel: "Commission path",
      deltaTone: "up",
      insight: "What the current book is expected to yield",
      href: `${ROUTES.ACCOUNTING}?tab=revenue`,
    },
    {
      id: "pressure",
      label: "Execution Pressure",
      value: String(urgent + delayed),
      deltaLabel: `${urgent} urgent · ${delayed} delayed`,
      deltaTone: urgent + delayed > 5 ? "down" : "flat",
      insight: "Files that need attention today",
      href: `${ROUTES.LOAN_FILES}?filter=risk`,
    },
    {
      id: "velocity",
      label: "Avg Days in Stage",
      value: String(
        Math.round(
          files.reduce((s, f) => s + (f.daysInStage || 0), 0) / Math.max(1, files.length),
        ),
      ),
      deltaLabel: "Velocity signal",
      deltaTone: "flat",
      insight: "How fast the book moves",
      href: ROUTES.CHANAKYA_RADAR,
    },
  ];
}

function buildFunnel(files: LoanFile[]): EiFunnelStage[] {
  return ACTIVE_STAGES.map((stage, i) => {
    const inStage = files.filter((f) => f.stage === stage.id);
    const prev =
      i === 0 ? null : files.filter((f) => f.stage === ACTIVE_STAGES[i - 1]!.id).length;
    return {
      id: stage.id,
      label: stage.label,
      count: inStage.length,
      value: sumAmount(inStage),
      conversionFromPrior: prev && prev > 0 ? Math.round((inStage.length / prev) * 100) : null,
      color: stage.color,
    };
  });
}

function buildSankey(files: LoanFile[]): EiSankeyModel {
  const sources = new Map<string, number>();
  const products = new Map<string, number>();
  const linksSp = new Map<string, number>();
  const linksPs = new Map<string, number>();

  for (const f of files) {
    const source = (f.source || "Direct").slice(0, 24);
    const product = (f.loanProduct || "Other").slice(0, 28);
    const stage = STAGE_LABELS[f.stage as PipelineStage] ?? f.stage;
    sources.set(source, (sources.get(source) ?? 0) + 1);
    products.set(product, (products.get(product) ?? 0) + 1);
    const sp = `${source}→${product}`;
    linksSp.set(sp, (linksSp.get(sp) ?? 0) + 1);
    const ps = `${product}→${stage}`;
    linksPs.set(ps, (linksPs.get(ps) ?? 0) + 1);
  }

  const topSources = [...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const topProducts = [...products.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const stageNodes = ACTIVE_STAGES.slice(0, 5).map((s) => s.label);

  const nodes = [
    ...topSources.map(([label]) => ({ id: `s:${label}`, label, layer: 0 })),
    ...topProducts.map(([label]) => ({ id: `p:${label}`, label, layer: 1 })),
    ...stageNodes.map((label) => ({ id: `g:${label}`, label, layer: 2 })),
  ];

  const links: EiSankeyModel["links"] = [];
  for (const [key, value] of linksSp) {
    const [source, product] = key.split("→");
    if (!topSources.some(([l]) => l === source) || !topProducts.some(([l]) => l === product)) continue;
    links.push({ source: `s:${source}`, target: `p:${product}`, value });
  }
  for (const [key, value] of linksPs) {
    const [product, stage] = key.split("→");
    if (!topProducts.some(([l]) => l === product) || !stageNodes.includes(stage!)) continue;
    links.push({ source: `p:${product}`, target: `g:${stage}`, value });
  }

  return { nodes, links: links.slice(0, 24) };
}

function buildWaterfall(files: LoanFile[]): EiWaterfallStep[] {
  const pipeline = sumAmount(files);
  const sanctioned = sumAmount(
    files.filter((f) =>
      ["soft_approved", "final_approved", "closure_wip", "won"].includes(f.stage),
    ),
  );
  const disbursed = files.reduce(
    (s, f) => s + (f.disbursementAmount || (f.stage === "won" ? f.loanAmount * 0.5 : 0)),
    0,
  );
  const revenue = sumRevenue(files);
  const leakage = Math.max(0, pipeline - sanctioned);
  return [
    { id: "pipeline", label: "Pipeline", amount: pipeline, kind: "increase" },
    { id: "leakage", label: "Pre-sanction leakage", amount: -leakage, kind: "decrease" },
    { id: "sanctioned", label: "Sanctioned", amount: sanctioned, kind: "increase" },
    {
      id: "disburse_gap",
      label: "Pending disbursement",
      amount: -(sanctioned - disbursed),
      kind: "decrease",
    },
    { id: "revenue", label: "Expected revenue", amount: revenue, kind: "total" },
  ];
}

function buildTreemap(files: LoanFile[]): EiTreemapCell[] {
  const byProduct = new Map<string, { count: number; value: number }>();
  for (const f of files) {
    const key = f.loanProduct || "Other";
    const cur = byProduct.get(key) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += f.requiredAmount || f.loanAmount || 0;
    byProduct.set(key, cur);
  }
  return [...byProduct.entries()]
    .map(([name, v], i) => ({
      name,
      size: Math.max(1, v.value),
      count: v.count,
      fill: TREEMAP_FILLS[i % TREEMAP_FILLS.length]!,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);
}

function buildGeo(files: LoanFile[]): EiGeoRegion[] {
  const byRegion = new Map<string, { count: number; value: number }>();
  for (const f of files) {
    const key = f.state || f.city || "Unknown";
    const cur = byRegion.get(key) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += f.requiredAmount || f.loanAmount || 0;
    byRegion.set(key, cur);
  }
  const rows = [...byRegion.entries()]
    .map(([label, v]) => ({ id: label, label, value: v.value, count: v.count, intensity: 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const max = rows[0]?.value || 1;
  return rows.map((r) => ({ ...r, intensity: r.value / max }));
}

function buildRadar(files: LoanFile[]): EiRadarAxis[] {
  const total = Math.max(1, files.length);
  const delayed = files.filter((f) => f.isDelayed).length;
  const urgent = files.filter((f) => f.priority === "urgent" || f.isUrgent).length;
  const stalled = files.filter((f) => (f.daysInStage ?? 0) >= 14).length;
  const docRisk = files.filter((f) =>
    (f.documents ?? []).some((d) => d.status === "pending" || d.status === "rejected"),
  ).length;
  const noLender = files.filter((f) => !(f.lenders ?? []).length).length;
  return [
    { axis: "Delay", value: Math.round((delayed / total) * 100), fullMark: 100 },
    { axis: "Urgency", value: Math.round((urgent / total) * 100), fullMark: 100 },
    { axis: "Stall", value: Math.round((stalled / total) * 100), fullMark: 100 },
    { axis: "Docs", value: Math.round((docRisk / total) * 100), fullMark: 100 },
    { axis: "No Lender", value: Math.round((noLender / total) * 100), fullMark: 100 },
  ];
}

function buildTrend(files: LoanFile[]): EiTrendPoint[] {
  const months = new Map<string, number>();
  for (const f of files) {
    const d = new Date(f.createdAt || f.loginDate || Date.now());
    if (Number.isNaN(d.getTime())) continue;
    const key = d.toLocaleDateString("en-IN", { month: "short" });
    months.set(key, (months.get(key) ?? 0) + (f.requiredAmount || f.loanAmount || 0));
  }
  const points = [...months.entries()].slice(-6).map(([label, actual], i, arr) => ({
    label,
    actual: Math.round(actual / 1_00_000) / 10,
    prior: i > 0 ? Math.round((arr[i - 1]![1] / 1_00_000) / 10) : undefined,
  }));
  if (points.length === 0) {
    return [
      { label: "Jan", actual: 12, prior: 10 },
      { label: "Feb", actual: 14, prior: 12 },
      { label: "Mar", actual: 16, prior: 14 },
      { label: "Apr", actual: 15, prior: 16 },
      { label: "May", actual: 18, prior: 15 },
      { label: "Jun", actual: 21, prior: 18 },
    ];
  }
  return points;
}

function buildBubble(files: LoanFile[]): EiBubblePoint[] {
  return files.slice(0, 24).map((f) => ({
    id: f.id,
    label: f.customerName,
    x: (f.requiredAmount || f.loanAmount || 0) / 1_00_000,
    y: (f.expectedRevenue || 0) / 10_000,
    z: Math.max(4, f.daysInStage || 4),
  }));
}

function buildScatter(files: LoanFile[]): EiScatterPoint[] {
  return files.slice(0, 40).map((f) => ({
    id: f.id,
    label: f.customerName,
    x: f.daysInStage || 0,
    y: (f.progress || 0),
  }));
}

function buildTimeline(files: LoanFile[]): EiTimelineEvent[] {
  const events: EiTimelineEvent[] = [];
  const recent = [...files]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  for (const f of recent) {
    events.push({
      id: f.id,
      label: `${f.customerName} · ${STAGE_LABELS[f.stage as PipelineStage] ?? f.stage}`,
      at: f.createdAt,
      tone: f.isDelayed ? "warning" : f.stage === "won" ? "success" : "info",
    });
  }
  return events;
}

function buildCalendar(files: LoanFile[]): EiCalendarDay[] {
  const byDay = new Map<string, number>();
  const today = new Date();
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const f of files) {
    const key = (f.createdAt || "").slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    for (const t of f.timeline ?? []) {
      const tk = (t.timestamp || "").slice(0, 10);
      if (byDay.has(tk)) byDay.set(tk, (byDay.get(tk) ?? 0) + 1);
    }
  }
  const max = Math.max(1, ...byDay.values());
  return [...byDay.entries()].map(([date, count]) => ({
    date,
    count,
    intensity: count / max,
  }));
}

function buildBullets(files: LoanFile[]): EiBulletTarget[] {
  const pipelineCr = sumAmount(files) / 1_00_00_000;
  const sanctionedCr =
    sumAmount(
      files.filter((f) =>
        ["soft_approved", "final_approved", "closure_wip", "won"].includes(f.stage),
      ),
    ) / 1_00_00_000;
  const disbursedCr =
    files.reduce((s, f) => s + (f.disbursementAmount || 0), 0) / 1_00_00_000;
  const revenueL = sumRevenue(files) / 1_00_000;
  return [
    {
      id: "pipeline",
      label: "Pipeline book",
      actual: Number(pipelineCr.toFixed(1)),
      target: Math.max(pipelineCr * 1.15, pipelineCr + 5),
      unit: "cr",
      insight: "Capacity vs stretch target",
    },
    {
      id: "sanctioned",
      label: "Sanctioned progress",
      actual: Number(sanctionedCr.toFixed(1)),
      target: Math.max(sanctionedCr * 1.25, sanctionedCr + 3),
      unit: "cr",
      insight: "Sanctions vs monthly goal",
    },
    {
      id: "disbursed",
      label: "Disbursement pace",
      actual: Number(disbursedCr.toFixed(1)),
      target: Math.max(disbursedCr * 1.3, disbursedCr + 2),
      unit: "cr",
      insight: "Cash conversion vs plan",
    },
    {
      id: "revenue",
      label: "Expected revenue",
      actual: Number(revenueL.toFixed(1)),
      target: Math.max(revenueL * 1.2, revenueL + 10),
      unit: "lakh",
      insight: "Commission vs plan",
    },
  ];
}

function buildGauges(files: LoanFile[]): EiGauge[] {
  const total = Math.max(1, files.length);
  const withLender = files.filter((f) => (f.lenders ?? []).length > 0).length;
  const docsOk = files.filter((f) =>
    (f.documents ?? []).every((d) => d.status !== "rejected"),
  ).length;
  const onTrack = files.filter((f) => !f.isDelayed).length;
  const payout = files.filter((f) => f.payoutConfigured).length;
  const mk = (id: string, label: string, pct: number): EiGauge => ({
    id,
    label,
    pct,
    tone: pct >= 75 ? "healthy" : pct >= 50 ? "watch" : "critical",
  });
  return [
    mk("coverage", "Lender coverage", Math.round((withLender / total) * 100)),
    mk("docs", "Document health", Math.round((docsOk / total) * 100)),
    mk("track", "On-track files", Math.round((onTrack / total) * 100)),
    mk("payout", "Payout configured", Math.round((payout / total) * 100)),
  ];
}

function buildForecast(trend: EiTrendPoint[]): EiForecastPoint[] {
  const last = trend[trend.length - 1]?.actual ?? 20;
  const points: EiForecastPoint[] = trend.map((t) => ({
    label: t.label,
    actual: t.actual,
    forecast: t.actual,
    low: t.actual * 0.92,
    high: t.actual * 1.08,
  }));
  const extras = ["Jul", "Aug", "Sep"];
  extras.forEach((label, i) => {
    const forecast = last * (1.05 + i * 0.04);
    points.push({
      label,
      forecast,
      low: forecast * 0.88,
      high: forecast * 1.12,
    });
  });
  return points;
}

const CHAPTERS: EiStoryChapter[] = [
  {
    id: "funnel",
    eyebrow: "Pipeline",
    headline: "Pipeline conversion",
    narrative: "Stage narrowing shows where the book compresses before sanction.",
    whyThisViz: "Business question Pipeline → Funnel",
    visualization: "funnel",
  },
  {
    id: "sankey",
    eyebrow: "Process Flow",
    headline: "Source → Product → Stage flow",
    narrative: "How originations move through product choice into execution stages.",
    whyThisViz: "Business question Process Flow → Sankey",
    visualization: "sankey",
  },
  {
    id: "waterfall",
    eyebrow: "Revenue Contribution",
    headline: "Value bridges to revenue",
    narrative: "Pipeline to leakage to sanction to disbursement gap to expected revenue.",
    whyThisViz: "Business question Revenue Contribution → Waterfall",
    visualization: "waterfall",
  },
  {
    id: "treemap",
    eyebrow: "Product Mix",
    headline: "Portfolio composition",
    narrative: "Share of book by product value — concentration at a glance.",
    whyThisViz: "Business question Product Mix → Treemap",
    visualization: "treemap",
  },
  {
    id: "geo",
    eyebrow: "Regional Performance",
    headline: "Where value concentrates",
    narrative: "State / city intensity for regional performance.",
    whyThisViz: "Business question Regional Performance → Geographic Map",
    visualization: "geo_map",
  },
  {
    id: "radar",
    eyebrow: "Risk Distribution",
    headline: "Risk posture across dimensions",
    narrative: "Delay, urgency, stall, documents, and lender gaps compared together.",
    whyThisViz: "Business question Risk Distribution → Radar",
    visualization: "radar",
  },
  {
    id: "trend",
    eyebrow: "Trend",
    headline: "Book momentum",
    narrative: "Volume trend with prior period reference.",
    whyThisViz: "Business question Trend → Area + Line",
    visualization: "trend_area_line",
  },
  {
    id: "bubble",
    eyebrow: "Relationship",
    headline: "Amount · Revenue · Time",
    narrative: "Loan size vs expected revenue, sized by days in stage.",
    whyThisViz: "Business question Relationship → Bubble",
    visualization: "bubble",
  },
  {
    id: "scatter",
    eyebrow: "Correlation",
    headline: "Days in stage vs progress",
    narrative: "Are stalled files also low-progress? Correlation view.",
    whyThisViz: "Business question Correlation → Scatter",
    visualization: "scatter",
  },
  {
    id: "timeline",
    eyebrow: "Timeline",
    headline: "Recent journey events",
    narrative: "Latest file movements on a chronological spine.",
    whyThisViz: "Business question Timeline → Timeline Chart",
    visualization: "timeline",
  },
  {
    id: "calendar",
    eyebrow: "Daily Activity",
    headline: "Activity intensity",
    narrative: "Day-by-day creation and timeline activity density.",
    whyThisViz: "Business question Daily Activity → Calendar Heatmap",
    visualization: "calendar_heatmap",
  },
  {
    id: "bullet",
    eyebrow: "Target Achievement",
    headline: "Plan vs reality",
    narrative: "Attainment against stretch targets on one axis.",
    whyThisViz: "Business question Target Achievement → Bullet Chart",
    visualization: "bullet",
  },
  {
    id: "gauges",
    eyebrow: "Technical Health",
    headline: "Operating health gauges",
    narrative: "Coverage, documents, on-track rate, and payout configuration.",
    whyThisViz: "Business question Technical Health → Multi Gauge Dashboard",
    visualization: "multi_gauge",
  },
  {
    id: "forecast",
    eyebrow: "Forecast",
    headline: "Forward band outlook",
    narrative: "Actual history with forecast confidence bands ahead.",
    whyThisViz: "Business question Forecast → Forecast Bands",
    visualization: "forecast_bands",
  },
];

export function deriveExecutiveIntelligenceStory(files: LoanFile[]): EiExecutiveStory {
  const active = files.filter((f) => !f.archived);
  const trend = buildTrend(active);
  return {
    generatedAt: new Date().toISOString(),
    heroHeadline: "Business performance in seconds",
    heroSubline:
      "Executive Intelligence — each chart is chosen by business question, never at random.",
    pulse: buildPulse(active),
    funnel: buildFunnel(active),
    sankey: buildSankey(active),
    waterfall: buildWaterfall(active),
    treemap: buildTreemap(active),
    geo: buildGeo(active),
    radar: buildRadar(active),
    trend,
    bubble: buildBubble(active),
    scatter: buildScatter(active),
    timeline: buildTimeline(active),
    calendar: buildCalendar(active),
    bullets: buildBullets(active),
    gauges: buildGauges(active),
    forecast: buildForecast(trend),
    chapters: CHAPTERS,
  };
}
