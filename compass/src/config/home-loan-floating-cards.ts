import { ROUTES } from "@/constants/routes";

/** Floating cards launch the COMPASS Discovery experience — not a page section. */
export const STRATEGY_ASSESSMENT_HREF = `${ROUTES.HOME_LOAN}?discovery=launch` as const;

export const homeLoanFloatingCards = [
  {
    id: "strategy-engine",
    title: "Financial Strategy Engine",
    badge: "AI Powered",
    icon: "sparkles" as const,
    emphasis: "primary" as const,
    animationVariant: "float-a" as const,
    items: [
      "Best Lender Match",
      "Smart Eligibility Analysis",
      "Personalized Home Loan Strategy",
    ],
    destination: STRATEGY_ASSESSMENT_HREF,
  },
  {
    id: "advantage-wallet",
    title: "Rupee Catalyst Advantage Wallet",
    subtitle: "Estimated Customer Benefit",
    badge: "Limited Period Offer",
    icon: "wallet" as const,
    emphasis: "accent" as const,
    animationVariant: "float-b" as const,
    highlightValue: "₹XX,XXX",
    highlightLabel: "Placeholder estimate",
    destination: STRATEGY_ASSESSMENT_HREF,
  },
  {
    id: "expert-selection",
    title: "Expert Lender Selection",
    badge: "Human Expertise",
    icon: "users" as const,
    emphasis: "default" as const,
    animationVariant: "float-c" as const,
    items: [
      "Multiple Lender Options",
      "Dedicated Relationship Manager",
      "Documentation Assistance",
      "End-to-End Loan Assistance",
    ],
    destination: STRATEGY_ASSESSMENT_HREF,
  },
] as const;
