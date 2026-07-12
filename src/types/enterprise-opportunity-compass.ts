/**
 * Opportunity Compass (SPR-001).
 * Needle direction, pulse intensity, and rotating recommendations.
 */

export type OpportunityCompassNeedle = "north" | "centre" | "south";

export type OpportunityCompassSignal = "excellent" | "normal" | "needs_attention";

export type OpportunityCompassColour = "green" | "blue" | "red";

export interface OpportunityProgressMetrics {
  completionRatio: number;
  overdueTaskCount?: number;
  blockedStageCount?: number;
  riskScore?: number;
}

export interface OpportunityCompassNeedleResult {
  needle: OpportunityCompassNeedle;
  signal: OpportunityCompassSignal;
  colour: OpportunityCompassColour;
  rationale: string;
}

export interface OpportunityPulseResult {
  intensity: number;
  label: "low" | "moderate" | "high" | "critical";
  metrics: OpportunityProgressMetrics;
}

export interface OpportunityRecommendation {
  id: string;
  contextRef: string;
  message: string;
  priority: number;
  enabled: boolean;
  createdOn: string;
}
