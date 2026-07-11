import { LAP_STRATEGY_HREF } from "@/config/lap-landing";

export const lapFloatingCards = [
  {
    id: "funding-strategy",
    title: "Property Funding Strategy",
    badge: "AI Powered",
    icon: "sparkles" as const,
    emphasis: "primary" as const,
    animationVariant: "float-a" as const,
    items: ["LTV analysis", "Tenure structuring", "End-use planning"],
    destination: LAP_STRATEGY_HREF,
  },
  {
    id: "equity-unlock",
    title: "Equity Unlock",
    badge: "Intelligence",
    icon: "building" as const,
    emphasis: "accent" as const,
    animationVariant: "float-b" as const,
    items: ["Property valuation guide", "Eligible amount estimate", "Risk assessment"],
    destination: LAP_STRATEGY_HREF,
  },
  {
    id: "lender-match",
    title: "Best Lender Match",
    badge: "Human Expertise",
    icon: "users" as const,
    emphasis: "default" as const,
    animationVariant: "float-c" as const,
    items: ["Documentation guidance", "Dedicated RM", "End-to-end assistance"],
    destination: LAP_STRATEGY_HREF,
  },
] as const;
