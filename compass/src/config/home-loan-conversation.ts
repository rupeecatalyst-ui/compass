export const CITY_OPTIONS = [
  "Mumbai",
  "Navi Mumbai",
  "Thane",
  "Pune",
  "Bengaluru",
  "Chennai",
  "Hyderabad",
  "Ahmedabad",
  "Surat",
  "Delhi",
  "Noida",
  "Gurugram",
  "Faridabad",
  "Ghaziabad",
  "Jaipur",
  "Chandigarh",
  "Kolkata",
  "Indore",
  "Nagpur",
  "Kochi",
  "Coimbatore",
  "Lucknow",
  "Other city",
] as const;

export const ACKNOWLEDGEMENTS = [
  "Great choice.",
  "Perfect.",
  "That helps us understand your requirement better.",
  "Let's continue.",
  "Excellent.",
  "Almost done.",
] as const;

export type ConversationAnswers = {
  purchaseType?: "builder" | "resale";
  propertyFinalized?: "yes" | "no";
  propertyStage?: "ready" | "under-construction";
  completionPercent?: number;
  loanAmount?: string;
  profession?: "salaried" | "self-employed";
  monthlyIncome?: string;
  city?: string;
};

export type StepId =
  | "purchaseType"
  | "propertyFinalized"
  | "propertyStage"
  | "completion"
  | "loanAmount"
  | "profession"
  | "monthlyIncome"
  | "city"
  | "reveal";

export const homeLoanConversation = {
  welcome: {
    greeting: "Welcome!",
    headline: "Let's discover your home loan advantage together.",
    body: "I'll ask a few simple questions — just like a conversation with your home loan advisor. No long forms.",
    note: "This usually takes less than 2 minutes.",
    cta: "Let's begin",
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
      "A calm, personalised path shaped around your goals — placeholder guidance for now. Full intelligence will connect to the Financial Strategy Engine later.",
    lendersTitle: "Recommended Lenders",
    lenders: ["Lender A", "Lender B", "Lender C"],
    interestRange: "8.25% – 9.10%",
    estimatedEmi: "₹XX,XXX / month",
    approvalConfidence: "High",
    walletTitle: "Your Rupee Catalyst Advantage Wallet",
    walletValue: "₹XX,XXX",
    walletNote: "Placeholder estimate · Limited period offer",
  },
  steps: {
    purchaseType: {
      prompt: "How are you planning to buy your home?",
      options: [
        { id: "builder", label: "Builder Purchase" },
        { id: "resale", label: "Resale Purchase" },
      ],
    },
    propertyFinalized: {
      prompt: "Have you already finalized the property?",
      options: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
    },
    propertyStage: {
      prompt: "Is the property",
      options: [
        { id: "ready", label: "Ready to Move" },
        { id: "under-construction", label: "Under Construction" },
      ],
    },
    completion: {
      prompt: "Approximately what percentage of the project has been completed?",
      helper:
        "We ask this because under-construction home loans are usually released in stages. This helps us estimate your home loan strategy more accurately.",
    },
    loanAmount: {
      prompt: "Approximately how much home loan do you need?",
      helper: "A round figure is perfectly fine.",
      placeholder: "e.g. 75,00,000",
    },
    profession: {
      prompt: "Tell us about your profession.",
      options: [
        { id: "salaried", label: "Salaried" },
        { id: "self-employed", label: "Self-employed" },
      ],
    },
    monthlyIncome: {
      prompt: "What is your approximate monthly income?",
      helper: "This stays private — we're only building your strategy.",
      placeholder: "e.g. 1,25,000",
    },
    city: {
      prompt: "Which city is the property located in?",
      helper: "Start typing to find your city.",
      placeholder: "Search city",
    },
    reveal: {
      prompt: "We've gathered enough to shape your advantage.",
      helper: "Whenever you're ready, I'll reveal your Rupee Catalyst Advantage.",
      cta: "Reveal My Advantage",
    },
  },
} as const;

/** Resolve the next conversational step from current answers. No business logic — journey UX only. */
export function getNextStep(answers: ConversationAnswers): StepId {
  if (!answers.purchaseType) return "purchaseType";

  if (answers.purchaseType === "builder") {
    if (!answers.propertyFinalized) return "propertyFinalized";

    if (answers.propertyFinalized === "yes") {
      if (!answers.propertyStage) return "propertyStage";
      if (answers.propertyStage === "under-construction" && answers.completionPercent === undefined) {
        return "completion";
      }
    }
    // If No (or ready-to-move / completion answered) → funding
  }

  if (!answers.loanAmount) return "loanAmount";
  if (!answers.profession) return "profession";
  if (!answers.monthlyIncome) return "monthlyIncome";
  if (!answers.city) return "city";
  return "reveal";
}
