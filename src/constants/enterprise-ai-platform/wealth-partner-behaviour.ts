/**
 * Wealth Partner Behaviour Pack (CO-AI-112 / Sprint AI-12).
 * Reuses the Enterprise AI Platform — does not introduce a second AI.
 */

export const EAI_WEALTH_PARTNER_BEHAVIOUR_VERSION = "1.0.0-ai12";

export const EAI_WEALTH_PARTNER_PACK_ID = "sarathi_wealth_partner" as const;

export const EAI_WEALTH_PARTNER_DISCLAIMERS = [
  "Wealth Partner Behaviour Pack reuses the Enterprise AI Platform — it is not a separate AI.",
  "Partner communication is professional and advisory — customer-facing tone must never be used.",
  "Action Proposals remain draft recommendations — never CRM or workflow execution.",
] as const;

/**
 * Business themes → existing platform capability IDs.
 * No parallel capability engines.
 */
export const EAI_WEALTH_PARTNER_CAPABILITY_THEMES = [
  {
    themeId: "customer_analysis",
    label: "Customer Analysis",
    capabilityIds: ["read_customer_context", "generate_consultation", "read_knowledge_base"],
  },
  {
    themeId: "product_guidance",
    label: "Product Guidance",
    capabilityIds: ["explain_products", "compare_products", "read_product_context"],
  },
  {
    themeId: "document_guidance",
    label: "Document Guidance",
    capabilityIds: ["request_documents", "read_knowledge_base"],
  },
  {
    themeId: "conversation_history",
    label: "Conversation History",
    capabilityIds: ["ask_questions"],
    notes: "History is platform session/continuity — not a separate store.",
  },
  {
    themeId: "opportunity_support",
    label: "Opportunity Support",
    capabilityIds: ["read_loan_context", "generate_action_proposals", "ask_questions"],
  },
  {
    themeId: "partner_advisory",
    label: "Partner Advisory",
    capabilityIds: ["generate_consultation", "generate_action_proposals", "read_knowledge_base"],
  },
] as const;

export type EaiWealthPartnerCapabilityThemeId =
  (typeof EAI_WEALTH_PARTNER_CAPABILITY_THEMES)[number]["themeId"];

/** Manifest capabilities for the activated Wealth Partner pack. */
export const EAI_WEALTH_PARTNER_CAPABILITIES = [
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
  "voice",
] as const;

export const EAI_WEALTH_PARTNER_DENIED_CAPABILITIES = [
  "workflow_execution",
  "crm_mutation",
  "create_opportunity",
  "notifications",
  "scheduling",
] as const;

export const EAI_WEALTH_PARTNER_TOOL_CATEGORIES = [
  "registry.customer",
  "registry.loan",
  "registry.partner",
  "registry.product",
  "registry.document",
  "knowledge.faqs",
  "knowledge.policies",
  "knowledge.lender_rules",
  "workflow.stages",
  "workflow.tasks",
  "workflow.opportunities",
  "financial.eligibility",
] as const;

/** Partner desk continuity — must not share customer SARATHI storage. */
export const EAI_WEALTH_PARTNER_CONTINUITY_STORAGE_KEY =
  "eai.sarathi.wealth_partner.continuity.v1";

/** Partner suggested questions — business-focused, never consumer-marketing. */
export const EAI_WEALTH_PARTNER_SUGGESTED_QUESTIONS = [
  "Summarise this customer's BT readiness",
  "Which documents are still outstanding?",
  "Compare LAP vs home loan for this case",
  "What opportunity gaps remain?",
  "Recommend the next partner action",
] as const;
