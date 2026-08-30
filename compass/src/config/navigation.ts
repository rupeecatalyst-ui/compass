import { ROUTES, toolRoute } from "@/constants/routes";

export const mainNavigation = [
  { label: "Borrow", href: ROUTES.BORROW },
  { label: "Invest", href: ROUTES.INVEST },
  { label: "About", href: ROUTES.ABOUT },
  { label: "Contact", href: ROUTES.CONTACT },
] as const;

export const footerNavigation = {
  products: [
    { label: "Borrow", href: ROUTES.BORROW },
    { label: "Invest", href: ROUTES.INVEST },
    { label: "Home Loan", href: ROUTES.HOME_LOAN },
    { label: "Unsecured Business Loan", href: ROUTES.BUSINESS_LOAN },
    { label: "Loan Against Property", href: ROUTES.LOAN_AGAINST_PROPERTY },
    { label: "Personal Loan", href: ROUTES.PERSONAL_LOAN },
  ],
  company: [
    { label: "About", href: ROUTES.ABOUT },
    { label: "Contact", href: ROUTES.CONTACT },
    { label: "Privacy Policy", href: ROUTES.PRIVACY },
    { label: "Terms and Conditions", href: ROUTES.TERMS },
    { label: "Disclaimer", href: ROUTES.DISCLAIMER },
  ],
  resources: [
    { label: "Knowledge Centre", href: ROUTES.RESOURCES },
    { label: "Loan Products", href: ROUTES.LOAN_PRODUCTS },
    { label: "Coaches", href: ROUTES.COACHES },
    { label: "Financial Tools", href: ROUTES.TOOLS },
  ],
} as const;
