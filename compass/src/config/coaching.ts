export const INTELLIGENCE_ATTRIBUTION = "Powered by Catalyst One Intelligence" as const;

export type CoachSlug =
  | "home-loan"
  | "business-loan"
  | "loan-against-property"
  | "personal-loan"
  | "construction-finance"
  | "working-capital";

export type ToolSlug =
  | "compass-advantage"
  | "emi-calculator"
  | "eligibility-calculator"
  | "balance-transfer-calculator"
  | "affordability-calculator"
  | "stamp-duty-calculator"
  | "registration-calculator"
  | "financial-fitness-calculator"
  | "loan-comparison";

export const coaches = [
  {
    slug: "home-loan" as const,
    title: "Home Loan Coach",
    shortTitle: "Home Loan",
    eyebrow: "Home Loan Coach",
    headline: "We know you deserve your dream home",
    headlineAccent: "at the best possible terms.",
    subheadline:
      "A calm coaching journey for purchase, construction, and balance transfer — clarity before you apply.",
    thoughtHeadline: "Questions every homebuyer asks",
    thoughts: [
      "Can I afford my dream home?",
      "Am I paying too much interest?",
      "Can I reduce my EMI?",
      "Which lender is right for me?",
      "How much can I actually borrow?",
      "What hidden costs should I know about?",
    ],
  },
  {
    slug: "business-loan" as const,
    title: "Business Loan Coach",
    shortTitle: "Business Loan",
    eyebrow: "Business Loan Coach",
    headline: "Fund growth with structure,",
    headlineAccent: "not guesswork.",
    subheadline:
      "Understand capacity, cash-flow fit, and lender appetite before you chase the wrong facility.",
    thoughtHeadline: "Questions every business owner asks",
    thoughts: [
      "How much working capital do I really need?",
      "Will lenders understand my cash cycles?",
      "Is debt the right lever for this growth?",
      "What documents will actually unlock approval?",
      "Can I protect personal assets while borrowing?",
      "Which structure keeps repayments sustainable?",
    ],
  },
  {
    slug: "loan-against-property" as const,
    title: "Loan Against Property Coach",
    shortTitle: "Loan Against Property",
    eyebrow: "LAP Coach",
    headline: "Unlock property value",
    headlineAccent: "without losing clarity.",
    subheadline:
      "See how tenure, LTV, and end-use shape your options — before you encumber what you own.",
    thoughtHeadline: "Questions property owners ask",
    thoughts: [
      "How much can my property realistically unlock?",
      "Is LAP smarter than selling?",
      "What happens if valuations come in low?",
      "How do tenure and EMI change the risk?",
      "Will this affect my future home plans?",
      "What costs sit outside the loan amount?",
    ],
  },
  {
    slug: "personal-loan" as const,
    title: "Personal Loan Coach",
    shortTitle: "Personal Loan",
    eyebrow: "Personal Loan Coach",
    headline: "Borrow for life goals",
    headlineAccent: "with eyes open.",
    subheadline:
      "Short-tenure decisions deserve the same clarity as long ones — cost, fit, and exit plan included.",
    thoughtHeadline: "Questions personal borrowers ask",
    thoughts: [
      "Do I need this loan, or just convenience?",
      "What will the true cost look like?",
      "Can I repay comfortably on my income?",
      "Will this hurt my home loan chances later?",
      "Is a shorter tenure worth the higher EMI?",
      "Which lender fits my profile without pressure?",
    ],
  },
  {
    slug: "construction-finance" as const,
    title: "Construction Finance Coach",
    shortTitle: "Construction Finance",
    eyebrow: "Construction Finance Coach",
    headline: "Build in stages,",
    headlineAccent: "fund with discipline.",
    subheadline:
      "Stage-wise disbursement needs a coach who understands projects, not only rate sheets.",
    thoughtHeadline: "Questions builders and self-constructors ask",
    thoughts: [
      "How should disbursement track project stages?",
      "What approvals unlock the next tranche?",
      "How do cost overruns change the facility?",
      "Can I keep cash flow stable during construction?",
      "Which lenders understand my project type?",
      "What happens if timelines slip?",
    ],
  },
  {
    slug: "working-capital" as const,
    title: "Working Capital Coach",
    shortTitle: "Working Capital",
    eyebrow: "Working Capital Coach",
    headline: "Keep operations liquid,",
    headlineAccent: "without drama.",
    subheadline:
      "Seasonality, receivables, and revolving needs — guided so liquidity never becomes panic.",
    thoughtHeadline: "Questions operators ask",
    thoughts: [
      "Is my squeeze seasonal or structural?",
      "Do I need a term loan or a revolving line?",
      "How much headroom keeps me safe?",
      "Will lenders look at bank credits or books first?",
      "Can I reduce dependency on informal credit?",
      "What signals show I am over-borrowing?",
    ],
  },
] as const;

export const tools = [
  {
    slug: "compass-advantage" as const,
    title: "COMPASS Advantage",
    description: "See how informed guidance can improve your borrowing position.",
    category: "Decision",
  },
  {
    slug: "emi-calculator" as const,
    title: "EMI Calculator",
    description: "Visualise repayment with clarity — before you lock a structure.",
    category: "Calculator",
  },
  {
    slug: "eligibility-calculator" as const,
    title: "Eligibility Calculator",
    description: "Understand borrowing readiness across lender patterns.",
    category: "Calculator",
  },
  {
    slug: "balance-transfer-calculator" as const,
    title: "Balance Transfer Calculator",
    description: "Compare whether switching could meaningfully help.",
    category: "Calculator",
  },
  {
    slug: "affordability-calculator" as const,
    title: "Affordability Calculator",
    description: "Match goals to sustainable monthly capacity.",
    category: "Calculator",
  },
  {
    slug: "stamp-duty-calculator" as const,
    title: "Stamp Duty Calculator",
    description: "Surface stamp duty considerations beyond the loan amount.",
    category: "Calculator",
  },
  {
    slug: "registration-calculator" as const,
    title: "Registration Calculator",
    description: "Estimate registration costs that sit beside your loan.",
    category: "Calculator",
  },
  {
    slug: "financial-fitness-calculator" as const,
    title: "Financial Fitness Calculator",
    description: "A calm read on readiness before you apply.",
    category: "Assessment",
  },
  {
    slug: "loan-comparison" as const,
    title: "Loan Comparison",
    description: "Compare structures side by side — clarity over clutter.",
    category: "Decision",
  },
] as const;

export function getCoach(slug: string) {
  return coaches.find((coach) => coach.slug === slug);
}

export function getTool(slug: string) {
  return tools.find((tool) => tool.slug === slug);
}
