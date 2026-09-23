import type { RankedProgramme } from "./types";

export type RankableCandidate<T> = {
  item: T;
  programmeId: string;
  matchPercent: number;
  applicableRoiPercent: number | null;
  tentativeOfferRupees: number | null;
};

/**
 * Rank the complete scored universe.
 * Primary: Match % descending.
 * Tie-break only after equal Match %: lower ROI, higher offer, stable programme id.
 * The stable identifier carries zero business preference.
 */
export function rankByMatchPercent<T>(candidates: RankableCandidate<T>[]): RankedProgramme<T>[] {
  const sorted = [...candidates].sort((a, b) => {
    if (a.matchPercent !== b.matchPercent) return b.matchPercent - a.matchPercent;
    const roiA = a.applicableRoiPercent ?? Number.POSITIVE_INFINITY;
    const roiB = b.applicableRoiPercent ?? Number.POSITIVE_INFINITY;
    if (roiA !== roiB) return roiA - roiB;
    const offerA = a.tentativeOfferRupees ?? Number.NEGATIVE_INFINITY;
    const offerB = b.tentativeOfferRupees ?? Number.NEGATIVE_INFINITY;
    if (offerA !== offerB) return offerB - offerA;
    return a.programmeId < b.programmeId ? -1 : a.programmeId > b.programmeId ? 1 : 0;
  });
  return sorted.map((row, index) => {
    const rank = index + 1;
    const presentationTier: RankedProgramme<T>["presentationTier"] =
      rank <= 5 ? "primary" : rank <= 7 ? "additional" : "evaluated";
    return { item: row.item, programmeId: row.programmeId, matchPercent: row.matchPercent, rank, presentationTier };
  });
}

export function presentationSlice<T>(ranked: RankedProgramme<T>[]): {
  primary: RankedProgramme<T>[];
  additional: RankedProgramme<T>[];
  evaluated: RankedProgramme<T>[];
} {
  return {
    primary: ranked.filter((row) => row.presentationTier === "primary"),
    additional: ranked.filter((row) => row.presentationTier === "additional"),
    evaluated: ranked,
  };
}
