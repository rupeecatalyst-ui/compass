/**
 * Every Executive Intelligence visualization must support these capabilities.
 */

export const EI_VIZ_CAPABILITIES = [
  "Hover Insights",
  "Drill Down",
  "Cross Filtering",
  "Date Comparison",
  "Fullscreen",
  "Export",
  "AI Explanation",
  "Animation",
  "Loading Skeleton",
  "Empty State",
  "Error State",
] as const;

export type EiVizCapability = (typeof EI_VIZ_CAPABILITIES)[number];

export type EiDateComparisonMode = "period" | "vs_prior" | "yoy";

export interface EiCrossFilterState {
  stageId?: string;
  product?: string;
  region?: string;
  lender?: string;
  rm?: string;
}

export interface EiHoverInsight {
  title: string;
  detail: string;
  value?: string;
}

export interface EiDrillTarget {
  dimension: string;
  key: string;
  label: string;
}

export interface EiExportPayload {
  filename: string;
  /** JSON-serializable rows / object */
  data: unknown;
}
