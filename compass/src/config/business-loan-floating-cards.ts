import { BUSINESS_LOAN_STRATEGY_HREF } from "@/config/business-loan-landing";

export const businessLoanFloatingCards = [
  {
    id: "growth-strategy",
    title: "Business Growth Strategy",
    badge: "AI Powered",
    icon: "sparkles" as const,
    emphasis: "primary" as const,
    animationVariant: "float-a" as const,
    items: ["Expansion planning", "Facility structure", "Lender appetite mapping"],
    destination: BUSINESS_LOAN_STRATEGY_HREF,
  },
  {
    id: "cash-flow",
    title: "Cash Flow Insights",
    badge: "Intelligence",
    icon: "chart" as const,
    emphasis: "accent" as const,
    animationVariant: "float-b" as const,
    items: ["Seasonality analysis", "Repayment capacity", "Working capital fit"],
    destination: BUSINESS_LOAN_STRATEGY_HREF,
  },
  {
    id: "expert-support",
    title: "Relationship Manager",
    badge: "Human Expertise",
    icon: "users" as const,
    emphasis: "default" as const,
    animationVariant: "float-c" as const,
    items: ["Dedicated RM", "Documentation guidance", "End-to-end assistance"],
    destination: BUSINESS_LOAN_STRATEGY_HREF,
  },
] as const;
