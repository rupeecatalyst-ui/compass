/**
 * Opportunity Compass helpers (SPR-001).
 */

import type {
  OpportunityCompassNeedleResult,
  OpportunityProgressMetrics,
  OpportunityPulseResult,
  OpportunityRecommendation,
} from "@/types/enterprise-opportunity-compass";

let recommendations: OpportunityRecommendation[] = [];

export function computeOpportunityCompassNeedle(
  metrics: OpportunityProgressMetrics,
): OpportunityCompassNeedleResult {
  const overdue = metrics.overdueTaskCount ?? 0;
  const blocked = metrics.blockedStageCount ?? 0;
  const risk = metrics.riskScore ?? 0;
  const completion = metrics.completionRatio;

  if (overdue > 0 || blocked > 0 || risk >= 0.7 || completion < 0.35) {
    return {
      needle: "south",
      signal: "needs_attention",
      colour: "red",
      rationale: "Progress metrics indicate attention is required.",
    };
  }

  if (completion >= 0.8 && overdue === 0 && blocked === 0 && risk < 0.3) {
    return {
      needle: "north",
      signal: "excellent",
      colour: "green",
      rationale: "Strong progress with low risk.",
    };
  }

  return {
    needle: "centre",
    signal: "normal",
    colour: "blue",
    rationale: "Progress is within normal operating range.",
  };
}

export function computeOpportunityPulse(metrics: OpportunityProgressMetrics): OpportunityPulseResult {
  const overdue = metrics.overdueTaskCount ?? 0;
  const blocked = metrics.blockedStageCount ?? 0;
  const risk = metrics.riskScore ?? 0;
  const lag = Math.max(0, 1 - metrics.completionRatio);

  const intensity = Math.min(
    1,
    Math.max(0, lag * 0.45 + overdue * 0.15 + blocked * 0.2 + risk * 0.35),
  );

  let label: OpportunityPulseResult["label"] = "low";
  if (intensity >= 0.75) label = "critical";
  else if (intensity >= 0.5) label = "high";
  else if (intensity >= 0.25) label = "moderate";

  return { intensity, label, metrics };
}

export function registerOpportunityRecommendation(
  input: Omit<OpportunityRecommendation, "id" | "createdOn">,
): OpportunityRecommendation {
  const recommendation: OpportunityRecommendation = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };
  recommendations = [recommendation, ...recommendations.filter((r) => r.id !== recommendation.id)];
  return recommendation;
}

export function listOpportunityRecommendations(contextRef?: string): OpportunityRecommendation[] {
  const items = contextRef
    ? recommendations.filter((r) => r.contextRef === contextRef && r.enabled)
    : recommendations.filter((r) => r.enabled);
  return [...items].sort((a, b) => b.priority - a.priority);
}

export function resetOpportunityCompassRecommendations(): void {
  recommendations = [];
}
