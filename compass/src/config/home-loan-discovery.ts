/** Frozen discovery orchestration — Home Loan reference implementation. */
export const DISCOVERY_QUESTION_RULE = {
  /** A question is allowed only if it changes eligibility, recommendation, calculation, or Sarathi advice. */
  mustChangeOneOf: ["eligibility", "recommendation", "calculation", "sarathiAdvice"] as const,
  /** Property intent questions (first home / investment) are excluded until they affect engine logic. */
  propertyQuestion: "propertyTypeOnly" as const,
} as const;

export const DISCOVERY_STAGES = [
  "Understanding You",
  "Your Home",
  "Financial Snapshot",
  "Personalising Results",
  "Your COMPASS Advantage",
] as const;

export type DiscoveryStepId =
  | "welcome"
  | "propertyType"
  | "loanAmount"
  | "propertyValue"
  | "mobile"
  | "incomeType"
  | "monthlyIncome"
  | "existingEmi"
  | "city"
  | "analysing"
  | "advantage"
  | "lenders";

export const ANALYSIS_PHASES = [
  {
    id: "intelligence",
    label: "Preparing Intelligence",
    messages: [
      "Preparing your COMPASS workspace...",
      "Gathering market insights...",
      "Loading product intelligence...",
      "Preparing recommendation framework...",
      "Ready to analyse your requirements...",
    ],
  },
  {
    id: "customer",
    label: "Customer Analysis",
    messages: [
      "Understanding your borrowing needs...",
      "Estimating repayment comfort...",
      "Building your financial profile...",
      "Assessing affordability...",
    ],
  },
  {
    id: "decision",
    label: "Decision Intelligence",
    messages: [
      "Comparing suitable loan products...",
      "Evaluating lender policies...",
      "Matching your profile with lending criteria...",
      "Building your COMPASS Advantage...",
    ],
  },
  {
    id: "recommendation",
    label: "Recommendation",
    messages: ["Finalising personalised recommendations...", "Your COMPASS Advantage is Ready."],
  },
] as const;

export const discoveryCopy = {
  welcome: {
    title: "Let's begin",
    subtitle: "A few calm questions — one clear path forward.",
    cta: "Begin",
  },
  propertyType: {
    heading: "Property Type",
    helper: "This shapes your loan journey — not just the numbers.",
    options: [
      { id: "ready", label: "Ready" },
      { id: "construction", label: "Construction" },
    ],
  },
  loanAmount: {
    heading: "Desired Loan",
    helper: "Tell us how much financing you're looking for.",
    min: 10_00_000,
    max: 5_00_00_000,
    default: 50_00_000,
    minLabel: "₹10 Lakh",
    maxLabel: "₹5 Crore",
    cta: "Next",
  },
  propertyValue: {
    heading: "Property Value",
    helper: "This helps us recommend a suitable loan structure.",
    min: 15_00_000,
    max: 10_00_00_000,
    default: 75_00_000,
    minLabel: "₹15 Lakh",
    maxLabel: "₹10 Crore",
    cta: "Next",
  },
  mobile: {
    heading: "Stay Connected",
    helper: "We'll save your progress as you go.",
    otpLabel: "Verification code",
    otpSuccess: "Great! Your journey has been saved.",
    cta: "Continue",
    verifyCta: "Verify",
  },
  incomeType: {
    heading: "Employment",
    helper: "This helps us understand your income source.",
    options: [
      { id: "salaried", label: "Salaried" },
      { id: "business", label: "Business" },
      { id: "professional", label: "Professional" },
    ],
  },
  monthlyIncome: {
    heading: "Monthly Income",
    helper: "We use this to estimate a comfortable monthly repayment.",
    min: 25_000,
    max: 5_00_000,
    default: 1_50_000,
    minLabel: "₹25,000",
    maxLabel: "₹5 Lakh",
    cta: "Next",
  },
  existingEmi: {
    heading: "Existing EMI",
    helper: "This helps us understand your monthly commitments.",
    min: 0,
    max: 5_00_000,
    default: 0,
    minLabel: "₹0",
    maxLabel: "₹5 Lakh",
    cta: "Next",
  },
  city: {
    heading: "Property City",
    helper: "Lending policies can vary across locations.",
    placeholder: "Search city",
    popular: ["Mumbai", "Bengaluru", "Delhi", "Pune", "Hyderabad", "Chennai", "Gurugram", "Noida"],
  },
  advantage: {
    heading: "Your COMPASS Advantage",
    showMatches: "View Matches",
    loading: "Preparing your Advantage...",
  },
  lenders: {
    heading: "Your Matches",
    subtitle: "Shortlisted for your profile — revealed one at a time.",
    reviewSarathi: "Review Sarathi",
  },
  sarathiBridge: {
    name: "Sarathi",
    title: "Your Home Loan Specialist",
    tagline: "Built with advanced intelligence.",
    taglineSub: "Designed around real people.",
  },
  application: {
    heading: "Ready Next",
    helper: "When you're comfortable, we'll guide you through the next step.",
    cta: "Begin Application",
  },
  buttons: {
    next: "Next",
    continue: "Continue",
  },
} as const;

export const DISCOVERY_STEP_ORDER: DiscoveryStepId[] = [
  "welcome",
  "propertyType",
  "loanAmount",
  "propertyValue",
  "mobile",
  "incomeType",
  "monthlyIncome",
  "existingEmi",
  "city",
  "analysing",
  "advantage",
  "lenders",
];

export function stepToStageIndex(step: DiscoveryStepId): number {
  switch (step) {
    case "welcome":
    case "propertyType":
      return 0;
    case "loanAmount":
    case "propertyValue":
      return 1;
    case "incomeType":
    case "monthlyIncome":
    case "existingEmi":
      return 2;
    case "mobile":
    case "city":
      return 3;
    case "analysing":
    case "advantage":
    case "lenders":
      return 4;
    default:
      return 0;
  }
}
