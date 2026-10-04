export type RecommendationLenderCategory = "A" | "B" | "C";

export type CibilCategoryRuleSet = {
  notKnownCategories: RecommendationLenderCategory[];
  below700Categories: RecommendationLenderCategory[];
  atOrAbove700Categories: RecommendationLenderCategory[];
  belowThreshold: number;
};

export const AUTHORISED_CIBIL_CATEGORY_RULES: CibilCategoryRuleSet = {
  notKnownCategories: ["A"],
  below700Categories: ["C"],
  atOrAbove700Categories: ["A", "B", "C"],
  belowThreshold: 700,
};

export type CibilCategoryGateResult = {
  permittedCategories: RecommendationLenderCategory[];
  ruleApplied: "not_known" | "below_threshold" | "at_or_above_threshold";
  cibilKnown: boolean;
};

export function parseCibilBandToScore(value: string | number | null | undefined): {
  score: number | null;
  notKnown: boolean;
} {
  if (value == null) return { score: null, notKnown: true };
  if (typeof value === "number" && Number.isFinite(value)) {
    return { score: value, notKnown: false };
  }
  const raw = String(value).trim().toLowerCase();
  if (!raw || raw === "not_known" || raw === "not known" || raw === "unknown") {
    return { score: null, notKnown: true };
  }
  const digits = raw.match(/\d{3,4}/);
  if (!digits) return { score: null, notKnown: true };
  return { score: Number(digits[0]), notKnown: false };
}

export function applyCibilCategoryGate(input: {
  cibilBandOrScore: string | number | null | undefined;
  rules?: CibilCategoryRuleSet;
}): CibilCategoryGateResult {
  const rules = input.rules ?? AUTHORISED_CIBIL_CATEGORY_RULES;
  const parsed = parseCibilBandToScore(input.cibilBandOrScore);
  if (parsed.notKnown || parsed.score == null) {
    return {
      permittedCategories: [...rules.notKnownCategories],
      ruleApplied: "not_known",
      cibilKnown: false,
    };
  }
  if (parsed.score < rules.belowThreshold) {
    return {
      permittedCategories: [...rules.below700Categories],
      ruleApplied: "below_threshold",
      cibilKnown: true,
    };
  }
  return {
    permittedCategories: [...rules.atOrAbove700Categories],
    ruleApplied: "at_or_above_threshold",
    cibilKnown: true,
  };
}
