import assert from "node:assert/strict";
import { selectStandardRecommendationPresentation } from "../src/lib/opportunity-assessment/standard-presentation.ts";

type Card = {
  programmeId: string;
  presentationTier: "primary" | "additional" | "evaluated" | null;
  matchRank: number | null;
  matchPercent: number | null;
};

function card(programmeId: string, rank: number, matchPercent: number): Card {
  const presentationTier = rank <= 5 ? "primary" : rank <= 7 ? "additional" : "evaluated";
  return { programmeId, presentationTier, matchRank: rank, matchPercent };
}

const cards = Array.from({ length: 9 }, (_, index) => card(`p-${index + 1}`, index + 1, 90 - index));
const sliced = selectStandardRecommendationPresentation(cards, {
  primaryProgrammeIds: cards.filter((row) => row.matchRank != null && row.matchRank <= 5).map((row) => row.programmeId),
  additionalProgrammeIds: cards.filter((row) => row.matchRank != null && row.matchRank >= 6 && row.matchRank <= 7).map((row) => row.programmeId),
});
assert.deepEqual(sliced.recommended.map((row) => row.programmeId), ["p-1", "p-2", "p-3", "p-4", "p-5"]);
assert.deepEqual(sliced.additional.map((row) => row.programmeId), ["p-6", "p-7"]);
assert.deepEqual(sliced.auditedOnly.map((row) => row.programmeId), ["p-8", "p-9"]);
assert.equal(cards.length, 9);

const fromTier = selectStandardRecommendationPresentation(cards);
assert.deepEqual(fromTier.recommended.map((row) => row.matchRank), [1, 2, 3, 4, 5]);
assert.deepEqual(fromTier.additional.map((row) => row.matchRank), [6, 7]);
assert.deepEqual(fromTier.auditedOnly.map((row) => row.programmeId), ["p-8", "p-9"]);

const unscored = selectStandardRecommendationPresentation([
  { programmeId: "legacy", presentationTier: null, matchRank: null, matchPercent: null },
]);
assert.deepEqual(unscored.recommended.map((row) => row.programmeId), ["legacy"]);
assert.equal(unscored.additional.length, 0);
assert.equal(unscored.auditedOnly.length, 0);
console.log("STANDARD_PRESENTATION rank 1-5 / 6-7 / audit 8+: PASS");
