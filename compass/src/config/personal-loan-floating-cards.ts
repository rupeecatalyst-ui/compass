import { ROUTES } from "@/constants/routes";
import { discoveryLaunchUrl } from "@/discovery-template/launch-discovery";

export const PERSONAL_LOAN_ADVANTAGE_HREF = discoveryLaunchUrl(ROUTES.PERSONAL_LOAN);

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
    id: "smart-match",
    title: "Smart Lender Match",
    badge: "Intelligence",
    icon: "target" as const,
    emphasis: "accent" as const,
    animationVariant: "float-b" as const,
    items: ["Profile-based matching", "Rate and tenure fit", "Approval likelihood"],
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
