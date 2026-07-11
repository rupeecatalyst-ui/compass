import { WORKING_CAPITAL_STRATEGY_HREF } from "@/config/working-capital-landing";

export const workingCapitalFloatingCards = [
  {
    id: "liquidity",
    title: "Business Liquidity",
    badge: "AI Powered",
    icon: "chart" as const,
    emphasis: "primary" as const,
    animationVariant: "float-a" as const,
    items: ["Cash cycle analysis", "Seasonality mapping", "Liquidity headroom"],
    destination: WORKING_CAPITAL_STRATEGY_HREF,
  },
  {
    id: "funding-structure",
    title: "Funding Structure",
    badge: "Intelligence",
    icon: "trending" as const,
    emphasis: "accent" as const,
    animationVariant: "float-b" as const,
    items: ["Facility type selection", "Revolver vs. term", "Repayment alignment"],
    destination: WORKING_CAPITAL_STRATEGY_HREF,
  },
  {
    id: "optimisation",
    title: "Cash Flow Optimisation",
    badge: "Human Expertise",
    icon: "users" as const,
    emphasis: "default" as const,
    animationVariant: "float-c" as const,
    items: ["Bank limit guidance", "Documentation support", "Dedicated RM"],
    destination: WORKING_CAPITAL_STRATEGY_HREF,
  },
] as const;
