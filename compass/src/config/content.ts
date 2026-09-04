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
      description: "Intelligent pre-screening across 40+ lending partners before you apply.",
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
    { value: "₹2,500+ Crore", label: "Business Facilitated" },
    { value: "1,000+", label: "Clients Served" },
    { value: "40+", label: "Lending Partners" },
    { value: "Since 2017", label: "Financial Advisory" },
  ],
  finalCta: {
    headline: "Ready to Borrow Smarter?",
    subheadline: "Start your financial journey with confidence.",
    cta: "Get Started",
  },
} as const;

export const aboutContent = {
  headline: "Your Financial Fitness Champion",
  intro:
    "Founded in 2017, Rupee Catalyst is a financial advisory and transaction-execution platform helping individuals, families and businesses make better borrowing and investment decisions.",
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
