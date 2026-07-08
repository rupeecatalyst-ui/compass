export const homepageV2 = {
  hero: {
    eyebrow: "Home Loan Coach",
    headline: "We know you deserve your dream home at the best possible terms.",
    headlineLine2: "Borrow Better. Invest Smarter.",
    headlineAccent: "Build Financial Confidence.",
    subheadline:
      "COMPASS helps customers make smarter home loan decisions through financial intelligence, expert guidance and personalised recommendations — with calm clarity at every step.",
    trustIndicators: [
      { label: "100+ Lending Partners", icon: "building" as const },
      { label: "₹1000Cr+ Facilitated", icon: "trending" as const },
      { label: "20+ Years Expertise", icon: "shield" as const },
    ],
    valueProps: [
      "Eligibility intelligence before you apply",
      "Guidance on rates, terms, and lender fit",
      "Specialists for documentation and execution",
    ],
    journeyCards: {
      borrow: {
        title: "Borrow",
        subtitle: "Home loan confidence",
        description: "Make the right home loan choice with intelligent matching, expert support, and transparent execution.",
        cta: "Explore Home Loans",
      },
      invest: {
        title: "Invest",
        subtitle: "Wealth with purpose",
        description: "Mutual funds, fixed income, and goal-based planning — aligned to your financial future.",
        cta: "Explore Investing",
      },
    },
  },
  sarathi: {
    name: "Sarathi",
    title: "Your AI Financial Guide",
    description:
      "Sarathi understands your goals, analyses your position, and guides every step — coaching you forward with clarity, never complexity.",
    sampleInsight: {
      what: "Your home loan eligibility is strongest with lenders favouring salaried profiles above ₹12L annual income.",
      action: "Explore pre-qualified options before you apply.",
    },
    cta: "Meet Sarathi",
  },
  intelligenceJourney: {
    headline: "Intelligence at Every Step",
    subheadline: "Not a checklist. A thinking partner that grows with you.",
    steps: [
      { id: "understand", label: "Understand", description: "Your goals, context, and financial picture — clearly mapped." },
      { id: "analyse", label: "Analyse", description: "Deep assessment across credit, capacity, and market fit." },
      { id: "recommend", label: "Recommend", description: "Personalised paths — not generic rate tables." },
      { id: "execute", label: "Execute", description: "End-to-end support from application to disbursement." },
      { id: "grow", label: "Grow", description: "Continuous guidance as your wealth and needs evolve." },
    ],
  },
  borrow: {
    headline: "Borrow with Intelligence",
    subheadline: "Every loan product, matched to your unique profile.",
    products: [
      { id: "home-loan", label: "Home Loan", icon: "home" as const },
      { id: "business-loan", label: "Business Loan", icon: "briefcase" as const },
      { id: "lap", label: "Loan Against Property", icon: "building" as const },
      { id: "construction", label: "Construction Finance", icon: "hammer" as const },
      { id: "wc", label: "Working Capital", icon: "wallet" as const },
      { id: "personal", label: "Personal Loan", icon: "user" as const },
    ],
  },
  invest: {
    headline: "Invest with Purpose",
    subheadline: "Build wealth through disciplined, goal-aligned strategies.",
    products: [
      { id: "mf", label: "Mutual Funds", icon: "chart" as const },
      { id: "fixed", label: "Fixed Income", icon: "landmark" as const },
      { id: "advisory", label: "Wealth Advisory", icon: "gem" as const },
      { id: "goals", label: "Goal Planning", icon: "target" as const },
    ],
  },
  fitness: {
    headline: "Financial Fitness",
    subheadline: "Know your strength before you commit.",
    description:
      "Your Financial Fitness Score is an intelligent assessment of borrowing readiness — income stability, credit profile, obligations, and repayment capacity — distilled into actionable clarity.",
    dimensions: ["Income Stability", "Credit Profile", "Debt Capacity", "Repayment Strength"],
    sampleScore: 742,
    cta: "Discover Your Score",
  },
  positioning: {
    headline: "Why COMPASS Exists",
    subheadline: "The best of human guidance and digital intelligence — unified for you.",
    spectrum: [
      {
        id: "offline",
        title: "Traditional Offline Advice",
        traits: ["Personal relationships", "Deep case understanding", "Limited digital visibility"],
        highlighted: false,
      },
      {
        id: "compass",
        title: "COMPASS",
        traits: ["Human expertise", "AI intelligence", "End-to-end execution", "Transparent guidance"],
        highlighted: true,
      },
      {
        id: "digital",
        title: "Digital Marketplaces",
        traits: ["Fast comparison", "Self-service convenience", "Limited personalisation"],
        highlighted: false,
      },
    ],
  },
  trust: {
    headline: "Trusted by Thousands",
    subheadline: "Two decades of lending expertise. A new standard of intelligent guidance.",
    stats: [
      { id: "experience", value: 20, suffix: "+", label: "Years of Experience" },
      { id: "loans", value: 1000, prefix: "₹", suffix: "Cr+", label: "Loans Facilitated" },
      { id: "partners", value: 100, suffix: "+", label: "Lending Partners" },
      { id: "customers", displayValue: "10,000+", label: "Families Guided" },
    ],
    lenders: ["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak", "Bajaj Finserv", "LIC Housing", "Tata Capital"],
    testimonials: [
      {
        id: "t1",
        quote: "COMPASS helped us understand which lenders would genuinely consider our profile — before we applied anywhere.",
        author: "Priya & Rajesh S.",
        context: "Home Loan · Bengaluru",
        initials: "PR",
      },
      {
        id: "t2",
        quote: "The combination of Sarathi's guidance and a human specialist made a complex business loan feel manageable.",
        author: "Amit M.",
        context: "Business Loan · Mumbai",
        initials: "AM",
      },
      {
        id: "t3",
        quote: "Our Financial Fitness Score gave us the confidence to invest and borrow in the right sequence for our goals.",
        author: "Neha K.",
        context: "Wealth Planning · Pune",
        initials: "NK",
      },
    ],
  },
  finalCta: {
    headline: "Your Financial Future Starts Here",
    subheadline: "Join thousands who chose clarity over confusion.",
    cta: "Begin Your Journey",
  },
} as const;
