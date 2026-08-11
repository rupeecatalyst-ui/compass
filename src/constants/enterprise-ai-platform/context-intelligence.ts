/**
 * Context Intelligence constants (CO-AI-103 / Sprint AI-3).
 */

import type {
  EaiContextBudgetPolicy,
  EaiContextDomain,
} from "@/types/enterprise-ai-context-intelligence";

export const EAI_CONTEXT_INTELLIGENCE_VERSION = "1.0.0-ai3";

export const EAI_CONTEXT_BUILDER_VERSION = "1.0.0";

export const EAI_CONTEXT_PACKAGE_VERSION = "1.0.0";

export const EAI_CONTEXT_DOMAINS: readonly EaiContextDomain[] = [
  "customer",
  "loan",
  "partner",
  "product",
  "workflow",
  "knowledge",
  "conversation",
  "financial",
  "document",
  "policy",
] as const;

/** Default budget architecture — token counting deferred. */
export const EAI_DEFAULT_CONTEXT_BUDGET_POLICY: EaiContextBudgetPolicy = {
  maxApproximateChars: 12_000,
  priorityOrder: [
    "conversation",
    "product",
    "knowledge",
    "policy",
    "customer",
    "loan",
    "partner",
    "document",
    "financial",
    "workflow",
  ],
  enableSummaryReplacement: true,
  enableTruncation: true,
};

export const EAI_CONTEXT_SANITISATION_NOTES = [
  "Raw enterprise registry objects are never included in Context Packages.",
  "Internal IDs, secrets, and implementation details are stripped.",
  "PII is omitted unless explicitly required by a future governed connector.",
  "Context Intelligence Engine is the only allowed AI context preparer.",
] as const;

/**
 * Intent/hint → domain prioritisation rules (framework heuristics).
 * No business calculations — selection only.
 */
export const EAI_CONTEXT_PRIORITISATION_RULES: readonly {
  id: string;
  pattern: RegExp;
  include: EaiContextDomain[];
  exclude?: EaiContextDomain[];
  description: string;
}[] = [
  {
    id: "balance_transfer_education",
    pattern: /\bwhat is\b.*\bbalance transfer\b|\bbalance transfer\b.*\b(what|mean|explain)\b/i,
    include: ["knowledge", "conversation"],
    exclude: ["customer", "loan", "financial", "document", "workflow", "partner"],
    description: "Balance Transfer education — knowledge only (+ conversation)",
  },
  {
    id: "general_product_education",
    pattern: /\b(what is|explain)\b.*\b(home loan|product)\b|\b(home loan|product)\b.*\b(what|explain)\b/i,
    include: ["knowledge", "product", "conversation"],
    exclude: ["customer", "loan", "financial", "document", "workflow"],
    description: "Product education — avoid loading customer/loan context",
  },
  {
    id: "emi_affordability",
    pattern: /\b(emi|reduce my emi|can i reduce|affordability|instalment|installment)\b/i,
    include: ["knowledge", "loan", "financial", "conversation", "customer"],
    description:
      "EMI-related — knowledge + loan + financial + conversation; customer if available",
  },
  {
    id: "amount_requirement",
    pattern: /\b(i need|require|looking for)\b.*\b(\d+|₹|rs\.?|lakh|lac|crore)\b|\b₹\s*\d+/i,
    include: ["knowledge", "financial", "product", "conversation", "customer"],
    description: "Amount intent — knowledge, financial, product, conversation; customer if available",
  },
  {
    id: "document_request",
    pattern: /\b(document|kyc|upload|paper|statement)\b/i,
    include: ["document", "conversation", "customer"],
    description: "Document-related context",
  },
  {
    id: "partner_channel",
    pattern: /\b(partner|wealth partner|referral|channel)\b/i,
    include: ["partner", "product", "conversation", "knowledge"],
    description: "Partner / channel context",
  },
  {
    id: "policy_rules",
    pattern: /\b(policy|eligible|eligibility|foir|dbr|guideline)\b/i,
    include: ["policy", "knowledge", "product", "conversation"],
    exclude: ["workflow"],
    description: "Policy explanation — engines remain SSOT for decisions",
  },
];
