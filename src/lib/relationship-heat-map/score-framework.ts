/**
 * CO-SPRINT-095 — Engagement score framework (placeholder only).
 *
 * Production algorithm is intentionally NOT implemented.
 * This port + placeholder scorer exist so the heat map UI can wire size/colour
 * until operational signal collectors are certified.
 */

import type {
  RelationshipEngagementBand,
  RelationshipEngagementScoreResult,
  RelationshipEngagementSignals,
  RelationshipTimeWindow,
} from "@/types/relationship-heat-map";

export interface RelationshipEngagementScoreEngine {
  /**
   * Future: weight operational factors into a durable engagement score.
   * Current: returns framework placeholder scores for visualization wiring.
   */
  score(signals: RelationshipEngagementSignals): RelationshipEngagementScoreResult;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function daysSince(iso?: string): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.max(0, (Date.now() - t) / 86400000);
}

/**
 * Activity band is date-only. A historically high score must not prevent Dormant.
 * Very Active 0–7 · Active 8–30 · Moderately Active 31–60 · Needs Attention 61–90 · Dormant >90 or unknown.
 */
export function bandFromRecency(days: number): RelationshipEngagementBand {
  if (!Number.isFinite(days) || days > 90) return "dormant";
  if (days <= 7) return "very_active";
  if (days <= 30) return "active";
  if (days <= 60) return "moderate";
  return "needs_attention";
}

/**
 * PLACEHOLDER scorer — not the production engagement algorithm.
 * Uses recency + optional contactScore hint solely to drive treemap wiring.
 */
export function createPlaceholderEngagementScoreEngine(): RelationshipEngagementScoreEngine {
  return {
    score(signals) {
      const days = daysSince(signals.lastActivityAt);
      const recencyComponent = clamp(
        Number.isFinite(days) ? 100 - days * 0.7 : 8,
        8,
        96,
      );
      const hint = signals.contactScoreHint ?? 70;
      const score = Math.round(clamp(recencyComponent * 0.65 + hint * 0.35, 8, 99));
      return {
        score,
        band: bandFromRecency(days),
        placeholder: true,
        computedAt: new Date().toISOString(),
      };
    },
  };
}

export function timeWindowMaxDays(window: RelationshipTimeWindow): number {
  switch (window) {
    case "today":
      return 1;
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
  }
}

export function statusMatchesBand(
  status: "all" | "active" | "moderate" | "dormant",
  band: RelationshipEngagementBand,
): boolean {
  if (status === "all") return true;
  if (status === "active") return band === "very_active" || band === "active";
  if (status === "moderate") return band === "moderate" || band === "needs_attention";
  return band === "dormant";
}
