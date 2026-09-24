/**
 * Standard CHANAKYA presentation of an already ranked governed result.
 * Ranks 1–5 are Recommended. Ranks 6–7 are Additional Options.
 * Rank 8+ stays on the recommendation result for audit and is omitted here.
 */

export type StandardPresentationCard = {
  programmeId: string;
  presentationTier: "primary" | "additional" | "evaluated" | null;
  matchRank: number | null;
};

export type StandardRecommendationPresentation<T extends StandardPresentationCard> = {
  recommended: T[];
  additional: T[];
  auditedOnly: T[];
};

export function selectStandardRecommendationPresentation<T extends StandardPresentationCard>(
  cards: readonly T[],
  presentation?: { primaryProgrammeIds?: readonly string[]; additionalProgrammeIds?: readonly string[] } | null,
): StandardRecommendationPresentation<T> {
  const primaryIds = new Set(presentation?.primaryProgrammeIds ?? []);
  const additionalIds = new Set(presentation?.additionalProgrammeIds ?? []);
  const hasPresentationIds = primaryIds.size > 0 || additionalIds.size > 0;
  const recommended: T[] = [];
  const additional: T[] = [];
  const auditedOnly: T[] = [];

  for (const card of cards) {
    if (hasPresentationIds) {
      if (primaryIds.has(card.programmeId)) recommended.push(card);
      else if (additionalIds.has(card.programmeId)) additional.push(card);
      else auditedOnly.push(card);
      continue;
    }
    const rank = card.matchRank;
    if (card.presentationTier === "evaluated" || (rank != null && rank >= 8)) {
      auditedOnly.push(card);
    } else if (card.presentationTier === "additional" || (rank != null && rank >= 6 && rank <= 7)) {
      additional.push(card);
    } else {
      recommended.push(card);
    }
  }

  return { recommended, additional, auditedOnly };
}
