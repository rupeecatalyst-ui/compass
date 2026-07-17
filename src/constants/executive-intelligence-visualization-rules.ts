/**
 * Executive Intelligence — Visualization Rules (frozen).
 * Never choose charts randomly. Map business question → visualization.
 *
 * Prefer the better visualization when a more suitable form exists.
 * Do not optimize for ease of implementation — optimize for executive
 * understanding and long-term product quality.
 */

export const EI_VISUALIZATION_RULES = [
  { businessQuestion: "Pipeline", visualization: "Funnel", kind: "funnel" },
  { businessQuestion: "Process Flow", visualization: "Sankey", kind: "sankey" },
  { businessQuestion: "Revenue Contribution", visualization: "Waterfall", kind: "waterfall" },
  { businessQuestion: "Product Mix", visualization: "Treemap", kind: "treemap" },
  { businessQuestion: "Regional Performance", visualization: "Geographic Map", kind: "geo_map" },
  { businessQuestion: "Risk Distribution", visualization: "Radar", kind: "radar" },
  { businessQuestion: "Trend", visualization: "Area + Line", kind: "trend_area_line" },
  { businessQuestion: "Relationship", visualization: "Bubble", kind: "bubble" },
  { businessQuestion: "Correlation", visualization: "Scatter", kind: "scatter" },
  { businessQuestion: "Timeline", visualization: "Timeline Chart", kind: "timeline" },
  { businessQuestion: "Daily Activity", visualization: "Calendar Heatmap", kind: "calendar_heatmap" },
  { businessQuestion: "Target Achievement", visualization: "Bullet Chart", kind: "bullet" },
  { businessQuestion: "Technical Health", visualization: "Multi Gauge Dashboard", kind: "multi_gauge" },
  { businessQuestion: "KPIs", visualization: "Premium Metric Cards", kind: "kpi_cards" },
  { businessQuestion: "Forecast", visualization: "Forecast Bands", kind: "forecast_bands" },
] as const;

export type EiRuleKind = (typeof EI_VISUALIZATION_RULES)[number]["kind"];

export function resolveVisualizationForQuestion(
  businessQuestion: string,
): (typeof EI_VISUALIZATION_RULES)[number] | undefined {
  const q = businessQuestion.trim().toLowerCase();
  return EI_VISUALIZATION_RULES.find((r) => r.businessQuestion.toLowerCase() === q);
}
