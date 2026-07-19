/**
 * CO-SPRINT-101 — Approximate CIBIL Score master (shared SSOT).
 * Used by Catalyst One Loan Journey and Wealth Partner Application.
 */

export type ApproxCibilScoreBand =
  | "not_known"
  | "below_600"
  | "600_649"
  | "650_699"
  | "700_749"
  | "750_799"
  | "800_plus";

export const APPROX_CIBIL_SCORE_BANDS: readonly ApproxCibilScoreBand[] = [
  "not_known",
  "below_600",
  "600_649",
  "650_699",
  "700_749",
  "750_799",
  "800_plus",
] as const;
