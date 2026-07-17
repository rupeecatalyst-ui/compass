/**
 * Executive Intelligence Platform — presentation contracts.
 * Visualization choice is driven by business-question rules (never random).
 */

import type { EiRuleKind } from "@/constants/executive-intelligence-visualization-rules";

export type EiVisualizationKind = EiRuleKind;

export interface EiPulseMetric {
  id: string;
  label: string;
  value: string;
  deltaLabel: string;
  deltaTone: "up" | "down" | "flat";
  insight: string;
  href?: string;
}

export interface EiFunnelStage {
  id: string;
  label: string;
  count: number;
  value: number;
  conversionFromPrior: number | null;
  color: string;
}

export interface EiSankeyNode {
  id: string;
  label: string;
  layer: number;
}

export interface EiSankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface EiSankeyModel {
  nodes: EiSankeyNode[];
  links: EiSankeyLink[];
}

export interface EiWaterfallStep {
  id: string;
  label: string;
  amount: number;
  kind: "increase" | "decrease" | "total";
}

export interface EiTreemapCell {
  name: string;
  size: number;
  count: number;
  fill: string;
}

export interface EiGeoRegion {
  id: string;
  label: string;
  value: number;
  count: number;
  intensity: number;
}

export interface EiRadarAxis {
  axis: string;
  value: number;
  fullMark: number;
}

export interface EiTrendPoint {
  label: string;
  actual: number;
  prior?: number;
}

export interface EiBubblePoint {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
}

export interface EiScatterPoint {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface EiTimelineEvent {
  id: string;
  label: string;
  at: string;
  tone: "success" | "warning" | "info" | "neutral";
}

export interface EiCalendarDay {
  date: string;
  count: number;
  intensity: number;
}

export interface EiBulletTarget {
  id: string;
  label: string;
  actual: number;
  target: number;
  unit: "cr" | "lakh" | "count" | "pct";
  insight: string;
}

export interface EiGauge {
  id: string;
  label: string;
  pct: number;
  tone: "healthy" | "watch" | "critical";
}

export interface EiForecastPoint {
  label: string;
  actual?: number;
  forecast: number;
  low: number;
  high: number;
}

export interface EiStoryChapter {
  id: string;
  eyebrow: string;
  headline: string;
  narrative: string;
  whyThisViz: string;
  visualization: EiVisualizationKind;
}

export interface EiExecutiveStory {
  generatedAt: string;
  heroHeadline: string;
  heroSubline: string;
  pulse: EiPulseMetric[];
  funnel: EiFunnelStage[];
  sankey: EiSankeyModel;
  waterfall: EiWaterfallStep[];
  treemap: EiTreemapCell[];
  geo: EiGeoRegion[];
  radar: EiRadarAxis[];
  trend: EiTrendPoint[];
  bubble: EiBubblePoint[];
  scatter: EiScatterPoint[];
  timeline: EiTimelineEvent[];
  calendar: EiCalendarDay[];
  bullets: EiBulletTarget[];
  gauges: EiGauge[];
  forecast: EiForecastPoint[];
  chapters: EiStoryChapter[];
}
