/**
 * CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001
 * Shared CHANAKYA conversation intelligence layer.
 * In-app Ask CHANAKYA and Catalyst One GPT consume the same compile, privacy, and cards.
 */

export { redactFacingIntelligenceText, containsCustomerContactPii, containsTechnicalFallbackLeak } from "./facing-redact";
export { isChanakyaMutationRequest } from "./mutation-guard";
export {
  bindFollowUpEntity,
  looksLikeOrdinalFollowUp,
  ordinalIndexFromMessage,
  sessionBelongsToActor,
} from "./follow-up";
export {
  collectAuthorisedAttentionRows,
  buildInterventionCards,
  projectInterventionCard,
  similarInterventionCards,
  looksLikeBusinessLoanProduct,
  INTERVENTION_EMPTY_CRITERIA,
} from "./intervention-cards";
export { buildChanakyaGroundingBrief } from "./grounding-brief";
export {
  configureChanakyaConversationModelPort,
  resetChanakyaConversationModelPortForTests,
  isChanakyaConversationModelConfigured,
  getChanakyaConversationModelPort,
} from "./model-port";
export { generateChanakyaConversationAnswer } from "./generate-answer";
export {
  actorHasOrgWideChanakyaView,
  actorMaySeeAttentionRow,
  scopeTransactionAttentionForActor,
} from "./scope-actor";
export { actorMayIncludeDocumentExcerpts } from "./document-excerpt-gate";
