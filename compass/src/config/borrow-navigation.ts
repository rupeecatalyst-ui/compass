import { ROUTES } from "@/constants/routes";

export type BorrowNavProduct = {
  id: string;
  label: string;
  href?: string;
  future?: boolean;
};

export type BorrowNavCategory = {
  id: string;
  emoji: string;
  title: string;
  tagline: string;
  products: readonly BorrowNavProduct[];
};

/** Borrow navigation layer — categories and products only. Psychology begins on product pages. */
export const borrowNavigation = {
  headline: "Choose a category.",
  subtext: "Select a product to begin your journey.",
} as const;

export const borrowCategories: readonly BorrowNavCategory[] = [
  {
    id: "home-loans",
    emoji: "🏠",
    title: "Home Loans",
    tagline: "Purchase and transfer with clarity.",
    products: [
      { id: "home-loan", label: "Home Loan", href: ROUTES.HOME_LOAN },
      { id: "home-loan-bt", label: "Home Loan Balance Transfer", href: ROUTES.HOME_LOAN },
    ],
  },
  {
    id: "property-loans",
    emoji: "🏢",
    title: "Property Loans",
    tagline: "Unlock value from property you own.",
    products: [
      { id: "lap", label: "Loan Against Property", href: ROUTES.LOAN_AGAINST_PROPERTY },
      { id: "lrd", label: "Lease Rental Discounting", future: true },
    ],
  },
  {
    id: "business-loans",
    emoji: "💼",
    title: "Business Loans",
    tagline: "Funding solutions for every stage.",
    products: [
      { id: "business-loan", label: "Unsecured Business Loan", href: ROUTES.BUSINESS_LOAN },
      { id: "working-capital", label: "Working Capital Loan", href: ROUTES.WORKING_CAPITAL },
      { id: "construction-finance", label: "Construction Finance", href: ROUTES.CONSTRUCTION_FINANCE },
    ],
  },
  {
    id: "vehicle-loans",
    emoji: "🚗",
    title: "Vehicle Loans",
    tagline: "Finance your next vehicle with confidence.",
    products: [
      { id: "car-loan", label: "Car Loan", href: ROUTES.PERSONAL_LOAN },
      { id: "commercial-vehicle", label: "Commercial Vehicle Loan", future: true },
    ],
  },
  {
    id: "equipment-finance",
    emoji: "⚙️",
    title: "Equipment Finance",
    tagline: "Fund the assets your business needs.",
    products: [
      { id: "machinery", label: "Machinery Loan", future: true },
      { id: "medical-equipment", label: "Medical Equipment Finance", future: true },
    ],
  },
  {
    id: "loan-against-securities",
    emoji: "📈",
    title: "Loan Against Securities",
    tagline: "Leverage your investments responsibly.",
    products: [{ id: "las", label: "Loan Against Securities", future: true }],
  },
] as const;
