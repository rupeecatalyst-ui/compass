/**
 * Universal product-agnostic Match % types.
 * The scoring method is shared. Product-specific universe, gates, and evaluators stay outside.
 */

export const CRITERION_SCORING_STATUSES = [
  "fully_scorable",
  "inputs_wired_scoring_contract_pending",
  "not_implemented",
] as const;
export type CriterionCatalogStatus = (typeof CRITERION_SCORING_STATUSES)[number];

export type RecommendationCriterionDefinition = {
  key: string;
  label: string;
  catalogStatus: CriterionCatalogStatus;
};

export type ParsedCriterionWeights = {
  /** Selected keys only. Omitted keys contribute nothing and consume no weight. */
  selected: Readonly<Record<string, number>>;
  total: number;
};

export type CriterionEvaluationStatus =
  | "scored"
  | "scoring_contract_pending"
  | "missing_required_input"
  | "unknown_criterion"
  | "evaluator_missing";

export type CriterionEvaluation = {
  criterionKey: string;
  status: CriterionEvaluationStatus;
  /** Deterministic 0–100 when status is scored. Never invented. */
  criterionScore: number | null;
  weightPercent: number;
  weightedContribution: number | null;
  inputs?: Readonly<Record<string, number | string | boolean | null>>;
  reason?: string;
};

export type CriterionEvaluationContext = Readonly<Record<string, unknown>>;

export type CriterionEvaluator = (input: {
  criterionKey: string;
  weightPercent: number;
  context: CriterionEvaluationContext;
}) => CriterionEvaluation;

export type ActiveRecommendationRuleSet = {
  id: string;
  organizationId: string;
  productCode: string;
  lineageId: string;
  versionNumber: number;
  weights: ParsedCriterionWeights;
  labelledUnapproved: boolean;
  simulationOnly: boolean;
  lifecycleStatus: string;
};

export type ProgrammeMatchScore = {
  programmeId: string;
  matchPercent: number;
  contributions: CriterionEvaluation[];
};

export type RecommendationFieldSourceKind = "raw" | "derived";
export type RecommendationFieldKind = "assessment_fact" | "programme_fact" | "derived_fact" | "compatibility_alias";
export type RecommendationEvaluatorTypeId = string;
export type RecommendationScoreability = CriterionCatalogStatus;

export type ProjectedRecommendationField = {
  id: string;
  label: string;
  productCodes: readonly string[];
  sourceKind: RecommendationFieldSourceKind;
  fieldKind: RecommendationFieldKind;
  valueType: "number" | "percent" | "currency" | "integer" | "string" | "boolean" | "date";
  customerFactRef: string | null;
  programmeFactRef: string | null;
  evaluatorType: RecommendationEvaluatorTypeId;
  selectable: boolean;
  scoreability: RecommendationScoreability;
  aliases: readonly string[];
  notes?: string;
};

export type MatchPercentFailureCode =
  | "RULE_SET_REQUIRED"
  | "RULE_SET_NOT_ACTIVE"
  | "RULE_SET_AMBIGUOUS"
  | "WEIGHTS_NOT_EXACTLY_100"
  | "UNKNOWN_CRITERION"
  | "EVALUATOR_MISSING"
  | "UNKNOWN_EVALUATOR_TYPE"
  | "SCORING_CONTRACT_PENDING"
  | "SCORING_INPUT_REQUIRED"
  | "NON_SCORABLE";

export type MatchPercentEngineResult =
  | {
      ok: true;
      scores: ProgrammeMatchScore[];
      ruleSet: Pick<ActiveRecommendationRuleSet, "id" | "lineageId" | "versionNumber" | "productCode">;
      weights: ParsedCriterionWeights;
    }
  | {
      ok: false;
      code: MatchPercentFailureCode;
      detail?: string;
    };

export type RankedProgramme<T> = {
  item: T;
  programmeId: string;
  matchPercent: number;
  rank: number;
  presentationTier: "primary" | "additional" | "evaluated";
};
