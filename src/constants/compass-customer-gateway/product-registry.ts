/**
 * COMPASS Customer Gateway — canonical product registry.
 *
 * Business semantics (codes, secured/unsecured, catalog membership) come from
 * Enterprise Product Master. This module only maps COMPASS journey slugs onto
 * those catalog entries and records journey presentation flags.
 *
 * Inactive / future COMPASS surfaces stay listed here so routing can reject
 * them explicitly instead of collapsing onto Home Loan.
 */

import { getCanonicalProductByCode } from "@/constants/enterprise-product-master/canonical-catalog";

export const COMPASS_ACTIVE_PRODUCT_CODES = [
  "home-loan",
  "home-loan-balance-transfer",
  "personal-loan",
  "business-loan",
  "loan-against-property",
  "working-capital",
  "construction-finance",
  "project-finance",
] as const;

export type CompassProductCode = (typeof COMPASS_ACTIVE_PRODUCT_CODES)[number];

export const COMPASS_FUTURE_PRODUCT_CODES = [
  "vehicle-loan",
  "commercial-vehicle-loan",
  "lease-rental-discounting",
  "equipment-finance",
  "loan-against-securities",
] as const;

export type CompassFutureProductCode = (typeof COMPASS_FUTURE_PRODUCT_CODES)[number];

export type CompassBorrowerKind = "individual" | "company";

export type CompassProductDefinition = {
  compassCode: CompassProductCode;
  enterpriseProductCode: string;
  productLabel: string;
  transactionType: "fresh" | "balance_transfer";
  isSecured: boolean;
  borrowerKind: CompassBorrowerKind;
  /** IDC family key consumed by resolveProductFieldFamily. */
  idcProductFamily: string;
  compassPath: string;
  advantageEnabled: boolean;
  hasPropertyFields: boolean;
  hasBusinessFields: boolean;
  hasProjectFields: boolean;
  hasFacilityFields: boolean;
  status: "active";
};

function fromCatalog(
  compassCode: CompassProductCode,
  enterpriseProductCode: string,
  rest: Omit<
    CompassProductDefinition,
    "compassCode" | "enterpriseProductCode" | "productLabel" | "isSecured" | "status"
  >,
): CompassProductDefinition {
  const catalog = getCanonicalProductByCode(enterpriseProductCode);
  if (!catalog) {
    throw new Error(`Enterprise Product Master has no entry for ${enterpriseProductCode}`);
  }
  return {
    compassCode,
    enterpriseProductCode: catalog.code,
    productLabel: catalog.label,
    isSecured: catalog.isSecured,
    status: "active",
    ...rest,
  };
}

export const COMPASS_PRODUCT_REGISTRY: readonly CompassProductDefinition[] = [
  fromCatalog("home-loan", "HOME_LOAN", {
    transactionType: "fresh",
    borrowerKind: "individual",
    idcProductFamily: "HOME_LOAN",
    compassPath: "/home-loan",
    advantageEnabled: true,
    hasPropertyFields: true,
    hasBusinessFields: false,
    hasProjectFields: false,
    hasFacilityFields: false,
  }),
  fromCatalog("home-loan-balance-transfer", "HOME_LOAN_BT", {
    transactionType: "balance_transfer",
    borrowerKind: "individual",
    idcProductFamily: "HOME_LOAN",
    compassPath: "/home-loan?product=home-loan-balance-transfer",
    advantageEnabled: true,
    hasPropertyFields: true,
    hasBusinessFields: false,
    hasProjectFields: false,
    hasFacilityFields: false,
  }),
  fromCatalog("personal-loan", "PERSONAL_LOAN", {
    transactionType: "fresh",
    borrowerKind: "individual",
    idcProductFamily: "PERSONAL_LOAN",
    compassPath: "/personal-loan",
    advantageEnabled: false,
    hasPropertyFields: false,
    hasBusinessFields: false,
    hasProjectFields: false,
    hasFacilityFields: false,
  }),
  fromCatalog("business-loan", "BUSINESS_LOAN_UNSECURED", {
    transactionType: "fresh",
    borrowerKind: "company",
    idcProductFamily: "BUSINESS_LOAN",
    compassPath: "/business-loan",
    advantageEnabled: false,
    hasPropertyFields: false,
    hasBusinessFields: true,
    hasProjectFields: false,
    hasFacilityFields: false,
  }),
  fromCatalog("loan-against-property", "LAP", {
    transactionType: "fresh",
    borrowerKind: "individual",
    idcProductFamily: "LAP",
    compassPath: "/loan-against-property",
    advantageEnabled: false,
    hasPropertyFields: true,
    hasBusinessFields: false,
    hasProjectFields: false,
    hasFacilityFields: false,
  }),
  fromCatalog("working-capital", "WORKING_CAPITAL_SECURED", {
    transactionType: "fresh",
    borrowerKind: "company",
    idcProductFamily: "WORKING_CAPITAL",
    compassPath: "/working-capital",
    advantageEnabled: false,
    hasPropertyFields: false,
    hasBusinessFields: true,
    hasProjectFields: false,
    hasFacilityFields: true,
  }),
  fromCatalog("construction-finance", "CONSTRUCTION_FINANCE", {
    transactionType: "fresh",
    borrowerKind: "company",
    idcProductFamily: "CONSTRUCTION_FINANCE",
    compassPath: "/construction-finance",
    advantageEnabled: false,
    hasPropertyFields: false,
    hasBusinessFields: true,
    hasProjectFields: true,
    hasFacilityFields: false,
  }),
  fromCatalog("project-finance", "PROJECT_FINANCE", {
    transactionType: "fresh",
    borrowerKind: "company",
    idcProductFamily: "CONSTRUCTION_FINANCE",
    compassPath: "/construction-finance?product=project-finance",
    advantageEnabled: false,
    hasPropertyFields: false,
    hasBusinessFields: true,
    hasProjectFields: true,
    hasFacilityFields: false,
  }),
];

const BY_COMPASS_CODE = new Map(
  COMPASS_PRODUCT_REGISTRY.map((entry) => [entry.compassCode, entry] as const),
);

const FUTURE_SET = new Set<string>(COMPASS_FUTURE_PRODUCT_CODES);

export function isCompassProductCode(value: string | null | undefined): value is CompassProductCode {
  return Boolean(value && BY_COMPASS_CODE.has(value as CompassProductCode));
}

export function isCompassFutureProductCode(value: string | null | undefined): boolean {
  return Boolean(value && FUTURE_SET.has(value));
}

export function getCompassProductDefinition(
  code: CompassProductCode,
): CompassProductDefinition {
  const entry = BY_COMPASS_CODE.get(code);
  if (!entry) {
    throw new Error(`Unknown COMPASS product: ${code}`);
  }
  return entry;
}

export function classifyCompassProductParam(value: string | null | undefined):
  | { kind: "active"; code: CompassProductCode }
  | { kind: "future"; code: string }
  | { kind: "invalid" } {
  const raw = value?.trim() ?? "";
  if (!raw) return { kind: "invalid" };
  if (isCompassProductCode(raw)) return { kind: "active", code: raw };
  if (isCompassFutureProductCode(raw)) return { kind: "future", code: raw };
  return { kind: "invalid" };
}

export function parseActiveCompassProductCode(
  value: string | null | undefined,
): CompassProductCode | null {
  const classified = classifyCompassProductParam(value);
  return classified.kind === "active" ? classified.code : null;
}

export const COMPASS_PRODUCT_TO_ENTERPRISE: Record<
  CompassProductCode,
  { productCode: string; productLabel: string; transactionType: "fresh" | "balance_transfer" }
> = Object.fromEntries(
  COMPASS_PRODUCT_REGISTRY.map((entry) => [
    entry.compassCode,
    {
      productCode: entry.enterpriseProductCode,
      productLabel: entry.productLabel,
      transactionType: entry.transactionType,
    },
  ]),
) as Record<
  CompassProductCode,
  { productCode: string; productLabel: string; transactionType: "fresh" | "balance_transfer" }
>;

/** Working Capital facility options — catalog products, not invented underwriting. */
export const COMPASS_WORKING_CAPITAL_FACILITIES = [
  { value: "cash_credit", label: "Cash Credit", enterpriseProductCode: "CASH_CREDIT" },
  { value: "overdraft", label: "Overdraft", enterpriseProductCode: "OVERDRAFT" },
  {
    value: "working_capital_term_loan",
    label: "Working Capital Term Loan",
    enterpriseProductCode: "WORKING_CAPITAL_SECURED",
  },
] as const;
