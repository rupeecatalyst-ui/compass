import type { ProductConversationConfig } from "@/config/product-conversation-types";

export const workingCapitalConversation: ProductConversationConfig = {
  welcome: {
    greeting: "Welcome!",
    headline: "Let's discover your working capital strategy together.",
    body: "A few operational questions — like a conversation with your business banking advisor. No lengthy forms.",
    note: "This takes about a minute.",
    cta: "Let's begin",
  },
  analysis: {
    title: "Analysing your cash flow profile...",
    steps: [
      "Understanding your liquidity needs",
      "Mapping cash cycle patterns",
      "Building your Funding Structure",
      "Matching suitable lenders",
    ],
  },
  result: {
    title: "Your Working Capital Strategy",
    cards: [
      { title: "Recommended Facility", value: "CC / OD / Bill discounting — placeholder" },
      { title: "Suggested Lenders", value: "Lender A · Lender B · Lender C" },
      { title: "Interest Range", value: "X.XX% – X.XX%" },
      { title: "Suggested Limit", value: "₹XX,XX,XXX" },
      { title: "Cash Flow Insight", value: "Seasonal pattern detected — placeholder" },
      { title: "Approval Confidence", value: "Moderate to High" },
    ],
  },
  steps: [
    {
      id: "need",
      type: "options",
      prompt: "What best describes your liquidity need?",
      options: [
        { id: "seasonal", label: "Seasonal cash squeeze" },
        { id: "receivables", label: "Receivables gap" },
        { id: "inventory", label: "Inventory funding" },
        { id: "expansion", label: "Operational expansion" },
      ],
    },
    {
      id: "amount",
      type: "currency",
      prompt: "Roughly how much working capital do you need?",
      helper: "A round figure is perfectly fine.",
      placeholder: "e.g. 25,00,000",
    },
    {
      id: "city",
      type: "city",
      prompt: "Where is your business based?",
      helper: "Start typing to find your city.",
      placeholder: "Search city",
    },
    {
      id: "reveal",
      type: "reveal",
      prompt: "Great — I have enough to shape your liquidity strategy.",
      helper: "Whenever you're ready, I'll reveal your Working Capital Strategy.",
      cta: "Reveal My Strategy",
    },
  ],
};
