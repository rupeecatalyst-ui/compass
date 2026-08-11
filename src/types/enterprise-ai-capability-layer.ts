/**
 * Enterprise AI Capability Layer (CO-AI-102 / Sprint AI-2).
 * Declarative Behaviour Packs, Capability Manifests, permissions, tool categories.
 * No business behaviour, UI, voice, or CRM execution.
 */

import type { EaiPersonaPackId } from "./enterprise-ai-platform";

/** Canonical capability ids — declarative only. */
export type EaiCapabilityId =
  | "explain_products"
  | "compare_products"
  | "ask_questions"
  | "generate_consultation"
  | "generate_action_proposals"
  | "request_documents"
  | "read_customer_context"
  | "read_loan_context"
  | "read_product_context"
  | "read_knowledge_base"
  /** Future — denied by default in AI-2 permission matrix. */
  | "voice"
  | "workflow_execution"
  | "notifications"
  | "scheduling"
  | "crm_mutation"
  | "create_opportunity";

export type EaiCapabilityStatus = "active" | "reserved" | "disabled";

export type EaiToolCategoryId =
  | "registry.customer"
  | "registry.loan"
  | "registry.partner"
  | "registry.product"
  | "registry.document"
  | "knowledge.faqs"
  | "knowledge.policies"
  | "knowledge.lender_rules"
  | "financial.foir"
  | "financial.dbr"
  | "financial.eligibility"
  | "financial.emi"
  | "financial.roi"
  | "workflow.tasks"
  | "workflow.opportunities"
  | "workflow.stages"
  | "communication.email"
  | "communication.sms"
  | "communication.whatsapp"
  | "communication.notification";

export type EaiToolCategoryGroup =
  | "registry"
  | "knowledge"
  | "financial"
  | "workflow"
  | "communication";

export type EaiPermissionEffect = "allow" | "deny";

export type EaiToneProfile = "neutral" | "warm" | "formal" | "executive" | "reserved";

export type EaiCommunicationStyle =
  | "concise"
  | "explanatory"
  | "socratic"
  | "advisory_reserved"
  | "reserved";

export type EaiResponseStyle =
  | "structured"
  | "narrative"
  | "bullet_first"
  | "reserved";

export type EaiQuestionStyle =
  | "one_at_a_time"
  | "batched"
  | "clarifying_first"
  | "reserved";

export type EaiVoiceStyle = "reserved_not_implemented" | "provider_independent";

export type EaiSupportedLanguageCode = "en" | "hi" | "mr" | "mixed_reserved";

export interface EaiCapabilityDefinition {
  capabilityId: EaiCapabilityId;
  label: string;
  description: string;
  status: EaiCapabilityStatus;
  /** Tool categories this capability may touch when allowed. */
  relatedToolCategories: EaiToolCategoryId[];
  /** When true, Policy Gate forces Action Proposal path. */
  requiresActionProposal: boolean;
}

export interface EaiCapabilityPermission {
  capabilityId: EaiCapabilityId;
  effect: EaiPermissionEffect;
  reason: string;
}

export interface EaiCapabilityManifest {
  manifestVersion: string;
  capabilities: EaiCapabilityId[];
  /** Explicit denials inside the pack (subset of platform catalogue). */
  deniedCapabilities?: EaiCapabilityId[];
}

export interface EaiBehaviourConfiguration {
  tone: EaiToneProfile;
  communicationStyle: EaiCommunicationStyle;
  responseStyle: EaiResponseStyle;
  questionStyle: EaiQuestionStyle;
  allowedToolCategories: EaiToolCategoryId[];
  /** Future — must remain reserved until voice sprints. */
  voiceStyle: EaiVoiceStyle;
  supportedLanguages: EaiSupportedLanguageCode[];
}

export type EaiBehaviourPackLifecycle = "scaffold" | "registered" | "active" | "retired";

/**
 * Behaviour Pack — AI personality container.
 * AI-2 ships scaffolds only (no conversational activation).
 */
export interface EaiBehaviourPack {
  packId: EaiPersonaPackId;
  displayName: string;
  description: string;
  lifecycle: EaiBehaviourPackLifecycle;
  manifest: EaiCapabilityManifest;
  configuration: EaiBehaviourConfiguration;
  /** Platform permission overlays for this pack (optional). */
  permissionOverrides?: EaiCapabilityPermission[];
  registeredAt: string;
  updatedAt: string;
}

export interface EaiToolCategoryDefinition {
  categoryId: EaiToolCategoryId;
  group: EaiToolCategoryGroup;
  label: string;
  description: string;
  /** Architecture-only — no handlers in AI-2. */
  implemented: boolean;
}

export interface EaiCapabilityEvaluation {
  capabilityId: EaiCapabilityId;
  allowed: boolean;
  effect: EaiPermissionEffect;
  reasons: string[];
  requireActionProposal: boolean;
}

export interface EaiCapabilityLayerReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}
