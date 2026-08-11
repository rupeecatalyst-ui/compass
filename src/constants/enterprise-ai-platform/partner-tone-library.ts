/**
 * Partner Tone Library — professional advisory copy (CO-AI-112).
 * Customer-facing Tone Library lines must never be used for Wealth Partner.
 */

import type { EaiToneCategoryId, EaiToneEntry } from "@/types/enterprise-ai-domain-governance";

export const EAI_PARTNER_TONE_LIBRARY_VERSION = "1.0.0-ai12";

/**
 * Parallel catalogue keyed by the same topic categories.
 * Lines are business-focused and advisory — never warm consumer copy.
 */
export const EAI_PARTNER_TONE_LIBRARY: readonly EaiToneEntry[] = [
  {
    categoryId: "home_loan",
    label: "Home Loan (Partner)",
    lines: ["Home loan briefing ready.", "Review case parameters next."],
  },
  {
    categoryId: "balance_transfer",
    label: "Balance Transfer (Partner)",
    lines: ["BT opportunity identified.", "Confirm outstanding and EMI."],
  },
  {
    categoryId: "loan_against_property",
    label: "LAP (Partner)",
    lines: ["LAP case requires structure review."],
  },
  {
    categoryId: "business_loan",
    label: "Business Loan (Partner)",
    lines: ["Business finance case noted."],
  },
  {
    categoryId: "working_capital",
    label: "Working Capital (Partner)",
    lines: ["Working capital brief prepared."],
  },
  {
    categoryId: "personal_loan",
    label: "Personal Loan (Partner)",
    lines: ["Personal loan parameters under review."],
  },
  {
    categoryId: "eligibility",
    label: "Eligibility (Partner)",
    lines: ["Eligibility inputs required."],
  },
  {
    categoryId: "documents",
    label: "Documents (Partner)",
    lines: ["Document checklist incomplete."],
  },
  {
    categoryId: "waiting",
    label: "Waiting (Partner)",
    lines: ["Preparing partner recommendation."],
  },
  {
    categoryId: "recommendation",
    label: "Recommendation (Partner)",
    lines: ["Recommended partner next step."],
  },
  {
    categoryId: "completion",
    label: "Completion (Partner)",
    lines: ["Partner analysis complete."],
  },
] as const;

export const EAI_PARTNER_TONE_CATEGORY_IDS: readonly EaiToneCategoryId[] =
  EAI_PARTNER_TONE_LIBRARY.map((e) => e.categoryId);
