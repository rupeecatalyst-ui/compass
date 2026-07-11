import type { ProductConversationConfig } from "@/config/product-conversation-types";

export const lapConversation: ProductConversationConfig = {
  welcome: {
    greeting: "Welcome!",
    headline: "Let's discover your property funding strategy together.",
    body: "A few thoughtful questions — like a conversation with your property finance advisor. No lengthy forms.",
    note: "This takes about a minute.",
    cta: "Let's begin",
  },
  analysis: {
    title: "Analysing your property profile...",
    steps: [
      "Understanding your property and intent",
      "Estimating equity unlock potential",
      "Building your Property Funding Strategy",
      "Matching suitable lenders",
    ],
  },
  result: {
    title: "Your Property Funding Strategy",
    cards: [
      { title: "Estimated Unlock", value: "₹XX,XX,XXX — placeholder" },
      { title: "Suggested Lenders", value: "Lender A · Lender B · Lender C" },
      { title: "Interest Range", value: "X.XX% – X.XX%" },
      { title: "Suggested Tenure", value: "XX years" },
      { title: "Documentation Path", value: "Property papers · Income proof" },
      { title: "Approval Confidence", value: "Moderate to High" },
    ],
  },
  steps: [
    {
      id: "property-type",
      type: "options",
      prompt: "What type of property do you want to mortgage?",
      options: [
        { id: "residential", label: "Residential" },
        { id: "commercial", label: "Commercial" },
        { id: "industrial", label: "Industrial" },
        { id: "mixed", label: "Mixed use" },
      ],
    },
    {
      id: "amount",
      type: "currency",
      prompt: "Roughly how much funding do you need?",
      helper: "A round figure is perfectly fine.",
      placeholder: "e.g. 75,00,000",
    },
    {
      id: "city",
      type: "city",
      prompt: "Where is the property located?",
      helper: "Start typing to find your city.",
      placeholder: "Search city",
    },
    {
      id: "reveal",
      type: "reveal",
      prompt: "Great — I have enough to shape your funding strategy.",
      helper: "Whenever you're ready, I'll reveal your Property Funding Strategy.",
      cta: "Reveal My Strategy",
    },
  ],
};
