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
  | "approxCibilScore"
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

/** Public COMPASS routes that carry the Catalyst One product identity. */
export const COMPASS_PRODUCT_HREFS: Record<CompassProductCode, string> = {
  "home-loan": "/home-loan",
  "home-loan-balance-transfer": "/home-loan?product=home-loan-balance-transfer",
  "personal-loan": "/personal-loan",
  "business-loan": "/business-loan",
  "loan-against-property": "/loan-against-property",
  "working-capital": "/working-capital",
  "construction-finance": "/construction-finance",
  "project-finance": "/construction-finance?product=project-finance",
};

/**
 * Customer-facing catalog order for the Products page.
 * Visibility is still owned by COMPASS_GATEWAY_PRODUCTS — this only ranks launched items.
 */
export const COMPASS_PRODUCTS_PAGE_ORDER: readonly CompassProductCode[] = [
  "home-loan",
  "home-loan-balance-transfer",
  "loan-against-property",
  "business-loan",
  "working-capital",
  "construction-finance",
  "project-finance",
  "personal-loan",
] as const;

export type CompassProductPageCopy = {
  positioning: string;
  benefits: readonly string[];
};

export const COMPASS_PRODUCT_PAGE_COPY: Record<CompassProductCode, CompassProductPageCopy> = {
  "home-loan": {
    positioning: "Find the right structure and lender for purchasing or constructing your home.",
    benefits: [
      "Profile-led lender matching",
      "Guided documentation",
      "COMPASS Advantage where eligible",
    ],
  },
  "home-loan-balance-transfer": {
    positioning:
      "Evaluate whether transferring your existing Home Loan can meaningfully improve the structure.",
    benefits: [
      "Rate and tenure review",
      "Top-up assessment where applicable",
      "COMPASS Advantage where eligible",
    ],
  },
  "loan-against-property": {
    positioning:
      "Unlock property value through a structure aligned with your end use and repayment capacity.",
    benefits: ["LTV-led assessment", "Tenure structuring", "Institution-fit guidance"],
  },
  "business-loan": {
    positioning: "Match business funding with turnover, cash flow and expansion requirements.",
    benefits: [
      "Secured/unsecured assessment",
      "Cash-flow-based guidance",
      "Lender appetite alignment",
    ],
  },
  "working-capital": {
    positioning:
      "Structure operating liquidity around receivables, inventory and business cash cycles.",
    benefits: ["CC/OD and facility assessment", "Cash-cycle alignment", "Banking-pattern guidance"],
  },
  "construction-finance": {
    positioning: "Plan stage-wise project funding and disbursement around execution milestones.",
    benefits: ["Project-stage assessment", "Tranche planning", "Construction-lender alignment"],
  },
  "project-finance": {
    positioning:
      "Align long-horizon project capital with execution, cash flows and lender appetite.",
    benefits: [
      "Project-stage assessment",
      "Capital-structure guidance",
      "Construction-lender alignment",
    ],
  },
  "personal-loan": {
    positioning: "Explore suitable unsecured borrowing through a short, clear discovery journey.",
    benefits: ["Profile-based assessment", "Clear repayment view", "Guided application"],
  },
};

const FUTURE_PRODUCT_SET = new Set<string>(COMPASS_FUTURE_PRODUCTS);

export function isLaunchedCompassProduct(code: string): code is CompassProductCode {
  return (COMPASS_GATEWAY_PRODUCTS as readonly string[]).includes(code) && !FUTURE_PRODUCT_SET.has(code);
}

/** Launched products only, ranked for the Products page. Future/disabled codes never appear. */
export function listVisibleCompassProducts(): CompassProductCode[] {
  const rank = new Map(COMPASS_PRODUCTS_PAGE_ORDER.map((code, index) => [code, index]));
  return COMPASS_GATEWAY_PRODUCTS.filter(isLaunchedCompassProduct).slice().sort((a, b) => {
    return (rank.get(a) ?? 100) - (rank.get(b) ?? 100);
  });
}

export function appendDiscoveryLaunch(href: string): string {
  const url = new URL(href, "https://compass.local");
  url.searchParams.set("discovery", "launch");
  return `${url.pathname}${url.search}`;
}

export function getCompassProductHref(code: CompassProductCode): string {
  return COMPASS_PRODUCT_HREFS[code];
}

export function getCompassProductExploreHref(code: CompassProductCode): string {
  return appendDiscoveryLaunch(getCompassProductHref(code));
}
