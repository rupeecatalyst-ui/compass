import type { ProductConversationConfig } from "@/config/product-conversation-types";

export const businessLoanConversation: ProductConversationConfig = {
  welcome: {
    greeting: "Welcome!",
    headline: "Let's discover your business loan strategy together.",
    body: "A few strategic questions — like a conversation with your business banking advisor. No lengthy forms.",
    note: "This takes about a minute.",
    cta: "Let's begin",
  },
  analysis: {
    title: "Analysing your business profile...",
    steps: [
      "Understanding your growth intent",
      "Mapping cash flow patterns",
      "Building your Business Growth Strategy",
      "Matching suitable lenders",
    ],
  },
  result: {
    title: "Your Business Growth Strategy",
    cards: [
      { title: "Recommended Facility", value: "Term loan / WC blend — placeholder" },
      { title: "Suggested Lenders", value: "Lender A · Lender B · Lender C" },
      { title: "Interest Range", value: "X.XX% – X.XX%" },
      { title: "Estimated EMI", value: "₹XX,XXX / month" },
      { title: "Documentation Path", value: "GST · Financials · Bank credits" },
      { title: "Approval Confidence", value: "Moderate to High" },
    ],
  },
  steps: [
    {
      id: "purpose",
      type: "options",
      prompt: "What is the primary purpose of this loan?",
      options: [
        { id: "expansion", label: "Business expansion" },
        { id: "equipment", label: "Equipment / machinery" },
        { id: "working-capital", label: "Working capital" },
        { id: "refinance", label: "Debt consolidation" },
      ],
    },
    {
      id: "amount",
      type: "currency",
      prompt: "Roughly how much funding do you need?",
      helper: "A round figure is perfectly fine.",
      placeholder: "e.g. 50,00,000",
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
      prompt: "Great — I have enough to shape your growth strategy.",
      helper: "Whenever you're ready, I'll reveal your Business Growth Strategy.",
      cta: "Reveal My Strategy",
    },
  ],
};
