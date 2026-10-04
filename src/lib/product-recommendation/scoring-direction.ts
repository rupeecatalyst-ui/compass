/**
 * Direction metadata only. Does not generate a Match % score.
 * Product Owner still selects weighted criteria separately.
 */
export const SCORING_DIRECTIONS = {
  LOWER_IS_BETTER: "LOWER_IS_BETTER",
  HIGHER_IS_BETTER: "HIGHER_IS_BETTER",
} as const;

export type ScoringDirection = (typeof SCORING_DIRECTIONS)[keyof typeof SCORING_DIRECTIONS];

const DIRECTION_BY_KEY: Record<string, ScoringDirection> = {
  "derived:applicableRoiPercent": "LOWER_IS_BETTER",
  roiCompetitiveness: "LOWER_IS_BETTER",
  "derived:ltvPercent": "LOWER_IS_BETTER",
  ltvFit: "LOWER_IS_BETTER",
  "derived:foirPercent": "LOWER_IS_BETTER",
  foirFit: "LOWER_IS_BETTER",
  "derived:ageYears": "LOWER_IS_BETTER",
  "assessment:borrower.ageYears": "LOWER_IS_BETTER",
  ageYears: "LOWER_IS_BETTER",
  "assessment:incomeAndObligations.monthlyIncome": "HIGHER_IS_BETTER",
  monthlyIncome: "HIGHER_IS_BETTER",
  "assessment:cibil.exactScore": "HIGHER_IS_BETTER",
  cibil: "HIGHER_IS_BETTER",
};

export function scoringDirectionForField(fieldId: string): ScoringDirection | null {
  return DIRECTION_BY_KEY[fieldId] ?? DIRECTION_BY_KEY[fieldId.split(".").pop() ?? ""] ?? null;
}

/**
 * Negative when left is directionally better than right.
 * Returns null when either value is not comparable. Never a score.
 */
export function compareByScoringDirection(
  direction: ScoringDirection,
  left: number,
  right: number,
): number | null {
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  if (direction === "LOWER_IS_BETTER") return left - right;
  return right - left;
}

export function isDirectionallyBetter(input: {
  fieldId: string;
  left: number;
  right: number;
}): boolean | null {
  const direction = scoringDirectionForField(input.fieldId);
  if (!direction) return null;
  const compared = compareByScoringDirection(direction, input.left, input.right);
  return compared == null ? null : compared < 0;
}

export const HOME_LOAN_V1_WEIGHTED_CRITERION_KEYS = [
  "roiCompetitiveness",
  "eligibleAmount",
  "foirFit",
  "tenureAvailability",
  "ltvFit",
] as const;

export const HOME_LOAN_V1_EXCLUDED_FROM_WEIGHTS = [
  "derived:ageYears",
  "assessment:borrower.ageYears",
  "assessment:incomeAndObligations.monthlyIncome",
  "assessment:cibil.exactScore",
] as const;
