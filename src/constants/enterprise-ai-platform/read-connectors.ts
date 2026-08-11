/**
 * Read connector constants (CO-AI-104 / Sprint AI-4).
 */

import type { EaiReadCachePolicy, EaiReadConnectorId } from "@/types/enterprise-ai-read-connectors";
import type { EaiContextDomain } from "@/types/enterprise-ai-context-intelligence";
import type { EaiToolCategoryId } from "@/types/enterprise-ai-capability-layer";

export const EAI_READ_CONNECTORS_VERSION = "1.1.0-ai4";

export const EAI_READ_CONNECTOR_IDS: readonly EaiReadConnectorId[] = [
  "customer_registry",
  "loan_registry",
  "partner_registry",
  "product_registry",
  "workflow_registry",
  "document_registry",
  "knowledge_registry",
  "financial_registry",
  "policy_registry",
] as const;

export const EAI_DOMAIN_TO_CONNECTOR: Record<
  Exclude<EaiContextDomain, "conversation">,
  EaiReadConnectorId
> = {
  customer: "customer_registry",
  loan: "loan_registry",
  partner: "partner_registry",
  product: "product_registry",
  workflow: "workflow_registry",
  document: "document_registry",
  knowledge: "knowledge_registry",
  financial: "financial_registry",
  policy: "policy_registry",
};

/** Tool Bus read tool catalogue — READ ONLY. */
export const EAI_READ_TOOL_DEFINITIONS: readonly {
  toolId: string;
  name: string;
  description: string;
  category: EaiToolCategoryId;
  connectorId: EaiReadConnectorId;
  domain: EaiContextDomain;
}[] = [
  {
    toolId: "eai.read.customer",
    name: "Read Customer",
    description: "Read sanitized customer projection",
    category: "registry.customer",
    connectorId: "customer_registry",
    domain: "customer",
  },
  {
    toolId: "eai.read.loan",
    name: "Read Loan",
    description: "Read sanitized loan/opportunity projection",
    category: "registry.loan",
    connectorId: "loan_registry",
    domain: "loan",
  },
  {
    toolId: "eai.read.partner",
    name: "Read Partner",
    description: "Read sanitized wealth partner projection",
    category: "registry.partner",
    connectorId: "partner_registry",
    domain: "partner",
  },
  {
    toolId: "eai.read.product",
    name: "Read Products",
    description: "Read sanitized product catalogue projection",
    category: "registry.product",
    connectorId: "product_registry",
    domain: "product",
  },
  {
    toolId: "eai.read.workflow",
    name: "Read Workflow",
    description: "Read sanitized journey/workflow projection",
    category: "workflow.stages",
    connectorId: "workflow_registry",
    domain: "workflow",
  },
  {
    toolId: "eai.read.document",
    name: "Read Documents",
    description: "Read sanitized document readiness projection",
    category: "registry.document",
    connectorId: "document_registry",
    domain: "document",
  },
  {
    toolId: "eai.read.knowledge",
    name: "Read Knowledge",
    description: "Read Chanakya Guide / knowledge projection",
    category: "knowledge.faqs",
    connectorId: "knowledge_registry",
    domain: "knowledge",
  },
  {
    toolId: "eai.read.policy",
    name: "Read Policies",
    description: "Read policy explanation projection",
    category: "knowledge.policies",
    connectorId: "policy_registry",
    domain: "policy",
  },
  {
    toolId: "eai.read.financial",
    name: "Read Financial Profile",
    description: "Read sanitized financial visibility / stated projection",
    category: "financial.eligibility",
    connectorId: "financial_registry",
    domain: "financial",
  },
  {
    toolId: "eai.read.conversation_summary",
    name: "Read Conversation Summary",
    description: "Read structured conversation memory summary (not full chat)",
    category: "knowledge.faqs",
    connectorId: "knowledge_registry",
    domain: "conversation",
  },
] as const;

/** Framework-only cache policy — disabled by default. */
export const EAI_DEFAULT_READ_CACHE_POLICY: EaiReadCachePolicy = {
  enabled: false,
  ttlSeconds: 60,
  maxEntries: 256,
};
