export const homeLoanExperience = {
  hero: {
    headline: "Find your best way home.",
    supporting: "We'll guide you every step of the way.",
    primaryCta: "Discover My Advantage",
    secondaryCta: "Talk to Sarathi",
  },
  intro: {
    lines: [
      "Buying a home is exciting.",
      "It is also one of the biggest financial decisions of your life.",
      "You don't have to make it alone.",
    ],
  },
  fitness: {
    eyebrow: "Financial fitness",
    headline: "Let's understand where you stand.",
    subheadline: "One question at a time. No forms. Just clarity.",
    questions: [
      {
        id: "timeline",
        prompt: "When are you hoping to buy?",
        options: [
          { id: "3m", label: "Within 3 months", score: 85 },
          { id: "6m", label: "Within 6 months", score: 75 },
          { id: "1y", label: "Within a year", score: 65 },
          { id: "exploring", label: "Still exploring", score: 50 },
        ],
      },
      {
        id: "readiness",
        prompt: "How prepared do you feel today?",
        options: [
          { id: "ready", label: "Ready to move forward", score: 90 },
          { id: "mostly", label: "Mostly prepared", score: 72 },
          { id: "learning", label: "Still learning", score: 58 },
          { id: "early", label: "Just starting out", score: 42 },
        ],
      },
      {
        id: "savings",
        prompt: "Do you have savings for a down payment?",
        options: [
          { id: "yes-strong", label: "Yes — substantial savings", score: 88 },
          { id: "yes-some", label: "Yes — some savings", score: 70 },
          { id: "building", label: "Building savings now", score: 55 },
          { id: "unsure", label: "Not sure yet", score: 40 },
        ],
      },
      {
        id: "clarity",
        prompt: "How clear are you on monthly affordability?",
        options: [
          { id: "very", label: "Very clear", score: 92 },
          { id: "somewhat", label: "Somewhat clear", score: 68 },
          { id: "rough", label: "Rough idea only", score: 50 },
          { id: "unclear", label: "Still unclear", score: 35 },
        ],
      },
    ],
    gaugeLabels: {
      low: "Building clarity",
      mid: "Growing confidence",
      high: "Strong readiness",
    },
  },
  advantage: {
    eyebrow: "Your advantage",
    headline: "See what becomes possible.",
    subheadline: "Adjust the numbers. Watch your picture sharpen.",
    fields: {
      loanAmount: { label: "Loan amount", placeholder: "50,00,000", default: "5000000" },
      income: { label: "Monthly income", placeholder: "1,50,000", default: "150000" },
      propertyValue: { label: "Property value", placeholder: "75,00,000", default: "7500000" },
      existingEmi: { label: "Existing EMI", placeholder: "0", default: "0" },
      city: { label: "City", placeholder: "Mumbai" },
    },
    outputs: {
      eligibility: "Eligibility outlook",
      emi: "Estimated EMI",
      affordability: "Monthly comfort",
      fitnessScore: "Financial Fitness Score",
      confidence: "Confidence",
    },
  },
  bestMatch: {
    eyebrow: "Best match",
    headline: "Lenders chosen for you — not at random.",
    subheadline: "Every match comes with a reason.",
    matches: [
      {
        id: "best",
        tier: "Best Match",
        lender: "Lender A",
        rate: "8.35%",
        why: "Strong profile fit, competitive rate, and flexible tenure for your income band.",
        emphasis: "primary" as const,
      },
      {
        id: "strong",
        tier: "Strong Match",
        lender: "Lender B",
        rate: "8.50%",
        why: "Excellent for salaried profiles in your city with faster processing timelines.",
        emphasis: "accent" as const,
      },
      {
        id: "alt",
        tier: "Alternative Match",
        lender: "Lender C",
        rate: "8.65%",
        why: "Worth considering if you value relationship banking and branch-led support.",
        emphasis: "default" as const,
      },
    ],
  },
  journey: {
    eyebrow: "Your journey",
    headline: "Always know what comes next.",
    subheadline: "A calm path from first question to keys in hand.",
    stages: [
      {
        id: "discover",
        label: "Discover",
        title: "Understand your position",
        description: "We learn your goals, income, and comfort — before any lender conversation.",
        status: "complete" as const,
      },
      {
        id: "strategy",
        label: "Strategy",
        title: "Build your loan strategy",
        description: "Tenure, structure, and lender fit — shaped to your life, not a template.",
        status: "active" as const,
      },
      {
        id: "match",
        label: "Match",
        title: "Find your best lender",
        description: "We shortlist lenders who genuinely suit your profile and property.",
        status: "upcoming" as const,
      },
      {
        id: "prepare",
        label: "Prepare",
        title: "Documents, guided",
        description: "Clear checklist. No surprises. We walk through every paper with you.",
        status: "upcoming" as const,
      },
      {
        id: "execute",
        label: "Execute",
        title: "Apply with confidence",
        description: "Dedicated support through approval, valuation, and disbursement.",
        status: "upcoming" as const,
      },
    ],
  },
  documents: {
    eyebrow: "Documents",
    headline: "We'll guide you through every document.",
    subheadline: "No upload pressure. Just clarity on what you'll need — and when.",
    checklist: [
      { id: "identity", label: "Identity proof", detail: "Aadhaar, PAN — the basics, explained simply." },
      { id: "income", label: "Income documents", detail: "Salary slips or ITR — matched to your employment type." },
      { id: "property", label: "Property papers", detail: "Agreement, NOC, or builder docs — depending on your purchase." },
      { id: "banking", label: "Bank statements", detail: "Typically 6 months — we tell you exactly what lenders look for." },
      { id: "photos", label: "Photographs", detail: "Passport-size — a small detail, handled early." },
    ],
  },
  trust: {
    eyebrow: "Trust",
    headline: "Guidance you can verify.",
    subheadline: "We don't inflate numbers to impress you.",
    pillars: [
      {
        title: "No hidden agenda",
        body: "We are not paid to push a lender. Your fit comes first.",
      },
      {
        title: "Transparent trade-offs",
        body: "Rate, tenure, fees — explained plainly so you choose with eyes open.",
      },
      {
        title: "Human when it matters",
        body: "Sarathi and our specialists step in when complexity needs a conversation.",
      },
    ],
  },
  finalCta: {
    headline: "Find your best way home.",
    cta: "Discover My Advantage",
    empathy: "You've already invested so much — you deserve clarity before the next step.",
  },
} as const;

export type FitnessQuestionId = (typeof homeLoanExperience.fitness.questions)[number]["id"];
