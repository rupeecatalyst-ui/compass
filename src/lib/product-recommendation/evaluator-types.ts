/**
 * Reusable evaluator types. Keyed by type, not by business field.
 * No 0–100 scoring mathematics is defined here.
 */
export const RECOMMENDATION_EVALUATOR_TYPES = {
  PENDING_CONTRACT: "pending_contract",
  NOT_IMPLEMENTED: "not_implemented",
} as const;

export type RegisteredEvaluatorTypeId =
  (typeof RECOMMENDATION_EVALUATOR_TYPES)[keyof typeof RECOMMENDATION_EVALUATOR_TYPES];

export const REGISTERED_EVALUATOR_TYPE_IDS = new Set<string>(Object.values(RECOMMENDATION_EVALUATOR_TYPES));

export function isRegisteredEvaluatorType(typeId: string | null | undefined): boolean {
  return Boolean(typeId && REGISTERED_EVALUATOR_TYPE_IDS.has(typeId));
}
