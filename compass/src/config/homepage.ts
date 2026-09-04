import {
  COMPANY_STATISTICS,
  formatCompanyStatistic,
} from "@/config/company-facts";

export const homepageV2 = {
  hero: {
    eyebrow: "Financial Discovery Platform",
    headlineLine2: "Borrow Better. Invest Smarter.",
    headlineAccent: "Build Financial Confidence.",
    subheadline:
      "COMPASS helps you find the right financial path — with intelligence, expert guidance, and calm clarity at every step.",
    trustIndicators: COMPANY_STATISTICS.map((stat) => ({
      label: formatCompanyStatistic(stat),
      icon: (stat.id === "partners" ? "building" : stat.id === "facilitated" ? "trending" : "shield") as
        | "building"
        | "trending"
        | "shield",
      tooltip: stat.label,
    })),
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
    headline: "Trusted financial advisory",
    subheadline: "Clear outcomes, measured with the same figures across COMPASS.",
    stats: COMPANY_STATISTICS.map((stat) => ({
      id: stat.id,
      displayValue: stat.value,
      label: stat.label,
    })),
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
    subheadline: "Choose clarity over confusion.",
    primaryCta: "Start Borrowing",
    secondaryCta: "Get Started",
  },
} as const;
