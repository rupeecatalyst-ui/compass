/**
 * Enterprise AI Platform — public barrel (CO-AI-101 / AI-1 + CO-AI-102 / AI-2).
 *
 * Persona-agnostic foundation + Capability Layer. No SARATHI UI, voice, or CRM mutation.
 */

export {
  configureEaiPorts,
  getEaiPorts,
  resetEaiComposition,
} from "./composition";
export {
  createInMemoryEaiPorts,
  createStubEaiLlmProvider,
} from "./repositories/in-memory";
export {
  appendEaiTurn,
  attachEaiSessionDevice,
  createEaiSession,
  getEaiSession,
  listEaiSessionsByConversation,
  listEaiTurns,
  updateEaiSessionStatus,
  type CreateEaiSessionInput,
} from "./session-orchestrator";
export {
  compileEaiContext,
  compileEaiContextFromPackage,
  getEaiCompiledContext,
  listEaiContextSourceDescriptors,
  type CompileEaiContextInput,
} from "./context-compiler";
export {
  assertEaiCapabilityAllowed,
  assertEaiLlmReasoningAllowed,
  assertEaiToolAllowed,
  evaluateEaiPolicy,
} from "./policy-gate";
export {
  getEaiTool,
  invokeEaiTool,
  listEaiTools,
  registerEaiTool,
  resetEaiToolHandlers,
  type RegisterEaiToolInput,
} from "./tool-bus";
export {
  composeEaiResponse,
} from "./response-composer";
export {
  createEaiActionProposal,
  getEaiActionProposal,
  listEaiActionProposalsBySession,
  updateEaiActionProposalStatus,
  type CreateEaiActionProposalInput,
} from "./action-proposals";
export {
  getEaiInteraction,
  listEaiInteractionsByConversation,
  recordEaiInteraction,
  type RecordEaiInteractionInput,
} from "./ai-registry";
export {
  completeEaiLlm,
  getActiveEaiLlmProvider,
  getActiveEaiLlmProviderId,
} from "./llm-provider";
export {
  getEaiFrameworkVersion,
  getEaiRegistrySnapshot,
} from "./registry-snapshot";
export { runEaiFoundationValidation } from "./foundation-validation";

/** AI-2 Capability Layer */
export {
  ensureEaiBehaviourPackScaffolds,
  getEaiBehaviourPackOrThrow,
  listEaiBehaviourPacks,
  loadEaiBehaviourPack,
  registerEaiBehaviourPack,
  resetEaiBehaviourPackRegistry,
} from "./behaviour-packs";
export { buildEaiScaffoldBehaviourPacks } from "./behaviour-pack-scaffolds";
export {
  createEaiCapabilityManifest,
  eaiManifestIncludesCapability,
  listUnknownEaiCapabilities,
  validateEaiCapabilityManifestShape,
} from "./capability-manifest";
export {
  evaluateEaiCapabilityPermission,
  listEaiPlatformPermissions,
  resolveEaiCapabilityEffect,
} from "./permission-matrix";
export {
  isEaiToolCategoryAllowedForPack,
  listEaiToolCategories,
  listEaiToolCategoriesByGroup,
  listUnknownEaiToolCategories,
} from "./tool-categories";
export {
  getEaiBehaviourConfiguration,
  validateEaiBehaviourConfiguration,
} from "./behaviour-config";
export { runEaiCapabilityLayerReadiness } from "./capability-readiness";

/** AI-3 Context Intelligence Engine */
export {
  applyEaiContextBudget,
  approximateEaiPackageChars,
  assertNoRawEnterprisePayload,
  buildEaiContextPackage,
  conversationMemoryToFacts,
  ensureEaiContextProviderStubs,
  getEaiContextProvider,
  invokeEaiContextProvider,
  listEaiContextProviders,
  normaliseEaiConversationMemory,
  prioritiseEaiContextDomains,
  registerEaiContextProvider,
  resetEaiContextProviders,
  resolveEaiContextBudgetPolicy,
  runEaiContextIntelligenceReadiness,
  sanitiseEaiFact,
  sanitiseEaiProviderResult,
  validateEaiContextPackage,
} from "./context-intelligence";

/** AI-4 Enterprise Read Connectors */
export {
  bootstrapEaiReadConnectorsLayer,
  configureEaiReadCachePolicy,
  createEmptyProjection,
  createProjection,
  discoverEaiReadTools,
  ensureEaiReadConnectorsRegistered,
  getEaiReadCachePolicy,
  getEaiReadConnector,
  listEaiReadAuditEvents,
  listEaiReadConnectors,
  registerEaiEnterpriseReadTools,
  registerEaiReadConnector,
  resetEaiReadAudit,
  resetEaiReadCache,
  resetEaiReadConnectors,
  runEaiReadConnectorsReadiness,
  validateEaiReadProjection,
  wireEaiContextProvidersToReadConnectors,
} from "./read-connectors";

/** AI-4A / AI-4 DIE Domain Boundary & Knowledge Governance */
export {
  applyEaiMicroCommunication,
  assertEaiDomainAllowsKnowledge,
  assertEaiDomainAllowsLlm,
  assertEaiKnowledgeSourceZoneAllowed,
  buildEaiSafeRefusal,
  classifyEaiSarathiIntent,
  ensureEaiKnowledgeSourcesSeeded,
  evaluateEaiDomainBoundary,
  getEaiKnowledgeSource,
  getEaiOutsideDomainRefusal,
  getEaiToneEntry,
  getEaiToneLibraryVersion,
  listEaiKnowledgeSources,
  listEaiToneEntries,
  registerEaiKnowledgeSource,
  resetEaiKnowledgeSources,
  resolveEaiToneMessage,
  runEaiDomainGovernanceReadiness,
  validateEaiMicroCommunicationCompliance,
  validateEaiToneLibraryIntegrity,
} from "./domain-governance";

/** AI-5 Financial Decision Intelligence Foundation */
export {
  assessEaiFdiConfidence,
  buildEaiFdiAlternatives,
  buildEaiFdiExplanation,
  buildEaiFdiRecommendations,
  listEaiFdiScenarioCatalogue,
  runEaiFinancialDecisionIntelligence,
  runEaiFinancialDecisionIntelligenceReadiness,
  selectEaiFdiScenarios,
  validateEaiFdiDecisionPackage,
} from "./financial-decision-intelligence";

/** AI-6 Knowledge & Advisory Reasoning Engine */
export {
  composeEaiAdvisoryFacingText,
  reasonEaiBenefitTradeoff,
  reasonEaiComparison,
  reasonEaiCustomerGuidance,
  reasonEaiEducationalResponse,
  reasonEaiJourneyGuidance,
  reasonEaiKnowledgeAdvice,
  reasonEaiLoanAdvisory,
  reasonEaiProductExplanation,
  runEaiAdvisoryReasoning,
  runEaiAdvisoryReasoningReadiness,
  validateEaiAdvisoryReasoningResult,
} from "./advisory-reasoning";

/** AI-7 Planner & Next Best Action Engine */
export {
  detectEaiMissingInformation,
  deriveEaiNextBestActions,
  generateEaiPlannerActionProposals,
  planEaiConversation,
  planEaiFollowUps,
  runEaiPlanner,
  runEaiPlannerReadiness,
  selectEaiPlannerQuestions,
  sequenceEaiPlannerRecommendations,
  validateEaiPlannerPlan,
} from "./planner";

/** AI-8 Consultation Intelligence Engine */
export {
  applyEaiConsultationTransition,
  assessEaiConsultationConfidence,
  buildEaiConsultationSummary,
  canEaiConsultationTransition,
  deriveEaiConsultationLifecycleEvent,
  describeEaiConsultationLifecycle,
  extractEaiConsultationKeyFacts,
  extractEaiCustomerObjectives,
  extractEaiFinancialConcerns,
  isEaiConsultationTerminalState,
  runEaiConsultationIntelligence,
  runEaiConsultationIntelligenceReadiness,
  scoreEaiConsultationCompletion,
  validateEaiConsultationObject,
  EAI_CONSULTATION_LIFECYCLE_ORDER,
} from "./consultation-intelligence";

/** AI-9 Lead Intelligence & Action Proposal Engine */
export {
  assessEaiCustomerReadiness,
  assessEaiDocumentReadiness,
  assessEaiLeadIntelligenceConfidence,
  assessEaiLeadReadiness,
  assessEaiOpportunityReadiness,
  attachEaiProposalIds,
  deriveEaiLeadIntelligenceNba,
  emitEaiLeadIntelligenceProposals,
  rankEaiActionProposals,
  recommendEaiPartner,
  runEaiLeadIntelligence,
  runEaiLeadIntelligenceReadiness,
  scoreEaiLeadIntelligencePriority,
  validateEaiLeadIntelligenceResult,
} from "./lead-intelligence";

/** AI-10 Explainability & Trust Engine */
export {
  buildEaiDecisionTrace,
  buildEaiRecommendationExplanation,
  collectEaiTrustMissingInformation,
  collectEaiTrustSupportingFacts,
  deriveEaiTrustAssumptions,
  deriveEaiTrustReasonCodes,
  explainEaiAlternativeRecommendations,
  explainEaiTrustConfidence,
  resolveEaiTrustReasonCode,
  runEaiExplainabilityTrust,
  runEaiExplainabilityTrustReadiness,
  validateEaiTrustPackage,
} from "./explainability-trust";

/** AI-11 SARATHI Conversation Experience (text only) */
export {
  clearEaiSarathiContinuityStorage,
  createEaiConversationContinuityKey,
  loadEaiSarathiContinuityFromStorage,
  resolveEaiSarathiSuggestedQuestions,
  runEaiConversationExperienceReadiness,
  runEaiSarathiConversationTurn,
  saveEaiSarathiContinuityToStorage,
} from "./conversation-experience";

/** AI-12 Wealth Partner Behaviour Pack */
export {
  activateEaiWealthPartnerBehaviourPack,
  buildEaiWealthPartnerBehaviourPack,
  getEaiWealthPartnerCapabilityThemes,
  isEaiWealthPartnerPackActive,
  runEaiWealthPartnerBehaviourReadiness,
} from "./wealth-partner-behaviour";

export {
  getEaiPartnerToneLibraryVersion,
  resolveEaiToneAudience,
} from "./domain-governance/tone-library";

/** AI-13 Voice & Real-Time Conversation Engine */
export {
  closeEaiVoiceSession,
  configureEaiVoicePorts,
  createEaiVoiceSession,
  createStubEaiSttProvider,
  createStubEaiTtsProvider,
  createStubEaiVadProvider,
  createStubEaiVoicePorts,
  enqueueEaiVoiceResponse,
  getActiveEaiSttProviderId,
  getActiveEaiTtsProviderId,
  getActiveEaiVadProviderId,
  getEaiVoicePorts,
  getEaiVoiceSession,
  interruptEaiVoiceQueue,
  interruptEaiVoiceSession,
  isEaiVoiceLanguageSupported,
  listEaiVoiceQueue,
  listEaiVoiceSessions,
  listEaiVoiceStreamEvents,
  recoverEaiVoiceSession,
  resetEaiVoiceComposition,
  resetEaiVoiceQueues,
  resetEaiVoiceSessions,
  resetEaiVoiceStreams,
  runEaiVoiceConversationTurn,
  runEaiVoiceEngineReadiness,
  subscribeEaiVoiceStream,
} from "./voice";

/** AI-14 Multilingual Intelligence Engine */
export {
  analyzeEaiMixedLanguage,
  buildEaiMultilingualTurnContext,
  coerceEaiLanguageCode,
  detectEaiLanguage,
  getEaiOutsideDomainRefusalLocalised,
  isEaiMixedLanguageUtterance,
  isEaiOutsideDomainRefusalEquivalent,
  localiseEaiEnglishFacingText,
  localiseEaiMicroCommunication,
  localiseEaiOutsideDomainRefusal,
  localiseEaiResponseFacingText,
  localiseEaiToneLines,
  resolveEaiLanguagePreference,
  runEaiMultilingualEngineReadiness,
  translateEaiUtteranceToCanonical,
} from "./multilingual";

/** AI-15 Enterprise Conversation Memory & Learning */
export {
  appendEaiMemoryAudit,
  computeEaiMemoryConfidence,
  createEaiEnterpriseConversationMemory,
  createEaiMemoryAuditEntry,
  defaultEaiMemoryExpiryIso,
  expireEaiEnterpriseConversationMemory,
  findEaiEnterpriseConversationMemoryByContinuity,
  getEaiEnterpriseConversationMemory,
  isEaiMemoryEntryExpired,
  listEaiEnterpriseConversationMemories,
  projectEaiEnterpriseMemoryToCompact,
  resetEaiConversationMemoryStore,
  resolveEaiEnterpriseConversationMemory,
  runEaiConversationMemoryEngineReadiness,
  saveEaiEnterpriseConversationMemory,
  updateEaiEnterpriseMemoryFromTurn,
  validateEaiEnterpriseConversationMemory,
} from "./conversation-memory";

/** AI-16 Enterprise AI Validation & Performance */
export {
  analyzeEaiContextOptimisation,
  analyzeEaiLatency,
  analyzeEaiTokenOptimisation,
  buildEaiPerformanceReport,
  runEaiBehaviourValidationSuite,
  runEaiContextValidationSuite,
  runEaiDomainBoundaryValidationSuite,
  runEaiFailureRecoveryValidationSuite,
  runEaiLoadTestingSuite,
  runEaiPerformanceAggregateSuite,
  runEaiPolicyGateValidationSuite,
  runEaiPromptInjectionValidationSuite,
  runEaiSecurityValidationSuite,
  runEaiToolBusValidationSuite,
  runEaiValidationPerformanceReadiness,
  runEaiValidationPerformanceSuite,
} from "./validation-performance";
