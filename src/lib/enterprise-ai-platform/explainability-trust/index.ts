/**
 * Explainability & Trust Engine — public barrel (CO-AI-110).
 */

export { runEaiExplainabilityTrust } from "./orchestrator";
export { deriveEaiTrustReasonCodes, resolveEaiTrustReasonCode } from "./reason-codes";
export {
  collectEaiTrustSupportingFacts,
  collectEaiTrustMissingInformation,
  deriveEaiTrustAssumptions,
} from "./supporting-facts";
export { explainEaiTrustConfidence } from "./confidence-explanation";
export { explainEaiAlternativeRecommendations } from "./alternative-explanation";
export { buildEaiDecisionTrace } from "./decision-trace";
export { buildEaiRecommendationExplanation } from "./recommendation-explanation";
export { validateEaiTrustPackage } from "./validation";
export { runEaiExplainabilityTrustReadiness } from "./readiness";
