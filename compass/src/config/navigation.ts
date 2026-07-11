import { ROUTES, toolRoute } from "@/constants/routes";

export const mainNavigation = [
  { label: "Borrow", href: ROUTES.BORROW },
  { label: "Invest", href: ROUTES.INVEST },
  { label: "Coaches", href: ROUTES.COACHES },
  { label: "Tools", href: ROUTES.TOOLS },
  { label: "About", href: ROUTES.ABOUT },
  { label: "Contact", href: ROUTES.CONTACT },
] as const;

export const footerNavigation = {
  products: [
    { label: "Borrow", href: ROUTES.BORROW },
    { label: "Invest", href: ROUTES.INVEST },
    { label: "Home Loan", href: ROUTES.HOME_LOAN },
    { label: "Business Loan", href: ROUTES.BUSINESS_LOAN },
    { label: "Loan Against Property", href: ROUTES.LOAN_AGAINST_PROPERTY },
    { label: "Personal Loan", href: ROUTES.PERSONAL_LOAN },
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
    { label: "Sarathi", href: `${ROUTES.BORROW}` },
  ],
} as const;
