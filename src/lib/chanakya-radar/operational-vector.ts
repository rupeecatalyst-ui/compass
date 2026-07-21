/**
 * CO-SPRINT-100 / CO-SPRINT-107 — Operational Vector Engine.
 *
 * BUSINESS CERTIFIED (production-approved): attention-weighted management focus.
 * Health score uses portfolio weights. Bearing = living Operational Vector
 * (direction of highest management attention / operational impact).
 *
 * FUTURE PLATFORM HARDENING (not a production task): decouple abstract enterprise
 * attention (Enterprise Attention Score · Highest Attention Quadrant · Confidence)
 * from Radar compass geometry; Radar becomes a presentation adapter only.
 */

import {
  CHANAKYA_RADAR_QUADRANTS,
  type ChanakyaCompassDirectionId,
  type ChanakyaHealthTrendId,
  type ChanakyaOperationalQuadrantId,
} from "@/constants/chanakya-radar";

export interface OperationalVectorInput {
  quadrant: ChanakyaOperationalQuadrantId;
  /** Relative weight for portfolio health (loan size, risk, overdue pressure). */
  weight: number;
  /**
   * Attention / management-impact weight for Operational Vector bearing.
   * Defaults to `weight` when omitted.
   */
  attentionWeight?: number;
  momentum?: "improving" | "stable" | "declining";
}

export interface OperationalVectorResult {
  /** Bearing degrees from North, clockwise, 0–360 — Operational Vector. */
  bearingDeg: number;
  direction: ChanakyaCompassDirectionId;
  healthScore: number;
  trend: ChanakyaHealthTrendId;
  dominantQuadrant: ChanakyaOperationalQuadrantId;
  largestConcern: ChanakyaOperationalQuadrantId;
  /** Quadrant with highest management-attention pull (vector focus). */
  attentionFocus: ChanakyaOperationalQuadrantId;
  quadrantWeights: Record<ChanakyaOperationalQuadrantId, number>;
  attentionWeights: Record<ChanakyaOperationalQuadrantId, number>;
  totalWeight: number;
  /** Human-readable purpose for UI / a11y. */
  vectorPurpose: string;
}

const QUADRANT_SCORE: Record<ChanakyaOperationalQuadrantId, number> = {
  on_track: 92,
  follow_up_required: 62,
  needs_attention: 48,
  at_risk: 18,
};

const BEARING: Record<ChanakyaOperationalQuadrantId, number> = {
  on_track: 0,
  follow_up_required: 90,
  at_risk: 180,
  needs_attention: 270,
};

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

export function bearingToCompassDirection(bearingDeg: number): ChanakyaCompassDirectionId {
  const d = normalizeDeg(bearingDeg);
  const sector = Math.round(d / 45) % 8;
  const labels: ChanakyaCompassDirectionId[] = [
    "North",
    "North-East",
    "East",
    "South-East",
    "South",
    "South-West",
    "West",
    "North-West",
  ];
  return labels[sector]!;
}

/**
 * Compute portfolio health + Operational Vector (attention bearing).
 */
export function computeOperationalVector(
  inputs: OperationalVectorInput[],
): OperationalVectorResult {
  const quadrantWeights: Record<ChanakyaOperationalQuadrantId, number> = {
    on_track: 0,
    needs_attention: 0,
    follow_up_required: 0,
    at_risk: 0,
  };
  const attentionWeights: Record<ChanakyaOperationalQuadrantId, number> = {
    on_track: 0,
    needs_attention: 0,
    follow_up_required: 0,
    at_risk: 0,
  };

  let scoreSum = 0;
  let weightSum = 0;
  let improving = 0;
  let declining = 0;

  let ax = 0;
  let ay = 0;
  let attentionSum = 0;

  for (const item of inputs) {
    const w = Math.max(0.05, item.weight);
    const aw = Math.max(0.02, item.attentionWeight ?? item.weight);
    quadrantWeights[item.quadrant] += w;
    attentionWeights[item.quadrant] += aw;
    scoreSum += QUADRANT_SCORE[item.quadrant] * w;
    weightSum += w;
    if (item.momentum === "improving") improving += w;
    if (item.momentum === "declining") declining += w;

    const rad = toRadians(BEARING[item.quadrant]);
    // North-up: x = sin(bearing), y = cos(bearing)
    ax += aw * Math.sin(rad);
    ay += aw * Math.cos(rad);
    attentionSum += aw;
  }

  let bearingDeg = 0;
  if (attentionSum > 0 && (Math.abs(ax) > 1e-9 || Math.abs(ay) > 1e-9)) {
    bearingDeg = normalizeDeg((Math.atan2(ax, ay) * 180) / Math.PI);
  }

  const healthScore =
    weightSum > 0 ? Math.round(Math.min(100, Math.max(0, scoreSum / weightSum))) : 100;

  let dominantQuadrant: ChanakyaOperationalQuadrantId = "on_track";
  let largestConcern: ChanakyaOperationalQuadrantId = "at_risk";
  let attentionFocus: ChanakyaOperationalQuadrantId = "on_track";
  let maxW = -1;
  let maxConcern = -1;
  let maxAttention = -1;
  for (const q of CHANAKYA_RADAR_QUADRANTS) {
    const w = quadrantWeights[q.id];
    const aw = attentionWeights[q.id];
    if (w > maxW) {
      maxW = w;
      dominantQuadrant = q.id;
    }
    if (q.id !== "on_track" && w > maxConcern) {
      maxConcern = w;
      largestConcern = q.id;
    }
    if (aw > maxAttention) {
      maxAttention = aw;
      attentionFocus = q.id;
    }
  }

  let trend: ChanakyaHealthTrendId = "Stable";
  if (improving > declining * 1.15) trend = "Improving";
  else if (declining > improving * 1.15) trend = "Declining";

  const focusLabel =
    CHANAKYA_RADAR_QUADRANTS.find((q) => q.id === attentionFocus)?.label ?? "portfolio";

  return {
    bearingDeg,
    direction: bearingToCompassDirection(bearingDeg),
    healthScore,
    trend,
    dominantQuadrant,
    largestConcern: maxConcern <= 0 ? dominantQuadrant : largestConcern,
    attentionFocus,
    quadrantWeights,
    attentionWeights,
    totalWeight: weightSum,
    vectorPurpose: `Operational Vector — greatest management impact toward ${focusLabel}`,
  };
}

export function quadrantLabel(id: ChanakyaOperationalQuadrantId): string {
  return CHANAKYA_RADAR_QUADRANTS.find((q) => q.id === id)?.label ?? id;
}
