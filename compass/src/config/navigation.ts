import { ROUTES } from "@/constants/routes";

export const mainNavigation = [
  { label: "Home Loan", href: ROUTES.HOME_LOAN },
  { label: "Loan Products", href: ROUTES.LOAN_PRODUCTS },
  { label: "About", href: ROUTES.ABOUT },
  { label: "Resources", href: ROUTES.RESOURCES },
  { label: "Contact", href: ROUTES.CONTACT },
] as const;

export const footerNavigation = {
  products: [
    { label: "Home Loan", href: ROUTES.HOME_LOAN },
    { label: "Business Loan", href: ROUTES.LOAN_PRODUCTS },
    { label: "Loan Against Property", href: ROUTES.LOAN_PRODUCTS },
    { label: "Personal Loan", href: ROUTES.LOAN_PRODUCTS },
  ],
  company: [
    { label: "About", href: ROUTES.ABOUT },
    { label: "Why COMPASS", href: `${ROUTES.HOME_LOAN}#why-compass` },
    { label: "Contact", href: ROUTES.CONTACT },
    { label: "Financial Fitness", href: ROUTES.FINANCIAL_FITNESS },
  ],
  resources: [
    { label: "Knowledge Centre", href: ROUTES.RESOURCES },
    { label: "Financial Tools", href: `${ROUTES.HOME_LOAN}#tools` },
    { label: "Sarathi", href: `${ROUTES.HOME_LOAN}#sarathi` },
  ],
} as const;
