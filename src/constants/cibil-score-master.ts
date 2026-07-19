/**
 * CO-SPRINT-101 — Approximate CIBIL Score master (shared SSOT).
 * Identical values for Catalyst One and Wealth Partner Application.
 */

import type { ApproxCibilScoreBand } from "@/types/cibil-score-master";
import { APPROX_CIBIL_SCORE_BANDS } from "@/types/cibil-score-master";

export type { ApproxCibilScoreBand };
export { APPROX_CIBIL_SCORE_BANDS };

export const APPROX_CIBIL_SCORE_TOOLTIP =
  "Approximate CIBIL score helps improve lender recommendations and eligibility assessment. If unknown, select 'Not Known'.";

export interface ApproxCibilScoreOption {
  value: ApproxCibilScoreBand;
  label: string;
  /** Analyze Deal — reveal low-score follow-up questions for weaker bands. */
  revealLowScoreQuestions: boolean;
}

/** Canonical dropdown options — do not fork labels/values elsewhere. */
export const APPROX_CIBIL_SCORE_OPTIONS: ReadonlyArray<ApproxCibilScoreOption> = [
  { value: "not_known", label: "Not Known", revealLowScoreQuestions: false },
  { value: "below_600", label: "Below 600", revealLowScoreQuestions: true },
  { value: "600_649", label: "600 – 649", revealLowScoreQuestions: true },
  { value: "650_699", label: "650 – 699", revealLowScoreQuestions: true },
  { value: "700_749", label: "700 – 749", revealLowScoreQuestions: false },
  { value: "750_799", label: "750 – 799", revealLowScoreQuestions: false },
  { value: "800_plus", label: "800+", revealLowScoreQuestions: false },
];

export const APPROX_CIBIL_SCORE_ENUM = APPROX_CIBIL_SCORE_BANDS as unknown as [
  ApproxCibilScoreBand,
  ...ApproxCibilScoreBand[],
];

export function getApproxCibilScoreLabel(
  band: ApproxCibilScoreBand | string | null | undefined,
): string {
  if (!band) return "—";
  return APPROX_CIBIL_SCORE_OPTIONS.find((o) => o.value === band)?.label ?? String(band);
}

export function isApproxCibilScoreBand(value: string): value is ApproxCibilScoreBand {
  return APPROX_CIBIL_SCORE_BANDS.includes(value as ApproxCibilScoreBand);
}

export function shouldRevealLowScoreQuestions(
  band: ApproxCibilScoreBand | string | null | undefined,
): boolean {
  if (!band) return false;
  return (
    APPROX_CIBIL_SCORE_OPTIONS.find((o) => o.value === band)?.revealLowScoreQuestions ?? false
  );
}
