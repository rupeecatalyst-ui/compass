import type { DiscoveryStepId } from "@/config/compass-lending-products";
import { COMPASS_PRODUCT_LABELS } from "@/config/compass-lending-products";

export type { DiscoveryStepId };
export { COMPASS_PRODUCT_LABELS };

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
  "Application",
] as const;

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
  // Widget range only. Approved product ceilings come from Catalyst One journey config.
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
    heading: "Your details",
    helper: "We'll save your progress as you go. Email is optional.",
    fullNameLabel: "Full name",
    fullNamePlaceholder: "Your full name",
    mobileLabel: "Mobile number",
    emailLabel: "Email address (optional)",
    emailPlaceholder: "name@example.com",
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
      { id: "self-employed-business", label: "Self-Employed Business" },
      { id: "self-employed-professional", label: "Self-Employed Professional" },
    ],
  },
  monthlyIncome: {
    heading: "Monthly Income",
    helper: "Approximate monthly income in Indian Rupees.",
    min: 25_000,
    max: 10_00_000,
    default: 1_50_000,
    minLabel: "₹25,000",
    maxLabel: "₹10 Lakh",
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
  currentLender: {
    heading: "Current Lender",
    helper: "Which institution currently holds this home loan?",
    placeholder: "Search or type the current lender",
  },
  outstandingLoanAmount: {
    heading: "Outstanding Balance",
    helper: "Current outstanding on the loan being transferred.",
    min: 1_00_000,
    max: 5_00_00_000,
    default: 40_00_000,
    minLabel: "₹1 Lakh",
    maxLabel: "₹5 Crore",
    cta: "Next",
  },
  city: {
    heading: "City",
    helper: "Lending policies can vary across locations.",
    placeholder: "Search city",
    popular: ["Mumbai", "Bengaluru", "Delhi", "Pune", "Hyderabad", "Chennai", "Gurugram", "Noida"],
  },
  approxCibilScore: {
    heading: "Expected CIBIL Score",
    helper:
      "Approximate CIBIL score helps improve lender recommendations and eligibility assessment. If unknown, select 'Not Known'. This is a self-declared estimate, not a bureau-verified score.",
    cta: "Next",
  },
  propertyUsage: {
    heading: "Property Usage",
    helper: "How is the property currently used?",
    options: [
      { id: "self-occupied", label: "Self occupied" },
      { id: "rented", label: "Rented" },
      { id: "vacant", label: "Vacant" },
      { id: "commercial", label: "Commercial" },
    ],
  },
  loanPurpose: {
    heading: "Loan Purpose",
    helper: "This helps us understand how you plan to use the funds.",
    placeholder: "e.g. Medical, Education, Travel",
  },
  companyName: {
    heading: "Business Name",
    helper: "Registered or trading name of the borrowing entity.",
    placeholder: "Company / firm name",
  },
  constitution: {
    heading: "Constitution",
    helper: "Legal structure of the business.",
    options: [
      { id: "proprietorship", label: "Proprietorship" },
      { id: "partnership", label: "Partnership" },
      { id: "llp", label: "LLP" },
      { id: "private_limited", label: "Private Limited" },
      { id: "public_limited", label: "Public Limited" },
    ],
  },
  annualTurnover: {
    heading: "Annual Turnover",
    helper: "Approximate turnover for the last financial year.",
    min: 10_00_000,
    max: 100_00_00_000,
    default: 2_00_00_000,
    minLabel: "₹10 Lakh",
    maxLabel: "₹100 Crore",
    cta: "Next",
  },
  facilityType: {
    heading: "Facility Type",
    helper: "Choose the working capital facility you need.",
    options: [
      { id: "cash_credit", label: "Cash Credit" },
      { id: "overdraft", label: "Overdraft" },
      { id: "working_capital_term_loan", label: "Working Capital Term Loan" },
    ],
  },
  projectCost: {
    heading: "Project Cost",
    helper: "Estimated total cost of the project.",
    min: 50_00_000,
    max: 500_00_00_000,
    default: 10_00_00_000,
    minLabel: "₹50 Lakh",
    maxLabel: "₹500 Crore",
    cta: "Next",
  },
  advantage: {
    heading: "COMPASS Advantage",
    requestedAmountLabel: "Requested loan amount",
    resultTitle: "Your COMPASS Advantage",
    eligibilityNote:
      "You will be eligible for this COMPASS Advantage amount after successful disbursal of this transaction.",
    showMatches: "View Matches",
    loading: "Preparing your Advantage...",
  },
  lenders: {
    heading: "Your Matches",
    subtitle: "Shortlisted for your profile — revealed one at a time.",
    continueCta: "Continue to Documents",
  },
  documents: {
    heading: "Documents",
    subtitle: "Upload your documents folder or add files one by one.",
    folderCta: "Upload folder",
    folderHelper: "Select a folder from your device — we will map files into your application.",
    itemCta: "Upload file",
    completionLabel: "Document completion",
    mandatoryPending: "mandatory pending",
    loading: "Loading your document checklist...",
    continueCta: "Review application",
  },
  review: {
    heading: "Review your application",
    subtitle: "Confirm your details before final submission.",
    productLabel: "Product",
    answersLabel: "Your details",
    recommendationsLabel: "Lender guidance",
    documentsLabel: "Documents",
    advantageLabel: "COMPASS Advantage",
    submitCta: "Submit application",
    submitting: "Submitting...",
  },
  confirmation: {
    heading: "Application received",
    referenceLabel: "Reference",
    nextStepsTitle: "What happens next",
    doneCta: "Done",
    sarathiCta: "Talk to Sarathi",
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
  "approxCibilScore",
  "analysing",
  "advantage",
  "lenders",
  "documents",
  "review",
  "confirmation",
];

export function stepToStageIndex(step: DiscoveryStepId): number {
  switch (step) {
    case "welcome":
    case "propertyType":
    case "propertyUsage":
    case "facilityType":
      return 0;
    case "loanAmount":
    case "propertyValue":
    case "projectCost":
    case "currentLender":
    case "outstandingLoanAmount":
      return 1;
    case "incomeType":
    case "monthlyIncome":
    case "existingEmi":
    case "loanPurpose":
    case "companyName":
    case "constitution":
    case "annualTurnover":
    case "approxCibilScore":
      return 2;
    case "mobile":
    case "city":
      return 3;
    case "analysing":
    case "advantage":
    case "lenders":
      return 4;
    case "documents":
    case "review":
    case "confirmation":
      return 5;
    default:
      return 0;
  }
}
