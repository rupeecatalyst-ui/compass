export const homepageV2 = {
  hero: {
    eyebrow: "Financial Discovery Platform",
    headlineLine2: "Borrow Better. Invest Smarter.",
    headlineAccent: "Build Financial Confidence.",
    subheadline:
      "COMPASS helps you find the right financial path — with intelligence, expert guidance, and calm clarity at every step.",
    trustIndicators: [
      {
        label: "40+ Lending Partners",
        icon: "building" as const,
        tooltip: "Leading Banks, HFCs & NBFCs",
      },
      {
        label: "₹2,500+ Crores Facilitated",
        icon: "trending" as const,
        tooltip: "Across Home Loans, LAP & Business Loans",
      },
      {
        label: "1,100+ Families Guided",
        icon: "shield" as const,
        tooltip: "Helping customers make confident financial decisions",
      },
      {
        label: "15+ Years of Expertise",
        icon: "shield" as const,
        tooltip: "Trusted lending advisory experience",
      },
    ],
    journeyCards: {
      borrow: {
        title: "Borrow",
        subtitle: "Borrowing goals",
        description:
          "Choose your goal. We'll recommend the right strategy before recommending a lender.",
        cta: "Explore Borrowing",
      },
      invest: {
        title: "Invest",
        subtitle: "Wealth with purpose",
        description:
          "Goal-aligned investing — mutual funds, fixed income, and wealth planning.",
        cta: "Explore Investing",
      },
    },
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
    subheadline: "Start with your goal — not a product catalogue.",
    cta: "Choose Your Goal",
  },
  invest: {
    headline: "Invest with Purpose",
    subheadline: "Build wealth through disciplined, goal-aligned strategies.",
    cta: "Choose Your Goal",
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
    primaryCta: "Start Borrowing",
    secondaryCta: "Get Started",
  },
} as const;
