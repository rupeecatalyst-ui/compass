import type { ProductConversationConfig } from "@/config/product-conversation-types";

export const constructionFinanceConversation: ProductConversationConfig = {
  welcome: {
    greeting: "Welcome!",
    headline: "Let's discover your construction funding strategy together.",
    body: "A few project questions — like a conversation with your construction finance advisor. No lengthy forms.",
    note: "This takes about a minute.",
    cta: "Let's begin",
  },
  analysis: {
    title: "Analysing your project profile...",
    steps: [
      "Understanding your construction project",
      "Mapping disbursement stages",
      "Building your Construction Funding Strategy",
      "Matching suitable lenders",
    ],
  },
  result: {
    title: "Your Construction Funding Strategy",
    cards: [
      { title: "Disbursement Plan", value: "Stage-wise — placeholder" },
      { title: "Suggested Lenders", value: "Lender A · Lender B · Lender C" },
      { title: "Interest Range", value: "X.XX% – X.XX%" },
      { title: "Estimated Limit", value: "₹XX,XX,XXX" },
      { title: "Documentation Path", value: "Plans · Approvals · Progress certs" },
      { title: "Approval Confidence", value: "Moderate to High" },
    ],
  },
  steps: [
    {
      id: "project-type",
      type: "options",
      prompt: "What type of construction project is this?",
      options: [
        { id: "self-build", label: "Self-construction (own plot)" },
        { id: "builder", label: "Builder project" },
        { id: "commercial", label: "Commercial construction" },
        { id: "renovation", label: "Major renovation" },
      ],
    },
    {
      id: "amount",
      type: "currency",
      prompt: "Roughly what is the total project cost?",
      helper: "Include construction and related costs.",
      placeholder: "e.g. 1,20,00,000",
    },
    {
      id: "city",
      type: "city",
      prompt: "Where is the project located?",
      helper: "Start typing to find your city.",
      placeholder: "Search city",
    },
    {
      id: "reveal",
      type: "reveal",
      prompt: "Great — I have enough to shape your construction strategy.",
      helper: "Whenever you're ready, I'll reveal your Construction Funding Strategy.",
      cta: "Reveal My Strategy",
    },
  ],
};
