export const ROUTES = {
  HOME: "/",
  GET_STARTED: "/get-started",
  BORROW: "/borrow",
  INVEST: "/invest",
  HOME_LOAN: "/home-loan",
  PERSONAL_LOAN: "/personal-loan",
  BUSINESS_LOAN: "/business-loan",
  LOAN_AGAINST_PROPERTY: "/loan-against-property",
  WORKING_CAPITAL: "/working-capital",
  CONSTRUCTION_FINANCE: "/construction-finance",
  LOAN_PRODUCTS: "/loan-products",
  ABOUT: "/about",
  CONTACT: "/contact",
  FINANCIAL_FITNESS: "/financial-fitness",
  RESOURCES: "/resources",
  COACHES: "/coaches",
  TOOLS: "/tools",
} as const;

/** Maps coach slugs to dedicated product experience routes. */
export const PRODUCT_ROUTE_BY_COACH_SLUG: Record<string, string> = {
  "home-loan": ROUTES.HOME_LOAN,
  "personal-loan": ROUTES.PERSONAL_LOAN,
  "business-loan": ROUTES.BUSINESS_LOAN,
  "loan-against-property": ROUTES.LOAN_AGAINST_PROPERTY,
  "working-capital": ROUTES.WORKING_CAPITAL,
  "construction-finance": ROUTES.CONSTRUCTION_FINANCE,
};

export function coachRoute(slug: string) {
  return `/coaches/${slug}` as const;
}

export function toolRoute(slug: string) {
  return `/tools/${slug}` as const;
}
