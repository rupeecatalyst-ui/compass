export const ROUTES = {
  HOME: "/",
  HOME_LOAN: "/home-loan",
  PERSONAL_LOAN: "/personal-loan",
  LOAN_PRODUCTS: "/loan-products",
  ABOUT: "/about",
  CONTACT: "/contact",
  FINANCIAL_FITNESS: "/financial-fitness",
  RESOURCES: "/resources",
  COACHES: "/coaches",
  TOOLS: "/tools",
} as const;

export function coachRoute(slug: string) {
  return `/coaches/${slug}` as const;
}

export function toolRoute(slug: string) {
  return `/tools/${slug}` as const;
}
