/**
 * Financial Decision Intelligence constants (CO-AI-105 / Sprint AI-5).
 */

import type { EaiFdiScenario } from "@/types/enterprise-ai-financial-decision";

export const EAI_FDI_VERSION = "1.0.0-ai5";

export const EAI_FDI_DISCLAIMERS = [
  "Financial Decision Intelligence explains and recommends — it does not approve credit.",
  "Eligibility, FOIR, DBR, pricing, and lender policy remain owned by enterprise engines.",
  "FDI never performs independent financial calculations.",
  "Human review is required before any Action Proposal execution.",
] as const;

/** Topics FDI must never claim to have calculated. */
export const EAI_FDI_FORBIDDEN_CALCULATION_CLAIMS = [
  "you are eligible",
  "approved for",
  "approval granted",
  "foir calculated",
  "dbr calculated",
  "interest rate is",
  "pricing is",
  "you qualify",
  "loan sanctioned",
  "your credit score is",
] as const;

export const EAI_FDI_SCENARIO_CATALOGUE: readonly EaiFdiScenario[] = [
  {
    scenarioId: "affordability_explore",
    label: "Affordability exploration",
    purpose: "Frame affordability questions for enterprise engine inputs",
    requiredEngineInputs: ["stated_income", "existing_obligations", "requested_amount"],
    explorationQuestions: [
      "What monthly obligation is comfortable?",
      "Has income evidence been captured?",
    ],
  },
  {
    scenarioId: "balance_transfer_explore",
    label: "Balance Transfer exploration",
    purpose: "Explore BT framing without computing savings",
    requiredEngineInputs: ["outstanding_amount", "current_rate", "remaining_tenure"],
    explorationQuestions: [
      "What is the outstanding balance?",
      "What rate is currently charged?",
    ],
  },
  {
    scenarioId: "tenure_tradeoff",
    label: "Tenure trade-off",
    purpose: "Discuss tenure trade-offs; engines compute EMI",
    requiredEngineInputs: ["principal", "rate", "tenure_options"],
    explorationQuestions: [
      "Which tenure options should engines compare?",
    ],
  },
  {
    scenarioId: "top_up_explore",
    label: "Top-up exploration",
    purpose: "Explore top-up intent; engines own eligibility",
    requiredEngineInputs: ["existing_loan_ref", "requested_top_up"],
    explorationQuestions: [
      "Is there an active loan reference?",
      "What top-up amount is requested?",
    ],
  },
  {
    scenarioId: "documentation_gap",
    label: "Documentation gap",
    purpose: "Highlight missing documents from readiness projections",
    requiredEngineInputs: ["document_readiness_snapshot"],
    explorationQuestions: [
      "Which mandatory documents remain pending?",
    ],
  },
] as const;
