import { ROUTES } from "@/constants/routes";

export const mainNavigation = [
  { label: "Loan Products", href: ROUTES.LOAN_PRODUCTS },
  { label: "Financial Fitness", href: ROUTES.FINANCIAL_FITNESS },
  { label: "About", href: ROUTES.ABOUT },
  { label: "Resources", href: ROUTES.RESOURCES },
  { label: "Contact", href: ROUTES.CONTACT },
] as const;

export const footerNavigation = {
  products: [
    { label: "Home Loan", href: ROUTES.LOAN_PRODUCTS },
    { label: "Business Loan", href: ROUTES.LOAN_PRODUCTS },
    { label: "Loan Against Property", href: ROUTES.LOAN_PRODUCTS },
    { label: "Personal Loan", href: ROUTES.LOAN_PRODUCTS },
  ],
  company: [
    { label: "About", href: ROUTES.ABOUT },
    { label: "Contact", href: ROUTES.CONTACT },
    { label: "Financial Fitness", href: ROUTES.FINANCIAL_FITNESS },
  ],
  resources: [
    { label: "Knowledge Centre", href: ROUTES.RESOURCES },
    { label: "Borrowing Guides", href: ROUTES.RESOURCES },
  ],
} as const;
