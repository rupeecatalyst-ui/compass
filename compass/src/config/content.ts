export const homepageContent = {
  hero: {
    eyebrow: "Not a broker. Not a comparison site. A smarter way to borrow.",
    headline: "Borrow Smarter. Borrow with Confidence.",
    subheadline:
      "AI intelligence combined with expert guidance to help you find the right borrowing solution with complete transparency.",
    primaryCta: "Start Your Journey",
    secondaryCta: "Explore Loan Products",
  },
  comparison: [
    {
      id: "brokers",
      title: "Traditional Loan Brokers",
      strengths: ["Personal relationships", "Human guidance", "Complex case handling"],
      challenges: ["Slow process", "Limited transparency", "Paper-heavy"],
      highlighted: false,
    },
    {
      id: "marketplaces",
      title: "Online Marketplaces",
      strengths: ["Digital", "Fast", "Easy comparison"],
      challenges: ["Limited personalised advice", "Generic recommendations", "Difficult complex cases"],
      highlighted: false,
    },
    {
      id: "compass",
      title: "COMPASS",
      strengths: [
        "AI-powered intelligence",
        "Human expertise",
        "Personalised borrowing journey",
        "Real lender intelligence",
        "End-to-end execution",
        "Transparent tracking",
      ],
      challenges: [] as string[],
      highlighted: true,
    },
  ],
  features: [
    {
      title: "AI Eligibility Matching",
      description: "Intelligent pre-screening across 100+ lending partners before you apply.",
    },
    {
      title: "Human Loan Specialists",
      description: "Dedicated experts for complex cases, documentation, and lender negotiations.",
    },
    {
      title: "Faster Processing",
      description: "Streamlined workflows reduce back-and-forth and accelerate lender decisions.",
    },
    {
      title: "Transparent Journey",
      description: "Every stage visible — from eligibility to disbursement — with no hidden surprises.",
    },
    {
      title: "Secure Document Vault",
      description: "Bank-grade encryption for your financial documents, accessible when you need them.",
    },
    {
      title: "Live Application Tracking",
      description: "Real-time status updates across lenders so you always know where things stand.",
    },
  ],
  journey: ["Understand", "Evaluate", "Match", "Apply", "Track", "Get Funded"],
  trustStats: [
    { value: "20+", label: "Years Experience" },
    { value: "₹1000Cr+", label: "Loans Facilitated" },
    { value: "100+", label: "Lending Partners" },
    { value: "Thousands", label: "Happy Customers" },
  ],
  finalCta: {
    headline: "Ready to Borrow Smarter?",
    subheadline: "Start your financial journey with confidence.",
    cta: "Get Started",
  },
} as const;

export const loanProducts = [
  {
    id: "home-loan",
    title: "Home Loan",
    description: "Competitive rates with guided documentation for purchase, construction, or balance transfer.",
  },
  {
    id: "business-loan",
    title: "Business Loan",
    description: "Working capital and growth financing matched to your business cash flows and lender appetite.",
  },
  {
    id: "lap",
    title: "Loan Against Property",
    description: "Unlock property value with structured tenure and lender options tailored to your profile.",
  },
  {
    id: "working-capital",
    title: "Working Capital",
    description: "Short-term liquidity solutions designed for operational continuity and seasonal demand.",
  },
  {
    id: "construction-finance",
    title: "Construction Finance",
    description: "Stage-wise disbursement support with lender coordination from approval to completion.",
  },
  {
    id: "personal-loan",
    title: "Personal Loan",
    description: "Unsecured borrowing with eligibility clarity before you commit to an application.",
  },
] as const;

export const aboutContent = {
  headline: "Built for clearer financial decisions",
  intro:
    "Borrowing in India sits between slow, opaque brokers and fast but impersonal marketplaces. COMPASS brings intelligent guidance and human expertise together — with transparency at every step.",
  pillars: [
    {
      title: "Intelligence First",
      description: "Every recommendation is shaped by real lender patterns, not generic rate tables.",
    },
    {
      title: "Human When It Matters",
      description: "Complex cases get dedicated specialists who guide documentation and execution.",
    },
    {
      title: "Transparency Always",
      description: "You understand trade-offs and next steps — without pressure or hidden surprises.",
    },
  ],
} as const;

export const contactContent = {
  headline: "We're here to guide you",
  intro: "Speak with our team about your borrowing needs — clarity first, forms later.",
} as const;

export const placeholderPages = {
  financialFitness: {
    headline: "Financial Fitness",
    description:
      "Know your borrowing strength before you apply. Your Financial Fitness Score will evaluate income stability, credit profile, and repayment capacity.",
    status: "Coming soon",
  },
  resources: {
    headline: "Resources",
    description:
      "Guides, articles, and tools to help you make informed borrowing decisions. The Knowledge Centre is being prepared.",
    status: "Coming soon",
  },
} as const;
