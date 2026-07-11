import { CONSTRUCTION_FINANCE_STRATEGY_HREF } from "@/config/construction-finance-landing";

export const constructionFinanceFloatingCards = [
  {
    id: "funding-strategy",
    title: "Construction Funding Strategy",
    badge: "AI Powered",
    icon: "sparkles" as const,
    emphasis: "primary" as const,
    animationVariant: "float-a" as const,
    items: ["Stage-wise planning", "Disbursement mapping", "Cost buffer guidance"],
    destination: CONSTRUCTION_FINANCE_STRATEGY_HREF,
  },
  {
    id: "project-alignment",
    title: "Project Execution",
    badge: "Intelligence",
    icon: "building" as const,
    emphasis: "accent" as const,
    animationVariant: "float-b" as const,
    items: ["Milestone tracking", "Tranche readiness", "Timeline planning"],
    destination: CONSTRUCTION_FINANCE_STRATEGY_HREF,
  },
  {
    id: "lender-match",
    title: "Construction Lender Match",
    badge: "Human Expertise",
    icon: "users" as const,
    emphasis: "default" as const,
    animationVariant: "float-c" as const,
    items: ["Documentation guidance", "Dedicated RM", "End-to-end assistance"],
    destination: CONSTRUCTION_FINANCE_STRATEGY_HREF,
  },
] as const;
