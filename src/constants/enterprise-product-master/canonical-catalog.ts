/**
 * CO-ADMIN-005 / CO-ADMIN-006 — Canonical Enterprise Product Master catalog.
 * Fallback SSOT for dropdowns when registry API is unavailable.
 * Durable SSOT remains EnterpriseProduct via /api/product-registry.
 */

export type ProductCustomerSegment =
  | "salaried"
  | "self_employed"
  | "professional"
  | "business"
  | "msme"
  | "company"
  | "nri"
  | "all";

export interface CanonicalProductMasterEntry {
  code: string;
  label: string;
  description: string;
  sortOrder: number;
  isSecured: boolean;
  customerSegment: ProductCustomerSegment[];
  categoryCode: string;
  groupCode: string;
  /** Legacy aliases normalized into this code for continuity. */
  aliases?: string[];
}

/** Initial product seed — CO-ADMIN-006 taxonomy (Loan Products / Secured Loans / …). */
export const CANONICAL_PRODUCT_MASTER_SEED: CanonicalProductMasterEntry[] = [
  {
    code: "HOME_LOAN",
    label: "Home Loan",
    description: "Residential home purchase / construction financing.",
    sortOrder: 10,
    isSecured: true,
    customerSegment: ["salaried", "self_employed", "nri"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "HOUSING_LOANS",
    aliases: ["home_loan", "HL"],
  },
  {
    code: "HOME_LOAN_BT",
    label: "Home Loan Balance Transfer",
    description: "Balance transfer of an existing home loan.",
    sortOrder: 20,
    isSecured: true,
    customerSegment: ["salaried", "self_employed", "nri"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "HOUSING_LOANS",
    aliases: ["home_loan_bt"],
  },
  {
    code: "LAP",
    label: "Loan Against Property (LAP)",
    description: "Secured loan against residential or commercial property.",
    sortOrder: 30,
    isSecured: true,
    customerSegment: ["salaried", "self_employed", "business"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "SECURED_LOANS",
    aliases: ["lap", "loan_against_property"],
  },
  {
    code: "COMM_PURCHASE",
    label: "Commercial Purchase",
    description: "Purchase financing for commercial property.",
    sortOrder: 40,
    isSecured: true,
    customerSegment: ["business", "msme", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "SECURED_LOANS",
    aliases: [
      "COMMERCIAL_PURCHASE",
      "commercial_property",
      "commercial_purchase",
      "COMM_PURCHASE",
    ],
  },
  {
    code: "COMMERCIAL_MORTGAGE",
    label: "Commercial Mortgage",
    description: "Mortgage against commercial real estate.",
    sortOrder: 50,
    isSecured: true,
    customerSegment: ["business", "self_employed", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "SECURED_LOANS",
  },
  {
    code: "WORKING_CAPITAL_SECURED",
    label: "Working Capital (Secured)",
    description: "Secured working capital facilities.",
    sortOrder: 60,
    isSecured: true,
    customerSegment: ["business", "msme", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "MSME_LOANS",
    aliases: ["working_capital", "WORKING_CAPITAL"],
  },
  {
    code: "WORKING_CAPITAL_UNSECURED",
    label: "Working Capital (Unsecured)",
    description: "Unsecured working capital facilities.",
    sortOrder: 70,
    isSecured: false,
    customerSegment: ["business", "msme", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "MSME_LOANS",
  },
  {
    code: "BUSINESS_LOAN_UNSECURED",
    label: "Business Loan (Unsecured)",
    description: "Unsecured term business loan.",
    sortOrder: 80,
    isSecured: false,
    customerSegment: ["business", "msme", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "UNSECURED_LOANS",
    aliases: ["business_loan", "BUSINESS_LOAN", "UNSECURED_BUSINESS_LOAN", "business_loan_unsecured"],
  },
  {
    code: "CONSTRUCTION_FINANCE",
    label: "Construction Finance",
    description: "Project construction / builder finance.",
    sortOrder: 90,
    isSecured: true,
    customerSegment: ["business", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "CORPORATE_LOANS",
    aliases: ["construction_finance", "construction_funding"],
  },
  {
    code: "LRD",
    label: "Lease Rental Discounting (LRD)",
    description: "Finance against lease rental receivables.",
    sortOrder: 100,
    isSecured: true,
    customerSegment: ["business", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "CORPORATE_LOANS",
    aliases: ["lrd", "lease_rental_discounting"],
  },
  {
    code: "PROJECT_FINANCE",
    label: "Project Finance",
    description: "Long-term project financing.",
    sortOrder: 110,
    isSecured: true,
    customerSegment: ["business", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "CORPORATE_LOANS",
  },
  {
    code: "PERSONAL_LOAN",
    label: "Personal Loan",
    description: "Unsecured personal loan.",
    sortOrder: 120,
    isSecured: false,
    customerSegment: ["salaried", "professional"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "UNSECURED_LOANS",
    aliases: ["personal_loan"],
  },
  {
    code: "EDUCATION_LOAN",
    label: "Education Loan",
    description: "Education financing for students.",
    sortOrder: 130,
    isSecured: false,
    customerSegment: ["salaried", "all"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "UNSECURED_LOANS",
    aliases: ["education_loan"],
  },
  {
    code: "DOCTOR_LOAN",
    label: "Doctor Loan",
    description: "Professional loan for medical practitioners.",
    sortOrder: 140,
    isSecured: false,
    customerSegment: ["professional"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "PROFESSIONAL_LOANS",
  },
  {
    code: "PROFESSIONAL_LOAN",
    label: "Professional Loan",
    description: "Loan for qualified professionals (CA, CS, architects, etc.).",
    sortOrder: 150,
    isSecured: false,
    customerSegment: ["professional"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "PROFESSIONAL_LOANS",
  },
];

export function listCanonicalProductOptions(enabledOnly = true) {
  return CANONICAL_PRODUCT_MASTER_SEED.map((p) => ({
    code: p.code,
    label: p.label,
    isSecured: p.isSecured,
    sortOrder: p.sortOrder,
    enabled: true as boolean,
  })).filter((p) => (enabledOnly ? p.enabled : true));
}

/** Resolve any legacy / alias code to the canonical Product Master code. */
export function resolveCanonicalProductCode(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const normalized = raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_-]/g, "");
  for (const entry of CANONICAL_PRODUCT_MASTER_SEED) {
    if (entry.code === normalized) return entry.code;
    if (entry.aliases?.some((a) => a.toUpperCase().replace(/\s+/g, "_") === normalized)) {
      return entry.code;
    }
  }
  return normalized;
}

export function getCanonicalProductByCode(code: string | null | undefined) {
  const resolved = resolveCanonicalProductCode(code);
  if (!resolved) return null;
  return CANONICAL_PRODUCT_MASTER_SEED.find((p) => p.code === resolved) ?? null;
}
