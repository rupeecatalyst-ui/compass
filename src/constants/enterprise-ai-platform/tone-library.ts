/**
 * Tone Library — curated enterprise messaging (CO-AI-104 DIE).
 * The LLM must not invent emotional responses; resolve from this catalogue.
 */

import type { EaiToneCategoryId, EaiToneEntry } from "@/types/enterprise-ai-domain-governance";

export const EAI_TONE_LIBRARY: readonly EaiToneEntry[] = [
  {
    categoryId: "home_loan",
    label: "Home Loan",
    lines: ["Buying a home matters.", "Let's explore your options."],
  },
  {
    categoryId: "balance_transfer",
    label: "Balance Transfer",
    lines: ["Let's reduce your borrowing cost."],
  },
  {
    categoryId: "loan_against_property",
    label: "Loan Against Property",
    lines: ["Let's support your business growth."],
  },
  {
    categoryId: "business_loan",
    label: "Business Loan",
    lines: ["Let's grow your business finance."],
  },
  {
    categoryId: "working_capital",
    label: "Working Capital",
    lines: ["Let's strengthen your cash flow."],
  },
  {
    categoryId: "personal_loan",
    label: "Personal Loan",
    lines: ["Let's review personal loan options."],
  },
  {
    categoryId: "eligibility",
    label: "Eligibility",
    lines: ["Let me check a few details."],
  },
  {
    categoryId: "documents",
    label: "Documents",
    lines: ["One document remaining."],
  },
  {
    categoryId: "waiting",
    label: "Waiting",
    lines: ["Preparing your recommendation."],
  },
  {
    categoryId: "recommendation",
    label: "Recommendation",
    lines: ["Here is a clear next step."],
  },
  {
    categoryId: "completion",
    label: "Completion",
    lines: ["Your analysis is ready."],
  },
] as const;

export const EAI_TONE_CATEGORY_IDS: readonly EaiToneCategoryId[] = EAI_TONE_LIBRARY.map(
  (e) => e.categoryId,
);

/** Topic id → tone category mapping for Domain Boundary hits. */
export const EAI_TOPIC_TO_TONE: Partial<Record<string, EaiToneCategoryId>> = {
  home_loan: "home_loan",
  balance_transfer: "balance_transfer",
  lap: "loan_against_property",
  business_loan: "business_loan",
  working_capital: "working_capital",
  personal_loan: "personal_loan",
  loan_eligibility: "eligibility",
  loan_documentation: "documents",
  document_request: "documents",
};
