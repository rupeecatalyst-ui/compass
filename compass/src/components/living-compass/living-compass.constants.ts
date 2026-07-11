/** Living Compass — design tokens and animation choreography. */

export const LIVING_COMPASS_SIZE = {
  default: 64,
  min: 48,
  max: 72,
} as const;

export const LIVING_COMPASS_COLORS = {
  background: "#06080d",
  ring: "rgba(255, 255, 255, 0.12)",
  ringInner: "rgba(45, 212, 191, 0.18)",
  tick: "rgba(255, 255, 255, 0.22)",
  tickMajor: "rgba(45, 212, 191, 0.55)",
  needleNorth: "rgb(45, 212, 191)",
  needleSouth: "rgba(255, 255, 255, 0.14)",
  hub: "#06080d",
  hubRing: "rgba(45, 212, 191, 0.65)",
  glow: "rgba(45, 212, 191, 0.35)",
} as const;

/**
 * Prototype financial direction bearings (degrees).
 * Future: replace or merge with Catalyst One advisory configuration.
 */
export const LIVING_COMPASS_FINANCIAL_DIRECTIONS = {
  HOME_LOAN: 15,
  HOME_LOAN_BT: 35,
  BUSINESS_LOAN: 70,
  WORKING_CAPITAL: 100,
  LOAN_AGAINST_PROPERTY: 135,
  PERSONAL_LOAN: 165,
  MUTUAL_FUNDS: 220,
  PMS: 245,
  AIF: 270,
  INSURANCE: 320,
} as const;

/** @deprecated Use LIVING_COMPASS_FINANCIAL_DIRECTIONS.HOME_LOAN — kept for backward compatibility. */
export const LIVING_COMPASS_READY_BEARING = LIVING_COMPASS_FINANCIAL_DIRECTIONS.HOME_LOAN;

export const LIVING_COMPASS_DIRECTION_LABELS: Record<
  keyof typeof LIVING_COMPASS_FINANCIAL_DIRECTIONS,
  string
> = {
  HOME_LOAN: "Home Loan",
  HOME_LOAN_BT: "Home Loan Balance Transfer",
  BUSINESS_LOAN: "Business Loan",
  WORKING_CAPITAL: "Working Capital",
  LOAN_AGAINST_PROPERTY: "Loan Against Property",
  PERSONAL_LOAN: "Personal Loan",
  MUTUAL_FUNDS: "Mutual Funds",
  PMS: "Portfolio Management Services",
  AIF: "Alternative Investment Fund",
  INSURANCE: "Insurance",
};

export const LIVING_COMPASS_EASE = [0.22, 1, 0.36, 1] as const;

export const LIVING_COMPASS_TIMING = {
  stateTransition: 0.55,
  idle: {
    breathDuration: 4.8,
    breathScaleMin: 1,
    breathScaleMax: 1.018,
    microNudgeDegrees: [-2.5, 1.8, -1.2, 2.2, 0] as const,
    microNudgeDuration: 2.4,
    microNudgePause: 3.2,
  },
  listening: {
    swingDegrees: [-5.5, 5.5, -3.5, 4, -2, 2.5, 0] as const,
    segmentDuration: 0.85,
  },
  thinking: {
    /**
     * Relative probe offsets from the target bearing.
     * Creates wide exploration → gradual convergence (never a full spin).
     */
    probeOffsetsFromTarget: [5, 80, -30, 55, -15, 5, -3] as const,
    /** Fallback loop when no target direction is supplied. */
    bearings: [-26, 14, -11, 22, -18, 9, -6, 16, 4, -9, 11] as const,
    segmentDuration: 1.65,
    pauseMs: 280,
    finalPauseMs: 420,
  },
  ready: {
    settleDuration: 1.35,
    glowDuration: 2.4,
    glowOpacityMin: 0.12,
    glowOpacityMax: 0.42,
    ringPulseScale: 1.04,
  },
} as const;

export const LIVING_COMPASS_STATE_LABELS = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  ready: "Recommendation Ready",
} as const;
