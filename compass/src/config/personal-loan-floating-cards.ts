import { ROUTES } from "@/constants/routes";

export const PERSONAL_LOAN_ADVANTAGE_HREF = `${ROUTES.PERSONAL_LOAN}#advantage-conversation` as const;

export const personalLoanFloatingCards = [
  {
    id: "instant-strategy",
    title: "Instant Loan Strategy",
    badge: "AI Powered",
    icon: "sparkles" as const,
    emphasis: "primary" as const,
    animationVariant: "float-a" as const,
    items: ["Fast eligibility assessment", "Smart lender matching", "Personalised borrowing strategy"],
    destination: PERSONAL_LOAN_ADVANTAGE_HREF,
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
    destination: PERSONAL_LOAN_ADVANTAGE_HREF,
  },
  {
    id: "fast-track",
    title: "Fast Track Assistance",
    badge: "Human Expertise",
    icon: "users" as const,
    emphasis: "default" as const,
    animationVariant: "float-c" as const,
    items: ["Dedicated Relationship Manager", "Documentation Assistance", "Quick processing", "End-to-end support"],
    destination: PERSONAL_LOAN_ADVANTAGE_HREF,
  },
] as const;

