import { LEGAL_OPERATOR_STATEMENT, PRIMARY_TAGLINE } from "@/config/company-facts";

export const aboutPageContent = {
  eyebrow: "ABOUT RUPEE CATALYST",
  headline: "Your Financial Fitness Champion",
  tagline: PRIMARY_TAGLINE,
  introduction: [
    "Founded in 2017, Rupee Catalyst is a financial advisory and transaction-execution platform helping individuals, families and businesses make better borrowing and investment decisions.",
    "We combine experienced human judgement, an extensive financial-institution network and intelligent technology to simplify complex financial decisions. Our objective is not merely to source a financial product—it is to understand the client’s requirement, identify the appropriate strategy and remain accountable throughout execution.",
    LEGAL_OPERATOR_STATEMENT,
  ],
  whatWeDo: {
    heading: "What we do",
    items: [
      "Home Loans and Home Loan Balance Transfers",
      "Loans Against Property",
      "Personal Loans",
      "Unsecured Business Loans",
      "Working Capital and structured business finance",
      "Construction and property-backed funding",
      "Mutual Funds and investment solutions",
    ],
    supporting:
      "Our role includes requirement analysis, lender and product selection, documentation guidance, transaction coordination and ongoing human support.",
  },
  approach: {
    heading: "Our approach",
    pillars: [
      {
        title: "Understand before recommending",
        description:
          "Every transaction begins with the client’s actual financial requirement—not with a pre-selected product.",
      },
      {
        title: "Advice before application",
        description:
          "We assess the profile, objectives and available options before recommending an appropriate course of action.",
      },
      {
        title: "Transparent execution",
        description:
          "Clients receive clear guidance on documentation, process, indicative pricing, conditions and next steps.",
      },
      {
        title: "Technology with human accountability",
        description:
          "Technology supports faster analysis and structured execution, while experienced professionals remain responsible for client engagement and transaction progress.",
      },
    ],
  },
  leadership: {
    heading: "Leadership",
    people: [
      {
        id: "rahul-kapoor",
        name: "Rahul Kapoor",
        initials: "RK",
        title: "Founder & CEO · Investment Banker",
        profile: [
          "Rahul Kapoor is the Founder and CEO of Rupee Catalyst and an investment banker with 25 years of professional experience across lending, credit underwriting, risk management, investment banking and wealth management.",
          "Before establishing Rupee Catalyst, Rahul worked with leading financial institutions, including Citigroup, GE Countrywide and IIFL. At IIFL Home Loans, he served as Zonal Head for Western India.",
          "His experience covers the complete financing lifecycle—from understanding a borrower’s financial position and evaluating business requirements to structuring retail and corporate lending solutions, assessing credit risk, engaging with financial institutions and guiding transactions through execution.",
          "Rahul founded Rupee Catalyst in 2017 with the belief that financial intermediation should extend beyond product distribution. His vision was to create an institution that begins with the client’s actual requirement, applies experienced financial judgement and identifies appropriate solutions across the lending and investment ecosystem.",
        ],
        experienceHeading: "Rahul’s areas of experience include:",
        experience: [
          "Retail and corporate lending",
          "Credit underwriting and risk assessment",
          "Financial-statement analysis",
          "Structured and property-backed financing",
          "Investment banking and capital-raising solutions",
          "Wealth management and investment strategy",
          "Institutional and lender relationships",
          "Technology-led financial-services transformation",
        ],
        philosophy:
          "His leadership philosophy is grounded in long-term value creation, integrity, transparency and customer outcomes. He believes that the success of a financial-services business should be measured not merely by the value of transactions completed, but by the value and clarity created for its clients.",
        personal:
          "Beyond financial services, Rahul is a sports and fitness enthusiast who has participated in more than 20 marathon events across India.",
        quote: "Today’s creation is tomorrow’s legacy.",
      },
      {
        id: "ketan-kapoor",
        name: "Ketan Kapoor",
        initials: "KK",
        title: "Executive Director",
        profile: [
          "Ketan Kapoor is the Executive Director of Rupee Catalyst and brings 10 years of professional experience across business operations, client relationships, partner coordination and transaction execution.",
          "He plays an important role in ensuring that clients receive responsive communication, structured process management and consistent support throughout their financial journey.",
          "Ketan’s focus is on operational discipline, relationship management and effective coordination between clients, the Rupee Catalyst team and financial-institution partners.",
        ],
      },
    ],
  },
  compass: {
    heading: "COMPASS",
    copy: "COMPASS is Rupee Catalyst’s customer-facing financial discovery platform. It helps borrowers understand their requirements, explore suitable financial solutions and discover their potential COMPASS Advantage before beginning formal execution.",
  },
  closing: {
    headline: "Ready to take the next step?",
    subheadline: "Discover your potential COMPASS Advantage, or speak with an investment banker.",
  },
} as const;
