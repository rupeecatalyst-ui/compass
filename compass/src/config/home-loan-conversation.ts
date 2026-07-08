export const homeLoanConversation = {
  welcome: {
    greeting: "Welcome!",
    headline: "Let's discover your home loan advantage together.",
    body: "I'll ask you a few simple questions to understand your requirement and recommend the best strategy for you.",
    note: "This usually takes less than 2 minutes.",
    cta: "Begin conversation",
  },
  journey: [
    { id: "discover", label: "Discover Your Advantage" },
    { id: "build", label: "Build Your Strategy" },
    { id: "reveal", label: "Reveal Your Advantage" },
    { id: "welcome", label: "Welcome to the Rupee Catalyst Advantage" },
  ],
  analysis: {
    title: "Analysing your profile...",
    steps: [
      "Understanding your requirement",
      "Finding suitable lenders",
      "Building your financial strategy",
      "Preparing your Advantage Wallet",
    ],
  },
  result: {
    title: "Welcome to the Rupee Catalyst Advantage",
    strategyTitle: "Your Home Loan Strategy",
    strategySummary:
      "A calm, personalised path shaped around your goals — placeholder guidance only. Full intelligence arrives via Catalyst One later.",
    lendersTitle: "Recommended Lenders",
    lenders: ["Lender A", "Lender B", "Lender C"],
    interestRange: "8.25% – 9.10%",
    estimatedEmi: "₹XX,XXX / month",
    approvalConfidence: "High",
    walletTitle: "Your Rupee Catalyst Advantage Wallet",
    walletValue: "₹XX,XXX",
    walletNote: "Placeholder estimate · Limited period offer",
  },
  questions: [
    {
      id: "intent",
      prompt: "What brings you here today?",
      helper: "There's no wrong answer — this just helps us start in the right place.",
      options: [
        { id: "buy", label: "I'm looking to buy a home" },
        { id: "transfer", label: "I want to transfer my existing loan" },
        { id: "explore", label: "I'm still exploring my options" },
      ],
    },
    {
      id: "city",
      prompt: "Which city are you planning for?",
      helper: "A rough sense of location is enough for now.",
      options: [
        { id: "mumbai", label: "Mumbai" },
        { id: "bengaluru", label: "Bengaluru" },
        { id: "delhi-ncr", label: "Delhi NCR" },
        { id: "pune", label: "Pune" },
        { id: "other", label: "Another city" },
      ],
    },
    {
      id: "budget",
      prompt: "Roughly what home price range are you considering?",
      helper: "Think in comfortable ranges — not exact figures.",
      options: [
        { id: "under-50", label: "Under ₹50L" },
        { id: "50-1cr", label: "₹50L – ₹1 Cr" },
        { id: "1-2cr", label: "₹1 Cr – ₹2 Cr" },
        { id: "above-2", label: "Above ₹2 Cr" },
      ],
    },
    {
      id: "income",
      prompt: "How do you mainly earn today?",
      helper: "This helps match lenders who understand your profile.",
      options: [
        { id: "salaried", label: "Salaried" },
        { id: "business", label: "Business / Self-employed" },
        { id: "both", label: "A mix of both" },
      ],
    },
    {
      id: "timing",
      prompt: "When are you hoping to move forward?",
      helper: "No pressure — just so we pace the guidance well.",
      options: [
        { id: "asap", label: "As soon as possible" },
        { id: "1-3", label: "In the next 1–3 months" },
        { id: "later", label: "Still deciding the timeline" },
      ],
    },
  ],
} as const;
