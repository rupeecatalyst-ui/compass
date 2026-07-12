export {
  configureEeiPorts,
  getEeiPorts,
  resetEeiComposition,
} from "./composition";
export { createInMemoryEeiPorts } from "./repositories/in-memory";
export { recordEeiAudit } from "./audit-integration";
export {
  configureEeiOrchestrationConfig,
  getEeiOrchestrationConfig,
  resetEeiOrchestrationConfig,
} from "./config";
export { publishEeiEventToDialogue } from "./dialogue-integration";
export { resolveEeiReviewProfile } from "./ecg-adapters";
export {
  closeEeiExperience,
  createEeiExperienceFromAdvisory,
  expireEeiExperience,
  getEeiExperience,
  getEeiExperienceByAdvisory,
  listEeiExperiences,
  maybeCreateEeiFromAdvisory,
  recordEeiBusinessOutcome,
  recordEeiBusinessValue,
  recordEeiRecommendationOutcome,
  syncEeiFromAdvisoryLifecycle,
} from "./experience-registry";
export {
  ensureEeiKnowledgeFeedback,
  listEeiKnowledgeFeedback,
  markEeiKnowledgeRefinementSuggested,
} from "./knowledge-feedback";
export {
  buildEeiBusinessValueTraceability,
  withRefreshedValueTraceability,
} from "./value-traceability";
export { runEeiFoundationValidation } from "./foundation-validation";
export { getEeiFrameworkVersion, getEeiRegistrySnapshot } from "./registry-snapshot";
export {
  EEI_BUSINESS_VALUES,
  EEI_FRAMEWORK_VERSION,
  getEeiAdministratorArchitecture,
} from "@/constants/enterprise-experience-intelligence";
