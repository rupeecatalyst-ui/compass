/**
 * HOME_LOAN + HOME_LOAN_BT Match % scoring contracts V1.
 *
 * These curves are approved only for Home Loan and Home Loan Balance Transfer.
 * They are not a universal default. Other products must not inherit them silently.
 *
 * Weights are not defined here. The engine consumes the ACTIVE rule set.
 */

export const HOME_LOAN_V1_SCORING_PRODUCT_CODES = ["HOME_LOAN", "HOME_LOAN_BT"] as const;

export type InclusiveUpperScoreBand = {
  /** Inclusive upper bound. Null = catch-all remainder. */
  maxInclusive: number | null;
  score: number;
};

/** ROI difference from the lowest comparable eligible ROI, in basis points. */
export const HOME_LOAN_V1_ROI_BPS_BANDS: readonly InclusiveUpperScoreBand[] = [
  { maxInclusive: 0, score: 100 },
  { maxInclusive: 10, score: 95 },
  { maxInclusive: 25, score: 85 },
  { maxInclusive: 50, score: 70 },
  { maxInclusive: 75, score: 55 },
  { maxInclusive: 100, score: 40 },
  { maxInclusive: 150, score: 20 },
  { maxInclusive: null, score: 10 },
];

export const HOME_LOAN_V1_FOIR_BANDS: readonly InclusiveUpperScoreBand[] = [
  { maxInclusive: 30, score: 100 },
  { maxInclusive: 40, score: 90 },
  { maxInclusive: 50, score: 75 },
  { maxInclusive: 60, score: 60 },
  { maxInclusive: 70, score: 40 },
  { maxInclusive: null, score: 20 },
];

export const HOME_LOAN_V1_LTV_BANDS: readonly InclusiveUpperScoreBand[] = [
  { maxInclusive: 50, score: 100 },
  { maxInclusive: 60, score: 90 },
  { maxInclusive: 70, score: 75 },
  { maxInclusive: 75, score: 60 },
  { maxInclusive: 80, score: 45 },
  { maxInclusive: 90, score: 25 },
  { maxInclusive: null, score: 10 },
];

export function scoreInclusiveUpperBands(
  value: number,
  bands: readonly InclusiveUpperScoreBand[],
): number {
  for (const band of bands) {
    if (band.maxInclusive == null || value <= band.maxInclusive) return band.score;
  }
  return bands[bands.length - 1]!.score;
}

/** 1.00 percentage point = 100 bps. Rounded to 0.01 bps to avoid float-band leakage. */
export function roiDifferenceBasisPoints(applicableRoiPercent: number, lowestEligibleRoiPercent: number): number {
  return Math.round((applicableRoiPercent - lowestEligibleRoiPercent) * 10000) / 100;
}

export function scoreHomeLoanV1RoiFromBest(applicableRoiPercent: number, lowestEligibleRoiPercent: number): number {
  return scoreInclusiveUpperBands(
    roiDifferenceBasisPoints(applicableRoiPercent, lowestEligibleRoiPercent),
    HOME_LOAN_V1_ROI_BPS_BANDS,
  );
}

export function scoreHomeLoanV1Foir(calculatedFoirPercent: number): number {
  return scoreInclusiveUpperBands(calculatedFoirPercent, HOME_LOAN_V1_FOIR_BANDS);
}

export function scoreHomeLoanV1Ltv(assessedLtvPercent: number): number {
  return scoreInclusiveUpperBands(assessedLtvPercent, HOME_LOAN_V1_LTV_BANDS);
}
