/**
 * COMPASS Advantage — Catalyst One eligibility and indicative commercial schedule.
 *
 * Amounts are calculated only from this module. COMPASS must render the DTO.
 * Do not restore the retired COMPASS-local mock commercial formula.
 *
 * The indicative schedule is effective on isolated Vercel preview, or when
 * COMPASS_ADVANTAGE_COMMERCIAL_ENABLED=true. It is not a Hostinger production commercial.
 */

export const COMPASS_ADVANTAGE_RULE_ID = "compass-advantage-indicative-hl-hlbt-v1";

/** Basis points of requested loan amount (50 bps = 0.50%). */
export const COMPASS_ADVANTAGE_INDICATIVE_BPS = 50;

export const COMPASS_ADVANTAGE_MIN_AMOUNT = 10_000;
export const COMPASS_ADVANTAGE_MAX_AMOUNT = 2_50_000;

export const COMPASS_ADVANTAGE_TITLE = "COMPASS Advantage";

export const COMPASS_ADVANTAGE_DISCLAIMER =
  "Indicative COMPASS Advantage calculated by Catalyst One from your stated loan amount. This is not a sanctioned offer and is subject to lender policy, documentation, and credit appraisal.";
