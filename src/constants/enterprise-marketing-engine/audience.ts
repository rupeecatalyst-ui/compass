/**
 * CO-MARKETING-MKT-03 — Audience filter & scan constants.
 * Field names come from discovered sheet headers — not hard-coded business categories.
 */

/** Max rows scanned server-side for audience preview estimates (never full mirror). */
export const MARKETING_AUDIENCE_SCAN_MAX_ROWS = 2000 as const;

/** Page size when streaming source rows for audience evaluation. */
export const MARKETING_AUDIENCE_SCAN_PAGE_SIZE = 100 as const;

export const MARKETING_FILTER_OPS = [
  "eq",
  "neq",
  "contains",
  "not_contains",
  "starts_with",
  "in",
  "not_in",
  "is_empty",
  "is_not_empty",
  /** True when detected email column has a non-empty value (validity checked separately). */
  "email_available",
  /** True when detected phone/mobile column has a non-empty value. */
  "mobile_available",
] as const;

export type MarketingFilterOp = (typeof MARKETING_FILTER_OPS)[number];

export const MARKETING_SUPPRESSION_REASONS = [
  "UNSUBSCRIBE",
  "DO_NOT_CONTACT",
  "INVALID",
  "HARD_BOUNCE",
  "COMPLAINT",
  "PRIOR_SUPPRESSION",
  "MANUAL",
] as const;

export type MarketingSuppressionReason = (typeof MARKETING_SUPPRESSION_REASONS)[number];
