import {
  LIVING_COMPASS_FINANCIAL_DIRECTIONS,
  LIVING_COMPASS_TIMING,
} from "./living-compass.constants";
import type { LivingCompassDirection } from "./living-compass.types";

/**
 * Resolves the needle bearing for a financial direction.
 * `bearingOverride` supports future Catalyst One runtime configuration.
 */
export function resolveFinancialDirectionBearing(
  direction?: LivingCompassDirection,
  bearingOverride?: number,
): number {
  if (bearingOverride !== undefined) return bearingOverride;
  if (direction) return LIVING_COMPASS_FINANCIAL_DIRECTIONS[direction];
  return LIVING_COMPASS_FINANCIAL_DIRECTIONS.HOME_LOAN;
}

/**
 * Builds an intelligent thinking path toward a target bearing.
 * Wide probes first, then gradual convergence — deliberate, not random.
 */
export function buildThinkingBearings(targetBearing: number): number[] {
  return LIVING_COMPASS_TIMING.thinking.probeOffsetsFromTarget.map(
    (offset) => targetBearing + offset,
  );
}
