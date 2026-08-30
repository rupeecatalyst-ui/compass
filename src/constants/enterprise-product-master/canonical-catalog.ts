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
  /**
   * Approved maximum requested amount in integer rupees.
   * Omit until Product Owner approves a ceiling — never invent one.
   */
  maxRequestedAmountRupees?: number;
  /** Customer-facing “up to” phrasing family when a ceiling exists. */
  requestedAmountLimitKind?: "loan" | "funding";
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
    aliases: [
      "home_loan",
      "HL",
      "HL_STD",
      "HOME-LOAN",
      "home-loan",
      "prod_001",
    ],
    maxRequestedAmountRupees: 10_00_00_000,
    requestedAmountLimitKind: "loan",
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
    aliases: ["home_loan_bt", "HOME-LOAN-BT"],
    maxRequestedAmountRupees: 10_00_00_000,
    requestedAmountLimitKind: "loan",
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
    aliases: [
      "lap",
      "loan_against_property",
      "LAP_STD",
      "loan-against-property",
    ],
    maxRequestedAmountRupees: 25_00_00_000,
    requestedAmountLimitKind: "funding",
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
    aliases: ["working_capital", "WORKING_CAPITAL", "WC_STD", "working-capital"],
    maxRequestedAmountRupees: 50_00_00_000,
    requestedAmountLimitKind: "funding",
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
    label: "Unsecured Business Loan",
    description: "Unsecured term business loan.",
    sortOrder: 80,
    isSecured: false,
    customerSegment: ["business", "msme", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "UNSECURED_LOANS",
    aliases: [
      "business_loan",
      "BUSINESS_LOAN",
      "UNSECURED_BUSINESS_LOAN",
      "business_loan_unsecured",
      "BL_STD",
      "BUSINESS-LOAN",
      "business-loan",
    ],
    maxRequestedAmountRupees: 5_00_00_000,
    requestedAmountLimitKind: "loan",
  },
  {
    code: "CONSTRUCTION_FINANCE",
    label: "Construction Funding",
    description: "Project construction / builder finance.",
    sortOrder: 90,
    isSecured: true,
    customerSegment: ["business", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "CORPORATE_LOANS",
    aliases: ["construction_finance", "construction_funding", "CONSTRUCTION_FUNDING"],
    maxRequestedAmountRupees: 1_00_00_00_000,
    requestedAmountLimitKind: "funding",
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
    aliases: ["personal_loan", "PL_STD", "PERSONAL-LOAN", "personal-loan"],
    maxRequestedAmountRupees: 1_00_00_000,
    requestedAmountLimitKind: "loan",
  },
  {
    code: "GOLD_LOAN",
    label: "Gold Loan",
    description: "Loan against gold jewellery / ornaments (retail).",
    sortOrder: 125,
    isSecured: true,
    customerSegment: ["salaried", "self_employed", "business", "all"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "SECURED_LOANS",
    aliases: ["gold_loan", "GL"],
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
    aliases: ["education_loan", "EDUCATION-LOAN"],
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
  // CO-LR-006 — expanded Product Programme catalogue for Lender × Product matrix
  {
    code: "MSME_LOAN",
    label: "MSME Loan",
    description: "Term / working facilities for Micro, Small and Medium Enterprises.",
    sortOrder: 160,
    isSecured: false,
    customerSegment: ["business", "msme"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "MSME_LOANS",
    aliases: ["msme_loan", "msme", "sme_loan"],
  },
  {
    code: "CASH_CREDIT",
    label: "Cash Credit",
    description: "Working capital cash credit facility.",
    sortOrder: 170,
    isSecured: true,
    customerSegment: ["business", "msme", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "MSME_LOANS",
    aliases: ["cash_credit", "cc"],
  },
  {
    code: "OVERDRAFT",
    label: "Overdraft",
    description: "Overdraft facility against current account / securities.",
    sortOrder: 180,
    isSecured: true,
    customerSegment: ["business", "salaried", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "MSME_LOANS",
    aliases: ["overdraft", "od"],
  },
  {
    code: "SUPPLY_CHAIN_FINANCE",
    label: "Supply Chain Finance",
    description: "Buyer / supplier supply-chain financing programmes.",
    sortOrder: 190,
    isSecured: false,
    customerSegment: ["business", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "CORPORATE_LOANS",
    aliases: ["supply_chain_finance", "scf"],
  },
  {
    code: "INVOICE_FINANCING",
    label: "Invoice Financing",
    description: "Finance against trade invoices / receivables.",
    sortOrder: 200,
    isSecured: false,
    customerSegment: ["business", "msme", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "MSME_LOANS",
    aliases: ["invoice_financing", "invoice_discounting"],
  },
  {
    code: "BILL_DISCOUNTING",
    label: "Bill Discounting",
    description: "Discounting of trade bills / negotiable instruments.",
    sortOrder: 210,
    isSecured: false,
    customerSegment: ["business", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "CORPORATE_LOANS",
    aliases: ["bill_discounting"],
  },
  {
    code: "MACHINERY_FINANCE",
    label: "Machinery Finance",
    description: "Term finance for industrial / business machinery.",
    sortOrder: 220,
    isSecured: true,
    customerSegment: ["business", "msme", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "MSME_LOANS",
    aliases: ["machinery_finance", "machine_loan"],
  },
  {
    code: "EQUIPMENT_FINANCE",
    label: "Equipment Finance",
    description: "Finance for plant and equipment.",
    sortOrder: 230,
    isSecured: true,
    customerSegment: ["business", "msme", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "MSME_LOANS",
    aliases: ["equipment_finance"],
  },
  {
    code: "VEHICLE_LOAN",
    label: "Vehicle Loan",
    description: "Retail passenger vehicle financing.",
    sortOrder: 240,
    isSecured: true,
    customerSegment: ["salaried", "self_employed", "business"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "SECURED_LOANS",
    aliases: ["vehicle_loan", "auto_loan", "car_loan"],
  },
  {
    code: "COMMERCIAL_VEHICLE_LOAN",
    label: "Commercial Vehicle Loan",
    description: "Commercial vehicle / fleet financing.",
    sortOrder: 250,
    isSecured: true,
    customerSegment: ["business", "msme", "self_employed"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "SECURED_LOANS",
    aliases: ["commercial_vehicle_loan", "cv_loan"],
  },
  {
    code: "TRADE_FINANCE",
    label: "Trade Finance",
    description: "Letter of credit, bank guarantees and trade facilities.",
    sortOrder: 260,
    isSecured: false,
    customerSegment: ["business", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "CORPORATE_LOANS",
    aliases: ["trade_finance"],
  },
  {
    code: "EXPORT_FINANCE",
    label: "Export Finance",
    description: "Pre / post shipment export credit facilities.",
    sortOrder: 270,
    isSecured: false,
    customerSegment: ["business", "company"],
    categoryCode: "LOAN_PRODUCTS",
    groupCode: "CORPORATE_LOANS",
    aliases: ["export_finance", "export_credit"],
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

/** Normalize product codes for equality (hyphen and underscore are equivalent). */
export function normalizeProductCodeKey(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

/** Resolve any legacy / alias code to the canonical Product Master code. */
export function resolveCanonicalProductCode(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const normalized = normalizeProductCodeKey(raw);
  for (const entry of CANONICAL_PRODUCT_MASTER_SEED) {
    if (normalizeProductCodeKey(entry.code) === normalized) return entry.code;
    if (entry.aliases?.some((a) => normalizeProductCodeKey(a) === normalized)) {
      return entry.code;
    }
  }
  return normalized;
}

/** Label key for uniqueness — prevents duplicate dropdown rows with the same display name. */
export function normalizeProductLabelKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getCanonicalProductByCode(code: string | null | undefined) {
  const resolved = resolveCanonicalProductCode(code);
  if (!resolved) return null;
  return (
    CANONICAL_PRODUCT_MASTER_SEED.find(
      (p) => normalizeProductCodeKey(p.code) === normalizeProductCodeKey(resolved),
    ) ?? null
  );
}

/**
 * CO-PR-004 — Selection / matrix family key.
 * Collapses legacy Product Library / ECM codes onto their canonical Product Master entry
 * (e.g. HL_STD + HOME_LOAN, BL_STD + BUSINESS_LOAN_UNSECURED) without mutating rows.
 * Distinct canonical variants (Working Capital Secured vs Unsecured) stay separate.
 */
export function resolveProductSelectionFamilyKey(input: {
  code: string;
  label?: string | null;
}): string {
  const canonical = getCanonicalProductByCode(input.code);
  if (canonical) return `canon:${normalizeProductCodeKey(canonical.code)}`;
  const label = input.label?.trim();
  if (label) return `label:${normalizeProductLabelKey(label)}`;
  return `code:${normalizeProductCodeKey(input.code)}`;
}

/** True when two product codes represent the same selection family. */
export function productCodesShareSelectionFamily(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  if (normalizeProductCodeKey(a) === normalizeProductCodeKey(b)) return true;
  const fa = resolveProductSelectionFamilyKey({ code: a });
  const fb = resolveProductSelectionFamilyKey({ code: b });
  return fa === fb;
}
