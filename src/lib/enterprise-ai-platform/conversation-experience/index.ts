/**
 * SARATHI Conversation Experience — public barrel (CO-AI-111).
 */

export { runEaiSarathiConversationTurn } from "./turn-orchestrator";
export {
  clearEaiSarathiContinuityStorage,
  createEaiConversationContinuityKey,
  loadEaiSarathiContinuityFromStorage,
  saveEaiSarathiContinuityToStorage,
} from "./continuity";
export { resolveEaiSarathiSuggestedQuestions } from "./suggested-questions";
export { runEaiConversationExperienceReadiness } from "./readiness";
export { shapeSarathiConsultantFacing } from "./consultant-facing";
export {
  enrichUtteranceForDomainGate,
  isSarathiContextualFollowUp,
  reasonSarathiConsultationResponse,
} from "./consultation-reasoning";
export {
  emptySarathiConsultationMemory,
  mergeSarathiConsultationMemory,
  missingConsultationSlots,
  type SarathiConsultationMemory,
} from "./consultation-memory";
export {
  awaitSarathiNaturalThinkFloor,
  buildSarathiNaturalThinkPlan,
  classifySarathiThinkComplexity,
  startSarathiProgressiveThinking,
  SARATHI_PROGRESSIVE_THINKING,
  type SarathiNaturalThinkPlan,
  type SarathiThinkComplexity,
} from "./natural-timing";
export { streamSarathiFacingText } from "./response-stream";
export {
  detectSarathiProductContext,
  deriveSarathiConsultationConfidence,
  extractUxFactsFromUtterance,
  isSarathiSummaryReady,
  mapConsultationFactsToSummary,
  primaryAdaptiveQuestionForProduct,
  SARATHI_CONSULTATION_READY_THRESHOLD,
  SARATHI_PRODUCT_TONE,
  type SarathiConsultationConfidence,
  type SarathiProductContextId,
  type SarathiSummaryFact,
  type SarathiUxPhase,
} from "./ux-flow";
