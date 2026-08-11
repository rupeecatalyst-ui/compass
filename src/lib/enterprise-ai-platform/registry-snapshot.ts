/**
 * Registry snapshot + framework version (CO-AI-101 … CO-AI-111).
 */

import {
  EAI_ADVISORY_REASONING_VERSION,
  EAI_ALL_CAPABILITY_IDS,
  EAI_ALL_TOOL_CATEGORY_IDS,
  EAI_CAPABILITY_LAYER_VERSION,
  EAI_CONSULTATION_VERSION,
  EAI_CONTEXT_INTELLIGENCE_VERSION,
  EAI_CONVERSATION_EXPERIENCE_VERSION,
  EAI_DOMAIN_GOVERNANCE_VERSION,
  EAI_EXPLAINABILITY_VERSION,
  EAI_FDI_VERSION,
  EAI_FRAMEWORK_VERSION,
  EAI_LEAD_INTELLIGENCE_VERSION,
  EAI_PLANNER_VERSION,
  EAI_READ_CONNECTORS_VERSION,
  EAI_RESERVED_PERSONA_PACKS,
  EAI_WEALTH_PARTNER_BEHAVIOUR_VERSION,
  EAI_VOICE_ENGINE_VERSION,
  EAI_MULTILINGUAL_ENGINE_VERSION,
  EAI_CONVERSATION_MEMORY_ENGINE_VERSION,
  EAI_VALIDATION_PERFORMANCE_VERSION,
} from "@/constants/enterprise-ai-platform";
import type { EaiRegistrySnapshot } from "@/types/enterprise-ai-platform";
import { listEaiBehaviourPacks } from "./behaviour-packs";
import { getEaiPorts } from "./composition";
import { listEaiContextProviders } from "./context-intelligence/providers";
import {
  ensureEaiKnowledgeSourcesSeeded,
  listEaiKnowledgeSources,
} from "./domain-governance/knowledge-governance";
import { listEaiReadConnectors } from "./read-connectors/registry";
import { listEaiTools } from "./tool-bus";

export function getEaiFrameworkVersion(): string {
  return EAI_FRAMEWORK_VERSION;
}

export function getEaiRegistrySnapshot(): EaiRegistrySnapshot {
  const ports = getEaiPorts();
  const readTools = listEaiTools().filter((t) => t.toolId.startsWith("eai.read."));
  ensureEaiKnowledgeSourcesSeeded();
  return {
    frameworkVersion: EAI_FRAMEWORK_VERSION,
    sessionCount: ports.sessions.list().length,
    interactionCount: ports.interactions.list().length,
    proposalCount: ports.proposals.list().length,
    registeredToolCount: ports.tools.list().length,
    personaPacksReserved: [...EAI_RESERVED_PERSONA_PACKS],
    llmProviderId: ports.llmProvider.providerId,
    capabilityLayerVersion: EAI_CAPABILITY_LAYER_VERSION,
    registeredBehaviourPackCount: listEaiBehaviourPacks().length,
    toolCategoryCount: EAI_ALL_TOOL_CATEGORY_IDS.length,
    capabilityCatalogueCount: EAI_ALL_CAPABILITY_IDS.length,
    contextIntelligenceVersion: EAI_CONTEXT_INTELLIGENCE_VERSION,
    contextProviderCount: listEaiContextProviders().length,
    readConnectorsVersion: EAI_READ_CONNECTORS_VERSION,
    readConnectorCount: listEaiReadConnectors().length,
    readToolCount: readTools.length,
    domainGovernanceVersion: EAI_DOMAIN_GOVERNANCE_VERSION,
    knowledgeSourceCount: listEaiKnowledgeSources().length,
    financialDecisionIntelligenceVersion: EAI_FDI_VERSION,
    advisoryReasoningVersion: EAI_ADVISORY_REASONING_VERSION,
    plannerVersion: EAI_PLANNER_VERSION,
    consultationIntelligenceVersion: EAI_CONSULTATION_VERSION,
    leadIntelligenceVersion: EAI_LEAD_INTELLIGENCE_VERSION,
    explainabilityTrustVersion: EAI_EXPLAINABILITY_VERSION,
    conversationExperienceVersion: EAI_CONVERSATION_EXPERIENCE_VERSION,
    wealthPartnerBehaviourVersion: EAI_WEALTH_PARTNER_BEHAVIOUR_VERSION,
    voiceEngineVersion: EAI_VOICE_ENGINE_VERSION,
    multilingualEngineVersion: EAI_MULTILINGUAL_ENGINE_VERSION,
    conversationMemoryEngineVersion: EAI_CONVERSATION_MEMORY_ENGINE_VERSION,
    validationPerformanceVersion: EAI_VALIDATION_PERFORMANCE_VERSION,
  };
}
