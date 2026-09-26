/**
 * Reusable evaluator types. Keyed by type, not by business field.
 * Approved contracts implement only frozen deterministic formulas.
 * Unapproved degradation curves stay on pending_contract.
 */
export const RECOMMENDATION_EVALUATOR_TYPES = {
  PENDING_CONTRACT: "pending_contract",
  NOT_IMPLEMENTED: "not_implemented",
  CAPPED_REQUIREMENT_RATIO: "capped_requirement_ratio",
  RELATIVE_TO_ELIGIBLE_MAX: "relative_to_eligible_max",
  WITHIN_NORM_OR_PENDING: "within_norm_or_pending",
  LOWEST_AMONG_ELIGIBLE_OR_PENDING: "lowest_among_eligible_or_pending",
  /** HOME_LOAN / HOME_LOAN_BT V1 — ROI vs lowest eligible, basis-point bands. */
  ROI_BPS_FROM_BEST: "roi_bps_from_best",
  /** HOME_LOAN / HOME_LOAN_BT V1 — absolute FOIR bands. Not a hard-elimination rule. */
  FOIR_LOWER_BETTER_BANDS: "foir_lower_better_bands",
  /** HOME_LOAN / HOME_LOAN_BT V1 — assessed LTV bands. Does not replace programme/RBI caps. */
  LTV_LOWER_BETTER_BANDS: "ltv_lower_better_bands",
} as const;

export type RegisteredEvaluatorTypeId =
  (typeof RECOMMENDATION_EVALUATOR_TYPES)[keyof typeof RECOMMENDATION_EVALUATOR_TYPES];

export const REGISTERED_EVALUATOR_TYPE_IDS = new Set<string>(Object.values(RECOMMENDATION_EVALUATOR_TYPES));

export function isRegisteredEvaluatorType(typeId: string | null | undefined): boolean {
  return Boolean(typeId && REGISTERED_EVALUATOR_TYPE_IDS.has(typeId));
}
