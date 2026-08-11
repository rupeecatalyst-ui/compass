/**
 * CO-AI-G2-W2 — Reference consultation fixtures for six product paths.
 * Offline scoring only.
 */

import type { EaoBenchmarkConversationInput } from "@/types/enterprise-ai-orchestrator/benchmark";

export const EAO_BENCHMARK_REFERENCE_FIXTURES: EaoBenchmarkConversationInput[] = [
  {
    conversationId: "bench_hl_001",
    productPath: "home_loan",
    scenarioLabel: "Home Loan — first home purchase",
    source: "fixture",
    turns: [
      {
        turnIndex: 0,
        customerUtterance: "I want to buy my first home in Pune.",
        assistantFacingText:
          "I'd be glad to help with your home purchase. Is this a ready property, or are you still shortlisting?",
      },
      {
        turnIndex: 1,
        customerUtterance: "Ready flat. How fast can I get a home loan?",
        assistantFacingText:
          "With complete documents, some home loan cases can move quite quickly, although timelines depend on the lender and your profile. Approximately how much funding are you looking for?",
      },
    ],
  },
  {
    conversationId: "bench_lap_001",
    productPath: "lap",
    scenarioLabel: "LAP — residential property",
    source: "fixture",
    turns: [
      {
        turnIndex: 0,
        customerUtterance: "I need a loan against property on my residential flat.",
        assistantFacingText:
          "Understood — loan against property on a residential flat. What do you intend to use the funds for?",
      },
      {
        turnIndex: 1,
        customerUtterance: "Business expansion.",
        assistantFacingText:
          "Understood — funds for business expansion. Approximately how much funding are you looking for?",
      },
    ],
  },
  {
    conversationId: "bench_bl_001",
    productPath: "business_loan",
    scenarioLabel: "Business Loan — expansion timeline",
    source: "fixture",
    turns: [
      {
        turnIndex: 0,
        customerUtterance: "How fast can I get a business loan?",
        assistantFacingText:
          "With complete documents, some business loan cases can move quite quickly, although timelines depend on the lender and your profile. Is your business a proprietorship, partnership, or private limited?",
      },
    ],
  },
  {
    conversationId: "bench_wc_001",
    productPath: "working_capital",
    scenarioLabel: "Working Capital — cash flow",
    source: "fixture",
    turns: [
      {
        turnIndex: 0,
        customerUtterance: "I need working capital for cash flow gaps.",
        assistantFacingText:
          "Working capital support is often about matching limits to cash-flow cycles. Is your business a proprietorship, partnership, or private limited?",
      },
    ],
  },
  {
    conversationId: "bench_bt_001",
    productPath: "balance_transfer",
    scenarioLabel: "Balance Transfer — reduce EMI",
    source: "fixture",
    turns: [
      {
        turnIndex: 0,
        customerUtterance: "I want a home loan balance transfer to reduce EMI.",
        assistantFacingText:
          "Balance transfer can help when the rate or EMI is no longer competitive. Which bank is your current loan with?",
      },
    ],
  },
  {
    conversationId: "bench_pl_001",
    productPath: "personal_loan",
    scenarioLabel: "Personal Loan — general need",
    source: "fixture",
    turns: [
      {
        turnIndex: 0,
        customerUtterance: "I am looking for a personal loan.",
        assistantFacingText:
          "I can help you explore a personal loan. What is the main purpose of this loan?",
      },
    ],
  },
];

/** Negative control — chatbot-like / unsafe (for framework sensitivity). */
export const EAO_BENCHMARK_NEGATIVE_FIXTURE: EaoBenchmarkConversationInput = {
  conversationId: "bench_neg_001",
  productPath: "general",
  scenarioLabel: "Negative control — generic + invented EMI",
  source: "fixture",
  turns: [
    {
      turnIndex: 0,
      customerUtterance: "How fast can I get a loan?",
      assistantFacingText:
        "Let's explore your options. Share whatever feels useful next. Your EMI will be ₹42,500 at 8.5% and you are guaranteed approved.",
    },
  ],
};
