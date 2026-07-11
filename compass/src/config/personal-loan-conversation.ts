export const PERSONAL_LOAN_ACKS = [
  "Great choice.",
  "Perfect.",
  "That helps.",
  "Got it.",
  "Excellent.",
  "Almost done.",
] as const;

export type PersonalLoanAnswers = {
  intent?: "education" | "travel" | "wedding" | "renovation" | "lifestyle";
  amount?: string;
  city?: string;
};

export type PersonalLoanStepId = "intent" | "amount" | "city" | "reveal";

export const personalLoanConversation = {
  welcome: {
    greeting: "Welcome!",
    headline: "Let's discover your personal loan strategy together.",
    body: "Just a few quick questions — like a calm chat with your loan advisor. No long forms.",
    note: "This takes about a minute.",
    cta: "Let's begin",
  },
  analysis: {
    title: "Analysing your profile...",
    steps: [
      "Understanding your requirement",
      "Finding suitable lenders",
      "Building your Personal Loan Strategy",
      "Preparing your strategy summary",
    ],
  },
  result: {
    title: "Your Personal Loan Strategy",
    cards: [
      { title: "Personal Loan Strategy", value: "Placeholder guidance" },
      { title: "Recommended Lenders", value: "Lender A · Lender B · Lender C" },
      { title: "Interest Range", value: "X.XX% – X.XX%" },
      { title: "Estimated EMI", value: "₹XX,XXX / month" },
      { title: "Quick Eligibility", value: "High" },
      { title: "Approval Confidence", value: "High" },
    ],
  },
  steps: {
    intent: {
      prompt: "What are you planning this loan for?",
      options: [
        { id: "education", label: "Education" },
        { id: "travel", label: "Travel" },
        { id: "wedding", label: "Wedding" },
        { id: "renovation", label: "Home renovation" },
        { id: "lifestyle", label: "Lifestyle purchase" },
      ],
    },
    amount: {
      prompt: "Roughly how much do you need?",
      helper: "A round figure is perfectly fine.",
      placeholder: "e.g. 5,00,000",
    },
    city: {
      prompt: "Which city are you based in?",
      helper: "Start typing to find your city.",
      placeholder: "Search city",
    },
    reveal: {
      prompt: "Great — I have enough to shape your strategy.",
      helper: "Whenever you're ready, I'll reveal your Personal Loan Strategy.",
      cta: "Reveal My Strategy",
    },
  },
} as const;

export function getPersonalLoanNextStep(answers: PersonalLoanAnswers): PersonalLoanStepId {
  if (!answers.intent) return "intent";
  if (!answers.amount) return "amount";
  if (!answers.city) return "city";
  return "reveal";
}
