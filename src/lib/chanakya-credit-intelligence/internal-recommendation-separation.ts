/**
 * Internal vs lender-facing recommendation separation (CO-CHANAKYA-CERTIFICATION-020A).
 * Detects genuine internal-recommendation leakage — not generic shared evidence phrasing.
 */

export interface InternalRecommendationLeakCandidate {
  id?: string;
  recommendation?: string;
  /** Product/lender intelligence internal recommendations use `statement`. */
  statement?: string;
  reason?: string;
  internalOnly?: boolean;
}

export function normalizeRecommendationLeakText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function resolveRecommendationText(rec: InternalRecommendationLeakCandidate): string {
  return (rec.recommendation ?? rec.statement ?? "").trim();
}

/**
 * True when a full internal-only recommendation statement appears in lender-facing text.
 * Partial prefix overlap (e.g. shared "Obtain readable bank statements …") is not leakage.
 */
export function internalRecommendationLeaksIntoLenderText(
  lenderText: string,
  recommendations: ReadonlyArray<InternalRecommendationLeakCandidate>,
): { leaked: boolean; matchedId?: string; matchedText?: string } {
  const lenderNorm = normalizeRecommendationLeakText(lenderText);
  if (!lenderNorm) return { leaked: false };

  for (const rec of recommendations) {
    if (rec.internalOnly === false) continue;
    const raw = resolveRecommendationText(rec);
    const recNorm = normalizeRecommendationLeakText(raw);
    if (recNorm.length < 20) continue;
    if (lenderNorm.includes(recNorm)) {
      return { leaked: true, matchedId: rec.id, matchedText: raw };
    }
  }

  return { leaked: false };
}

export function assertNoInternalRecommendationLeakInLenderText(
  lenderText: string,
  recommendations: ReadonlyArray<InternalRecommendationLeakCandidate>,
): boolean {
  return !internalRecommendationLeaksIntoLenderText(lenderText, recommendations).leaked;
}
