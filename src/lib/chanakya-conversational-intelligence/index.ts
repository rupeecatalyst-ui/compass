/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Phase 1 conversational layer on top of existing enterprise-read / conversation intelligence.
 */

export { classifyChanakyaPhase1Domain, isChanakyaPhase1OutOfDomain } from "./domain-gate";
export { isChanakyaWebResearchEnabled, chanakyaWebResearchIsImplemented } from "./web-research-flag";
export {
  validateChanakyaGeneratedEvidence,
  looksLikeUnavailableMetricQuestion,
  groundingHasAuthorisedFacts,
} from "./evidence-validate";
export {
  collectChanakyaDocumentGroundingNotes,
  isChanakyaDocumentQuestion,
} from "./document-grounding";
export { isChanakyaMakeProposalRequest } from "./proposal-detect";
export {
  generateChanakyaChatProposalDraft,
} from "./proposal-chat";
export {
  rememberUnsavedChatProposalDraft,
  getUnsavedChatProposalDraft,
  saveChanakyaChatProposalDraft,
  listSavedChanakyaChatProposalDrafts,
  resetChanakyaChatProposalDraftsForTests,
} from "./proposal-draft-store";
export {
  isChanakyaChatSessionExpired,
  chanakyaChatExpiryFrom,
} from "./retention";
export { redactChanakyaPersistText } from "./persist-redact";
