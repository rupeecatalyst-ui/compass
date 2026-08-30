/**
 * COMPASS presentation metadata for Catalyst One gateway products.
 * Business codes and secured/unsecured flags are owned by Catalyst One.
 * This file only describes COMPASS routes, copy, and discovery step order.
 */

export const COMPASS_GATEWAY_PRODUCTS = [
  "home-loan",
  "home-loan-balance-transfer",
  "personal-loan",
  "business-loan",
  "loan-against-property",
  "working-capital",
  "construction-finance",
  "project-finance",
] as const;

export type CompassProductCode = (typeof COMPASS_GATEWAY_PRODUCTS)[number];

export const COMPASS_FUTURE_PRODUCTS = [
  "vehicle-loan",
  "commercial-vehicle-loan",
  "lease-rental-discounting",
  "equipment-finance",
  "loan-against-securities",
] as const;

export const COMPASS_PRODUCT_LABELS: Record<CompassProductCode, string> = {
  "home-loan": "New Home Loan",
  "home-loan-balance-transfer": "Home Loan Balance Transfer",
  "personal-loan": "Personal Loan",
  "business-loan": "Business Loan",
  "loan-against-property": "Loan Against Property",
  "working-capital": "Working Capital",
  "construction-finance": "Construction Finance",
  "project-finance": "Project Finance",
};

export const COMPASS_PATH_TO_PRODUCT: Record<string, CompassProductCode> = {
  "/home-loan": "home-loan",
  "/personal-loan": "personal-loan",
  "/business-loan": "business-loan",
  "/loan-against-property": "loan-against-property",
  "/working-capital": "working-capital",
  "/construction-finance": "construction-finance",
};

const HL_STEPS = [
  "welcome",
  "propertyType",
  "loanAmount",
  "propertyValue",
  "mobile",
  "incomeType",
  "monthlyIncome",
  "existingEmi",
  "city",
  "analysing",
  "advantage",
  "lenders",
  "documents",
  "review",
  "confirmation",
] as const;

export type DiscoveryStepId = (typeof HL_STEPS)[number] | ExtraDiscoveryStepId;

type ExtraDiscoveryStepId =
  | "propertyUsage"
  | "loanPurpose"
  | "companyName"
  | "constitution"
  | "annualTurnover"
  | "facilityType"
  | "projectCost"
  | "currentLender"
  | "outstandingLoanAmount";

const TAIL = ["analysing", "lenders", "documents", "review", "confirmation"] as const;

export function getDiscoveryStepOrder(productCode: CompassProductCode): DiscoveryStepId[] {
  switch (productCode) {
    case "home-loan":
      return [...HL_STEPS];
    case "home-loan-balance-transfer":
      return [
        "welcome",
        "propertyType",
        "loanAmount",
        "propertyValue",
        "currentLender",
        "outstandingLoanAmount",
        "mobile",
        "incomeType",
        "monthlyIncome",
        "existingEmi",
        "city",
        "analysing",
        "advantage",
        "lenders",
        "documents",
        "review",
        "confirmation",
      ];
    case "personal-loan":
      return [
        "welcome",
        "loanAmount",
        "mobile",
        "incomeType",
        "monthlyIncome",
        "existingEmi",
        "loanPurpose",
        "city",
        ...TAIL,
      ];
    case "loan-against-property":
      return [
        "welcome",
        "propertyUsage",
        "loanAmount",
        "propertyValue",
        "mobile",
        "incomeType",
        "monthlyIncome",
        "existingEmi",
        "city",
        ...TAIL,
      ];
    case "business-loan":
      return [
        "welcome",
        "loanAmount",
        "mobile",
        "companyName",
        "constitution",
        "annualTurnover",
        "city",
        ...TAIL,
      ];
    case "working-capital":
      return [
        "welcome",
        "facilityType",
        "loanAmount",
        "mobile",
        "companyName",
        "constitution",
        "annualTurnover",
        "city",
        ...TAIL,
      ];
    case "construction-finance":
    case "project-finance":
      return [
        "welcome",
        "loanAmount",
        "projectCost",
        "mobile",
        "companyName",
        "constitution",
        "city",
        ...TAIL,
      ];
    default:
      return [...HL_STEPS];
  }
}

export function getPersistedDiscoveryAnswerKeys(productCode: CompassProductCode): readonly string[] {
  const keys = new Set<string>(["loanAmount", "mobile", "otpVerified", "city"]);
  switch (productCode) {
    case "home-loan":
      keys.add("propertyType");
      keys.add("propertyValue");
      keys.add("incomeType");
      keys.add("monthlyIncome");
      keys.add("existingEmi");
      break;
    case "home-loan-balance-transfer":
      keys.add("propertyType");
      keys.add("propertyValue");
      keys.add("currentLender");
      keys.add("outstandingLoanAmount");
      keys.add("incomeType");
      keys.add("monthlyIncome");
      keys.add("existingEmi");
      break;
    case "personal-loan":
      keys.add("incomeType");
      keys.add("monthlyIncome");
      keys.add("existingEmi");
      keys.add("loanPurpose");
      break;
    case "loan-against-property":
      keys.add("propertyUsage");
      keys.add("propertyValue");
      keys.add("incomeType");
      keys.add("monthlyIncome");
      keys.add("existingEmi");
      break;
    case "business-loan":
      keys.add("companyName");
      keys.add("constitution");
      keys.add("annualTurnover");
      break;
    case "working-capital":
      keys.add("facilityType");
      keys.add("companyName");
      keys.add("constitution");
      keys.add("annualTurnover");
      break;
    case "construction-finance":
    case "project-finance":
      keys.add("projectCost");
      keys.add("companyName");
      keys.add("constitution");
      break;
    default:
      break;
  }
  return [...keys];
}

export function productShowsPropertyPreview(productCode: CompassProductCode): boolean {
  return (
    productCode === "home-loan" ||
    productCode === "home-loan-balance-transfer" ||
    productCode === "loan-against-property"
  );
}

export function productShowsAdvantage(productCode: CompassProductCode): boolean {
  return productCode === "home-loan" || productCode === "home-loan-balance-transfer";
}

export function readProductCodeFromPathname(
  pathname: string,
  search: string,
): CompassProductCode {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const queried = params.get("product");
  if (queried === "home-loan-balance-transfer") return "home-loan-balance-transfer";
  if (queried === "project-finance") return "project-finance";
  const path = pathname.replace(/\/$/, "") || "/";
  return COMPASS_PATH_TO_PRODUCT[path] ?? "home-loan";
}

export function productCodeFromRoute(route: string): CompassProductCode {
  const [path, query = ""] = route.split("?");
  return readProductCodeFromPathname(path, query);
}

export function resolveLaunchProductCode(productPath: string): CompassProductCode {
  if (typeof window !== "undefined") {
    const pathOnly = productPath.split("?")[0];
    const current = window.location.pathname.replace(/\/$/, "") || "/";
    const target = pathOnly.replace(/\/$/, "") || "/";
    if (current === target) {
      return readProductCodeFromPathname(window.location.pathname, window.location.search);
    }
  }
  return productCodeFromRoute(productPath);
}
