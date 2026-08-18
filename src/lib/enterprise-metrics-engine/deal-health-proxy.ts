/**
 * EME Phase-1 Deal Health proxy — single implementation.
 *
 * Score formula (canonical): 85 − min(days, 60), with the existing EME
 * clamp to [5, 98]. For non-negative days the clamp is a no-op (range 25–85).
 *
 * Nightly snapshots pass stored `daysInStage`.
 * Lender Pipeline Kanban derives days from `stageEnteredAt` at read time.
 * Do not persist Kanban-derived scores onto EnterpriseDeal.
 */

export const DEAL_HEALTH_PROXY_BASE = 85;
export const DEAL_HEALTH_PROXY_MAX_AGE_DAYS = 60;
export const DEAL_HEALTH_PROXY_MIN_SCORE = 5;
export const DEAL_HEALTH_PROXY_MAX_SCORE = 98;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Canonical Phase-1 Deal Health score from an effective stage-age in days. */
export function computeDealHealthProxyScore(daysInStage: number): number {
  const days = Number.isFinite(daysInStage) ? Math.max(0, daysInStage) : 0;
  return Math.max(
    DEAL_HEALTH_PROXY_MIN_SCORE,
    Math.min(
      DEAL_HEALTH_PROXY_MAX_SCORE,
      DEAL_HEALTH_PROXY_BASE - Math.min(days, DEAL_HEALTH_PROXY_MAX_AGE_DAYS),
    ),
  );
}

/**
 * Calendar-elapsed whole days since current-stage entry.
 * Returns null when `stageEnteredAt` is missing or unparseable.
 * Ageing source is current-stage entry only.
 */
export function dealHealthStageAgeDays(
  stageEnteredAt: string | Date | null | undefined,
  now: Date = new Date(),
): number | null {
  if (stageEnteredAt == null) return null;
  if (typeof stageEnteredAt === "string" && !stageEnteredAt.trim()) return null;
  const entered =
    stageEnteredAt instanceof Date ? stageEnteredAt : new Date(stageEnteredAt);
  if (Number.isNaN(entered.getTime())) return null;
  const nowMs = now.getTime();
  if (Number.isNaN(nowMs)) return null;
  return Math.max(0, Math.floor((nowMs - entered.getTime()) / MS_PER_DAY));
}

/**
 * Lender Pipeline Kanban Deal Health (read-time only).
 * Prefer stageEnteredAt ageing; otherwise preserve cached healthScore / null.
 */
export function resolveKanbanDealHealthScore(
  input: {
    stageEnteredAt?: string | Date | null;
    healthScore?: number | null;
  },
  now: Date = new Date(),
): number | null {
  const days = dealHealthStageAgeDays(input.stageEnteredAt, now);
  if (days != null) {
    return computeDealHealthProxyScore(days);
  }
  return typeof input.healthScore === "number" && Number.isFinite(input.healthScore)
    ? input.healthScore
    : null;
}
