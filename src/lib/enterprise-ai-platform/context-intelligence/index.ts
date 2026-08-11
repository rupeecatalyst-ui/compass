/**
 * Context Intelligence Engine — public barrel (CO-AI-103).
 */

export { prioritiseEaiContextDomains } from "./prioritisation";
export {
  assertNoRawEnterprisePayload,
  sanitiseEaiFact,
  sanitiseEaiProviderResult,
} from "./sanitisation";
export {
  applyEaiContextBudget,
  approximateEaiPackageChars,
  approximateEaiSectionChars,
  resolveEaiContextBudgetPolicy,
} from "./budget";
export {
  conversationMemoryToFacts,
  normaliseEaiConversationMemory,
} from "./conversation-memory";
export {
  ensureEaiContextProviderStubs,
  getEaiContextProvider,
  invokeEaiContextProvider,
  listEaiContextProviders,
  registerEaiContextProvider,
  resetEaiContextProviders,
} from "./providers";
export { buildEaiContextPackage } from "./package-builder";
export { validateEaiContextPackage } from "./package-validator";
export { runEaiContextIntelligenceReadiness } from "./readiness";
