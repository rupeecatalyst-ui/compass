import { ROUTES } from "@/constants/routes";
import type { ProductLandingConfig } from "@/config/product-experience-types";
import { discoveryLaunchUrl } from "@/discovery-template/launch-discovery";

export const workingCapitalLanding: ProductLandingConfig = {
  hero: {
    eyebrow: "Working Capital Coach",
    headline: "Keep operations liquid,",
    headlineAccent: "without drama.",
    subheadline:
      "Answer a few operational questions and we'll build your Liquidity Strategy, optimise your funding structure, and keep your business momentum intact.",
    valueProps: ["Operational intelligence. Dynamic clarity.", "Cash flow optimisation", "Bank limit guidance"],
    primaryCta: "Discover My Strategy",
    primaryCtaShort: "Discover Strategy",
    secondaryCta: "Talk To Us",
    badge: "Liquidity first",
  },
  metrics: {
    eyebrow: "Built for operators",
    headline: "Liquidity. Structure. Momentum.",
    subheadline: "Seasonality, receivables, and revolving needs — guided so liquidity never becomes panic.",
    items: [
      { id: "liquidity", icon: "chart", displayValue: "Liquid", label: "Cash flow view" },
      { id: "structure", icon: "trending", displayValue: "Structured", label: "Funding design" },
      { id: "limits", icon: "shield", displayValue: "Limits", label: "Bank headroom" },
      { id: "optimise", icon: "target", displayValue: "Optimised", label: "WC efficiency" },
    ],
  },
  why: {
    eyebrow: "Why COMPASS",
    headline: "Operational · Dynamic · Professional",
    subheadline:
      "Working capital is about timing — when money moves in and out. COMPASS reads your cash cycles, not just your balance sheet.",
    pillars: [
      {
        id: "liquidity",
        title: "Business liquidity clarity",
        description:
          "Understand whether your squeeze is seasonal or structural — and what facility type actually solves it.",
      },
      {
        id: "operational",
        title: "Funding structure guidance",
        description:
          "Term loan vs. revolving line vs. bill discounting — we help you pick the structure that matches your cycles.",
      },
      {
        id: "strategic",
        title: "Cash flow optimisation",
        description:
          "Beyond borrowing — we help you see headroom, bank limits, and signals that show you are over-borrowing.",
      },
    ],
  },
  questions: {
    eyebrow: "Common questions",
    headline: "Questions operators ask",
    subheadline: "Tap a question for a clear answer — no pressure, no jargon.",
    items: [
      {
        id: "seasonal",
        question: "Is my squeeze seasonal or structural?",
        answer:
          "Seasonal squeezes need revolving facilities. Structural gaps may need deeper diagnosis. We help you tell the difference.",
      },
      {
        id: "facility",
        question: "Do I need a term loan or a revolving line?",
        answer:
          "Revolving lines suit fluctuating needs. Term loans suit defined investments. We match facility to cash cycle.",
      },
      {
        id: "headroom",
        question: "How much headroom keeps me safe?",
        answer:
          "Safe headroom depends on receivable cycles, payables, and buffer for surprises. We help you model it realistically.",
      },
      {
        id: "signals",
        question: "What signals show I am over-borrowing?",
        answer:
          "Rising interest burden, dependency on informal credit, and shrinking margins are warning signs. We help you read them early.",
      },
    ],
  },
  finalCta: {
    headline: "Ready for a calmer working capital conversation?",
    subheadline: "No long forms. Just a few questions with Sarathi.",
    cta: "Discover My Strategy",
  },
};

export const WORKING_CAPITAL_STRATEGY_HREF = discoveryLaunchUrl(ROUTES.WORKING_CAPITAL);
