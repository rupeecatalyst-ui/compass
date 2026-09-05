/**
 * Collision-safe Marketing identifiers.
 * Honor an explicit id for test determinism. Never use Date.now() alone.
 */

let sequence = 0;

export function createMarketingScopedId(
  prefix: string,
  organizationId: string,
  explicitId?: string | null,
): string {
  const trimmed = explicitId?.trim();
  if (trimmed) return trimmed;
  sequence += 1;
  return `${prefix}-${organizationId}-${Date.now()}-${sequence.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
