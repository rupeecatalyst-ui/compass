import { ROUTES } from "@/constants/routes";
import type { ProductLandingConfig } from "@/config/product-experience-types";
import { discoveryLaunchUrl } from "@/discovery-template/launch-discovery";

export const lapLanding: ProductLandingConfig = {
  hero: {
    eyebrow: "Loan Against Property Coach",
    headline: "Unlock property value",
    headlineAccent: "without losing clarity.",
    subheadline:
      "Answer a few thoughtful questions and we'll build your Property Funding Strategy, show how much equity you can unlock, and match you with the right lender.",
    valueProps: ["Responsible borrowing. Long-term thinking.", "Equity unlock guidance", "Premium lender matching"],
    primaryCta: "Discover My Strategy",
    primaryCtaShort: "Discover Strategy",
    secondaryCta: "Talk To Us",
    badge: "Asset backed",
  },
  metrics: {
    eyebrow: "Built for property owners",
    headline: "Strong. Premium. Secure.",
    subheadline: "Unlocking an asset you already own deserves careful, confident guidance.",
    items: [
      { id: "equity", icon: "building", displayValue: "Equity", label: "Unlock analysis" },
      { id: "ltv", icon: "shield", displayValue: "LTV", label: "Smart structuring" },
      { id: "match", icon: "target", displayValue: "Matched", label: "Best lender fit" },
      { id: "docs", icon: "file", displayValue: "Guided", label: "Documentation support" },
    ],
  },
  why: {
    eyebrow: "Why COMPASS",
    headline: "Strong · Premium · Secure",
    subheadline:
      "LAP is a long-term decision. COMPASS helps you see tenure, LTV, and end-use before you encumber what you own.",
    pillars: [
      {
        id: "equity",
        title: "Equity unlock with clarity",
        description:
          "Understand how much your property can realistically unlock — and what that means for your future plans.",
      },
      {
        id: "secure",
        title: "Responsible borrowing",
        description:
          "We help you borrow against an asset you already trust — with tenure and EMI that fit your long-term goals.",
      },
      {
        id: "strategic",
        title: "Best lender match",
        description:
          "LAP lenders differ in LTV appetite, valuation methods, and end-use flexibility. We find your fit.",
      },
    ],
  },
  questions: {
    eyebrow: "Common questions",
    headline: "Questions property owners ask",
    subheadline: "Tap a question for a clear answer — no pressure, no jargon.",
    items: [
      {
        id: "unlock",
        question: "How much can my property realistically unlock?",
        answer:
          "It depends on property type, location, existing obligations, and lender LTV norms. We help you see a realistic range before valuation.",
      },
      {
        id: "vs-sell",
        question: "Is LAP smarter than selling?",
        answer:
          "Sometimes yes — when you need liquidity without losing the asset. We help you compare the trade-offs honestly.",
      },
      {
        id: "valuation",
        question: "What happens if valuations come in low?",
        answer:
          "Lower valuations reduce eligible amount. We help you understand lender norms and alternatives before you commit.",
      },
      {
        id: "tenure",
        question: "How do tenure and EMI change the risk?",
        answer:
          "Longer tenure lowers EMI but increases total interest. We help you find a sustainable structure for your goals.",
      },
    ],
  },
  finalCta: {
    headline: "Ready for a thoughtful LAP conversation?",
    subheadline: "No long forms. Just a few questions with Sarathi.",
    cta: "Discover My Strategy",
  },
};

export const LAP_STRATEGY_HREF = discoveryLaunchUrl(ROUTES.LOAN_AGAINST_PROPERTY);
