/**
 * Scaffold Behaviour Packs — configuration framework only (CO-AI-102).
 * No prompts, no advisory logic, no conversational activation.
 */

import {
  EAI_CAPABILITY_MANIFEST_VERSION,
} from "@/constants/enterprise-ai-platform";
import type { EaiBehaviourPack } from "@/types/enterprise-ai-capability-layer";

function nowIso(): string {
  return new Date().toISOString();
}

/** Conservative read/explain capabilities shared by customer/partner scaffolds. */
const SARATHI_SCAFFOLD_CAPABILITIES = [
  "explain_products",
  "compare_products",
  "ask_questions",
  "generate_consultation",
  "generate_action_proposals",
  "request_documents",
  "read_customer_context",
  "read_loan_context",
  "read_product_context",
  "read_knowledge_base",
] as const;

const SARATHI_TOOL_CATEGORIES = [
  "registry.customer",
  "registry.loan",
  "registry.partner",
  "registry.product",
  "registry.document",
  "knowledge.faqs",
  "knowledge.policies",
  "knowledge.lender_rules",
  /** AI-4 enterprise read tools */
  "workflow.stages",
  "financial.eligibility",
] as const;

export function buildEaiScaffoldBehaviourPacks(): EaiBehaviourPack[] {
  const ts = nowIso();

  const platformNone: EaiBehaviourPack = {
    packId: "platform_none",
    displayName: "Platform (None)",
    description: "Neutral platform pack with no audience behaviour.",
    lifecycle: "scaffold",
    manifest: {
      manifestVersion: EAI_CAPABILITY_MANIFEST_VERSION,
      capabilities: ["ask_questions"],
      deniedCapabilities: [
        "voice",
        "workflow_execution",
        "notifications",
        "scheduling",
        "crm_mutation",
        "create_opportunity",
      ],
    },
    configuration: {
      tone: "neutral",
      communicationStyle: "concise",
      responseStyle: "structured",
      questionStyle: "one_at_a_time",
      allowedToolCategories: [],
      voiceStyle: "reserved_not_implemented",
      supportedLanguages: ["en"],
    },
    registeredAt: ts,
    updatedAt: ts,
  };

  const sarathiCustomer: EaiBehaviourPack = {
    packId: "sarathi_customer",
    displayName: "SARATHI Customer",
    description:
      "SARATHI Customer Behaviour Pack — conversation (AI-11) + voice interface (AI-13).",
    lifecycle: "scaffold",
    manifest: {
      manifestVersion: EAI_CAPABILITY_MANIFEST_VERSION,
      capabilities: [...SARATHI_SCAFFOLD_CAPABILITIES, "voice"],
      deniedCapabilities: [
        "workflow_execution",
        "crm_mutation",
        "create_opportunity",
        "notifications",
        "scheduling",
      ],
    },
    configuration: {
      tone: "warm",
      communicationStyle: "explanatory",
      responseStyle: "structured",
      questionStyle: "clarifying_first",
      allowedToolCategories: [...SARATHI_TOOL_CATEGORIES],
      voiceStyle: "provider_independent",
      supportedLanguages: ["en", "hi", "mr", "mixed_reserved"],
    },
    registeredAt: ts,
    updatedAt: ts,
  };

  const sarathiPartner: EaiBehaviourPack = {
    packId: "sarathi_wealth_partner",
    displayName: "SARATHI Wealth Partner",
    description:
      "Wealth Partner Behaviour Pack — activated in AI-12; voice interface available in AI-13.",
    lifecycle: "scaffold",
    manifest: {
      manifestVersion: EAI_CAPABILITY_MANIFEST_VERSION,
      capabilities: [...SARATHI_SCAFFOLD_CAPABILITIES, "voice"],
      deniedCapabilities: [
        "workflow_execution",
        "crm_mutation",
        "create_opportunity",
        "notifications",
        "scheduling",
      ],
    },
    configuration: {
      tone: "formal",
      communicationStyle: "advisory_reserved",
      responseStyle: "bullet_first",
      questionStyle: "batched",
      allowedToolCategories: [...SARATHI_TOOL_CATEGORIES, "workflow.tasks"],
      voiceStyle: "provider_independent",
      supportedLanguages: ["en", "hi", "mr"],
    },
    registeredAt: ts,
    updatedAt: ts,
  };

  const chanakyaExecutive: EaiBehaviourPack = {
    packId: "chanakya_executive",
    displayName: "CHANAKYA Executive (Future)",
    description:
      "Scaffold reserved for future conversational CHANAKYA — intelligence-only today.",
    lifecycle: "scaffold",
    manifest: {
      manifestVersion: EAI_CAPABILITY_MANIFEST_VERSION,
      capabilities: ["ask_questions", "read_knowledge_base", "generate_consultation"],
      deniedCapabilities: [
        "voice",
        "workflow_execution",
        "crm_mutation",
        "create_opportunity",
        "notifications",
        "scheduling",
        "generate_action_proposals",
      ],
    },
    configuration: {
      tone: "executive",
      communicationStyle: "concise",
      responseStyle: "structured",
      questionStyle: "one_at_a_time",
      allowedToolCategories: [
        "knowledge.faqs",
        "knowledge.policies",
        "registry.product",
      ],
      voiceStyle: "reserved_not_implemented",
      supportedLanguages: ["en"],
    },
    registeredAt: ts,
    updatedAt: ts,
  };

  return [platformNone, sarathiCustomer, sarathiPartner, chanakyaExecutive];
}
