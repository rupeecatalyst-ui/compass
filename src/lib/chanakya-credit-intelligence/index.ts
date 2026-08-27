/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-010 — Credit intelligence module exports.
 */

export {
  assembleCreditIntelligence,
  assertNoForbiddenCreditLanguage,
  buildAuditorAnalysisFromFacts,
  buildBankingAnalysisFromEvidence,
  buildBusinessAnalysis,
  buildCreditInternalRecommendations,
  buildFinancialProfileFromFacts,
  buildFinancialTrendsFromFacts,
  buildGstAnalysisFromFacts,
  buildGstReconciliationLimitation,
  buildGstVsFinancials,
  classifyGstFieldCategory,
  buildKeyConcerns,
  buildKeyPositives,
  buildMitigants,
  buildPropertyAnalysis,
  buildReconciliationRows,
  computeMetricTrend,
  mapCrossDocStatusToReconciliation,
  normalizeFinancialYear,
  parseFinancialNumeric,
  type CreditIntelligenceAssemblyInput,
} from "./credit-intelligence-core";

export {
  assessGstFinancialPeriodAlignment,
  isAnnualFinancialPeriod,
  isMonthlyGstReturnPeriod,
  mapNumericRatioToComparisonOutcome,
  mayAnnualizeMonthlyGstReturns,
} from "./gst-reconciliation-core";

export {
  buildFinancialFactQuality,
  isReliableForFinancialIntelligence,
  isReliableForTrendComputation,
} from "./financial-fact-quality-core";

export {
  assessStatementPeriodCompleteness,
  buildBankingTrendFromAccounts,
  mayDeriveAverageBalanceFromOpenClose,
  resolveAggregateBankEvidenceTier,
  resolveBankEvidenceTier,
} from "./banking-evidence-core";

export {
  buildBankVsTurnoverReconciliation,
  buildBankDocumentInventory,
  isBankFactKey,
} from "./banking-intelligence-core";

export {
  assertNoForbiddenSynthesisLanguage,
  buildFinancialAssessmentObservations,
  composeCreditSynthesis,
  mapSynthesisAdvisory,
  rankCreditConcerns,
} from "./credit-synthesis-core";

export {
  assertNoInternalRecommendationLeakInLenderText,
  internalRecommendationLeaksIntoLenderText,
  normalizeRecommendationLeakText,
} from "./internal-recommendation-separation";

export type { ChanakyaCreditIntelligenceContext } from "@/types/chanakya-credit-intelligence";
export type { ChanakyaCreditSynthesisContext } from "@/types/chanakya-credit-synthesis";
