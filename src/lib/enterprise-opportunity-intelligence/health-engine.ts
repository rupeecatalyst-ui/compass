/**
 * Live Opportunity Health / Pulse / Compass computation (SPR-003).
 */

import type {
  OpportunityFactorScore,
  OpportunityHealthBand,
  OpportunityHealthResult,
  OpportunityIntelligenceConfig,
  OpportunityLiveCompassResult,
  OpportunityOperationalSignals,
} from "@/types/enterprise-opportunity-intelligence";
import { getOpportunityIntelligenceConfig } from "./config";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function bandFromScore(score: number, config: OpportunityIntelligenceConfig): OpportunityHealthBand {
  if (score >= config.healthThresholds.excellentMin) return "excellent";
  if (score >= config.healthThresholds.goodMin) return "good";
  if (score >= config.healthThresholds.needsAttentionMin) return "needs_attention";
  return "critical";
}

export function computeLivePulseIntensity(
  signals: OpportunityOperationalSignals,
  config: OpportunityIntelligenceConfig = getOpportunityIntelligenceConfig(),
): { intensity: number; label: OpportunityHealthResult["pulseLabel"]; pulseScore: number } {
  const w = config.pulseWeightages;
  const pendingDocs =
    signals.documentRequiredCount === 0
      ? 0
      : Math.max(0, signals.documentRequiredCount - signals.documentVerifiedCount) /
        signals.documentRequiredCount;
  const overdueNorm = clamp01(signals.overdueTaskCount / config.overdueTaskSoftCap);
  const openNorm = clamp01(signals.openTaskCount / config.openTaskSoftCap);
  const inactivityNorm = clamp01(signals.daysSinceLastActivity / config.inactivityHorizonDays);
  const stageLag = clamp01(1 - signals.stageProgressRatio);

  const intensity = clamp01(
    overdueNorm * w.overdueTaskWeight +
      pendingDocs * w.pendingDocumentWeight +
      inactivityNorm * w.inactivityDayWeight +
      openNorm * w.openTaskWeight +
      stageLag * w.stageLagWeight,
  );

  let label: OpportunityHealthResult["pulseLabel"] = "low";
  if (intensity >= 0.75) label = "critical";
  else if (intensity >= 0.5) label = "high";
  else if (intensity >= 0.25) label = "moderate";

  return { intensity, label, pulseScore: Math.round((1 - intensity) * 100) };
}

export function computeOpportunityHealthScore(
  signals: OpportunityOperationalSignals,
  config: OpportunityIntelligenceConfig = getOpportunityIntelligenceConfig(),
): OpportunityHealthResult {
  const weights = config.healthWeightages;
  const pulse = computeLivePulseIntensity(signals, config);

  const documentCompletion =
    signals.documentRequiredCount === 0
      ? 1
      : clamp01(signals.documentVerifiedCount / signals.documentRequiredCount);

  const openTasksScore = 1 - clamp01(signals.openTaskCount / config.openTaskSoftCap);
  const overdueTasksScore = 1 - clamp01(signals.overdueTaskCount / config.overdueTaskSoftCap);
  const inactivityScore = 1 - clamp01(signals.daysSinceLastActivity / config.inactivityHorizonDays);
  const communicationScore = clamp01(signals.communicationEventCount / 5);

  const factorDefs: Array<{ key: OpportunityFactorScore["key"]; weight: number; rawScore: number }> = [
    { key: "stageProgress", weight: weights.stageProgress, rawScore: clamp01(signals.stageProgressRatio) },
    { key: "pulseScore", weight: weights.pulseScore, rawScore: pulse.pulseScore / 100 },
    { key: "documentCompletion", weight: weights.documentCompletion, rawScore: documentCompletion },
    { key: "openTasks", weight: weights.openTasks, rawScore: openTasksScore },
    { key: "overdueTasks", weight: weights.overdueTasks, rawScore: overdueTasksScore },
    { key: "daysSinceLastActivity", weight: weights.daysSinceLastActivity, rawScore: inactivityScore },
    { key: "communicationActivity", weight: weights.communicationActivity, rawScore: communicationScore },
  ];

  const weightSum = factorDefs.reduce((s, f) => s + f.weight, 0) || 1;
  const factors: OpportunityFactorScore[] = factorDefs.map((f) => ({
    key: f.key,
    weight: f.weight / weightSum,
    rawScore: f.rawScore,
    contribution: (f.weight / weightSum) * f.rawScore * 100,
  }));

  const score = Math.round(factors.reduce((s, f) => s + f.contribution, 0));

  return {
    score,
    band: bandFromScore(score, config),
    factors,
    pulseScore: pulse.pulseScore,
    pulseIntensity: pulse.intensity,
    pulseLabel: pulse.label,
  };
}

export function computeLiveOpportunityCompass(
  signals: OpportunityOperationalSignals,
  health: OpportunityHealthResult,
  config: OpportunityIntelligenceConfig = getOpportunityIntelligenceConfig(),
): OpportunityLiveCompassResult {
  const t = config.compassThresholds;

  if (
    health.score <= t.southMaxHealth ||
    signals.overdueTaskCount >= t.southMinOverdue ||
    health.band === "critical"
  ) {
    return {
      needle: "south",
      colour: "red",
      signal: "needs_attention",
      rationale: "Health, overdue tasks, or critical band require attention.",
    };
  }

  if (
    health.score >= t.northMinHealth &&
    signals.overdueTaskCount <= t.northMaxOverdue &&
    health.band === "excellent"
  ) {
    return {
      needle: "north",
      colour: "green",
      signal: "excellent",
      rationale: "Strong health score with healthy task and document posture.",
    };
  }

  return {
    needle: "centre",
    colour: "blue",
    signal: "normal",
    rationale: "Operational posture is within normal range.",
  };
}
