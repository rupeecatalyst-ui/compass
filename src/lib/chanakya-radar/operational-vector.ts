/**
 * CO-SPRINT-100 — Operational Vector Engine.
 * Every active deal contributes proportionally to radar bearing.
 */

import {
  CHANAKYA_RADAR_QUADRANTS,
  type ChanakyaCompassDirectionId,
  type ChanakyaHealthTrendId,
  type ChanakyaOperationalQuadrantId,
} from "@/constants/chanakya-radar";

export interface OperationalVectorInput {
  quadrant: ChanakyaOperationalQuadrantId;
  /** Relative weight (loan size, risk, overdue pressure). */
  weight: number;
  momentum?: "improving" | "stable" | "declining";
}

export interface OperationalVectorResult {
  /** Bearing degrees from North, clockwise, 0–360. */
  bearingDeg: number;
  direction: ChanakyaCompassDirectionId;
  healthScore: number;
  trend: ChanakyaHealthTrendId;
  dominantQuadrant: ChanakyaOperationalQuadrantId;
  largestConcern: ChanakyaOperationalQuadrantId;
  quadrantWeights: Record<ChanakyaOperationalQuadrantId, number>;
  totalWeight: number;
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
 * Compute continuous operational vector from weighted deal contributions.
 * Uses North-up compass: +Y = North, +X = East.
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

  let vx = 0;
  let vy = 0;
  let scoreSum = 0;
  let weightSum = 0;
  let improving = 0;
  let declining = 0;

  for (const item of inputs) {
    const w = Math.max(0.05, item.weight);
    const bearing = BEARING[item.quadrant];
    const rad = toRadians(bearing);
    // North-up: x = sin(bearing), y = cos(bearing)
    vx += w * Math.sin(rad);
    vy += w * Math.cos(rad);
    quadrantWeights[item.quadrant] += w;
    scoreSum += QUADRANT_SCORE[item.quadrant] * w;
    weightSum += w;
    if (item.momentum === "improving") improving += w;
    if (item.momentum === "declining") declining += w;
  }

  let bearingDeg = 0;
  if (weightSum > 0 && (Math.abs(vx) > 1e-9 || Math.abs(vy) > 1e-9)) {
    bearingDeg = normalizeDeg((Math.atan2(vx, vy) * 180) / Math.PI);
  }

  const healthScore =
    weightSum > 0 ? Math.round(Math.min(100, Math.max(0, scoreSum / weightSum))) : 100;

  let dominantQuadrant: ChanakyaOperationalQuadrantId = "on_track";
  let largestConcern: ChanakyaOperationalQuadrantId = "at_risk";
  let maxW = -1;
  let maxConcern = -1;
  for (const q of CHANAKYA_RADAR_QUADRANTS) {
    const w = quadrantWeights[q.id];
    if (w > maxW) {
      maxW = w;
      dominantQuadrant = q.id;
    }
    if (q.id !== "on_track" && w > maxConcern) {
      maxConcern = w;
      largestConcern = q.id;
    }
  }

  let trend: ChanakyaHealthTrendId = "Stable";
  if (improving > declining * 1.15) trend = "Improving";
  else if (declining > improving * 1.15) trend = "Declining";

  return {
    bearingDeg,
    direction: bearingToCompassDirection(bearingDeg),
    healthScore,
    trend,
    dominantQuadrant,
    largestConcern: maxConcern <= 0 ? dominantQuadrant : largestConcern,
    quadrantWeights,
    totalWeight: weightSum,
  };
}

export function quadrantLabel(id: ChanakyaOperationalQuadrantId): string {
  return CHANAKYA_RADAR_QUADRANTS.find((q) => q.id === id)?.label ?? id;
}
