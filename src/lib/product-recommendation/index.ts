export { canonicalizeRecommendationProductCode, recommendationProductCodesEquivalent } from "./product-code";
export {
  SUPPORTED_RECOMMENDATION_CRITERIA,
  SUPPORTED_CRITERION_KEYS,
  criterionCatalogStatus,
  createCriterionEvaluatorRegistry,
  createGovernedCriterionRegistry,
  createGovernedEvaluatorTypeRegistry,
  type CriterionEvaluatorRegistry,
} from "./registry";
export { RECOMMENDATION_EVALUATOR_TYPES, isRegisteredEvaluatorType } from "./evaluator-types";
export {
  CANONICAL_RECOMMENDATION_FIELD_PROJECTION,
  listProjectedRecommendationFields,
  projectCanonicalRecommendationFields,
  resolveProjectedField,
  canonicalFieldIdForKey,
  fieldIsSelected,
  selectedWeightForField,
  deselectFieldKeys,
  compareByFriendlyDisplayLabel,
  sortByFriendlyDisplayLabel,
} from "./field-projection";
export { discoverCanonicalRecommendationFields } from "./discover-canonical-fields";
export {
  parseCriterionWeights,
  normalizeDraftCriterionWeights,
  weightsTotalExact100,
  assertActivateableWeights,
  validateWeightPublish,
  RESERVED_WEIGHT_METADATA_KEYS,
} from "./weights";
export { scoreProgrammes, type ScoreableProgramme } from "./score";
export { rankByMatchPercent, presentationSlice, type RankableCandidate } from "./rank";
export { resolveActiveRecommendationRuleSet } from "./resolve-active-rule-set";
export { resolveHomeLoanCibilCategoryUniverse } from "./home-loan-cibil-universe";
export {
  buildHomeLoanMatchPercentContext,
  buildHomeLoanMatchPercentContexts,
  contributingCoApplicantIncomeRupees,
  resolveEffectiveAvailableTenureMonths,
} from "./home-loan-inputs";
export {
  HOME_LOAN_V1_SCORING_PRODUCT_CODES,
  scoreHomeLoanV1Foir,
  scoreHomeLoanV1Ltv,
  scoreHomeLoanV1RoiFromBest,
  roiDifferenceBasisPoints,
} from "./home-loan-v1-scoring-contracts";
export { MATCH_PERCENT_CRITERION_REASONS } from "./match-percent-reasons";
export {
  SCORING_DIRECTIONS,
  compareByScoringDirection,
  isDirectionallyBetter,
  scoringDirectionForField,
  HOME_LOAN_V1_WEIGHTED_CRITERION_KEYS,
  HOME_LOAN_V1_EXCLUDED_FROM_WEIGHTS,
} from "./scoring-direction";
export type {
  ActiveRecommendationRuleSet,
  CriterionEvaluation,
  CriterionEvaluationContext,
  MatchPercentEngineResult,
  ParsedCriterionWeights,
  ProgrammeMatchScore,
  ProjectedRecommendationField,
  RankedProgramme,
  RecommendationCriterionDefinition,
} from "./types";
