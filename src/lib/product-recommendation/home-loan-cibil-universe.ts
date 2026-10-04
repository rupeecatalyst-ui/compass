import type { RecommendationLenderCategory } from "@/lib/home-loan-recommendation/cibil-category";
import { applyCibilCategoryGate, parseCibilBandToScore } from "@/lib/home-loan-recommendation/cibil-category";

export type HomeLoanCibilUniverse = {
  permittedCategories: RecommendationLenderCategory[];
  cibilKnown: boolean;
  /** Null when Not Known / Don't Know. Never 0, 650, 700, or another invented score. */
  numericScore: number | null;
  ruleApplied: "not_known" | "below_threshold" | "at_or_above_threshold";
};

/**
 * Home Loan / HLBT candidate-universe CIBIL categories.
 * Category has no Match % weight.
 */
export function resolveHomeLoanCibilCategoryUniverse(
  cibilBandOrScore: string | number | null | undefined,
): HomeLoanCibilUniverse {
  const parsed = parseCibilBandToScore(cibilBandOrScore);
  const gate = applyCibilCategoryGate({ cibilBandOrScore });
  if (!gate.cibilKnown || parsed.notKnown || parsed.score == null) {
    return {
      permittedCategories: ["A"],
      cibilKnown: false,
      numericScore: null,
      ruleApplied: "not_known",
    };
  }
  return {
    permittedCategories: gate.permittedCategories,
    cibilKnown: true,
    numericScore: parsed.score,
    ruleApplied: gate.ruleApplied,
  };
}
