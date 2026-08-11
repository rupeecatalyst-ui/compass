/**
 * Consultation Intelligence Engine — public barrel (CO-AI-108).
 */

export { runEaiConsultationIntelligence } from "./orchestrator";
export {
  applyEaiConsultationTransition,
  canEaiConsultationTransition,
  deriveEaiConsultationLifecycleEvent,
} from "./state-machine";
export {
  describeEaiConsultationLifecycle,
  isEaiConsultationTerminalState,
  EAI_CONSULTATION_LIFECYCLE_ORDER,
} from "./lifecycle";
export { extractEaiConsultationKeyFacts } from "./key-facts";
export { extractEaiCustomerObjectives } from "./objectives";
export { extractEaiFinancialConcerns } from "./concerns";
export { buildEaiConsultationSummary } from "./summary";
export { assessEaiConsultationConfidence } from "./confidence";
export { scoreEaiConsultationCompletion } from "./completion-score";
export { validateEaiConsultationObject } from "./validation";
export { runEaiConsultationIntelligenceReadiness } from "./readiness";
