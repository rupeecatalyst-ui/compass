import type { LIVING_COMPASS_FINANCIAL_DIRECTIONS } from "./living-compass.constants";

export type LivingCompassState = "idle" | "listening" | "thinking" | "ready";

export type LivingCompassDirection = keyof typeof LIVING_COMPASS_FINANCIAL_DIRECTIONS;

export interface LivingCompassProps {
  /** Animation choreography state. */
  state?: LivingCompassState;
  /** Financial product direction — needle settles here when ready. */
  direction?: LivingCompassDirection;
  /**
   * Optional runtime bearing override (degrees).
   * Reserved for future Catalyst One configuration — takes precedence over `direction`.
   */
  bearing?: number;
  /** Render size in CSS pixels (48–72 recommended). */
  size?: number;
  className?: string;
  /** Accessible label for screen readers. */
  "aria-label"?: string;
  /** Called once when a directional thinking sequence completes (prototype / journey flows). */
  onThinkingComplete?: () => void;
}
