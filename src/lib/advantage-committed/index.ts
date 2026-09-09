export {
  ADVANTAGE_COMMITTED_LABEL,
  ADVANTAGE_COMMITTED_STATUS,
  ADVANTAGE_COMMITTED_STATUS_LABEL,
  ADVANTAGE_COMMITTED_APPLICABLE_PRODUCT_CODES,
  ADVANTAGE_COMMITTED_CURRENCY,
  ADVANTAGE_COMMITTED_FORBIDDEN_LABELS,
  ADVANTAGE_COMMITTED_MUTATION_KEYS,
  ADVANTAGE_COMMITTED_PERMISSIONS,
} from "@/constants/advantage-committed";

export {
  canonicalCommittedRupees,
  committedAmountsEqual,
  formatAdvantageCommittedInr,
} from "./money";
export {
  isAdvantageCommittedApplicableProduct,
  resolveAdvantageCommittedProductCode,
} from "./applicability";
export {
  advantageCommittedSortKey,
  resolveAdvantageCommittedDisplay,
} from "./display";
export {
  collectForbiddenCommitmentMutations,
  decideDealCannotIntroduceCommitment,
  decideOrdinaryCommitmentMutation,
  decideRecalculationCannotMutateCommitment,
  preserveCommittedAmountAcrossRecalculation,
} from "./immutability";
export {
  assertAdvantageCommittedCorrection,
  canCorrectAdvantageCommitted,
  canViewAdvantageCommittedHistory,
  correctionPreservesHistory,
} from "./correction";
export {
  decideAccountingAdvantageHandoff,
  excludeAdvantageCommittedFromRevenueInputs,
} from "./accounting-handoff";
export {
  inheritedDealAdvantageCommitted,
  projectAdvantageCommitted,
  serializeAdvantageCommittedApi,
} from "./projection";
export {
  COMPASS_ADVANTAGE_COMMIT_ACTOR,
  COMPASS_ADVANTAGE_COMMIT_REASON,
  COMPASS_JOURNEY_SUBMITTED_AT_KEY,
  COMPASS_OPERATIONAL_HANDOFF_AT_KEY,
  decideCompassSubmissionAdvantageCommit,
  readCompassJourneySubmittedAt,
  snapshotCalculatedAtOrBeforeSubmission,
} from "./compass-handoff";
export type { CompassAdvantageCommitDecision } from "./compass-handoff";
