import { ROUTES, coachRoute, toolRoute } from "@/constants/routes";

export const mainNavigation = [
  { label: "Home Loan", href: ROUTES.HOME_LOAN },
  { label: "Coaches", href: ROUTES.COACHES },
  { label: "Tools", href: ROUTES.TOOLS },
  { label: "About", href: ROUTES.ABOUT },
  { label: "Contact", href: ROUTES.CONTACT },
] as const;

export const footerNavigation = {
  products: [
    { label: "Home Loan", href: ROUTES.HOME_LOAN },
    { label: "Business Loan", href: coachRoute("business-loan") },
    { label: "Loan Against Property", href: coachRoute("loan-against-property") },
    { label: "Personal Loan", href: coachRoute("personal-loan") },
    { label: "Construction Finance", href: coachRoute("construction-finance") },
    { label: "Working Capital", href: coachRoute("working-capital") },
  ],
  company: [
    { label: "About", href: ROUTES.ABOUT },
    { label: "Coaches", href: ROUTES.COACHES },
    { label: "Contact", href: ROUTES.CONTACT },
    { label: "Financial Fitness", href: toolRoute("financial-fitness-calculator") },
  ],
  resources: [
    { label: "Financial Tools", href: ROUTES.TOOLS },
    { label: "Knowledge Centre", href: ROUTES.RESOURCES },
    { label: "Loan Products", href: ROUTES.LOAN_PRODUCTS },
    { label: "Sarathi", href: `${ROUTES.HOME_LOAN}#sarathi` },
  ],
} as const;
