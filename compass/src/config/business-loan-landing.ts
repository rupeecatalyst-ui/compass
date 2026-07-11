import { ROUTES } from "@/constants/routes";
import type { ProductLandingConfig } from "@/config/product-experience-types";
import { discoveryLaunchUrl } from "@/discovery-template/launch-discovery";

export const businessLoanLanding: ProductLandingConfig = {
  hero: {
    eyebrow: "Business Loan Coach",
    headline: "Fund growth with structure,",
    headlineAccent: "not guesswork.",
    subheadline:
      "Answer a few strategic questions and we'll build your Business Growth Strategy, match lenders to your cash flows, and guide your expansion with confidence.",
    valueProps: ["Executive guidance. Strategic clarity.", "Cash flow insights", "Corporate-grade lender matching"],
    primaryCta: "Discover My Strategy",
    primaryCtaShort: "Discover Strategy",
    secondaryCta: "Talk To Us",
    badge: "Growth focused",
  },
  metrics: {
    eyebrow: "Built for business",
    headline: "Strategic financing. Operational clarity.",
    subheadline: "Growth decisions deserve the same rigour as your business plan.",
    items: [
      { id: "strategy", icon: "briefcase", displayValue: "Strategic", label: "Growth planning" },
      { id: "cashflow", icon: "chart", displayValue: "Cash Flow", label: "Insight driven" },
      { id: "rm", icon: "headset", displayValue: "Dedicated", label: "Relationship support" },
      { id: "docs", icon: "file", displayValue: "Guided", label: "Documentation path" },
    ],
  },
  why: {
    eyebrow: "Why COMPASS",
    headline: "Executive · Corporate · Strategic",
    subheadline:
      "Business loans are not personal loans at scale. COMPASS understands capacity, cash cycles, and lender appetite.",
    pillars: [
      {
        id: "growth",
        title: "Growth with structure",
        description:
          "We map your expansion goals to the right facility — term loan, working capital, or a blended structure.",
      },
      {
        id: "executive",
        title: "Executive-level guidance",
        description:
          "Dedicated relationship managers who understand business banking, not just rate sheets.",
      },
      {
        id: "strategic",
        title: "Strategic lender matching",
        description:
          "Different lenders suit different business profiles. We find the fit that respects your cash flows.",
      },
    ],
  },
  questions: {
    eyebrow: "Common questions",
    headline: "Questions every business owner asks",
    subheadline: "Tap a question for a clear answer — no pressure, no jargon.",
    items: [
      {
        id: "capacity",
        question: "How much can my business realistically borrow?",
        answer:
          "Capacity depends on cash flows, existing obligations, and lender appetite for your sector. We help you see a realistic range before you apply.",
      },
      {
        id: "structure",
        question: "Term loan or working capital — which do I need?",
        answer:
          "It depends on the use — asset purchase vs. operational liquidity. We help you choose the structure that keeps repayments sustainable.",
      },
      {
        id: "documents",
        question: "What documents will unlock approval?",
        answer:
          "GST returns, bank statements, financials, and business continuity proof. We guide you on what matters for your lender profile.",
      },
      {
        id: "timeline",
        question: "How long does business loan approval take?",
        answer:
          "Timelines vary by lender and documentation readiness. Our goal is to reduce back-and-forth and keep your growth on track.",
      },
    ],
  },
  finalCta: {
    headline: "Ready for a strategic business loan conversation?",
    subheadline: "No long forms. Just a few questions with Sarathi.",
    cta: "Discover My Strategy",
  },
};

export const BUSINESS_LOAN_STRATEGY_HREF = discoveryLaunchUrl(ROUTES.BUSINESS_LOAN);
