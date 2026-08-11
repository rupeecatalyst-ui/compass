/**
 * Capability Layer catalogue (CO-AI-102 / Sprint AI-2).
 */

import type {
  EaiCapabilityDefinition,
  EaiCapabilityId,
  EaiCapabilityPermission,
  EaiToolCategoryDefinition,
  EaiToolCategoryId,
} from "@/types/enterprise-ai-capability-layer";

export const EAI_CAPABILITY_LAYER_VERSION = "1.0.0-ai2";

export const EAI_CAPABILITY_MANIFEST_VERSION = "1.0.0";

export const EAI_CAPABILITY_CATALOGUE: readonly EaiCapabilityDefinition[] = [
  {
    capabilityId: "explain_products",
    label: "Explain Products",
    description: "Explain product attributes using enterprise product projections.",
    status: "active",
    relatedToolCategories: ["registry.product", "knowledge.faqs"],
    requiresActionProposal: false,
  },
  {
    capabilityId: "compare_products",
    label: "Compare Products",
    description: "Compare products using catalogue facts — no invented pricing.",
    status: "active",
    relatedToolCategories: ["registry.product"],
    requiresActionProposal: false,
  },
  {
    capabilityId: "ask_questions",
    label: "Ask Questions",
    description: "Ask clarifying questions within the conversation.",
    status: "active",
    relatedToolCategories: [],
    requiresActionProposal: false,
  },
  {
    capabilityId: "generate_consultation",
    label: "Generate Consultation",
    description: "Draft consultation summary text — advisory framing only.",
    status: "active",
    relatedToolCategories: ["knowledge.faqs", "registry.product"],
    requiresActionProposal: false,
  },
  {
    capabilityId: "generate_action_proposals",
    label: "Generate Action Proposals",
    description: "Create Action Proposal objects — never execute CRM.",
    status: "active",
    relatedToolCategories: ["workflow.tasks", "workflow.opportunities"],
    requiresActionProposal: true,
  },
  {
    capabilityId: "request_documents",
    label: "Request Documents",
    description: "Propose document requests via Action Proposal framework.",
    status: "active",
    relatedToolCategories: ["registry.document"],
    requiresActionProposal: true,
  },
  {
    capabilityId: "read_customer_context",
    label: "Read Customer Context",
    description: "Read sanitized customer context projections.",
    status: "active",
    relatedToolCategories: ["registry.customer"],
    requiresActionProposal: false,
  },
  {
    capabilityId: "read_loan_context",
    label: "Read Loan Context",
    description: "Read sanitized loan/opportunity context projections.",
    status: "active",
    relatedToolCategories: ["registry.loan"],
    requiresActionProposal: false,
  },
  {
    capabilityId: "read_product_context",
    label: "Read Product Context",
    description: "Read sanitized product context projections.",
    status: "active",
    relatedToolCategories: ["registry.product"],
    requiresActionProposal: false,
  },
  {
    capabilityId: "read_knowledge_base",
    label: "Read Knowledge Base",
    description: "Read FAQs / published guidance — not live policy mutation.",
    status: "active",
    relatedToolCategories: ["knowledge.faqs", "knowledge.policies", "knowledge.lender_rules"],
    requiresActionProposal: false,
  },
  {
    capabilityId: "voice",
    label: "Voice",
    description:
      "Voice interface (STT/TTS) — AI-13. Conversation intelligence remains the Enterprise AI Platform.",
    status: "active",
    relatedToolCategories: [],
    requiresActionProposal: false,
  },
  {
    capabilityId: "workflow_execution",
    label: "Workflow Execution",
    description: "Reserved — workflow execution denied in AI-2.",
    status: "reserved",
    relatedToolCategories: ["workflow.tasks", "workflow.stages", "workflow.opportunities"],
    requiresActionProposal: true,
  },
  {
    capabilityId: "notifications",
    label: "Notifications",
    description: "Reserved — communication dispatch denied in AI-2.",
    status: "reserved",
    relatedToolCategories: [
      "communication.email",
      "communication.sms",
      "communication.whatsapp",
      "communication.notification",
    ],
    requiresActionProposal: true,
  },
  {
    capabilityId: "scheduling",
    label: "Scheduling",
    description: "Reserved — scheduling denied in AI-2.",
    status: "reserved",
    relatedToolCategories: ["workflow.tasks"],
    requiresActionProposal: true,
  },
  {
    capabilityId: "crm_mutation",
    label: "CRM Mutation",
    description: "Reserved — direct CRM mutation always denied.",
    status: "disabled",
    relatedToolCategories: ["workflow.opportunities", "workflow.tasks"],
    requiresActionProposal: true,
  },
  {
    capabilityId: "create_opportunity",
    label: "Create Opportunity",
    description: "Reserved — opportunity creation via proposal only in future sprints.",
    status: "reserved",
    relatedToolCategories: ["workflow.opportunities"],
    requiresActionProposal: true,
  },
] as const;

/** Platform-wide permission matrix — Policy Gate enforces this. */
export const EAI_PLATFORM_PERMISSION_MATRIX: readonly EaiCapabilityPermission[] = [
  { capabilityId: "explain_products", effect: "allow", reason: "Read/explain allowed" },
  { capabilityId: "compare_products", effect: "allow", reason: "Compare via catalogue allowed" },
  { capabilityId: "ask_questions", effect: "allow", reason: "Clarifying questions allowed" },
  { capabilityId: "generate_consultation", effect: "allow", reason: "Draft consultation text allowed" },
  {
    capabilityId: "generate_action_proposals",
    effect: "allow",
    reason: "Proposals allowed; execution forbidden",
  },
  {
    capabilityId: "request_documents",
    effect: "allow",
    reason: "Document request proposals allowed",
  },
  { capabilityId: "read_customer_context", effect: "allow", reason: "Sanitized read allowed" },
  { capabilityId: "read_loan_context", effect: "allow", reason: "Sanitized read allowed" },
  { capabilityId: "read_product_context", effect: "allow", reason: "Sanitized read allowed" },
  { capabilityId: "read_knowledge_base", effect: "allow", reason: "Knowledge read allowed" },
  {
    capabilityId: "voice",
    effect: "allow",
    reason: "Voice interface allowed in AI-13 — intelligence remains platform engines",
  },
  {
    capabilityId: "workflow_execution",
    effect: "deny",
    reason: "Workflow execution out of scope for AI-2",
  },
  { capabilityId: "notifications", effect: "deny", reason: "Notifications out of scope for AI-2" },
  { capabilityId: "scheduling", effect: "deny", reason: "Scheduling out of scope for AI-2" },
  { capabilityId: "crm_mutation", effect: "deny", reason: "Direct CRM mutation never allowed" },
  {
    capabilityId: "create_opportunity",
    effect: "deny",
    reason: "Create Opportunity not allowed in AI-2 (proposal-only later)",
  },
] as const;

export const EAI_TOOL_CATEGORY_CATALOGUE: readonly EaiToolCategoryDefinition[] = [
  {
    categoryId: "registry.customer",
    group: "registry",
    label: "Customer Registry",
    description: "Customer identity projections",
    implemented: false,
  },
  {
    categoryId: "registry.loan",
    group: "registry",
    label: "Loan Registry",
    description: "Loan / opportunity projections",
    implemented: false,
  },
  {
    categoryId: "registry.partner",
    group: "registry",
    label: "Partner Registry",
    description: "Wealth partner projections",
    implemented: false,
  },
  {
    categoryId: "registry.product",
    group: "registry",
    label: "Product Registry",
    description: "Product catalogue projections",
    implemented: false,
  },
  {
    categoryId: "registry.document",
    group: "registry",
    label: "Document Registry",
    description: "Document request / status projections",
    implemented: false,
  },
  {
    categoryId: "knowledge.faqs",
    group: "knowledge",
    label: "FAQs",
    description: "Published FAQ knowledge",
    implemented: false,
  },
  {
    categoryId: "knowledge.policies",
    group: "knowledge",
    label: "Policies",
    description: "Published policy explanations",
    implemented: false,
  },
  {
    categoryId: "knowledge.lender_rules",
    group: "knowledge",
    label: "Lender Rules",
    description: "Published lender rule explanations",
    implemented: false,
  },
  {
    categoryId: "financial.foir",
    group: "financial",
    label: "FOIR",
    description: "FOIR calculator tool (engine-owned)",
    implemented: false,
  },
  {
    categoryId: "financial.dbr",
    group: "financial",
    label: "DBR",
    description: "DBR calculator tool (engine-owned)",
    implemented: false,
  },
  {
    categoryId: "financial.eligibility",
    group: "financial",
    label: "Eligibility",
    description: "Eligibility engine tool (engine-owned)",
    implemented: false,
  },
  {
    categoryId: "financial.emi",
    group: "financial",
    label: "EMI",
    description: "EMI calculator tool (engine-owned)",
    implemented: false,
  },
  {
    categoryId: "financial.roi",
    group: "financial",
    label: "ROI",
    description: "ROI calculator tool (engine-owned)",
    implemented: false,
  },
  {
    categoryId: "workflow.tasks",
    group: "workflow",
    label: "Tasks",
    description: "ETE task tools",
    implemented: false,
  },
  {
    categoryId: "workflow.opportunities",
    group: "workflow",
    label: "Opportunities",
    description: "Opportunity workflow tools",
    implemented: false,
  },
  {
    categoryId: "workflow.stages",
    group: "workflow",
    label: "Stages",
    description: "Stage progression tools",
    implemented: false,
  },
  {
    categoryId: "communication.email",
    group: "communication",
    label: "Email",
    description: "Email channel",
    implemented: false,
  },
  {
    categoryId: "communication.sms",
    group: "communication",
    label: "SMS",
    description: "SMS channel",
    implemented: false,
  },
  {
    categoryId: "communication.whatsapp",
    group: "communication",
    label: "WhatsApp",
    description: "WhatsApp channel",
    implemented: false,
  },
  {
    categoryId: "communication.notification",
    group: "communication",
    label: "Notification",
    description: "In-app / push notification channel",
    implemented: false,
  },
] as const;

export function getEaiCapabilityDefinition(
  capabilityId: EaiCapabilityId,
): EaiCapabilityDefinition | undefined {
  return EAI_CAPABILITY_CATALOGUE.find((c) => c.capabilityId === capabilityId);
}

export function getEaiPlatformPermission(
  capabilityId: EaiCapabilityId,
): EaiCapabilityPermission | undefined {
  return EAI_PLATFORM_PERMISSION_MATRIX.find((p) => p.capabilityId === capabilityId);
}

export function getEaiToolCategoryDefinition(
  categoryId: EaiToolCategoryId,
): EaiToolCategoryDefinition | undefined {
  return EAI_TOOL_CATEGORY_CATALOGUE.find((c) => c.categoryId === categoryId);
}

export const EAI_ALL_CAPABILITY_IDS: readonly EaiCapabilityId[] = EAI_CAPABILITY_CATALOGUE.map(
  (c) => c.capabilityId,
);

export const EAI_ALL_TOOL_CATEGORY_IDS: readonly EaiToolCategoryId[] =
  EAI_TOOL_CATEGORY_CATALOGUE.map((c) => c.categoryId);
