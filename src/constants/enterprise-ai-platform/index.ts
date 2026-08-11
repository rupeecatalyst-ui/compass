/**
 * Enterprise AI Platform constants (CO-AI-101 / Sprint AI-1 + CO-AI-102 / AI-2).
 */

import type { EaiPersonaPackId } from "@/types/enterprise-ai-platform";

export const EAI_FRAMEWORK_VERSION = "1.17.0-ai16";

export const EAI_CONTEXT_COMPILER_VERSION = "1.0.0-framework";

export const EAI_POLICY_VERSION = "1.3.0-domain-intelligence";

export const EAI_COMPOSER_VERSION = "1.0.0";

/** Reserved packs — SARATHI Customer (AI-11) · Wealth Partner (AI-12) · Voice interface (AI-13). */
export const EAI_RESERVED_PERSONA_PACKS: readonly EaiPersonaPackId[] = [
  "platform_none",
  "sarathi_customer",
  "sarathi_wealth_partner",
  "chanakya_executive",
] as const;

/** Future tool ids — registered as stubs only; no business handlers in AI-1/AI-2. */
export const EAI_RESERVED_TOOL_IDS = [
  "customer_registry.read",
  "loan_registry.read",
  "document_registry.read",
  "workflow_engine.read",
  "credit_risk_engine.read",
  "financial_calculators.read",
  "product_engine.read",
  "policy_engine.read",
] as const;

export type EaiReservedToolId = (typeof EAI_RESERVED_TOOL_IDS)[number];

/** Data scopes Policy Gate may allow — never implies raw row access. */
export const EAI_DATA_SCOPES = [
  "identity.public",
  "opportunity.summary",
  "product.catalog_public",
  "document.request_status",
  "partner.public_profile",
] as const;

export type EaiDataScope = (typeof EAI_DATA_SCOPES)[number];

export const EAI_DEFAULT_REDACTION_NOTES = [
  "Raw enterprise registry rows are never included in compiled LLM context.",
  "Only sanitized facts and opaque registry references are permitted.",
  "Enterprise engines remain the source of truth for eligibility, FOIR, DBR, policy, and pricing.",
] as const;

export const EAI_STUB_LLM_PROVIDER_ID = "eai.stub";

export const EAI_STUB_LLM_MODEL_ID = "stub-echo-v1";

export * from "./capability-layer";
export * from "./context-intelligence";
export * from "./read-connectors";
export * from "./domain-governance";
export * from "./tone-library";
export * from "./sarathi-bible";
export * from "./financial-decision-intelligence";
export * from "./advisory-reasoning";
export * from "./planner";
export * from "./consultation-intelligence";
export * from "./lead-intelligence";
export * from "./explainability";
export * from "./conversation-experience";
export * from "./wealth-partner-behaviour";
export * from "./partner-tone-library";
export * from "./voice";
export * from "./multilingual";
export * from "./conversation-memory";
export * from "./validation-performance";
